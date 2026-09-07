/* Iron Fist Legends - main loop, screens, fight orchestration, HUD */
'use strict';

const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
function fitCanvas() { const s = Math.min(window.innerWidth / W, (window.innerHeight - 30) / H); canvas.style.width = Math.floor(W * s) + 'px'; canvas.style.height = Math.floor(H * s) + 'px'; }
window.addEventListener('resize', fitCanvas); fitCanvas();

// ---------- Input ----------
const KEYMAP = {
  p1: { left:['KeyA'], right:['KeyD'], up:['KeyW'], down:['KeyS'], lp:['KeyJ'], hp:['KeyK'], lk:['KeyU'], hk:['KeyI'], sp:['KeyL'], sup:['Semicolon'] },
  p2: { left:['ArrowLeft'], right:['ArrowRight'], up:['ArrowUp'], down:['ArrowDown'], lp:['Comma','Numpad1'], hp:['Period','Numpad2'], lk:['KeyN','Numpad4'], hk:['KeyM','Numpad5'], sp:['Slash','Numpad3'], sup:['ShiftRight','Numpad6','Numpad0'] },
};
const keys = {}; const keyEdges = [];
window.addEventListener('keydown', e => {
  if (!keys[e.code]) keyEdges.push(e.code); keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  AudioSys.init(); AudioSys.resume();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('mousedown', () => { AudioSys.init(); AudioSys.resume(); });
function readPad(idx) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; const gp = pads && pads[idx]; if (!gp) return null;
  const b = i => gp.buttons[i] && gp.buttons[i].pressed; const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  return { left: b(14) || ax < -0.5, right: b(15) || ax > 0.5, up: b(12) || ay < -0.5, down: b(13) || ay > 0.5, lp: b(2), hp: b(3), lk: b(0), hk: b(1), sp: b(4) || b(6), sup: b(5) || b(7) };
}
function readInput(who) {
  const map = KEYMAP[who], inp = emptyInput();
  for (const k in map) inp[k] = map[k].some(c => keys[c]);
  const pad = readPad(who === 'p1' ? 0 : 1); if (pad) for (const k in inp) inp[k] = inp[k] || pad[k];
  return inp;
}
let menuEdgeQueue = [];
function menuKeys() { // generic nav edges, consumed by screens
  const out = { up:false, down:false, left:false, right:false, ok:false, back:false, rnd:false, p2ok:false, p2up:false, p2down:false, p2left:false, p2right:false, p2back:false, any:false };
  for (const c of keyEdges) {
    out.any = true;
    if (['KeyW'].includes(c)) out.up = true; if (['KeyS'].includes(c)) out.down = true; if (['KeyA'].includes(c)) out.left = true; if (['KeyD'].includes(c)) out.right = true;
    if (['ArrowUp'].includes(c)) { out.up = true; out.p2up = true; } if (['ArrowDown'].includes(c)) { out.down = true; out.p2down = true; } if (['ArrowLeft'].includes(c)) { out.left = true; out.p2left = true; } if (['ArrowRight'].includes(c)) { out.right = true; out.p2right = true; }
    if (['Enter','Space','KeyJ','KeyK','KeyL'].includes(c)) out.ok = true;
    if (['Comma','Period','Numpad1','Numpad2','ShiftRight'].includes(c)) { out.p2ok = true; }
    if (['Escape','Backspace'].includes(c)) out.back = true; if (['KeyN','KeyM','Numpad4','Numpad5'].includes(c)) out.p2back = true;
    if (c === 'KeyR') out.rnd = true;
  }
  return out;
}
const padPrev = [{}, {}];
function padEdges(idx) {
  const p = readPad(idx), prev = padPrev[idx], out = {}; if (!p) return out;
  for (const k in p) { out[k] = p[k] && !prev[k]; prev[k] = p[k]; } return out;
}

// ---------- Game ----------
const SAVE_KEY = 'ifl_save';
const Game = {
  screen: 'title', t: 0, fade: 1, fadeDir: -1, nextScreen: null, sel: 0, msg: [], shake: 0, particles: [], projectiles: [], afterimages: [],
  opts: { rounds: 2, time: 99, diff: 5 }, save: { arcadeWins: 0, cleared: [], best: null },
  mode: 'arcade', p1: null, p2: null, f1: null, f2: null, ai: null, ai1: null, stage: null, phase: 'intro', timeScale: 1, hitstop: 0, zoom: 1, camX: STAGE_W / 2, timer: 99, round: 1, sub: 0, roundMsg: '', roundMsgT: 0, flash: 0, superT: 0, superWho: null,
  arcade: null, cursor: [0, 0], selStage: 0, paused: false, pauseSel: 0, galleryIdx: 0, galleryF: null,
  init() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) Object.assign(this.save, s); const o = JSON.parse(localStorage.getItem('ifl_opts') || 'null'); if (o) Object.assign(this.opts, o); } catch (e) {}
    requestAnimationFrame(ts => this.loop(ts));
  },
  persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); localStorage.setItem('ifl_opts', JSON.stringify(this.opts)); } catch (e) {} },
  go(screen) { this.nextScreen = screen; this.fadeDir = 1; },
  lastTs: 0, acc: 0,
  loop(ts) {
    const dt = Math.min(0.1, (ts - this.lastTs) / 1000 || 0); this.lastTs = ts;
    this.acc += dt * this.timeScale; let steps = 0;
    while (this.acc >= 1 / 60 && steps < 4) { this.acc -= 1 / 60; this.step(); steps++; keyEdges.length = 0; }
    if (steps === 0) keyEdges.length = 0;
    this.draw();
    requestAnimationFrame(ts2 => this.loop(ts2));
  },
  step() {
    this.t++;
    // fade
    if (this.fadeDir === 1) { this.fade = Math.min(1, this.fade + 0.08); if (this.fade >= 1) { this.screen = this.nextScreen; this.fadeDir = -1; this.enter(this.screen); } }
    else if (this.fadeDir === -1) { this.fade = Math.max(0, this.fade - 0.06); if (this.fade <= 0) this.fadeDir = 0; }
    if (this.fadeDir === 1) return;
    const nav = menuKeys();
    const pe = padEdges(0), pe2 = padEdges(1);
    if (pe.up) nav.up = true; if (pe.down) nav.down = true; if (pe.left) nav.left = true; if (pe.right) nav.right = true; if (pe.lp || pe.lk || pe.sup) nav.ok = true; if (pe.hp || pe.hk) nav.back = true;
    if (pe2.up) nav.p2up = true; if (pe2.down) nav.p2down = true; if (pe2.left) nav.p2left = true; if (pe2.right) nav.p2right = true; if (pe2.lp || pe2.lk) nav.p2ok = true; if (pe2.hp || pe2.hk) nav.p2back = true;
    if (nav.any || pe.up || pe.lp || pe2.lp) { AudioSys.init(); }
    switch (this.screen) {
      case 'title': if (nav.ok || pe.lp) { AudioSys.sfx('confirm'); this.go('menu'); } if (AudioSys.ctx && this.screen === 'title') AudioSys.playMusic('menu'); break;
      case 'menu': this.stepMenu(nav); break;
      case 'select': this.stepSelect(nav); break;
      case 'stageselect': this.stepStageSelect(nav); break;
      case 'ladder': if (nav.ok) { AudioSys.sfx('confirm'); this.startFight(); } if (nav.back) { AudioSys.sfx('back'); this.go('menu'); } break;
      case 'fight': this.stepFight(nav); break;
      case 'result': this.stepResult(nav); break;
      case 'gallery': this.stepGallery(nav); break;
      case 'options': this.stepOptions(nav); break;
      case 'controls': if (nav.ok || nav.back) { AudioSys.sfx('back'); this.go('menu'); } break;
      case 'victory': case 'gameover': if (nav.ok || nav.back) { AudioSys.sfx('confirm'); this.go('menu'); } break;
    }
  },
  enter(screen) {
    this.sel = 0;
    if (screen === 'menu' || screen === 'title' || screen === 'gallery' || screen === 'options' || screen === 'controls') { if (AudioSys.ctx) AudioSys.playMusic('menu'); }
    if (screen === 'fight') this.setupFight();
    if (screen === 'victory') { AudioSys.playMusic('victory'); AudioSys.announce('You are the champion!'); }
    if (screen === 'gameover') { AudioSys.playMusic('gameover'); AudioSys.announce('Game over'); }
    if (screen === 'gallery') { this.galleryF = new Fighter(PLAYABLE[this.galleryIdx], 0, 1, true); }
    if (screen === 'select') { this.cursor = [0, 0]; this.cursor2 = [4, 3]; this.p1 = null; this.p2 = null; this.selPhase = 1; }
  },

  // ---------- Menu ----------
  menuItems: [
    { label: 'ARCADE', sub: 'Fight through 7 warriors and face the Iron Ogre', act: 'arcade' },
    { label: 'VERSUS CPU', sub: 'One-on-one against the computer', act: 'vscpu' },
    { label: 'VERSUS 2P', sub: 'Local two-player battle on one keyboard', act: 'vs2p' },
    { label: 'FIGHTERS', sub: 'Browse the 20 fighting styles and their moves', act: 'gallery' },
    { label: 'CONTROLS', sub: 'Keyboard and gamepad layout', act: 'controls' },
    { label: 'OPTIONS', sub: 'Audio, rounds, difficulty', act: 'options' },
    { label: 'ONLINE MATCH', sub: 'Coming soon - ranked and private rooms', act: null },
    { label: 'CREATE FIGHTER', sub: 'Coming soon - upload your photo and pick a style', act: null },
  ],
  stepMenu(nav) {
    if (nav.up) { this.sel = (this.sel + this.menuItems.length - 1) % this.menuItems.length; AudioSys.sfx('move'); }
    if (nav.down) { this.sel = (this.sel + 1) % this.menuItems.length; AudioSys.sfx('move'); }
    if (nav.ok) {
      const it = this.menuItems[this.sel]; if (!it.act) { AudioSys.sfx('back'); return; }
      AudioSys.sfx('confirm');
      if (it.act === 'arcade' || it.act === 'vscpu' || it.act === 'vs2p') { this.mode = it.act; this.go('select'); }
      else this.go(it.act);
    }
  },

  // ---------- Character select ----------
  stepSelect(nav) {
    const cols = 5, rows = 4;
    const moveCur = (c, up, down, left, right) => { if (up) c[1] = (c[1] + rows - 1) % rows; if (down) c[1] = (c[1] + 1) % rows; if (left) c[0] = (c[0] + cols - 1) % cols; if (right) c[0] = (c[0] + 1) % cols; if (up || down || left || right) AudioSys.sfx('move'); };
    if (nav.back && this.selPhase === 1) { AudioSys.sfx('back'); this.go('menu'); return; }
    if (this.mode === 'vs2p') {
      if (!this.p1) { moveCur(this.cursor, nav.up && !nav.p2up, nav.down && !nav.p2down, nav.left && !nav.p2left, nav.right && !nav.p2right); if (nav.ok) { this.p1 = PLAYABLE[this.cursor[1] * cols + this.cursor[0]]; AudioSys.sfx('confirm'); AudioSys.say(this.p1.quotes.intro, this.p1.voice.sp, this.p1.voice.rate); } }
      if (!this.p2) { moveCur(this.cursor2, nav.p2up, nav.p2down, nav.p2left, nav.p2right); if (nav.p2ok) { this.p2 = PLAYABLE[this.cursor2[1] * cols + this.cursor2[0]]; AudioSys.sfx('confirm'); AudioSys.say(this.p2.quotes.intro, this.p2.voice.sp, this.p2.voice.rate); } }
      if (this.p1 && nav.back) { this.p1 = null; AudioSys.sfx('back'); }
      if (this.p2 && nav.p2back) { this.p2 = null; AudioSys.sfx('back'); }
      if (this.p1 && this.p2) { this.selStage = 0; this.go('stageselect'); }
    } else {
      const cur = this.selPhase === 1 ? this.cursor : this.cursor2;
      moveCur(cur, nav.up, nav.down, nav.left, nav.right);
      if (nav.rnd) { cur[0] = Math.floor(Math.random() * cols); cur[1] = Math.floor(Math.random() * rows); AudioSys.sfx('move'); }
      if (nav.ok) {
        const ch = PLAYABLE[cur[1] * cols + cur[0]]; AudioSys.sfx('confirm');
        if (this.selPhase === 1) { this.p1 = ch; AudioSys.say(ch.quotes.intro, ch.voice.sp, ch.voice.rate);
          if (this.mode === 'arcade') { this.buildArcade(); this.go('ladder'); } else { this.selPhase = 2; this.cursor2 = [cur[0], cur[1]]; }
        } else { this.p2 = ch; this.selStage = 0; this.go('stageselect'); }
      }
      if (nav.back && this.selPhase === 2) { this.selPhase = 1; this.p1 = null; AudioSys.sfx('back'); }
    }
  },
  stepStageSelect(nav) {
    const n = STAGES.length;
    if (nav.left || nav.p2left) { this.selStage = (this.selStage + n - 1) % n; AudioSys.sfx('move'); }
    if (nav.right || nav.p2right) { this.selStage = (this.selStage + 1) % n; AudioSys.sfx('move'); }
    if (nav.up || nav.down) { this.selStage = (this.selStage + 4) % n; AudioSys.sfx('move'); }
    if (nav.ok || nav.p2ok) { this.stage = STAGES[this.selStage]; AudioSys.sfx('confirm'); this.arcade = null; this.startFight(); }
    if (nav.back) { AudioSys.sfx('back'); this.go('select'); }
  },
  buildArcade() {
    const pool = PLAYABLE.filter(c => c.id !== this.p1.id).sort(() => Math.random() - 0.5).slice(0, 7);
    const stages = STAGES.filter(s => !s.boss).sort(() => Math.random() - 0.5);
    const ladder = pool.map((c, i) => ({ ch: c, stage: stages[i % stages.length], diff: [1, 2, 3, 4, 5, 6, 8][i] }));
    ladder.push({ ch: BOSS, stage: STAGES.find(s => s.boss), diff: 9, boss: true });
    this.arcade = { ladder, idx: 0, continues: 0, startT: Date.now() };
  },
  startFight() {
    if (this.arcade) { const e = this.arcade.ladder[this.arcade.idx]; this.p2 = e.ch; this.stage = e.stage; }
    this.go('fight');
  },

  // ---------- Fight ----------
  setupFight() {
    const bossMult = this.arcade && this.arcade.ladder[this.arcade.idx].boss ? 1.15 : 1;
    this.f1 = new Fighter(this.p1, STAGE_W / 2 - 220, 1, true);
    this.f2 = new Fighter(this.p2, STAGE_W / 2 + 220, -1, false, bossMult);
    const diff = this.arcade ? this.arcade.ladder[this.arcade.idx].diff : this.opts.diff;
    this.ai = this.mode === 'vs2p' ? null : new AI(diff);
    this.round = 1; this.f1.roundsWon = 0; this.f2.roundsWon = 0; this.paused = false;
    this.projectiles = []; this.particles = []; this.afterimages = [];
    this.startRound();
    AudioSys.playMusic(this.stage.music);
  },
  startRound() {
    const f1 = this.f1, f2 = this.f2;
    for (const f of [f1, f2]) { f.hp = f.maxHp; f.state = 'idle'; f.move = null; f.y = 0; f.vx = 0; f.vy = 0; f.airborne = false; f.hitstun = 0; f.comboHits = 0; f.tookDamage = false; f.grabbed = null; f.invul = 0; f.meter = Math.min(f.meter, 100); }
    f1.x = STAGE_W / 2 - 220; f2.x = STAGE_W / 2 + 220; f1.facing = 1; f2.facing = -1;
    this.projectiles = []; this.timer = this.opts.time; this.phase = 'intro'; this.sub = 0; this.timeScale = 1; this.hitstop = 0; this.winner = null;
    this.roundMsg = ''; this.roundMsgT = 0;
    if (this.round === 1) { AudioSys.say(this.p1.quotes.intro, this.p1.voice.sp, this.p1.voice.rate); setTimeout(() => AudioSys.say(this.p2.quotes.intro, this.p2.voice.sp, this.p2.voice.rate), 1600); }
  },
  showMsg(s, t) { this.roundMsg = s; this.roundMsgT = t; },
  stepFight(nav) {
    if (nav.back && this.phase !== 'ko' && this.phase !== 'end') { this.paused = !this.paused; this.pauseSel = 0; AudioSys.sfx(this.paused ? 'back' : 'confirm'); }
    if (this.paused) {
      if (nav.up) { this.pauseSel = (this.pauseSel + 2) % 3; AudioSys.sfx('move'); } if (nav.down) { this.pauseSel = (this.pauseSel + 1) % 3; AudioSys.sfx('move'); }
      if (nav.ok) { AudioSys.sfx('confirm'); if (this.pauseSel === 0) this.paused = false; else if (this.pauseSel === 1) { this.paused = false; this.setupFight(); } else { this.paused = false; this.arcade = null; this.go('menu'); } }
      return;
    }
    this.sub++;
    const f1 = this.f1, f2 = this.f2;
    // phase logic
    if (this.phase === 'intro') {
      if (this.sub === 1) this.showMsg(this.stage.name, 100);
      if (this.sub === 120) { this.showMsg('ROUND ' + this.round, 70); AudioSys.announce(this.round === 3 ? 'Final round' : 'Round ' + this.round); AudioSys.sfx('round'); }
      if (this.sub === 200) { this.showMsg('FIGHT!', 45); AudioSys.announce('Fight!'); this.phase = 'active'; this.sub = 0; }
    } else if (this.phase === 'active') {
      if (this.sub % 60 === 0 && this.timer > 0) { this.timer--; }
      if (this.timer <= 0) { this.endRound(f1.hp === f2.hp ? null : (f1.hp > f2.hp ? f1 : f2), 'TIME OVER'); }
    } else if (this.phase === 'ko') {
      if (this.sub === 60) { this.timeScale = 1; }
      if (this.sub >= 60) {
        const w = this.winner; if (w && w.free()) { w.state = 'win'; if (this.sub === 62) { AudioSys.grunt(w.ch.voice, 'win'); } }
        const l = w === f1 ? f2 : f1; if (l.state !== 'down' && !l.airborne && l.hp <= 0) l.state = 'lose';
      }
      if (this.sub === 90 && this.winner) { this.showMsg((this.winner.isP1 ? this.p1.name : this.p2.name).toUpperCase() + ' WINS', 90); AudioSys.announce((this.winner.isP1 ? 'Player one' : (this.mode === 'vs2p' ? 'Player two' : this.winner.ch.name.split(' ')[0])) + ' wins' + (this.winner.tookDamage ? '' : '. Perfect!')); }
      if (this.sub === 180) this.afterRound();
    }
    // inputs
    const inp1 = readInput('p1');
    const inp2 = this.ai ? this.ai.think(f2, f1, this) : readInput('p2');
    f1.setInput(inp1); f2.setInput(inp2);
    if (this.hitstop > 0) { this.hitstop--; }
    else {
      f1.update(f2, this); f2.update(f1, this);
      this.separate(f1, f2);
      for (const p of this.projectiles) { p.update(); this.projHit(p); }
      for (const p of this.projectiles) for (const q of this.projectiles) if (p !== q && p.owner !== q.owner && !p.dead && !q.dead && this.overlap(p.box(), q.box())) { p.dead = q.dead = true; this.hitFx(p.x, p.y, '#fff', true); AudioSys.sfx('projhit'); }
      this.projectiles = this.projectiles.filter(p => !p.dead);
      if (this.phase === 'active') { if (f1.hp <= 0) this.endRound(f2, 'K.O.'); else if (f2.hp <= 0) this.endRound(f1, 'K.O.'); }
    }
    // camera
    const mid = (f1.x + f2.x) / 2, dist = Math.abs(f1.x - f2.x);
    const tz = clamp(1.22 - dist / 1500, 0.92, 1.18); this.zoom += (tz - this.zoom) * 0.08;
    const half = W / 2 / this.zoom; this.camX += (clamp(mid, half - 40, STAGE_W - half + 40) - this.camX) * 0.12;
    // effects
    if (this.shake > 0) this.shake *= 0.85; if (this.shake < 0.5) this.shake = 0;
    if (this.flash > 0) this.flash -= 0.06;
    if (this.superT > 0) this.superT--;
    for (const p of this.particles) { p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.life--; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const a of this.afterimages) a.life--; this.afterimages = this.afterimages.filter(a => a.life > 0);
    if (this.roundMsgT > 0) this.roundMsgT--;
  },
  endRound(winner, why) {
    this.phase = 'ko'; this.sub = 0; this.winner = winner; this.showMsg(why, 80);
    if (why === 'K.O.') { AudioSys.sfx('ko'); AudioSys.announce('K O'); this.timeScale = 0.35; this.shake = 20; this.flash = 1; } else { AudioSys.sfx('timeout'); AudioSys.announce('Time over'); }
    if (winner) winner.roundsWon++;
    const loser = winner === this.f1 ? this.f2 : this.f1; if (winner && loser.hp <= 0) AudioSys.grunt(loser.ch.voice, 'ko');
    for (const f of [this.f1, this.f2]) if (f.state === 'attack' && f.move && f.move.type !== 'grab') { /* let it finish */ }
  },
  afterRound() {
    const f1 = this.f1, f2 = this.f2, need = this.opts.rounds;
    if (f1.roundsWon >= need || f2.roundsWon >= need || this.round >= need * 2 - 1) { this.matchWinner = f1.roundsWon >= f2.roundsWon ? f1 : f2; this.phase = 'end'; this.go('result'); }
    else { this.round++; this.startRound(); }
  },
  stepResult(nav) {
    if (this.resultT == null) this.resultT = 0; this.resultT++;
    if (this.resultT === 5) { const w = this.matchWinner.ch; AudioSys.say(w.quotes.win, w.voice.sp, w.voice.rate); }
    if (nav.ok && this.resultT > 40) {
      AudioSys.sfx('confirm'); this.resultT = null;
      if (this.arcade) {
        if (this.matchWinner === this.f1) {
          this.arcade.idx++;
          if (this.arcade.idx >= this.arcade.ladder.length) { this.save.arcadeWins++; if (!this.save.cleared.includes(this.p1.id)) this.save.cleared.push(this.p1.id); const tm = Math.round((Date.now() - this.arcade.startT) / 1000); if (!this.save.best || tm < this.save.best) this.save.best = tm; this.persist(); this.arcade = null; this.go('victory'); }
          else this.go('ladder');
        } else { this.arcade.continues++; if (this.arcade.continues > 3) { this.arcade = null; this.go('gameover'); } else this.go('ladder'); }
      } else this.go('select');
    }
    if (nav.back && this.resultT > 40) { this.resultT = null; this.arcade = null; this.go('menu'); }
  },

  // ---------- Combat helpers ----------
  overlap(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; },
  separate(a, b) {
    if (a.state === 'grabbed' || b.state === 'grabbed' || a.state === 'down' || b.state === 'down') return;
    const minD = (a.w + b.w) / 2, dx = b.x - a.x;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 150) {
      const push = (minD - Math.abs(dx)) / 2, dir = dx >= 0 ? 1 : -1;
      a.x -= push * dir; b.x += push * dir;
      a.x = clamp(a.x, a.w / 2, STAGE_W - a.w / 2); b.x = clamp(b.x, b.w / 2, STAGE_W - b.w / 2);
      if (Math.abs(b.x - a.x) < minD - 1) { if (a.x <= a.w / 2 + 1) b.x = a.x + minD; else if (b.x >= STAGE_W - b.w / 2 - 1) a.x = b.x - minD; }
    }
  },
  canBlock(def, m) {
    if (m.type === 'grab') return false;
    if (def.airborne || def.state === 'attack' || def.state === 'hit' || def.state === 'throwing' || def.state === 'grabbed') return def.state === 'block';
    if (!def.back()) return false;
    if (m.lvl === 'low' && !def.inp.down) return false;
    if (m.lvl === 'over' && def.inp.down) return false;
    return true;
  },
  resolveHit(att, def, m) {
    // counter check
    if (def.state === 'attack' && def.move && def.move.type === 'counter' && def.mf > def.move.startup && def.mf <= def.move.startup + def.move.active && m.type !== 'projectile' && !m.projectile) {
      const cm = def.move; def.state = 'attack'; def.mf = cm.startup + cm.active; def.move = Object.assign({}, cm, { anim: 'palm', recovery: 18 });
      att.state = 'hit'; att.hitstun = cm.hitstun; att.knockdown = true; att.airborne = true; att.vy = -9; att.vx = def.facing * cm.kb; att.move = null; att.comboHits = 1;
      def.applyDamage(att, cm, this, false); att.flashT = 6; def.counterFlash = 0;
      this.hitFx(att.x, att.feetY - 100, def.style.fx, true); AudioSys.sfx('counter'); AudioSys.sfx('hitheavy'); AudioSys.grunt(def.ch.voice, 'special'); AudioSys.grunt(att.ch.voice, 'hurt'); this.shake = 12; this.hitstop = 8; this.showMsg('COUNTER!', 40);
      return;
    }
    const blocked = this.canBlock(def, m);
    const dir = att.facing;
    if (blocked) {
      def.state = 'block'; def.hitstun = m.blockstun; def.crouching = !!def.inp.down; def.vx = dir * m.kb * 0.6; att.vx = -dir * 2;
      att.applyDamage(def, m, this, true);
      this.hitFx(def.x - dir * 20, def.feetY - 110 * def.ch.body.h + (m.lvl === 'low' ? 60 : 0), '#7fb0ff', false); AudioSys.sfx('block'); this.hitstop = 3;
      if (def.hp <= 0) def.hp = 0.5; // no chip kills
    } else {
      const wasHit = def.state === 'hit';
      const dmg = att.applyDamage(def, m, this, false);
      def.state = 'hit'; def.hitstun = m.hitstun + (m.type === 'super' ? 6 : 0); def.crouching = def.inp.down && !def.airborne && !m.launch; def.move = null; def.grabbed = null;
      def.vx = dir * m.kb; def.flashT = 5;
      if (m.launch || (def.airborne && m.type !== 'super')) { def.airborne = true; def.vy = -(m.launch || 7); def.knockdown = true; def.y = Math.max(def.y, 1); }
      const lastHit = !m.hits || att.hitsDone >= m.hits - 1;
      if (m.knockdown && lastHit) { def.knockdown = true; if (!def.airborne) { def.airborne = true; def.vy = -6; def.y = 1; } }
      def.comboHits = wasHit || def.airborne ? def.comboHits + 1 : 1; def.comboDmg = wasHit ? def.comboDmg + dmg : dmg;
      const heavy = dmg >= 10 || m.knockdown || m.launch;
      this.hitFx(def.x - dir * 10, def.feetY - 110 * def.ch.body.h + (m.lvl === 'low' ? 60 : m.lvl === 'over' ? -40 : 0), att.style.fx, heavy);
      AudioSys.sfx(heavy ? 'hitheavy' : 'hit'); AudioSys.grunt(def.ch.voice, 'hurt');
      this.shake = heavy ? 10 : 4; this.hitstop = heavy ? 7 : 4;
      if (def.comboHits >= 2) { this.combo = { n: def.comboHits, dmg: def.comboDmg, side: def.isP1 ? 'right' : 'left', t: 70 }; }
    }
  },
  projHit(p) {
    if (p.dead) return; const def = p.owner === this.f1 ? this.f2 : this.f1;
    if (this.overlap(p.box(), def.hurtbox()) && def.invul <= 0 && def.state !== 'down' && def.state !== 'getup') {
      const m = Object.assign({}, p.m, { type: 'projectile', lvl: 'mid' });
      const blocked = this.canBlock(def, m);
      this.resolveHit(p.owner, def, m); p.dead = true; if (!blocked) AudioSys.sfx('projhit');
      this.hitFx(p.x, p.y, p.color, true);
    }
  },
  spawnProjectile(f, m, big) { this.projectiles.push(new Projectile(f, m, big)); AudioSys.sfx('proj'); },
  hitFx(x, y, color, heavy) {
    const n = heavy ? 18 : 9;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rnd(3, heavy ? 12 : 7); this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(8, 18), color, size: rnd(2, heavy ? 6 : 4), g: 0.3 }); }
    this.particles.push({ x, y, vx: 0, vy: 0, life: 8, color, ring: true, size: heavy ? 60 : 36 });
  },
  dust(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ x: x + rnd(-20, 20), y, vx: rnd(-3, 3), vy: rnd(-3, -0.5), life: rnd(10, 25), color: '#c8b89a', size: rnd(3, 7), g: 0.05 }); },
  afterimage(f) { this.afterimages.push({ ch: f.ch, pose: f.getPose(), x: f.x, y: f.feetY, facing: f.facing * (f.move && f.move.anim === 'spin' ? f.spinFlip : 1), life: 14, color: f.style.fx }); },
  superFlash(f) { this.flash = 1; this.superT = 40; this.superWho = f; this.shake = 8; this.hitstop = 14; AudioSys.grunt(f.ch.voice, 'special'); AudioSys.say(f.style.moves.sup.name, f.ch.voice.sp, f.ch.voice.rate * 1.1); },

  // ---------- Gallery / options ----------
  stepGallery(nav) {
    if (nav.back) { AudioSys.sfx('back'); this.go('menu'); return; }
    let changed = false;
    if (nav.left) { this.galleryIdx = (this.galleryIdx + PLAYABLE.length - 1) % PLAYABLE.length; changed = true; }
    if (nav.right) { this.galleryIdx = (this.galleryIdx + 1) % PLAYABLE.length; changed = true; }
    if (changed) { AudioSys.sfx('move'); this.galleryF = new Fighter(PLAYABLE[this.galleryIdx], 0, 1, true); AudioSys.say(PLAYABLE[this.galleryIdx].quotes.intro, PLAYABLE[this.galleryIdx].voice.sp, PLAYABLE[this.galleryIdx].voice.rate); }
    const f = this.galleryF; f.t++;
    const inp = readInput('p1'); const dummy = { x: f.x + 300, facing: -1 }; f.setInput(inp);
    if (f.state === 'attack') { f.mf++; const m = f.move; if (f.mf >= m.startup + m.active + m.recovery) { f.state = 'idle'; f.move = null; f.crouchAttack = false; } if (m.anim === 'spin' && f.mf % 4 === 0) f.spinFlip *= -1; }
    else { for (const k of ['sup', 'sp', 'hp', 'hk', 'lp', 'lk']) if (f.pressed(k)) { f.meter = 100; f.startMove(k === 'sp' ? (inp.down ? 'sp2' : 'sp1') : k, dummy, this); break; } }
  },
  optItems() { return [
    { label: 'Music Volume', get: () => Math.round(AudioSys.opts.music * 10), set: d => { AudioSys.opts.music = clamp(AudioSys.opts.music + d * 0.1, 0, 1); AudioSys.applyOpts(); } },
    { label: 'SFX Volume', get: () => Math.round(AudioSys.opts.sfx * 10), set: d => { AudioSys.opts.sfx = clamp(AudioSys.opts.sfx + d * 0.1, 0, 1); AudioSys.applyOpts(); } },
    { label: 'Voices & Announcer', get: () => AudioSys.opts.voices ? 'ON' : 'OFF', set: () => { AudioSys.opts.voices = !AudioSys.opts.voices; AudioSys.applyOpts(); } },
    { label: 'Rounds To Win', get: () => this.opts.rounds, set: d => { this.opts.rounds = clamp(this.opts.rounds + d, 1, 3); this.persist(); } },
    { label: 'Round Time', get: () => this.opts.time, set: d => { this.opts.time = clamp(this.opts.time + d * 30, 30, 150); this.persist(); } },
    { label: 'CPU Difficulty (Versus)', get: () => this.opts.diff, set: d => { this.opts.diff = clamp(this.opts.diff + d, 1, 10); this.persist(); } },
    { label: 'Reset Arcade Records', get: () => this.save.arcadeWins + ' wins', set: () => { this.save = { arcadeWins: 0, cleared: [], best: null }; this.persist(); } },
  ]; },
  stepOptions(nav) {
    const items = this.optItems();
    if (nav.up) { this.sel = (this.sel + items.length - 1) % items.length; AudioSys.sfx('move'); }
    if (nav.down) { this.sel = (this.sel + 1) % items.length; AudioSys.sfx('move'); }
    if (nav.left) { items[this.sel].set(-1); AudioSys.sfx('move'); } if (nav.right || nav.ok) { items[this.sel].set(1); AudioSys.sfx('move'); }
    if (nav.back) { AudioSys.sfx('back'); this.go('menu'); }
  },

  // ---------- Drawing ----------
  draw() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    switch (this.screen) {
      case 'title': this.drawTitle(); break;
      case 'menu': this.drawMenu(); break;
      case 'select': this.drawSelect(); break;
      case 'stageselect': this.drawStageSelect(); break;
      case 'ladder': this.drawLadder(); break;
      case 'fight': this.drawFight(); break;
      case 'result': this.drawFight(); this.drawResult(); break;
      case 'gallery': this.drawGallery(); break;
      case 'options': this.drawOptions(); break;
      case 'controls': this.drawControls(); break;
      case 'victory': this.drawVictory(); break;
      case 'gameover': this.drawGameOver(); break;
    }
    if (this.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  },
  bgMenu(st) {
    const s = st || STAGES[Math.floor(this.t / 900) % STAGES.length];
    drawStageBG(ctx, s, STAGE_W / 2 + Math.sin(this.t / 400) * 200, this.t, 1);
    ctx.save(); ctx.translate(-(STAGE_W / 2 - W / 2), 0); drawStageFloor(ctx, s); ctx.restore(); drawAmbient(ctx, s, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  },
  logo(y, size) {
    txt(ctx, 'IRON FIST', W / 2, y, size || 96, '#ffb020', 'center', { stroke: '#3a1000', strokeW: 8, shadow: '#ff6000', blur: 30 });
    txt(ctx, 'LEGENDS', W / 2, y + (size || 96) * 0.8, (size || 96) * 0.65, '#fff', 'center', { stroke: '#000', strokeW: 6, shadow: '#ff2020', blur: 20 });
  },
  drawTitle() {
    this.bgMenu();
    // showcase two fighters
    const a = PLAYABLE[Math.floor(this.t / 300) % PLAYABLE.length], b = PLAYABLE[(Math.floor(this.t / 300) + 7) % PLAYABLE.length];
    const bob = Math.sin(this.t / 14) * 2;
    drawFighter(ctx, a, mergePose(P.idle, { hy: bob }), 300, 640, 1, 1.3); drawFighter(ctx, b, mergePose(P.idle, { hy: -bob }), 980, 640, -1, 1.3);
    this.logo(230, 120);
    if (Math.floor(this.t / 30) % 2 === 0) txt(ctx, 'PRESS ENTER', W / 2, 520, 34, '#fff', 'center', { stroke: '#000' });
    txt(ctx, '20 FIGHTING STYLES  ·  8 ARENAS  ·  ARCADE & VERSUS', W / 2, 580, 20, '#ddd', 'center', { font: 'Arial', weight: 'bold' });
    txt(ctx, 'Procedural rock soundtrack - turn your sound on', W / 2, 610, 16, '#aaa', 'center', { font: 'Arial' });
  },
  drawMenu() {
    this.bgMenu(); this.logo(110, 64);
    const x0 = 120, y0 = 250;
    this.menuItems.forEach((it, i) => {
      const y = y0 + i * 54, on = i === this.sel, dis = !it.act;
      if (on) { roundRect(ctx, x0 - 20, y - 22, 560, 46, 8, 'rgba(255,120,0,0.25)', '#ffb020', 2); }
      txt(ctx, it.label, x0, y, 30, dis ? '#666' : on ? '#ffd060' : '#fff', 'left', { stroke: '#000' });
      if (on) txt(ctx, it.sub, x0 + 300, y + 2, 16, '#ddd', 'left', { font: 'Arial' });
    });
    const ch = PLAYABLE[Math.floor(this.t / 240) % PLAYABLE.length];
    drawFighter(ctx, ch, mergePose(P.idle, { hy: Math.sin(this.t / 14) * 2 }), 1000, 620, -1, 1.4);
    txt(ctx, ch.name, 1000, 660, 22, '#ffd060', 'center', { stroke: '#000' }); txt(ctx, STYLES[ch.style].name, 1000, 688, 16, '#ddd', 'center', { font: 'Arial' });
    txt(ctx, `Arcade cleared: ${this.save.arcadeWins}x${this.save.best ? '  ·  best time ' + this.save.best + 's' : ''}`, 120, 700, 15, '#aaa', 'left', { font: 'Arial' });
  },
  drawSelect() {
    this.bgMenu();
    txt(ctx, this.mode === 'arcade' ? 'ARCADE - CHOOSE YOUR FIGHTER' : this.mode === 'vs2p' ? 'VERSUS - CHOOSE YOUR FIGHTERS' : (this.selPhase === 1 ? 'CHOOSE YOUR FIGHTER' : 'CHOOSE CPU OPPONENT'), W / 2, 40, 34, '#ffb020', 'center', { stroke: '#000' });
    const cols = 5, cw = 118, chh = 88, gx = W / 2 - cols * cw / 2, gy = 80;
    PLAYABLE.forEach((ch, i) => {
      const cx = gx + (i % cols) * cw, cy = gy + Math.floor(i / cols) * chh;
      drawPortrait(ctx, ch, cx + 4, cy + 4, cw - 8, chh - 8, '#101018');
      const c1 = this.cursor[1] * cols + this.cursor[0] === i, c2 = (this.mode !== 'arcade') && this.cursor2 && (this.cursor2[1] * cols + this.cursor2[0] === i) && (this.mode === 'vs2p' || this.selPhase === 2);
      if (c1) roundRect(ctx, cx + 2, cy + 2, cw - 4, chh - 4, 6, null, '#ff4040', 4);
      if (c2) roundRect(ctx, cx + 6, cy + 6, cw - 12, chh - 12, 6, null, '#4080ff', 4);
      if (this.p1 === ch) txt(ctx, 'P1', cx + 12, cy + 16, 16, '#ff4040', 'left', { stroke: '#000' });
      if (this.p2 === ch) txt(ctx, this.mode === 'vs2p' ? 'P2' : 'CPU', cx + cw - 12, cy + 16, 16, '#4080ff', 'right', { stroke: '#000' });
    });
    const show = (cur, x, facing, color, label) => {
      const ch = PLAYABLE[cur[1] * cols + cur[0]], st = STYLES[ch.style];
      drawFighter(ctx, ch, mergePose(P.idle, { hy: Math.sin(this.t / 14) * 2 }), x, 640, facing, 1.1);
      const tx = facing > 0 ? 30 : W - 30, al = facing > 0 ? 'left' : 'right';
      txt(ctx, label, tx, 460, 18, color, al, { stroke: '#000' });
      txt(ctx, ch.name, tx, 492, 26, '#fff', al, { stroke: '#000' });
      txt(ctx, st.name + '  ·  ' + ch.country, tx, 520, 18, '#ffd060', al, { font: 'Arial', weight: 'bold' });
      const stats = [['SPD', st.stats.speed / 5.5], ['POW', st.stats.power / 1.3], ['DEF', 1.15 - st.stats.defense], ['HP', st.stats.hp / 130]];
      stats.forEach((s, i) => { const y = 548 + i * 22; txt(ctx, s[0], tx, y, 14, '#ccc', al, { font: 'Arial', weight: 'bold' }); const bx = facing > 0 ? tx + 40 : tx - 40 - 120; ctx.fillStyle = '#333'; ctx.fillRect(bx, y - 6, 120, 12); ctx.fillStyle = color; ctx.fillRect(facing > 0 ? bx : bx + 120 - 120 * clamp(s[1], 0.2, 1), y - 6, 120 * clamp(s[1], 0.2, 1), 12); });
      const desc = st.desc; ctx.font = '13px Arial'; ctx.fillStyle = '#ddd'; ctx.textAlign = al; wrapText(ctx, desc, tx, 660, 300, 16);
    };
    show(this.cursor, 250, 1, '#ff4040', 'PLAYER 1');
    if (this.mode === 'vs2p' || this.selPhase === 2) show(this.cursor2, W - 250, -1, '#4080ff', this.mode === 'vs2p' ? 'PLAYER 2' : 'CPU');
    txt(ctx, 'Move: WASD / Arrows   Confirm: Enter or J   Random: R   Back: Esc', W / 2, 700, 14, '#aaa', 'center', { font: 'Arial' });
  },
  drawStageSelect() {
    this.bgMenu(); txt(ctx, 'SELECT ARENA', W / 2, 50, 40, '#ffb020', 'center', { stroke: '#000' });
    const cols = 4, tw = 280, th = 158, gx = W / 2 - cols * tw / 2 - 10, gy = 110;
    STAGES.forEach((st, i) => {
      const x = gx + (i % cols) * (tw + 10), y = gy + Math.floor(i / cols) * (th + 50), on = i === this.selStage;
      ctx.drawImage(getStageThumb(st), x, y, tw, th);
      if (on) roundRect(ctx, x - 3, y - 3, tw + 6, th + 6, 4, null, '#ffb020', 4);
      txt(ctx, st.name, x + tw / 2, y + th + 20, 20, on ? '#ffd060' : '#fff', 'center', { stroke: '#000' });
    });
    txt(ctx, `${this.p1.name}  VS  ${this.p2.name}`, W / 2, 560, 26, '#fff', 'center', { stroke: '#000' });
    txt(ctx, 'Each arena has its own rock track', W / 2, 600, 15, '#aaa', 'center', { font: 'Arial' });
  },
  drawLadder() {
    const a = this.arcade; this.bgMenu(a.ladder[a.idx].stage);
    txt(ctx, 'ARCADE LADDER', W / 2, 50, 40, '#ffb020', 'center', { stroke: '#000' });
    a.ladder.forEach((e, i) => {
      const x = 90 + i * 140, y = 110, cur = i === a.idx, done = i < a.idx, hidden = e.boss && !cur && !done;
      roundRect(ctx, x, y, 120, 96, 6, done ? '#1a3a1a' : cur ? '#3a2a00' : '#111', cur ? '#ffb020' : '#444', cur ? 4 : 2);
      if (hidden) { txt(ctx, '???', x + 60, y + 48, 40, '#ff2050', 'center', { stroke: '#000' }); }
      else drawPortrait(ctx, e.ch, x + 4, y + 4, 112, 88, '#101018');
      if (done) txt(ctx, 'WIN', x + 60, y + 48, 30, '#40ff60', 'center', { stroke: '#000' });
      txt(ctx, hidden ? 'FINAL BOSS' : e.ch.name.split(' ')[0].toUpperCase(), x + 60, y + 116, 14, cur ? '#ffd060' : '#ccc', 'center', { font: 'Arial', weight: 'bold' });
      txt(ctx, 'LV ' + e.diff, x + 60, y + 134, 12, '#999', 'center', { font: 'Arial' });
    });
    const e = a.ladder[a.idx];
    drawFighter(ctx, this.p1, mergePose(P.idle, { hy: Math.sin(this.t / 14) * 2 }), 330, 640, 1, 1.3);
    drawFighter(ctx, e.ch, mergePose(P.idle, { hy: -Math.sin(this.t / 14) * 2 }), 950, 640, -1, 1.3 * (e.boss ? 1.05 : 1));
    txt(ctx, 'VS', W / 2, 430, 90, '#ff3030', 'center', { stroke: '#000', strokeW: 8 });
    txt(ctx, `STAGE ${a.idx + 1} / ${a.ladder.length}`, W / 2, 300, 26, '#fff', 'center', { stroke: '#000' });
    txt(ctx, e.ch.name, 950, 670, 24, '#fff', 'center', { stroke: '#000' }); txt(ctx, STYLES[e.ch.style].name + ' · ' + e.stage.name, 950, 696, 15, '#ffd060', 'center', { font: 'Arial', weight: 'bold' });
    txt(ctx, this.p1.name, 330, 670, 24, '#fff', 'center', { stroke: '#000' });
    ctx.font = '14px Arial'; ctx.fillStyle = '#ddd'; ctx.textAlign = 'center'; wrapText(ctx, e.ch.bio, W / 2, 520, 420, 18);
    txt(ctx, (a.continues ? `Continues used: ${a.continues}/3   ·   ` : '') + 'Press ENTER to fight', W / 2, 600, 18, '#fff', 'center', { stroke: '#000' });
  },
  drawFight() {
    const f1 = this.f1, f2 = this.f2, st = this.stage;
    drawStageBG(ctx, st, this.camX, this.t, this.zoom);
    ctx.save();
    const sx = this.shake ? rnd(-this.shake, this.shake) : 0, sy = this.shake ? rnd(-this.shake, this.shake) : 0;
    ctx.translate(W / 2 + sx, GROUND + sy); ctx.scale(this.zoom, this.zoom); ctx.translate(-this.camX, -GROUND);
    drawStageFloor(ctx, st);
    // shadows
    for (const f of [f1, f2]) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(f.x, GROUND + 4, 40 * f.ch.body.w * Math.max(0.4, 1 - f.y / 400), 9, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const a of this.afterimages) drawFighter(ctx, a.ch, a.pose, a.x, a.y, a.facing, null, { alpha: a.life / 28, flash: true });
    // fighters (draw the one in hitstun on top)
    const order = f1.state === 'hit' || f1.state === 'grabbed' ? [f2, f1] : [f1, f2];
    for (const f of order) {
      const pose = f.getPose(); const fc = f.facing * (pose.spin ? f.spinFlip : 1);
      const alpha = f.state === 'attack' && f.move && f.move.type === 'teleport' && f.mf < f.move.startup ? 0.3 : 1;
      drawFighter(ctx, f.ch, pose, f.x, f.feetY, fc, null, { flash: f.flashT > 0 && f.flashT % 2 === 0, alpha, aura: f.meter >= 100 ? f.style.fx : (f.counterFlash > 0 ? '#ffffff' : null) });
    }
    for (const p of this.projectiles) p.draw(ctx);
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / 10, 0, 1); ctx.fillStyle = p.color;
      if (p.ring) { ctx.strokeStyle = p.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - p.life / 8) + 6, 0, Math.PI * 2); ctx.stroke(); }
      else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    drawAmbient(ctx, st, this.t);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.8})`; ctx.fillRect(0, 0, W, H); }
    if (this.superT > 0 && this.superWho) { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, this.superT / 40)})`; ctx.fillRect(0, 0, W, H); txt(ctx, this.superWho.style.moves.sup.name.toUpperCase(), W / 2, H / 2, 70, this.superWho.style.fx, 'center', { stroke: '#000', strokeW: 8, shadow: this.superWho.style.fx, blur: 30 }); }
    this.drawHUD();
    if (this.roundMsgT > 0 && this.screen === 'fight') { const s = this.roundMsg === 'FIGHT!' ? 110 : this.roundMsg.length > 12 ? 60 : 90; const sc = 1 + Math.max(0, (this.roundMsgT - 35) / 60); ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(sc, sc); txt(ctx, this.roundMsg, 0, 0, s, this.roundMsg === 'K.O.' ? '#ff2020' : '#ffd040', 'center', { stroke: '#000', strokeW: 8, shadow: '#ff8000', blur: 25 }); ctx.restore(); }
    if (this.combo && this.combo.t > 0) { this.combo.t--; const x = this.combo.side === 'left' ? 120 : W - 120; txt(ctx, this.combo.n + ' HITS', x, 200, 44, '#ffd040', 'center', { stroke: '#000', strokeW: 5 }); txt(ctx, Math.round(this.combo.dmg) + ' DMG', x, 236, 20, '#fff', 'center', { stroke: '#000' }); }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H); txt(ctx, 'PAUSED', W / 2, 220, 70, '#ffb020', 'center', { stroke: '#000' });
      ['RESUME', 'RESTART MATCH', 'QUIT TO MENU'].forEach((s, i) => txt(ctx, s, W / 2, 330 + i * 54, 32, i === this.pauseSel ? '#ffd060' : '#fff', 'center', { stroke: '#000' }));
    }
  },
  drawHUD() {
    const f1 = this.f1, f2 = this.f2, bw = 470, bh = 26, y = 30;
    const bar = (f, x, dir) => {
      ctx.fillStyle = '#111'; ctx.fillRect(x, y, bw, bh);
      const pct = clamp(f.hp / f.maxHp, 0, 1); f.hpLag = f.hpLag == null ? pct : f.hpLag + (pct - f.hpLag) * 0.08;
      const wl = bw * f.hpLag, wp = bw * pct;
      ctx.fillStyle = '#c02020'; ctx.fillRect(dir > 0 ? x : x + bw - wl, y, wl, bh);
      const g = ctx.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, pct > 0.3 ? '#ffe066' : '#ff6060'); g.addColorStop(1, pct > 0.3 ? '#e0a020' : '#c02020'); ctx.fillStyle = g; ctx.fillRect(dir > 0 ? x : x + bw - wp, y, wp, bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(x, y, bw, bh);
      // meter
      ctx.fillStyle = '#111'; ctx.fillRect(dir > 0 ? x : x + bw - 200, y + bh + 8, 200, 10);
      ctx.fillStyle = f.meter >= 100 ? (Math.floor(this.t / 6) % 2 ? '#fff' : f.style.fx) : '#40a0ff'; const mw = 200 * clamp(f.meter / 100, 0, 1); ctx.fillRect(dir > 0 ? x : x + bw - mw, y + bh + 8, mw, 10);
      txt(ctx, f.ch.name.toUpperCase(), dir > 0 ? x + 4 : x + bw - 4, y + bh + 34, 20, '#fff', dir > 0 ? 'left' : 'right', { stroke: '#000' });
      // round dots
      for (let i = 0; i < this.opts.rounds; i++) { ctx.fillStyle = i < f.roundsWon ? '#ffd040' : '#333'; ctx.beginPath(); ctx.arc(dir > 0 ? x + bw - 14 - i * 26 : x + 14 + i * 26, y + bh + 40, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    };
    bar(f1, 60, 1); bar(f2, W - 60 - bw, -1);
    roundRect(ctx, W / 2 - 55, 18, 110, 60, 8, 'rgba(0,0,0,0.6)', '#fff', 2);
    txt(ctx, String(this.timer), W / 2, 50, 46, this.timer <= 10 ? '#ff4040' : '#fff', 'center', { stroke: '#000' });
    if (this.mode === 'vs2p') { txt(ctx, 'P1', 60, 20, 14, '#ff4040', 'left', { stroke: '#000', base: 'bottom' }); txt(ctx, 'P2', W - 60, 20, 14, '#4080ff', 'right', { stroke: '#000', base: 'bottom' }); }
    else if (this.ai) txt(ctx, 'CPU LV ' + this.ai.diff, W - 60, 20, 14, '#4080ff', 'right', { stroke: '#000', base: 'bottom' });
  },
  drawResult() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    const w = this.matchWinner, ch = w.ch;
    drawFighter(ctx, ch, mergePose(P.win, { aF: [172 + Math.sin(this.t / 6) * 6, -8] }), W / 2, 600, w.facing, 1.5);
    txt(ctx, (w.isP1 ? 'PLAYER 1' : (this.mode === 'vs2p' ? 'PLAYER 2' : 'CPU')) + ' WINS', W / 2, 120, 70, '#ffd040', 'center', { stroke: '#000', strokeW: 8, shadow: '#ff8000', blur: 30 });
    txt(ctx, ch.name, W / 2, 190, 34, '#fff', 'center', { stroke: '#000' });
    txt(ctx, '"' + ch.quotes.win + '"', W / 2, 235, 22, '#ffd060', 'center', { font: 'Georgia', weight: 'italic' });
    if (this.resultT > 40) txt(ctx, this.arcade ? (w === this.f1 ? 'ENTER - Next opponent' : 'ENTER - Continue   ·   ESC - Give up') : 'ENTER - Rematch / new fighters   ·   ESC - Menu', W / 2, 690, 18, '#fff', 'center', { stroke: '#000' });
  },
  drawGallery() {
    const ch = PLAYABLE[this.galleryIdx], st = STYLES[ch.style], f = this.galleryF; this.bgMenu();
    txt(ctx, 'FIGHTERS', W / 2, 40, 40, '#ffb020', 'center', { stroke: '#000' });
    txt(ctx, '<  ' + (this.galleryIdx + 1) + ' / ' + PLAYABLE.length + '  >', W / 2, 80, 18, '#ccc', 'center', { font: 'Arial' });
    const pose = f.getPose(); drawFighter(ctx, ch, pose, 380, 620, pose.spin ? f.spinFlip : 1, 1.6, { aura: f.state === 'attack' && f.move && f.move.type === 'super' ? st.fx : null });
    txt(ctx, ch.name, 700, 130, 38, '#fff', 'left', { stroke: '#000' });
    txt(ctx, st.name + '  ·  ' + ch.country, 700, 168, 20, '#ffd060', 'left', { font: 'Arial', weight: 'bold' });
    ctx.font = '15px Arial'; ctx.fillStyle = '#ddd'; ctx.textAlign = 'left'; wrapText(ctx, ch.bio + ' ' + st.desc, 700, 200, 520, 20);
    const stats = [['SPEED', st.stats.speed / 5.5], ['POWER', st.stats.power / 1.3], ['DEFENSE', 1.15 - st.stats.defense], ['HEALTH', st.stats.hp / 130], ['JUMP', st.stats.jump / 20]];
    stats.forEach((s, i) => { const y = 265 + i * 24; txt(ctx, s[0], 700, y, 14, '#ccc', 'left', { font: 'Arial', weight: 'bold' }); ctx.fillStyle = '#333'; ctx.fillRect(790, y - 7, 200, 14); ctx.fillStyle = st.fx; ctx.fillRect(790, y - 7, 200 * clamp(s[1], 0.2, 1), 14); });
    const moves = [['J', 'lp'], ['K', 'hp'], ['U', 'lk'], ['I', 'hk'], ['L', 'sp1'], ['S+L', 'sp2'], [';', 'sup']];
    moves.forEach((m, i) => { const mv = st.moves[m[1]], y = 400 + i * 30, on = f.move === mv; txt(ctx, m[0], 700, y, 18, '#ffb020', 'left', { stroke: '#000' }); txt(ctx, mv.name + (m[1] === 'sup' ? '  (SUPER)' : ''), 760, y, 18, on ? '#ffd060' : '#fff', 'left', { font: 'Arial', weight: 'bold' }); txt(ctx, `${mv.dmg}${mv.hits ? 'x' + mv.hits : ''} dmg · ${mv.lvl}${mv.type && mv.type !== 'normal' ? ' · ' + mv.type : ''}`, 1240, y, 13, '#aaa', 'right', { font: 'Arial' }); });
    txt(ctx, 'SUPER needs a full meter', 760, 620, 13, '#aaa', 'left', { font: 'Arial' });
    txt(ctx, 'A/D: browse   ·   Press the attack keys to preview moves   ·   Esc: back', W / 2, 690, 15, '#aaa', 'center', { font: 'Arial' });
  },
  drawOptions() {
    this.bgMenu(); txt(ctx, 'OPTIONS', W / 2, 60, 46, '#ffb020', 'center', { stroke: '#000' });
    this.optItems().forEach((it, i) => { const y = 170 + i * 56, on = i === this.sel; if (on) roundRect(ctx, 260, y - 24, 760, 48, 8, 'rgba(255,120,0,0.25)', '#ffb020', 2); txt(ctx, it.label, 290, y, 28, on ? '#ffd060' : '#fff', 'left', { stroke: '#000' }); txt(ctx, '<  ' + it.get() + '  >', 990, y, 28, '#fff', 'right', { stroke: '#000' }); });
    txt(ctx, 'Left/Right to change  ·  Esc to go back', W / 2, 640, 16, '#aaa', 'center', { font: 'Arial' });
  },
  drawControls() {
    this.bgMenu(); txt(ctx, 'CONTROLS', W / 2, 60, 46, '#ffb020', 'center', { stroke: '#000' });
    const rows = [['Move / Jump / Crouch', 'W A S D', 'Arrow keys'], ['Light Punch', 'J', ', (comma) / Numpad 1'], ['Heavy Punch', 'K', '. (period) / Numpad 2'], ['Light Kick', 'U', 'N / Numpad 4'], ['Heavy Kick', 'I', 'M / Numpad 5'], ['Special 1', 'L', '/ (slash) / Numpad 3'], ['Special 2', 'S + L', 'Down + / '], ['SUPER (full meter)', ';', 'Right Shift / Numpad 0'], ['Block', 'Hold back (down+back for lows)', 'Hold back'], ['Pause', 'Esc', 'Esc']];
    txt(ctx, 'ACTION', 260, 130, 20, '#ffd060', 'left', { stroke: '#000' }); txt(ctx, 'PLAYER 1', 620, 130, 20, '#ff4040', 'left', { stroke: '#000' }); txt(ctx, 'PLAYER 2', 900, 130, 20, '#4080ff', 'left', { stroke: '#000' });
    rows.forEach((r, i) => { const y = 170 + i * 40; txt(ctx, r[0], 260, y, 20, '#fff', 'left', { font: 'Arial', weight: 'bold' }); txt(ctx, r[1], 620, y, 20, '#ddd', 'left', { font: 'Arial' }); txt(ctx, r[2], 900, y, 20, '#ddd', 'left', { font: 'Arial' }); });
    txt(ctx, 'Gamepads: X/Y punches, A/B kicks, LB special, RB super. Pad 1 = P1, Pad 2 = P2.', W / 2, 600, 16, '#aaa', 'center', { font: 'Arial' });
    txt(ctx, 'Tips: crouching kicks hit low, jump-in kicks must be blocked standing, lows must be blocked crouching. Taking and dealing damage fills the SUPER meter.', W / 2, 630, 14, '#aaa', 'center', { font: 'Arial' });
  },
  drawVictory() {
    this.bgMenu(STAGES[0]); const ch = this.p1;
    drawFighter(ctx, ch, mergePose(P.win, { aF: [172 + Math.sin(this.t / 6) * 6, -8] }), W / 2, 620, 1, 1.7);
    txt(ctx, 'CHAMPION', W / 2, 120, 100, '#ffd040', 'center', { stroke: '#000', strokeW: 10, shadow: '#ff8000', blur: 40 });
    txt(ctx, ch.name + ' has defeated the Iron Ogre!', W / 2, 210, 30, '#fff', 'center', { stroke: '#000' });
    txt(ctx, '"' + ch.quotes.win + '"', W / 2, 260, 22, '#ffd060', 'center', { font: 'Georgia', weight: 'italic' });
    txt(ctx, `Arcade cleared ${this.save.arcadeWins} time(s)  ·  Fighters cleared: ${this.save.cleared.length}/20`, W / 2, 680, 18, '#ddd', 'center', { font: 'Arial' });
  },
  drawGameOver() {
    this.bgMenu(STAGES[7]); drawFighter(ctx, this.p1, P.down, W / 2, 620, 1, 1.5);
    txt(ctx, 'GAME OVER', W / 2, 200, 100, '#ff3030', 'center', { stroke: '#000', strokeW: 10, shadow: '#800', blur: 40 });
    txt(ctx, 'The Iron Ogre reigns... for now.', W / 2, 290, 28, '#fff', 'center', { stroke: '#000' });
    txt(ctx, 'Press ENTER', W / 2, 680, 20, '#ddd', 'center', { font: 'Arial' });
  },
};
function wrapText(c, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const test = line + w + ' '; if (c.measureText(test).width > maxW && line) { c.fillText(line, x, y); line = w + ' '; y += lh; } else line = test; }
  c.fillText(line, x, y);
}
Game.init();
