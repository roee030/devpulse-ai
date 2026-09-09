/* Iron Fist Legends - cut-out rig renderer: the concept-sheet artwork split into body parts and animated by the skeleton poses */
'use strict';

const RIG_PARTS = ['head', 'torso', 'uArmF', 'fArmF', 'uArmB', 'fArmB', 'thighF', 'shinF', 'thighB', 'shinB'];
const Rig = {
  data: null, img: {}, tints: {}, loaded: 0, total: 0,
  load() {
    const start = (data) => {
      this.data = data;
      for (const cid in data) for (const p of RIG_PARTS) {
        if (!data[cid].parts[p]) continue;
        const key = cid + '_' + p, im = new Image(); this.total++;
        im.onload = () => this.loaded++; im.onerror = () => this.loaded++;
        im.src = (typeof RIG_PART_DATA !== 'undefined' && RIG_PART_DATA[key]) || ('rig/parts/' + key + '.webp'); this.img[key] = im;
      }
    };
    if (typeof RIG_JSON !== 'undefined') start(RIG_JSON);
    else fetch('rig/rig.json').then(r => r.json()).then(start).catch(() => { this.data = {}; });
  },
  ready() { return this.data && this.loaded >= this.total; },
  has(cid) { return !!(this.data && this.data[cid] && this.img[cid + '_torso'] && this.img[cid + '_torso'].complete && this.img[cid + '_torso'].naturalWidth > 0); },
  part(cid, p, tint) {
    const key = cid + '_' + p, im = this.img[key]; if (!im || !im.complete || !im.naturalWidth) return null;
    if (!tint) return im;
    const ck = key + tint; if (this.tints[ck]) return this.tints[ck];
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height); this.tints[ck] = c; return c;
  },
};
const angOf = (vx, vy) => Math.atan2(vx, vy) / DEG;   // 0 = straight down, + = toward +x (forward)

// Draw one character in a skeleton pose (same pose objects as the vector renderer). Returns hand/joint info for weapons.
function drawRig(ctx, ch, pose, x, feetY, facing, sizeMult, opts) {
  opts = opts || {};
  const rig = Rig.data && Rig.data[ch.id]; if (!rig || !Rig.has(ch.id)) return null;
  const parts = rig.parts, k = FIGHTER_H * ch.body.h * (sizeMult || 1) / rig.h;
  const tint = opts.tint || null;
  const len = (p) => parts[p].len * k;
  const legLen = Math.max(len('thighF') + len('shinF'), len('thighB') + len('shinB'));
  const hyScale = legLen / 110;
  ctx.save();
  ctx.translate(x, feetY); ctx.scale(facing, 1);
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = opts.glowBlur || 14; }
  const hipC = { x: 0, y: -legLen * 0.96 + (pose.hy || 0) * hyScale };
  const tor = (pose.tor || 0) * DEG, ct = Math.cos(tor), st = Math.sin(tor);
  const T = (o) => ({ x: hipC.x + (o[0] * ct - o[1] * st) * k, y: hipC.y + (o[0] * st + o[1] * ct) * k });
  const neck = T(rig.neck), shF = T(rig.joints.shL), shB = T(rig.joints.shR), hipF = T(rig.joints.hipL), hipB = T(rig.joints.hipR);
  const pt = (b, a, l) => ({ x: b.x + Math.sin(a * DEG) * l, y: b.y + Math.cos(a * DEG) * l });
  const drawPart = (name, joint, targetAng, extraScale) => {
    const p = parts[name]; const im = Rig.part(ch.id, name, tint); if (!p || !im) return;
    ctx.save(); ctx.translate(joint.x, joint.y); ctx.rotate((targetAng - p.ang) * DEG); ctx.scale(k * (extraScale || 1), k * (extraScale || 1));
    ctx.drawImage(im, -p.px, -p.py); ctx.restore();
  };
  const limb = (side, tag) => {
    const a = side === 'F' ? pose.aF : pose.aB, l = side === 'F' ? pose.lF : pose.lB;
    const sh = side === 'F' ? shF : shB, hp = side === 'F' ? hipF : hipB;
    const el = pt(sh, a[0], len('uArm' + tag)), hand = pt(el, a[0] + a[1], len('fArm' + tag));
    const kn = pt(hp, l[0], len('thigh' + tag)), ft = pt(kn, l[0] + l[1], len('shin' + tag));
    return { sh, el, hand, hp, kn, ft, armAng: a[0] + a[1], legAng: l[0] + l[1], a, l };
  };
  const F = limb('F', 'F'), B = limb('B', 'B');
  const torsoAng = angOf(st, -ct), headA = tor + (pose.head || 0) * DEG, headAng = angOf(Math.sin(headA), -Math.cos(headA));
  // back limbs
  drawPart('uArmB', B.sh, B.a[0]); drawPart('fArmB', B.el, B.armAng);
  drawPart('thighB', B.hp, B.l[0]); drawPart('shinB', B.kn, B.legAng);
  if (opts.beforeTorso) opts.beforeTorso(ctx, { hipC, neck });
  drawPart('torso', hipC, torsoAng);
  drawPart('thighF', F.hp, F.l[0]); drawPart('shinF', F.kn, F.legAng);
  drawPart('head', neck, headAng);
  drawPart('uArmF', F.sh, F.a[0]); drawPart('fArmF', F.el, F.armAng);
  // energy weapons drawn from the hands
  const style = STYLES[ch.style];
  const ws = (FIGHTER_H * ch.body.h * (sizeMult || 1)) / 230;   // weapon scale follows the drawn fighter height
  if (!tint && style.weapon) {
    const acc = ch.colors.accent;
    const wpn = (h, dir, front) => {
      const dx = Math.sin(dir * DEG), dy = Math.cos(dir * DEG), P = (d) => ({ x: h.x + dx * d * ws, y: h.y + dy * d * ws });
      const wp = style.weapon;
      if ((wp === 'blade' && front) || wp === 'dualblade') {
        const L = wp === 'blade' ? 66 : 50;
        ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 5 * ws; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(P(-10).x, P(-10).y); ctx.lineTo(P(6).x, P(6).y); ctx.stroke();
        const tipW = 4.6 * ws; ctx.save(); ctx.shadowColor = acc; ctx.shadowBlur = 12 * ws; ctx.globalAlpha *= 0.9;
        ctx.strokeStyle = acc; ctx.lineWidth = tipW; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(P(6).x, P(6).y); ctx.lineTo(P(L).x, P(L).y); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = tipW * 0.34; ctx.stroke(); ctx.restore();
      }
      else if (wp === 'hammer' && front) {
        ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 7 * ws; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(P(-22).x, P(-22).y); ctx.lineTo(P(52).x, P(52).y); ctx.stroke();
        const hd = P(60); ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(ws, ws);
        ctx.fillStyle = '#3c3c4a'; ctx.beginPath(); ctx.moveTo(-11, -17); ctx.lineTo(11, -19); ctx.lineTo(13, 19); ctx.lineTo(-11, 17); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#15151c'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); ctx.shadowColor = acc; ctx.shadowBlur = 14; ctx.fillStyle = acc; ctx.fillRect(-4, -15, 8, 30); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillRect(-1.5, -11, 3, 22); ctx.restore(); ctx.restore();
      }
      else if (wp === 'claws') { for (let i = -1; i <= 1; i++) glowLine(ctx, P(1), pt(P(1), dir + i * 15, 20 * ws), acc, 2.6 * ws, 9, true); }
      else if (wp === 'fists') { const R = 22 * ws; const g = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, R); g.addColorStop(0, acc + 'cc'); g.addColorStop(1, acc + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, R, 0, Math.PI * 2); ctx.fill(); }
    };
    wpn(B.hand, B.armAng, false); wpn(F.hand, F.armAng, true);
    if (style.weapon === 'threads') {
      const now = performance.now() / 1000; ctx.save(); ctx.strokeStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = 8; ctx.lineWidth = 1.3; ctx.globalAlpha *= 0.85;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(B.hand.x, B.hand.y); ctx.quadraticCurveTo((B.hand.x + F.hand.x) / 2 + Math.sin(now * 5 + i) * 6 * ws, (B.hand.y + F.hand.y) / 2 + (14 + i * 6) * ws, F.hand.x, F.hand.y); ctx.stroke(); }
      if (opts.attack) for (let i = -1; i <= 1; i++) { const e = pt(F.hand, F.armAng + i * 14, 130 * ws); ctx.beginPath(); ctx.moveTo(F.hand.x, F.hand.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y, 2.5 * ws, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }
  if (!tint && opts.attack && (style.weapon === 'fists' || ['magma', 'psi', 'cryo', 'sonic', 'pulse'].includes(ch.style))) {
    const acc = ch.colors.accent, R = 36 * ws; const g = ctx.createRadialGradient(F.hand.x, F.hand.y, 4, F.hand.x, F.hand.y, R); g.addColorStop(0, acc + 'dd'); g.addColorStop(1, acc + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(F.hand.x, F.hand.y, R, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return { hand: { x: x + F.hand.x * facing, y: feetY + F.hand.y }, top: feetY + neck.y - 60 * k };
}

// Fighter presentation from live game state
function drawFighterRig(ctx, f, opts) {
  opts = opts || {};
  const ch = f.ch, st = f.state, m = f.move;
  if (!Rig.has(ch.id)) return false;
  const pose = f.getPose(); const fc = f.facing * (pose.spin ? f.spinFlip : 1);
  const acc = ch.colors.accent;
  if (opts.aura) { ctx.save(); const cy = f.feetY - 110 * ch.body.h; const g = ctx.createRadialGradient(f.x, cy, 10, f.x, cy, 140); g.addColorStop(0, opts.aura + 'aa'); g.addColorStop(1, opts.aura + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, cy, 140, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  const attacking = st === 'attack' && m && f.mf > m.startup * 0.5;
  const o = { alpha: opts.alpha, attack: attacking };
  const flashing = opts.flash || (f.flashT > 0 && st === 'hit');
  if (ch.body.kind === 'phantom') { o.glow = acc; o.glowBlur = 14; o.alpha = (o.alpha == null ? 1 : o.alpha) * 0.92; }
  if (attacking && (m.type === 'super' || m.type === 'dash')) { o.glow = acc; o.glowBlur = 18; }
  if (st === 'win') { o.glow = acc; o.glowBlur = 22; }
  const r = drawRig(ctx, ch, pose, f.x, f.feetY, fc, 1, o);
  if (!r) return false;
  if (st === 'hit') drawRig(ctx, ch, pose, f.x, f.feetY, fc, 1, { tint: '#ff3020', alpha: 0.3 * (opts.alpha == null ? 1 : opts.alpha) });
  if (flashing) drawRig(ctx, ch, pose, f.x, f.feetY, fc, 1, { tint: '#ffffff', alpha: (f.flashT / 6) * 0.75 * (opts.alpha == null ? 1 : opts.alpha) });
  if (st === 'block') { ctx.save(); ctx.strokeStyle = '#7fb0ff'; ctx.shadowColor = '#7fb0ff'; ctx.shadowBlur = 16; ctx.lineWidth = 5; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(f.x + f.facing * 40, f.feetY - (f.crouching ? 60 : 110) * ch.body.h, 64, (f.facing > 0 ? -0.9 : Math.PI - 0.9), (f.facing > 0 ? 0.9 : Math.PI + 0.9)); ctx.stroke(); ctx.restore(); }
  if (f.counterFlash > 0) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.shadowColor = acc; ctx.shadowBlur = 20; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(f.t / 2); ctx.beginPath(); ctx.arc(f.x, f.feetY - 105 * ch.body.h, 95, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  return true;
}
