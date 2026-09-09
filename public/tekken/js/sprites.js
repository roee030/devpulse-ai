/* Iron Fist Legends - sprite renderer: fighters drawn from the concept-sheet artwork */
'use strict';

// Which of the four pose panels (p0 top-left, p1 top-right, p2 bottom-left, p3 bottom-right) each move family uses
const POSE_MAP = {
  pyros:  { punch:'p0', kick:'p2', sp1:'p3', sp2:'p1', sup:'p3' },
  vex:    { punch:'p1', kick:'p0', sp1:'p2', sp2:'p3', sup:'p0' },
  kade:   { punch:'p0', kick:'p3', sp1:'p2', sp2:'p1', sup:'p1' },
  dorian: { punch:'p0', kick:'p2', sp1:'p1', sp2:'p2', sup:'p3' },
  silas:  { punch:'p3', kick:'p1', sp1:'p3', sp2:'p2', sup:'p0' },
  thorn:  { punch:'p3', kick:'p0', sp1:'p1', sp2:'p2', sup:'p2' },
  kryll:  { punch:'p0', kick:'p3', sp1:'p2', sp2:'p1', sup:'p1' },
  jax:    { punch:'p0', kick:'p3', sp1:'p0', sp2:'p1', sup:'p2' },
  rook:   { punch:'p1', kick:'p0', sp1:'p2', sp2:'p3', sup:'p3' },
  nyx:    { punch:'p0', kick:'p1', sp1:'p3', sp2:'p2', sup:'p1' },
  warden: { punch:'p0', kick:'p2', sp1:'p3', sp2:'p1', sup:'p3' },
  dez:    { punch:'p0', kick:'p3', sp1:'p1', sp2:'p2', sup:'p2' },
  ivo:    { punch:'p1', kick:'p0', sp1:'p3', sp2:'p2', sup:'p3' },
  shade:  { punch:'p3', kick:'p1', sp1:'p2', sp2:'p0', sup:'p2' },
  mira:   { punch:'p0', kick:'p3', sp1:'p2', sp2:'p1', sup:'p2' },
  mirage: { punch:'p0', kick:'p1', sp1:'p2', sp2:'p3', sup:'p2' },
};
const SPRITE_KEYS = ['main', 'p0', 'p1', 'p2', 'p3'];
const FIGHTER_H = 228;        // on-screen height of the main figure at body.h = 1
const POSE_RATIO = 1.92;      // pose panels are drawn at roughly half the size of the main figure on the sheet

const Sprites = {
  img: {}, tints: {}, loaded: 0, total: 0,
  src(id, key) { return (typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA[id + '_' + key]) || ('sprites/' + id + '_' + key + '.webp'); },
  load() {
    for (const ch of CHARACTERS) for (const k of SPRITE_KEYS) {
      const im = new Image(); this.total++;
      im.onload = () => { this.loaded++; }; im.onerror = () => { this.loaded++; };
      im.src = this.src(ch.id, k); this.img[ch.id + '_' + k] = im;
    }
  },
  get(id, key) { const im = this.img[id + '_' + key]; return im && im.complete && im.naturalWidth > 0 ? im : null; },
  ready() { return this.loaded >= this.total; },
  // cached colour-tinted copy of a sprite (used for hit flashes, afterimages, silhouettes)
  tinted(id, key, color) {
    const im = this.get(id, key); if (!im) return null;
    const ck = id + '_' + key + '_' + color; if (this.tints[ck]) return this.tints[ck];
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    this.tints[ck] = c; return c;
  },
};

function poseKeyForMove(ch, key) {
  const pm = POSE_MAP[ch.id] || { punch:'p0', kick:'p1', sp1:'p2', sp2:'p3', sup:'p3' };
  if (key === 'lp' || key === 'hp') return pm.punch; if (key === 'lk' || key === 'hk') return pm.kick;
  return pm[key] || pm.punch;
}

// Core sprite draw: image anchored at the feet (bottom-centre), scaled so the main figure is FIGHTER_H * body.h tall
function drawSpriteImg(ctx, ch, key, x, feetY, facing, sizeMult, xf) {
  xf = xf || {};
  const im = xf.tint ? Sprites.tinted(ch.id, key, xf.tint) : Sprites.get(ch.id, key);
  const main = Sprites.get(ch.id, 'main'); if (!im || !main) return false;
  const H = FIGHTER_H * ch.body.h * (sizeMult || 1);
  const mainScale = H / main.naturalHeight;
  const scale = key === 'main' ? mainScale : mainScale * POSE_RATIO * (xf.poseScale || 1);
  const w = im.width * scale, h = im.height * scale;
  ctx.save();
  if (xf.lie != null) { // lying on the ground: rotate about the centre and rest the long side on the floor
    const p = xf.lie; ctx.translate(x - facing * (h / 2 - w / 2) * p, feetY - (w / 2) * p - (h / 2) * (1 - p)); ctx.rotate(-Math.PI / 2 * p * facing); ctx.scale(facing * (xf.sx || 1), xf.sy || 1);
    if (xf.alpha != null) ctx.globalAlpha *= xf.alpha; if (xf.tint) {} ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return true;
  }
  ctx.translate(x + (xf.dx || 0) * facing, feetY + (xf.dy || 0));
  ctx.rotate((xf.rot || 0) * DEG * facing);
  ctx.scale(facing * (xf.sx || 1), xf.sy || 1);
  if (xf.alpha != null) ctx.globalAlpha *= xf.alpha;
  if (xf.glow) { ctx.shadowColor = xf.glow; ctx.shadowBlur = xf.glowBlur || 18; }
  ctx.drawImage(im, -w / 2 + (xf.ax || 0), -h, w, h);
  ctx.restore();
  return true;
}

// Full fighter presentation from game state
function drawFighterSprite(ctx, f, opts) {
  opts = opts || {};
  const ch = f.ch, st = f.state, m = f.move, acc = ch.colors.accent;
  const fc = f.facing * (m && m.anim === 'spin' && st === 'attack' ? 1 : 1);
  let key = 'main', xf = { alpha: 1 }, extra = null;
  const t = f.t;
  const ease = (a) => a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2;
  switch (st) {
    case 'idle': xf.dy = Math.sin(t / 14) * 2; xf.sy = 1 + Math.sin(t / 14) * 0.012; break;
    case 'walk': xf.dy = -Math.abs(Math.sin(f.walkT * 4)) * 4; xf.rot = (f.vx * f.facing > 0 ? 4 : -3); xf.sx = 1.02; break;
    case 'crouch': xf.sy = 0.72; xf.sx = 1.12; break;
    case 'jump': xf.sy = f.vy < 0 ? 1.06 : 0.98; xf.sx = f.vy < 0 ? 0.95 : 1.02; xf.rot = f.vx * f.facing * 1.5; break;
    case 'attack': {
      if (!m) break;
      const pk = poseKeyForMove(ch, f.moveKey || 'lp'), su = m.startup, ac = m.active, rc = m.recovery, mf = f.mf;
      if (mf <= su * 0.55) { const p = mf / (su * 0.55); xf.rot = -10 * p; xf.dx = -8 * p; xf.sx = 1 - 0.06 * p; }
      else if (mf <= su + ac) {
        key = pk; const p = Math.min(1, (mf - su * 0.55) / Math.max(1, su * 0.45));
        xf.dx = 6 + 14 * ease(p) + (m.fwd ? 6 : 0); xf.rot = 3 * p; xf.sx = 1 + 0.05 * p; xf.glow = acc; xf.glowBlur = mf > su ? 14 : 6;
        if (m.anim === 'spin') { xf.rot = ((mf - su) * 28) % 360; xf.dx = 0; }
        if (m.anim === 'upper' || m.launch) { xf.dy = -(mf - su) * 3; }
        if (m.air) { xf.rot = -15; }
      } else {
        key = pk; const p = Math.min(1, (mf - su - ac) / Math.max(1, rc));
        xf.dx = 20 * (1 - p); xf.rot = 3 * (1 - p); xf.alpha = 1;
        if (p > 0.6) { extra = { key: 'main', xf: { alpha: (p - 0.6) / 0.4 } }; xf.alpha = 1 - (p - 0.6) / 0.4; }
      }
      if (m.type === 'teleport' && mf < su) { xf.alpha = 0.3; xf.glow = acc; }
      break;
    }
    case 'throwing': key = poseKeyForMove(ch, 'sp2'); xf.dx = 6; xf.rot = f.throwT < 18 ? -6 : 8; break;
    case 'grabbed': xf.rot = 20; xf.dy = -f.y * 0; xf.sx = 0.96; break;
    case 'hit': {
      if (f.airborne) { xf.rot = -30 - Math.min(35, f.y / 5); }
      else { xf.rot = -12; xf.dx = -6; xf.sx = 0.96; if (f.crouching) { xf.sy = 0.74; xf.sx = 1.1; } }
      if (f.flashT > 0 && f.flashT % 2 === 0) xf.tint = '#ffffff'; else xf.tint = null;
      if (!xf.tint) extra = { key, xf: Object.assign({}, xf, { tint: '#ff3030', alpha: 0.35 }) };
      break;
    }
    case 'block': xf.rot = -6; xf.dx = -4; if (f.crouching) { xf.sy = 0.74; xf.sx = 1.1; } break;
    case 'down': case 'lose': xf.lie = 1; break;
    case 'getup': { const p = 1 - f.downT / 18; xf.lie = 1 - ease(p); break; }
    case 'win': xf.dy = -Math.abs(Math.sin(t / 8)) * 10; xf.sx = 1 + Math.sin(t / 8) * 0.03; xf.glow = acc; xf.glowBlur = 22; break;
  }
  if (opts.flash) xf.tint = '#ffffff';
  if (opts.alpha != null) xf.alpha = (xf.alpha == null ? 1 : xf.alpha) * opts.alpha;
  if (ch.body.kind === 'phantom') { xf.glow = xf.glow || acc; xf.glowBlur = xf.glowBlur || 14; xf.alpha = (xf.alpha == null ? 1 : xf.alpha) * 0.92; }
  // aura
  if (opts.aura) { ctx.save(); const cy = f.feetY - 100 * ch.body.h; const g = ctx.createRadialGradient(f.x, cy, 10, f.x, cy, 140); g.addColorStop(0, opts.aura + 'aa'); g.addColorStop(1, opts.aura + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, cy, 140, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  const ok = drawSpriteImg(ctx, ch, key, f.x, f.feetY, fc, 1, xf);
  if (extra) drawSpriteImg(ctx, ch, extra.key, f.x, f.feetY, fc, 1, extra.xf);
  // block shield
  if (st === 'block' && ok) { ctx.save(); ctx.strokeStyle = '#7fb0ff'; ctx.shadowColor = '#7fb0ff'; ctx.shadowBlur = 16; ctx.lineWidth = 5; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(f.x + f.facing * 36, f.feetY - (f.crouching ? 60 : 105) * ch.body.h, 62, (f.facing > 0 ? -0.9 : Math.PI - 0.9), (f.facing > 0 ? 0.9 : Math.PI + 0.9)); ctx.stroke(); ctx.restore(); }
  // counter stance glow
  if (f.counterFlash > 0 && ok) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.shadowColor = acc; ctx.shadowBlur = 20; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 2); ctx.beginPath(); ctx.arc(f.x, f.feetY - 100 * ch.body.h, 90, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  return ok;
}

// Idle showcase pose for menus / select screens
function drawSpriteIdle(ctx, ch, x, feetY, facing, sizeMult, t, xf) {
  return drawSpriteImg(ctx, ch, 'main', x, feetY, facing, sizeMult, Object.assign({ dy: Math.sin((t || 0) / 14) * 2 }, xf || {}));
}
// Portrait: head-and-shoulders crop of the main sprite into a rect
function drawSpritePortrait(ctx, ch, x, y, w, h, bg) {
  const im = Sprites.get(ch.id, 'main'); if (!im) return false;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bg || '#0c0c14'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, STYLES[ch.style].fx + '66'); g.addColorStop(1, '#00000000'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const cropH = im.naturalHeight * 0.5, cropW = Math.min(im.naturalWidth, cropH * w / h);
  const sx = (im.naturalWidth - cropW) / 2, sy = 0;
  ctx.drawImage(im, sx, sy, cropW, cropH, x, y, w, h);
  ctx.restore(); return true;
}
