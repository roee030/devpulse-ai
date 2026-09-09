/* Iron Fist Legends - fighter state machine, combat resolution, projectiles, AI */
'use strict';

const GRAVITY = 0.9;
const emptyInput = () => ({ left:false, right:false, up:false, down:false, lp:false, hp:false, lk:false, hk:false, sp:false, sup:false });

class Fighter {
  constructor(ch, x, facing, isP1, statMult) {
    this.ch = ch; this.style = STYLES[ch.style]; this.st = this.style.stats;
    this.mult = statMult || 1;
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0; this.facing = facing; this.isP1 = isP1;
    this.w = 64 * ch.body.w; this.h = 180 * ch.body.h; this.crouchH = 110 * ch.body.h;
    this.maxHp = Math.round(this.st.hp * (this.mult > 1 ? this.mult : 1)); this.hp = this.maxHp;
    this.meter = 0; this.state = 'idle'; this.t = 0; this.move = null; this.mf = 0;
    this.hitstun = 0; this.blockstun = 0; this.crouching = false; this.airborne = false;
    this.knockdown = false; this.downT = 0; this.invul = 0; this.comboHits = 0; this.comboDmg = 0;
    this.hitsDone = 0; this.nextHitF = 0; this.hitTargets = 0;
    this.inp = emptyInput(); this.prev = emptyInput(); this.buf = {}; this.buffered = null;
    this.landLag = 0; this.grabbed = null; this.throwT = 0; this.flashT = 0; this.roundsWon = 0;
    this.spinFlip = 1; this.trail = []; this.shake = 0; this.wins = 0; this.tookDamage = false; this.walkT = 0; this.counterFlash = 0;
    this.gravity = GRAVITY * (this.st.gravity || 1);
  }
  get feetY() { return GROUND - this.y; }
  get curH() { return this.crouching || this.state === 'down' || this.state === 'getup' ? this.crouchH : this.h; }
  hurtbox() { const h = this.state === 'down' ? 40 : this.curH; return { x0: this.x - this.w / 2, x1: this.x + this.w / 2, y0: this.feetY - h, y1: this.feetY }; }
  power() { return this.st.power * this.mult; }
  free() { return ['idle', 'walk', 'crouch', 'jump'].includes(this.state); }
  grounded() { return !this.airborne; }

  setInput(inp) {
    this.prev = this.inp; this.inp = inp;
    for (const k of ['lp', 'hp', 'lk', 'hk', 'sp', 'sup']) { if (inp[k] && !this.prev[k]) this.buf[k] = 6; else if (this.buf[k] > 0) this.buf[k]--; }
    if (inp.up && !this.prev.up) this.buf.up = 6; else if (this.buf.up > 0) this.buf.up--;
  }
  pressed(k) { return this.buf[k] > 0; }
  consume(k) { this.buf[k] = 0; }
  back() { return this.facing > 0 ? this.inp.left : this.inp.right; }
  fwd() { return this.facing > 0 ? this.inp.right : this.inp.left; }

  startMove(key, opp, game) {
    let m = this.style.moves[key];
    if (key === 'sup') { if (this.meter < 100) return false; this.meter = 0; }
    if (this.airborne) {
      if (key === 'sup' || key === 'sp1' || key === 'sp2') return false;
      m = Object.assign({}, key === 'lp' || key === 'hp' ? BASE_MOVES.straight : BASE_MOVES.fkick, { name: 'Jump ' + (key === 'lp' || key === 'hp' ? 'Punch' : 'Kick'), lvl: 'over', dmg: key === 'hk' || key === 'hp' ? 11 : 8, startup: 4, active: 40, recovery: 2, air: true, anim: key === 'lp' || key === 'hp' ? 'straight' : 'fkick' });
    } else if (this.crouching && (key === 'lk' || key === 'hk')) {
      m = Object.assign({}, key === 'lk' ? this.style.moves.lk : BASE_MOVES.sweep, { lvl: 'low', crouch: true, name: key === 'lk' ? this.style.moves.lk.name : 'Sweep' });
      if (key === 'hk') m.name = 'Sweep';
    } else if (this.crouching && (key === 'lp' || key === 'hp')) {
      m = Object.assign({}, this.style.moves[key], { crouch: true });
    }
    if (!m) return false;
    if (m.type === 'super') { game.superFlash(this); AudioSys.sfx('super'); }
    this.move = m; this.mf = 0; this.state = 'attack'; this.hitsDone = 0; this.nextHitF = 0; this.hitTargets = 0; this.hitLanded = false; this.consume(key);
    this.crouchAttack = !!m.crouch; this.crouching = !!m.crouch;
    if (m.vy && this.grounded()) { this.vy = m.vy; this.airborne = true; }
    if (m.type === 'teleport') { this.invul = m.startup + 2; AudioSys.sfx('tele'); }
    if (m.voice) AudioSys.grunt(this.ch.voice, m.voice); else if (Math.random() < 0.35) AudioSys.grunt(this.ch.voice, 'attack');
    AudioSys.sfx('whoosh');
    return true;
  }

  update(opp, game) {
    this.t++;
    if (this.invul > 0) this.invul--;
    if (this.flashT > 0) this.flashT--;
    if (this.counterFlash > 0) this.counterFlash--;
    if (this.meter > 100) this.meter = 100;
    const inp = this.inp;
    const canAct = game.phase === 'active';
    // face opponent
    if (this.free() && this.grounded()) this.facing = opp.x >= this.x ? 1 : -1;

    switch (this.state) {
      case 'hit': case 'block':
        this.hitstun--; this.vx *= 0.85;
        if (this.airborne) { /* wait for landing */ }
        else if (this.hitstun <= 0) { this.state = this.knockdown ? 'down' : 'idle'; if (this.state === 'down') { this.downT = 40; AudioSys.sfx('land'); game.dust(this.x, this.feetY, 10); } this.knockdown = false; this.comboHits = 0; }
        break;
      case 'down':
        this.downT--; this.vx *= 0.8; this.invul = 2; this.comboHits = 0;
        if (this.downT <= 0) { if (this.hp <= 0 || game.phase !== 'active') { this.downT = 10; } else { this.state = 'getup'; this.downT = 18; this.invul = 22; } }
        break;
      case 'getup':
        this.downT--; if (this.downT <= 0) this.state = 'idle';
        break;
      case 'grabbed':
        this.vx = 0; this.comboHits = 1;
        break;
      case 'throwing': {
        this.throwT++; const g = this.grabbed;
        if (g) {
          if (this.throwT < 18) { g.x = this.x + this.facing * 50; g.y = this.throwT * 3; }
          else if (this.throwT === 18) {
            g.state = 'hit'; g.hitstun = 30; g.knockdown = true; g.airborne = true; g.vy = -8; g.vx = this.facing * 9; g.y = 40;
            const dmg = this.applyDamage(g, this.move, game, false); game.hitFx(g.x, g.feetY - 80, this.style.fx, true); AudioSys.sfx('hitheavy'); game.shake = 12; this.grabbed = null;
          }
        }
        if (this.throwT >= 34) { this.state = 'idle'; this.move = null; }
        break;
      }
      case 'attack': this.updateAttack(opp, game); break;
      case 'win': case 'lose': this.vx = 0; break;
      default: {
        // free movement
        this.crouching = this.grounded() && canAct && !!inp.down;
        if (canAct) {
          // attacks (buffered)
          const keys = ['sup', 'sp', 'hp', 'hk', 'lp', 'lk'];
          let started = false;
          for (const k of keys) {
            if (!this.pressed(k)) continue;
            let mk = k;
            if (k === 'sp') mk = inp.down ? 'sp2' : 'sp1';
            if (this.airborne && (k === 'sp' || k === 'sup')) continue;
            if (this.startMove(mk, opp, game)) { started = true; break; }
          }
          if (started) break;
        }
        if (this.grounded()) {
          if (this.landLag > 0) { this.landLag--; this.vx = 0; this.state = 'idle'; break; }
          if (canAct && this.pressed('up')) {
            this.consume('up'); this.airborne = true; this.vy = -this.st.jump; this.vx = (inp.right ? 1 : inp.left ? -1 : 0) * this.st.speed * 1.1; this.state = 'jump'; AudioSys.sfx('jump'); game.dust(this.x, this.feetY, 5);
          } else if (canAct && inp.down) { this.state = 'crouch'; this.crouching = true; this.vx = 0; }
          else if (canAct && (inp.left || inp.right)) {
            const dir = inp.right ? 1 : -1; const backing = dir !== this.facing;
            this.vx = dir * this.st.speed * (backing ? 0.75 : 1); this.state = 'walk'; this.walkT += 0.18;
          } else { this.vx = 0; this.state = 'idle'; }
        } else {
          this.state = 'jump';
        }
      }
    }

    // physics
    this.x += this.vx;
    if (this.airborne) {
      this.y -= this.vy; this.vy += this.gravity;
      if (this.y <= 0) {
        this.y = 0; this.airborne = false; this.vy = 0;
        if (this.state === 'attack' && this.move && this.move.air) { this.state = 'idle'; this.move = null; this.landLag = 5; }
        else if (this.state === 'attack') { /* keep */ }
        else if (this.state === 'hit' || this.state === 'block') { if (this.knockdown) { this.state = 'down'; this.downT = 40; this.knockdown = false; game.dust(this.x, this.feetY, 12); AudioSys.sfx('land'); this.comboHits = 0; this.hitstun = 0; } else { this.hitstun = Math.min(this.hitstun, 4); } }
        else { this.landLag = 4; this.state = 'idle'; AudioSys.sfx('land'); game.dust(this.x, this.feetY, 4); }
        this.vx = 0;
      }
    } else this.y = 0;
    this.x = clamp(this.x, this.w / 2, STAGE_W - this.w / 2);
  }

  updateAttack(opp, game) {
    const m = this.move; this.mf++;
    const total = m.startup + m.active + m.recovery;
    const inActive = this.mf > m.startup && this.mf <= m.startup + m.active;
    if (m.fwd && this.mf <= m.startup + m.active && !this.airborne) this.vx = this.facing * m.fwd; else if (!this.airborne) this.vx *= 0.7;
    if (m.type === 'teleport' && this.mf === m.startup) {
      game.afterimage(this); this.x = clamp(opp.x - opp.facing * 95, this.w / 2, STAGE_W - this.w / 2); this.facing = opp.x >= this.x ? 1 : -1; game.afterimage(this); AudioSys.sfx('tele');
    }
    if (m.type === 'projectile' && this.mf === m.startup + 1) game.spawnProjectile(this, m);
    if (m.projectile === 'beam' && (this.mf === m.startup + 1 || this.mf === m.startup + 9 || this.mf === m.startup + 17)) game.spawnProjectile(this, m, true);
    if (m.anim === 'spin' && this.mf % 4 === 0) this.spinFlip *= -1;
    if (m.type === 'super' && this.mf % 3 === 0) game.afterimage(this);
    if (inActive && m.type !== 'projectile' && !m.projectile && m.type !== 'counter') {
      const hits = m.hits || 1;
      if (this.hitsDone < hits && this.mf >= this.nextHitF) {
        const hb = this.hitbox(m);
        const ob = opp.hurtbox();
        if (game.overlap(hb, ob) && opp.invul <= 0 && opp.state !== 'down' && opp.state !== 'getup' && !(opp.state === 'grabbed')) {
          if (m.type === 'grab') {
            if (!opp.airborne) { this.grabbed = opp; opp.state = 'grabbed'; opp.hitstun = 60; this.state = 'throwing'; this.throwT = 0; AudioSys.sfx('grab'); opp.facing = -this.facing; }
            else { this.hitsDone = hits; }
          } else {
            game.resolveHit(this, opp, m);
            this.hitsDone++; this.nextHitF = this.mf + (m.hitGap || 99);
            if (m.type === 'super' && this.hitsDone < hits) opp.hitstun = Math.max(opp.hitstun, (m.hitGap || 6) + 4);
          }
        }
      }
    }
    if (m.type === 'counter' && inActive && this.mf === m.startup + 1) this.counterFlash = m.active;
    if (this.mf >= total && !m.air) { this.state = this.crouchAttack && this.inp.down ? 'crouch' : 'idle'; this.crouching = this.state === 'crouch'; this.move = null; this.crouchAttack = false; }
    if (m.air && this.mf >= total) { this.state = 'jump'; this.move = null; }
  }

  hitbox(m) {
    const lv = m.lvl, fy = this.feetY, hs = this.ch.body.h;
    let y0, y1;
    if (lv === 'low') { y0 = fy - 75 * hs; y1 = fy; } else if (lv === 'over') { y0 = fy - 200 * hs; y1 = fy - 90 * hs; } else { y0 = fy - 165 * hs; y1 = fy - 50 * hs; }
    if (m.air) { y0 = fy - 120 * hs; y1 = fy + 20; }
    if (this.crouchAttack) { y0 += 50; y1 = Math.min(fy, y1 + 40); }
    const front = this.x + this.facing * (this.w / 2 - 10);
    const reach = m.range * (this.style.weapon ? 1 : 1) * Math.max(0.9, this.ch.body.h);
    const x0 = this.facing > 0 ? front : front - reach, x1 = this.facing > 0 ? front + reach : front;
    return { x0, x1, y0, y1 };
  }

  applyDamage(def, m, game, blocked) {
    let dmg = m.dmg * this.power() * def.st.defense;
    if (blocked) dmg *= (m.type === 'normal' || !m.type) ? 0 : 0.12;
    else dmg *= Math.max(0.35, 1 - 0.1 * def.comboHits);
    dmg = Math.round(dmg * 10) / 10;
    def.hp -= dmg; if (def.hp < 0) def.hp = 0;
    if (!blocked) { def.tookDamage = true; this.meter += dmg * 0.9; def.meter += dmg * 0.6; } else { this.meter += dmg * 0.3 + 1; }
    return dmg;
  }

  getPose() {
    const s = this.state, m = this.move;
    if (s === 'attack' && m) {
      const A = P[m.anim] || P.jab; const base = this.crouchAttack ? P.crouch : (this.airborne ? P.jump : P.idle);
      const wind = mergePose(base, A.wind), hit = mergePose(base, A.hit);
      let pose;
      const su = m.startup, ac = m.active, rc = m.recovery;
      if (this.mf <= su) { const t = this.mf / su; pose = t < 0.6 ? lerpPose(base, wind, t / 0.6) : lerpPose(wind, hit, (t - 0.6) / 0.4); }
      else if (this.mf <= su + ac) {
        pose = hit;
        if (A.alt && (m.hits || 1) > 1) { const idx = Math.floor((this.mf - su) / (m.hitGap || 6)); if (idx % 2 === 1) pose = mergePose(base, A.alt); }
        if (m.anim === 'rush' && this.mf % 12 > 6) pose = mergePose(pose, { lF: [96, 0], aF: [40, 90] });
      } else { const t = (this.mf - su - ac) / rc; pose = lerpPose(hit, base, Math.min(1, t)); }
      pose.open = A.open; pose.spin = A.spin;
      if (this.crouchAttack) pose.hy = Math.max(pose.hy, 40);
      return pose;
    }
    if (s === 'throwing') return this.throwT < 18 ? P.throwLift : P.throwSlam;
    if (s === 'grabbed') return P.grabbed;
    if (s === 'hit') return this.airborne ? P.launch : (this.crouching ? P.hitLow : P.hit);
    if (s === 'block') return this.crouching ? P.blockLow : P.block;
    if (s === 'down') return P.down;
    if (s === 'getup') return P.getup;
    if (s === 'win') return mergePose(P.win, { aF: [172 + Math.sin(this.t / 6) * 6, -8] });
    if (s === 'lose') return P.down;
    if (s === 'crouch') return P.crouch;
    if (s === 'jump' || this.airborne) return this.vy < 0 ? P.jump : P.fall;
    if (s === 'walk') {
      const sw = Math.sin(this.walkT * 4) * 28, sw2 = Math.cos(this.walkT * 4) * 10;
      return mergePose(P.idle, { lF: [14 + sw, -6 - Math.max(0, sw2)], lB: [-12 - sw, 3 - Math.max(0, -sw2)], hy: Math.abs(Math.sin(this.walkT * 4)) * 3 });
    }
    // idle breathing
    const b = Math.sin(this.t / 14);
    return mergePose(P.idle, { hy: b * 2, aF: [60 + b * 3, 100], aB: [45 + b * 2, 110], tor: 6 + b });
  }
}

// ---------- Projectile ----------
class Projectile {
  constructor(owner, m, big) {
    const pr = (m.alt && owner.style.proj2) ? owner.style.proj2 : (owner.style.proj || { shape: 'ki', color: owner.style.fx, speed: 9, size: 26 });
    this.owner = owner; this.m = m; this.x = owner.x + owner.facing * 60; this.y = owner.feetY - 105 * owner.ch.body.h;
    this.vx = owner.facing * (pr.speed || 0) * (big ? 1.3 : 1); this.size = pr.size * (big ? 1.8 : 1); this.shape = pr.shape; this.color = pr.color; this.life = 140; this.dead = false; this.t = 0; this.big = big;
    this.stationary = !!pr.stationary; this.low = !!pr.low; this.tall = pr.shape === 'pillar';
    if (this.stationary) { this.x = owner.x + owner.facing * pr.dist; this.vx = 0; this.life = pr.life; this.y = GROUND; this.maxLife = pr.life; }
    this.facing = owner.facing;
  }
  box() {
    if (this.tall) return { x0: this.x - this.size * 0.7, x1: this.x + this.size * 0.7, y0: GROUND - 240, y1: GROUND };
    if (this.low) return { x0: this.x - this.size, x1: this.x + this.size, y0: GROUND - 70, y1: GROUND };
    return { x0: this.x - this.size, x1: this.x + this.size, y0: this.y - this.size, y1: this.y + this.size };
  }
  update() { this.x += this.vx; this.t++; this.life--; if (this.life <= 0 || this.x < -100 || this.x > STAGE_W + 100) this.dead = true; }
  draw(ctx) {
    ctx.save(); ctx.translate(this.x, this.y); const s = this.size, c = this.color;
    ctx.shadowColor = c; ctx.shadowBlur = 25;
    if (this.shape === 'pillar') { const k = Math.min(1, this.t / 6) * (this.life < 6 ? this.life / 6 : 1); ctx.globalAlpha = 0.9; for (let i = 0; i < 3; i++) { const g = ctx.createLinearGradient(0, 0, 0, -240 * k); g.addColorStop(0, c); g.addColorStop(0.6, '#ffd040'); g.addColorStop(1, c + '00'); ctx.fillStyle = g; const wv = s * (0.7 - i * 0.18); ctx.beginPath(); ctx.moveTo(-wv, 0); ctx.quadraticCurveTo(-wv * 0.4 + Math.sin(this.t / 2 + i) * 8, -120 * k, 0, -240 * k); ctx.quadraticCurveTo(wv * 0.4 + Math.cos(this.t / 2 + i) * 8, -120 * k, wv, 0); ctx.fill(); } ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.ellipse(0, 0, s, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (this.shape === 'quake') { ctx.globalAlpha = 0.85; ctx.strokeStyle = c; ctx.lineWidth = 6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, s * 0.4 + i * 16 + (this.t % 4) * 3, Math.PI, Math.PI * 2); ctx.stroke(); } ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { ctx.fillRect(-s + i * s / 3 + (this.t * 3) % 10, -10 - (i % 3) * 12, 5, 10 + (i % 3) * 6); } }
    else if (this.shape === 'net') { ctx.rotate(this.t * 0.08); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.stroke(); }
    else if (this.shape === 'ice') { ctx.rotate(this.vx > 0 ? 0 : Math.PI); ctx.fillStyle = '#e8f0ff'; ctx.beginPath(); ctx.moveTo(s * 1.6, 0); ctx.lineTo(0, -s * 0.5); ctx.lineTo(-s, 0); ctx.lineTo(0, s * 0.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(s * 1.2, 0); ctx.lineTo(0, -s * 0.2); ctx.lineTo(-s * 0.6, 0); ctx.lineTo(0, s * 0.2); ctx.fill(); }
    else if (this.shape === 'slash') { const d = Math.sign(this.vx) || 1; ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(-d * s * 0.6, 0, s, -1.2 * d + (d < 0 ? Math.PI : 0), 1.2 * d + (d < 0 ? Math.PI : 0), d < 0); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
    else if (this.shape === 'spike') { const d = Math.sign(this.vx) || 1; for (let i = -1; i <= 1; i++) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(d * s * 1.4, i * 12); ctx.lineTo(-d * s * 0.4, i * 12 - 4); ctx.lineTo(-d * s * 0.4, i * 12 + 4); ctx.closePath(); ctx.fill(); } }
    else if (this.shape === 'clone') { ctx.globalAlpha = 0.75; ctx.fillStyle = c; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; const d = Math.sign(this.vx) || 1; ctx.beginPath(); ctx.arc(0, -s * 1.6, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-14, -s * 1.3, 28, s * 1.1, 10) : ctx.rect(-14, -s * 1.3, 28, s * 1.1); ctx.fill(); ctx.stroke(); ctx.lineWidth = 8; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(d * 34, -s * 1.0); ctx.moveTo(-6, -s * 0.2); ctx.lineTo(d * 26, s * 0.3); ctx.moveTo(6, -s * 0.2); ctx.lineTo(-d * 22, s * 0.35); ctx.stroke(); }
    else if (this.shape === 'shuriken') { ctx.rotate(this.t * 0.5); ctx.fillStyle = '#ddd'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s, -4); ctx.lineTo(s * 1.1, 4); ctx.fill(); } }
    else if (this.shape === 'laser') { ctx.fillStyle = c; ctx.fillRect(-s * 2.5, -s * 0.35, s * 5, s * 0.7); ctx.fillStyle = '#fff'; ctx.fillRect(-s * 2.2, -s * 0.12, s * 4.4, s * 0.24); }
    else if (this.shape === 'wave') { ctx.strokeStyle = c; ctx.lineWidth = 6; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-i * 10 * Math.sign(this.vx), 0, s - i * 8, -1.1, 1.1); ctx.stroke(); } }
    else if (this.shape === 'fire') { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#ffd040' : c; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(-i * 12 * Math.sign(this.vx) + Math.sin(this.t / 2 + i) * 4, Math.cos(this.t / 3 + i) * 6, s - i * 7, 0, Math.PI * 2); ctx.fill(); } }
    else { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, s); g.addColorStop(0, '#fff'); g.addColorStop(0.4, c); g.addColorStop(1, c + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); if (this.shape === 'orb') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.4, this.t / 5, 0, Math.PI * 2); ctx.stroke(); } }
    ctx.restore();
  }
}

// ---------- AI ----------
class AI {
  constructor(diff) { this.diff = diff; this.plan = null; this.timer = 0; this.inp = emptyInput(); this.combo = 0; }
  think(me, opp, game) {
    const d = this.diff, inp = emptyInput();
    if (game.phase !== 'active' || !me.free()) { this.timer = 0; if (me.state === 'attack' && this.combo > 0 && me.move && me.mf > me.move.startup + me.move.active + 2) { /* chain */ } return inp; }
    const dx = opp.x - me.x, dir = Math.sign(dx) || 1, dist = Math.abs(dx) - (me.w + opp.w) / 2;
    const fwdKey = dir > 0 ? 'right' : 'left', backKey = dir > 0 ? 'left' : 'right';
    if (this.timer > 0) { this.timer--; return this.applyPlan(me, opp, fwdKey, backKey); }
    const react = Math.max(2, Math.round(24 - d * 2.2));
    const blockProb = 0.08 + d * 0.075, aggro = 0.3 + d * 0.06;
    const r = Math.random();
    // incoming projectile
    const proj = game.projectiles.find(p => p.owner !== me && Math.abs(p.x - me.x) < 260 && Math.sign(p.vx) === -dir * -1 * -1 && ((p.vx > 0) === (p.x < me.x)));
    if (proj && r < 0.15 + d * 0.06) { this.plan = Math.random() < 0.6 ? 'jump' : 'block'; this.timer = 14; return this.applyPlan(me, opp, fwdKey, backKey); }
    const oppAttacking = opp.state === 'attack' && opp.move && opp.mf <= opp.move.startup + opp.move.active;
    if (oppAttacking && dist < 170 && r < blockProb) { this.plan = 'block'; this.blockLow = opp.move.lvl === 'low'; this.timer = Math.max(8, opp.move.startup + opp.move.active - opp.mf + 6); return this.applyPlan(me, opp, fwdKey, backKey); }
    if (opp.state === 'down' || opp.state === 'getup') { this.plan = dist > 90 ? 'approach' : 'wait'; this.timer = react; return this.applyPlan(me, opp, fwdKey, backKey); }
    if (opp.airborne && dist < 140 && r < 0.4 + d * 0.04) { this.plan = pick(['hp', 'hk', 'sp1']); this.timer = 4; return this.applyPlan(me, opp, fwdKey, backKey); }
    if (dist > 280) {
      if (me.style.proj && r < 0.12 + d * 0.035) this.plan = 'sp1';
      else if (r < 0.12) this.plan = 'jumpfwd';
      else if (r < 0.2 && (me.style.moves.sp2.type === 'dash' || me.style.moves.sp2.type === 'teleport')) this.plan = 'sp2';
      else if (r < 0.2 + 0.03 * d && me.style.moves.sp1.type === 'dash') this.plan = 'sp1';
      else this.plan = 'approach';
      this.timer = react + 6;
    } else if (dist > 120) {
      if (r < aggro * 0.5) this.plan = pick(['approach', 'approach', 'hk', 'lk', 'fwdattack']);
      else if (r < aggro * 0.5 + 0.1 && me.style.moves.sp1.type !== 'counter') this.plan = 'sp1';
      else if (r < 0.7) this.plan = 'approach';
      else if (r < 0.85) this.plan = 'wait';
      else this.plan = 'jumpfwd';
      this.timer = react;
    } else {
      if (me.meter >= 100 && r < 0.35 + d * 0.05) this.plan = 'sup';
      else if (opp.state === 'hit' && d >= 3 && r < 0.7) { this.plan = pick(['lp', 'hp', 'hk', 'lk']); }
      else if (r < aggro) {
        const w = [['lp', 3], ['hp', 2.5], ['lk', 2], ['hk', 2], ['sp1', 1 + d * 0.15], ['sp2', 0.8 + d * 0.15], ['crouchkick', 1]];
        let tot = w.reduce((a, b) => a + b[1], 0), k = Math.random() * tot; for (const it of w) { k -= it[1]; if (k <= 0) { this.plan = it[0]; break; } }
      }
      else if (r < aggro + 0.15) this.plan = 'retreat';
      else if (r < aggro + 0.25) this.plan = 'jumpback';
      else this.plan = 'wait';
      this.timer = this.plan.length <= 3 || this.plan === 'crouchkick' ? 3 : react;
    }
    return this.applyPlan(me, opp, fwdKey, backKey);
  }
  applyPlan(me, opp, fwdKey, backKey) {
    const inp = emptyInput(), p = this.plan;
    switch (p) {
      case 'approach': inp[fwdKey] = true; break;
      case 'retreat': inp[backKey] = true; break;
      case 'block': inp[backKey] = true; if (this.blockLow) inp.down = true; break;
      case 'jump': inp.up = true; break;
      case 'jumpfwd': inp.up = true; inp[fwdKey] = true; if (this.timer < 6) inp.hk = true; break;
      case 'jumpback': inp.up = true; inp[backKey] = true; break;
      case 'fwdattack': inp[fwdKey] = true; if (this.timer < 4) inp.hp = true; break;
      case 'crouchkick': inp.down = true; inp.lk = true; break;
      case 'sp1': inp.sp = true; break;
      case 'sp2': inp.sp = true; inp.down = true; break;
      case 'sup': inp.sup = true; break;
      case 'lp': case 'hp': case 'lk': case 'hk': inp[p] = true; break;
      default: break;
    }
    return inp;
  }
}
