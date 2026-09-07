/* Iron Fist Legends - rendering: skeleton poses, fighter drawing, stages, text */
'use strict';

const W = 1280, H = 720, GROUND = 610, STAGE_W = 2300;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------- Poses ----------
// hy: hip drop, tor: torso lean (+forward), head: head tilt, aB/aF: back/front arm [upper, lower(rel)], lB/lF legs
const P = {
  idle:    { hy:0,  tor:6,   head:0,   aB:[45,110], aF:[60,100], lB:[-12,3],  lF:[14,-6] },
  crouch:  { hy:55, tor:25,  head:-10, aB:[40,110], aF:[55,100], lB:[70,-125],lF:[78,-130] },
  jump:    { hy:0,  tor:2,   head:0,   aB:[120,30], aF:[130,20], lB:[40,-70], lF:[55,-80] },
  fall:    { hy:0,  tor:8,   head:0,   aB:[100,20], aF:[110,20], lB:[20,-30], lF:[35,-40] },
  block:   { hy:0,  tor:8,   head:0,   aB:[70,105], aF:[82,95],  lB:[-10,3],  lF:[12,-5] },
  blockLow:{ hy:55, tor:22,  head:-5,  aB:[30,80],  aF:[40,60],  lB:[70,-125],lF:[78,-130] },
  hit:     { hy:0,  tor:-18, head:-22, aB:[30,40],  aF:[50,30],  lB:[-15,10], lF:[10,-10] },
  hitLow:  { hy:50, tor:0,   head:-20, aB:[30,40],  aF:[50,30],  lB:[70,-125],lF:[78,-130] },
  launch:  { hy:0,  tor:-50, head:-20, aB:[120,20], aF:[140,10], lB:[30,-40], lF:[50,-50] },
  down:    { hy:96, tor:-88, head:-10, aB:[80,0],   aF:[100,20], lB:[92,-5],  lF:[88,0], noGround:true },
  getup:   { hy:60, tor:35,  head:-10, aB:[60,40],  aF:[70,30],  lB:[60,-120],lF:[90,-140] },
  win:     { hy:0,  tor:-5,  head:-10, aB:[30,30],  aF:[172,-8], lB:[-12,3],  lF:[14,-6] },
  stunned: { hy:10, tor:12,  head:15,  aB:[20,20],  aF:[25,15],  lB:[-5,-10], lF:[10,-25] },
  // attack keyframes: wind, hit
  jab:     { wind:{ aF:[40,120], tor:2 }, hit:{ aF:[92,0], tor:10 } },
  straight:{ wind:{ aF:[30,110], tor:-5, aB:[40,120] }, hit:{ aF:[96,0], tor:22, aB:[50,110], lF:[34,-10], lB:[-18,4] } },
  hook:    { wind:{ aF:[20,90], tor:-10 }, hit:{ aF:[100,72], tor:16, lF:[20,-6] } },
  upper:   { wind:{ hy:26, tor:22, aF:[10,60], lB:[50,-90], lF:[55,-95] }, hit:{ hy:-8, tor:-12, aF:[152,10], aB:[40,90], lF:[30,-10], lB:[-20,0] } },
  chain:   { wind:{ aF:[50,100] }, hit:{ aF:[92,0], aB:[45,110], tor:12 }, alt:{ aB:[92,0], aF:[45,110], tor:12 } },
  palm:    { wind:{ aF:[30,110], tor:-6 }, hit:{ aF:[95,0], tor:24, lF:[34,-10], lB:[-18,4] }, open:true },
  elbow:   { wind:{ aF:[20,120], tor:-8 }, hit:{ aF:[100,150], tor:20, lF:[26,-6] } },
  headbutt:{ wind:{ tor:-25, head:-25 }, hit:{ tor:38, head:28, aB:[20,40], aF:[30,30] } },
  slap:    { wind:{ aF:[20,60], tor:-8 }, hit:{ aF:[100,60], tor:14 }, open:true },
  fkick:   { wind:{ lF:[30,-90], tor:-4 }, hit:{ lF:[96,0], tor:-14, aF:[40,90], aB:[30,110] } },
  rkick:   { wind:{ lF:[20,-85], tor:-10 }, hit:{ lF:[108,-12], tor:-32, hy:4, aF:[20,80], aB:[60,90] } },
  lkick:   { wind:{ lF:[20,-60], hy:8 }, hit:{ lF:[58,6], tor:16, hy:12, aF:[50,90] } },
  sweep:   { wind:{ hy:50, tor:25, lB:[70,-125], lF:[60,-100] }, hit:{ hy:62, tor:35, lF:[92,0], lB:[72,-130], aF:[60,60], aB:[30,60] } },
  hkick:   { wind:{ lF:[30,-95], tor:-8 }, hit:{ lF:[148,-10], tor:-32, aF:[20,80], aB:[60,80] } },
  knee:    { wind:{ lF:[30,-80], tor:5 }, hit:{ lF:[98,-125], tor:12, aF:[70,30], aB:[70,30] } },
  axe:     { wind:{ lF:[162,0], tor:-12, aF:[30,60] }, hit:{ lF:[78,0], tor:26, aF:[40,60] } },
  spin:    { wind:{ tor:-10, aF:[60,60], aB:[60,60] }, hit:{ lF:[102,-6], tor:-20, aF:[90,30], aB:[90,30], hy:-6 }, spin:true },
  fly:     { wind:{ lF:[40,-100], tor:-5 }, hit:{ lF:[92,0], lB:[40,-95], tor:-16, aF:[60,60], aB:[30,110], hy:-24 } },
  dash:    { wind:{ tor:15, aF:[-20,-10], aB:[-20,-10] }, hit:{ tor:46, head:-12, aF:[-45,-20], aB:[-40,-20], lF:[55,-30], lB:[-45,20] } },
  throw:   { wind:{ tor:-10, aF:[20,110], aB:[20,110] }, hit:{ tor:16, aF:[92,0], aB:[86,6] }, open:true },
  grab:    { wind:{ aF:[70,60], aB:[70,60] }, hit:{ aF:[90,0], aB:[90,0], tor:12 }, open:true },
  counter: { wind:{ tor:-4, aF:[70,50], aB:[60,60] }, hit:{ tor:-6, aF:[78,40], aB:[66,60], lF:[22,-8] }, open:true },
  rush:    { wind:{ tor:15, aF:[-20,-10], aB:[-20,-10] }, hit:{ tor:20, aF:[92,0], aB:[45,110], lF:[34,-10] }, alt:{ tor:20, aB:[92,0], aF:[45,110], lF:[34,-10] } },
  throwLift:{ hy:-6, tor:-14, aF:[150,0], aB:[150,0], lB:[-12,3], lF:[14,-6] },
  throwSlam:{ hy:20, tor:40, aF:[70,0], aB:[70,0], lB:[40,-60], lF:[60,-80] },
  grabbed: { hy:0, tor:-10, head:-15, aB:[60,20], aF:[60,20], lB:[-5,-10], lF:[10,-20] },
};

function lerpPose(a, b, t) {
  const o = {};
  for (const k of ['hy', 'tor', 'head']) o[k] = lerp(a[k] || 0, b[k] || 0, t);
  for (const k of ['aB', 'aF', 'lB', 'lF']) o[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  return o;
}
function mergePose(base, over) { const o = Object.assign({}, base); if (over) for (const k in over) o[k] = over[k]; return o; }

// ---------- Fighter drawing (volumetric, cel-shaded) ----------
const LIMB = { thigh: 56, shin: 54, torso: 66, neck: 10, headR: 17, upper: 42, lower: 40 };
const OUTLINE = 'rgba(18,12,10,0.85)';

function hexToRgb(hex) {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  let [r, g, b] = hexToRgb(hex);
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; } else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// Tapered, muscular limb segment with cel shading and outline
function muscle(ctx, p0, p1, r0, r1, col, bulge, flash) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L; if (ny > 0) { nx = -nx; ny = -ny; }
  const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2, rm = Math.max(r0, r1) * (bulge || 1.1);
  const a0 = Math.atan2(ny, nx), a1 = a0 + Math.PI;
  ctx.beginPath();
  ctx.moveTo(p0.x + nx * r0, p0.y + ny * r0);
  ctx.quadraticCurveTo(mx + nx * rm * 1.3, my + ny * rm * 1.3, p1.x + nx * r1, p1.y + ny * r1);
  ctx.arc(p1.x, p1.y, r1, a0, a1, true);
  ctx.quadraticCurveTo(mx - nx * rm * 1.3, my - ny * rm * 1.3, p0.x - nx * r0, p0.y - ny * r0);
  ctx.arc(p0.x, p0.y, r0, a1, a0, true);
  ctx.closePath();
  if (flash) { ctx.fillStyle = '#fff'; ctx.fill(); return; }
  const g = ctx.createLinearGradient(mx + nx * rm, my + ny * rm, mx - nx * rm, my - ny * rm);
  g.addColorStop(0, shade(col, 0.22)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.35));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
}
function fillOutline(ctx, col, flash, lw) {
  if (flash) { ctx.fillStyle = '#fff'; ctx.fill(); return; }
  ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw || 2; ctx.stroke();
}

function drawFighter(ctx, ch, pose, x, feetY, facing, scaleOverride, opts) {
  opts = opts || {};
  const body = ch.body, s = (scaleOverride || 0.86) * body.h, w = body.w, flash = !!opts.flash;
  const c = ch.colors;
  const style = STYLES[ch.style];
  const skin = c.skin, top = c.top, bottom = c.bottom;
  const shirtless = top === skin;
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(facing * s, s);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const hipY = -(LIMB.thigh + LIMB.shin) + (pose.hy || 0);
  const hip = { x: 0, y: hipY };
  const tor = (pose.tor || 0) * DEG;
  const u = { x: Math.sin(tor), y: -Math.cos(tor) };            // torso up
  const rt = { x: Math.cos(tor), y: Math.sin(tor) };            // torso forward
  const sh = { x: hip.x + u.x * LIMB.torso, y: hip.y + u.y * LIMB.torso };
  const headA = tor + (pose.head || 0) * DEG;
  const headC = { x: sh.x + Math.sin(headA) * (LIMB.neck + LIMB.headR), y: sh.y - Math.cos(headA) * (LIMB.neck + LIMB.headR) };
  const pt = (base, a, len) => ({ x: base.x + Math.sin(a * DEG) * len, y: base.y + Math.cos(a * DEG) * len });

  // aura when meter full
  if (opts.aura) {
    const g = ctx.createRadialGradient(sh.x, sh.y, 10, sh.x, sh.y, 130); g.addColorStop(0, opts.aura + 'aa'); g.addColorStop(1, opts.aura + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sh.x, sh.y + 20, 130, 0, Math.PI * 2); ctx.fill();
  }

  const shorts = !!c.shorts || !!c.mawashi;
  const joint = (p, r, col) => { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = flash ? '#fff' : col; ctx.fill(); };
  const leg = (angles, hx, front) => {
    const hp = { x: hip.x + hx, y: hip.y + 4 };
    const knee = pt(hp, angles[0], LIMB.thigh);
    const foot = pt(knee, angles[0] + angles[1], LIMB.shin);
    const legCol = shorts ? skin : bottom, dim = front ? 0 : -0.12;
    muscle(ctx, hp, knee, 12.5 * w, 9.5 * w, shade(legCol, dim), 1.12, flash);
    muscle(ctx, knee, foot, 9.5 * w, 6.5 * w, shade(legCol, dim), 1.08, flash);
    joint(knee, 9.5 * w - 1.2, shade(legCol, dim - 0.08));
    if (shorts && !c.mawashi) { // shorts covering upper thigh
      const k2 = pt(hp, angles[0], LIMB.thigh * 0.45);
      muscle(ctx, hp, k2, 13.5 * w, 12 * w, shade(bottom, dim), 1.0, flash);
      if (c.trim) { ctx.strokeStyle = flash ? '#fff' : c.trim; ctx.lineWidth = 3; ctx.beginPath(); const n = pt(hp, angles[0] + 90, 12 * w), n2 = pt(hp, angles[0] - 90, 12 * w); ctx.moveTo(k2.x + (n.x - hp.x), k2.y + (n.y - hp.y)); ctx.lineTo(k2.x + (n2.x - hp.x), k2.y + (n2.y - hp.y)); ctx.stroke(); }
    }
    // foot / shoe
    const fa = (angles[0] + angles[1]) * DEG, tx = Math.cos(fa), ty = -Math.sin(fa);
    const heel = { x: foot.x - tx * 5, y: foot.y - ty * 5 }, toe = { x: foot.x + tx * 17, y: foot.y + ty * 17 };
    muscle(ctx, heel, toe, 6.5 * w, 5 * w, shade(c.shoe, dim), 1.0, flash);
    if (!flash && c.shoe !== skin) { ctx.strokeStyle = shade(c.shoe, -0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(heel.x - ty * 5, heel.y + tx * 5); ctx.lineTo(toe.x - ty * 4, toe.y + tx * 4); ctx.stroke(); }
    return foot;
  };
  const hand = (h, dir, open, front) => {
    const dx = Math.sin(dir * DEG), dy = Math.cos(dir * DEG);
    if (c.glove) {
      muscle(ctx, { x: h.x - dx * 5, y: h.y - dy * 5 }, { x: h.x + dx * 9, y: h.y + dy * 9 }, 11 * w, 11.5 * w, c.glove, 1.08, flash);
      if (!flash) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(h.x - dx * 6 - dy * 8 * w, h.y - dy * 6 + dx * 8 * w); ctx.lineTo(h.x - dx * 6 + dy * 8 * w, h.y - dy * 6 - dx * 8 * w); ctx.stroke();
        ctx.strokeStyle = shade(c.glove, -0.4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(h.x + dx * 2 - dy * 6, h.y + dy * 2 + dx * 6); ctx.quadraticCurveTo(h.x + dx * 9, h.y + dy * 9, h.x + dx * 2 + dy * 6, h.y + dy * 2 - dx * 6); ctx.stroke(); }
      return;
    }
    const hc = c.wrap && front ? c.wrap : skin;
    if (open) {
      muscle(ctx, { x: h.x - dx * 2, y: h.y - dy * 2 }, { x: h.x + dx * 7, y: h.y + dy * 7 }, 6.5 * w, 6 * w, hc, 1.0, flash);
      for (let i = -1; i <= 1; i++) { const a = dir + i * 22; const p0 = { x: h.x + dx * 6, y: h.y + dy * 6 }; muscle(ctx, p0, pt(p0, a, 9), 2.4 * w, 2 * w, hc, 1.0, flash); }
    } else {
      muscle(ctx, { x: h.x - dx * 3, y: h.y - dy * 3 }, { x: h.x + dx * 7, y: h.y + dy * 7 }, 8 * w, 7.5 * w, hc, 1.0, flash);
      if (!flash) { ctx.strokeStyle = shade(hc, -0.4); ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = -1; i <= 1; i++) { const kx = h.x + dx * 8 - dy * i * 4.5, ky = h.y + dy * 8 + dx * i * 4.5; ctx.moveTo(kx - dx * 2.5, ky - dy * 2.5); ctx.lineTo(kx + dx * 1, ky + dy * 1); } ctx.stroke(); }
    }
  };
  const arm = (angles, front, open) => {
    const shp = { x: sh.x + (front ? 2 : -3), y: sh.y + 5 };
    const elbow = pt(shp, angles[0], LIMB.upper);
    const abs = angles[0] + angles[1];
    const h = pt(elbow, abs, LIMB.lower);
    const dim = front ? 0 : -0.15;
    const sleeve = c.sleeves ? top : skin;
    muscle(ctx, shp, elbow, 9.5 * w, 7.5 * w, shade(sleeve, dim), 1.18, flash);
    muscle(ctx, elbow, h, 7.5 * w, 5.5 * w, shade(c.wrap && front ? c.wrap : skin, dim), 1.12, flash);
    joint(elbow, 7.5 * w - 1.2, shade(c.sleeves ? top : skin, dim - 0.08));
    // deltoid
    ctx.beginPath(); ctx.arc(shp.x, shp.y + 1, 10.5 * w, 0, Math.PI * 2); fillOutline(ctx, shade(c.sleeves || c.armor ? top : skin, dim + 0.05), flash);
    if (c.armor && !flash) { ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(shp.x, shp.y + 1, 4 * w, 0, Math.PI * 2); ctx.fill(); }
    hand(h, abs, open, front);
    if (front && style.weapon === 'bokken' && !flash) {
      const wa = abs * DEG; ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 6; ctx.beginPath();
      ctx.moveTo(h.x - Math.sin(wa) * 12, h.y - Math.cos(wa) * 12); ctx.lineTo(h.x + Math.sin(wa) * 82, h.y + Math.cos(wa) * 82); ctx.stroke();
      ctx.strokeStyle = '#c89a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x + Math.sin(wa) * 10, h.y + Math.cos(wa) * 10); ctx.lineTo(h.x + Math.sin(wa) * 78, h.y + Math.cos(wa) * 78); ctx.stroke();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(h.x - Math.sin(wa) * 12, h.y - Math.cos(wa) * 12); ctx.lineTo(h.x - Math.sin(wa) * 4, h.y - Math.cos(wa) * 4); ctx.stroke();
    }
  };

  // ---- torso ----
  const torso = () => {
    const P0 = (t, side) => ({ x: hip.x + u.x * LIMB.torso * t + rt.x * side, y: hip.y + u.y * LIMB.torso * t + rt.y * side });
    const shW = 22 * w, chW = 21 * w, waW = 15 * w, peW = 17 * w;
    const pts = [P0(-0.1, -peW), P0(0.25, -waW), P0(0.72, -chW), P0(0.98, -shW), P0(1.04, 0), P0(0.98, shW), P0(0.72, chW), P0(0.25, waW), P0(-0.1, peW)];
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) { const p = pts[i], q = pts[i - 1]; ctx.quadraticCurveTo((p.x + q.x) / 2 + (i === 3 || i === 5 ? u.x * 3 : 0), (p.y + q.y) / 2, p.x, p.y); }
    ctx.closePath();
    if (flash) { ctx.fillStyle = '#fff'; ctx.fill(); }
    else {
      const g = ctx.createLinearGradient(P0(0.5, -chW).x, P0(0.5, -chW).y, P0(0.5, chW).x, P0(0.5, chW).y);
      g.addColorStop(0, shade(top, -0.3)); g.addColorStop(0.45, top); g.addColorStop(1, shade(top, 0.15));
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
      const line = (a, b, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw || 1.8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
      const curve = (a, cpt, b, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw || 1.8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cpt.x, cpt.y, b.x, b.y); ctx.stroke(); };
      const dk = shade(top, -0.45);
      if (shirtless || c.tank) {
        // pecs + abs
        curve(P0(0.86, -shW * 0.7), P0(0.62, -chW * 0.3), P0(0.66, 3), dk, 2); curve(P0(0.86, shW * 0.75), P0(0.6, chW * 0.45), P0(0.66, 3), dk, 2);
        line(P0(0.62, 2), P0(0.2, 3), dk, 1.6);
        for (let i = 0; i < 3; i++) { const t = 0.55 - i * 0.12; line(P0(t, -9 * w), P0(t, 9 * w), dk, 1.4); }
      }
      if (c.tank) { // tank top straps + hem
        ctx.fillStyle = c.tankCol || '#222'; ctx.beginPath(); const a = P0(0.98, -shW * 0.6), b = P0(0.98, shW * 0.6), cc = P0(0.15, waW), d = P0(0.15, -waW); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(P0(0.6, chW * 0.9).x, P0(0.6, chW * 0.9).y); ctx.lineTo(cc.x, cc.y); ctx.lineTo(d.x, d.y); ctx.lineTo(P0(0.6, -chW * 0.9).x, P0(0.6, -chW * 0.9).y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (c.gi) {
        // lapels: V opening showing chest
        const col = P0(0.15, 4 * w), l1 = P0(0.98, -shW * 0.55), l2 = P0(0.98, shW * 0.55);
        ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(l1.x, l1.y); ctx.lineTo(col.x, col.y); ctx.lineTo(l2.x, l2.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = shade(top, -0.5); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(l1.x, l1.y); ctx.lineTo(col.x, col.y); ctx.lineTo(l2.x, l2.y); ctx.stroke();
        ctx.strokeStyle = dk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(l1.x, l1.y); ctx.lineTo(col.x, col.y); ctx.lineTo(l2.x, l2.y); ctx.stroke();
        curve(P0(0.8, -shW * 0.3), P0(0.62, -chW * 0.2), P0(0.62, 2), shade(skin, -0.35), 1.5);
      }
      if (c.armor) {
        ctx.strokeStyle = c.accent; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(P0(0.9, -shW * 0.5).x, P0(0.9, -shW * 0.5).y); ctx.lineTo(P0(0.55, 0).x, P0(0.55, 0).y); ctx.lineTo(P0(0.9, shW * 0.5).x, P0(0.9, shW * 0.5).y); ctx.stroke();
        ctx.fillStyle = c.accent; ctx.shadowColor = c.accent; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(P0(0.7, 0).x, P0(0.7, 0).y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        line(P0(0.35, -waW), P0(0.35, waW), shade(top, -0.5), 2); line(P0(0.2, -waW), P0(0.2, waW), shade(top, -0.5), 2);
      }
      if (c.vest) { // fur / leather vest
        ctx.fillStyle = c.vest; ctx.beginPath(); ctx.moveTo(P0(0.98, -shW).x, P0(0.98, -shW).y); ctx.lineTo(P0(0.98, -shW * 0.45).x, P0(0.98, -shW * 0.45).y); ctx.lineTo(P0(0.05, -waW * 0.6).x, P0(0.05, -waW * 0.6).y); ctx.lineTo(P0(-0.05, -peW).x, P0(-0.05, -peW).y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(P0(0.98, shW).x, P0(0.98, shW).y); ctx.lineTo(P0(0.98, shW * 0.45).x, P0(0.98, shW * 0.45).y); ctx.lineTo(P0(0.05, waW * 0.6).x, P0(0.05, waW * 0.6).y); ctx.lineTo(P0(-0.05, peW).x, P0(-0.05, peW).y); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // pelvis / trunks
    const tw = 17.5 * w;
    ctx.beginPath(); const a = P0(0.2, -waW - 1), b = P0(0.2, waW + 1), cc2 = P0(-0.12, tw), d = P0(-0.12, -tw);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.quadraticCurveTo(P0(-0.02, tw + 2).x, P0(-0.02, tw + 2).y, cc2.x, cc2.y); ctx.quadraticCurveTo(P0(-0.2, 0).x, P0(-0.2, 0).y, d.x, d.y); ctx.closePath();
    fillOutline(ctx, c.mawashi ? c.bottom : bottom, flash);
    // belt / waistband
    if (!flash) { ctx.strokeStyle = c.accent; ctx.lineWidth = c.gi ? 7 : 5; ctx.beginPath(); ctx.moveTo(P0(0.17, -waW - 2).x, P0(0.17, -waW - 2).y); ctx.lineTo(P0(0.17, waW + 2).x, P0(0.17, waW + 2).y); ctx.stroke(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke();
      if (c.gi) { ctx.strokeStyle = c.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(P0(0.17, 2).x, P0(0.17, 2).y); ctx.lineTo(P0(-0.05, 10).x, P0(-0.05, 10).y); ctx.stroke(); } }
    // neck
    muscle(ctx, { x: sh.x, y: sh.y + 4 }, { x: sh.x + Math.sin(headA) * (LIMB.neck + 6), y: sh.y - Math.cos(headA) * (LIMB.neck + 6) }, 7 * w, 6.5 * w, shade(skin, -0.05), 1.0, flash);
  };

  // draw order
  arm(pose.aB, false, pose.open);
  leg(pose.lB, -7, false);
  leg(pose.lF, 7, true);
  torso();
  drawHead(ctx, c, body.head, headC, headA, w, flash, style);
  arm(pose.aF, true, pose.open);
  ctx.restore();
}

function drawHead(ctx, c, type, hc, a, w, flash, style) {
  const r = LIMB.headR, skin = c.skin, hair = c.hair;
  const F = col => flash ? '#fff' : col;
  ctx.save(); ctx.translate(hc.x, hc.y); ctx.rotate(a);
  ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE;
  // back hair
  if (type === 'afro') { ctx.beginPath(); ctx.arc(-1, -4, r + 12, 0, Math.PI * 2); fillOutline(ctx, F(hair), flash); }
  if (type === 'long') { ctx.beginPath(); ctx.ellipse(-7, 10, 12, 26, 0.25, 0, Math.PI * 2); fillOutline(ctx, F(hair), flash); }
  if (type === 'ponytail') { ctx.beginPath(); ctx.ellipse(-14, 12, 6, 20, 0.4, 0, Math.PI * 2); fillOutline(ctx, F(hair), flash); }
  if (type === 'viking') { ctx.beginPath(); ctx.ellipse(-9, 10, 13, 22, 0.2, 0, Math.PI * 2); fillOutline(ctx, F(hair), flash); }
  if (type === 'horns') { ctx.beginPath(); ctx.moveTo(-9, -12); ctx.quadraticCurveTo(-24, -20, -18, -40); ctx.quadraticCurveTo(-12, -24, -1, -16); ctx.closePath(); fillOutline(ctx, F('#e8dcc0'), flash); ctx.beginPath(); ctx.moveTo(9, -12); ctx.quadraticCurveTo(24, -20, 18, -40); ctx.quadraticCurveTo(12, -24, 1, -16); ctx.closePath(); fillOutline(ctx, F('#e8dcc0'), flash); }
  // ear
  ctx.beginPath(); ctx.ellipse(-13, 1, 4, 5.5, 0, 0, Math.PI * 2); fillOutline(ctx, F(skin), flash);
  // face shape
  if (type === 'robot') {
    ctx.beginPath(); ctx.moveTo(-15, -17); ctx.lineTo(13, -17); ctx.lineTo(17, -8); ctx.lineTo(17, 10); ctx.lineTo(10, 19); ctx.lineTo(-13, 19); ctx.lineTo(-16, 8); ctx.closePath();
    if (flash) { ctx.fillStyle = '#fff'; ctx.fill(); } else { const g = ctx.createLinearGradient(-16, 0, 17, 0); g.addColorStop(0, shade(skin, -0.3)); g.addColorStop(1, shade(skin, 0.2)); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a0f14'; ctx.fillRect(-11, -8, 26, 9); ctx.fillStyle = c.accent; ctx.shadowColor = c.accent; ctx.shadowBlur = 14; ctx.fillRect(-9, -6, 22, 5); ctx.shadowBlur = 0;
      ctx.strokeStyle = shade(skin, -0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(10, 8); ctx.moveTo(-6, 13); ctx.lineTo(8, 13); ctx.stroke();
      ctx.fillStyle = c.top; ctx.fillRect(-16, -20, 30, 6); ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(-6, -22, 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return;
  }
  if (type === 'alien') {
    ctx.beginPath(); ctx.moveTo(-12, -22); ctx.quadraticCurveTo(0, -34, 14, -20); ctx.quadraticCurveTo(20, -6, 12, 12); ctx.quadraticCurveTo(4, 22, -4, 20); ctx.quadraticCurveTo(-16, 10, -12, -22); ctx.closePath();
    if (flash) { ctx.fillStyle = '#fff'; ctx.fill(); } else { const g = ctx.createRadialGradient(4, -8, 4, 0, 0, 30); g.addColorStop(0, shade(skin, 0.25)); g.addColorStop(1, shade(skin, -0.3)); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.ellipse(7, -4, 6, 10, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-4, -3, 4, 8, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.ellipse(8, -6, 2, 3.5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = shade(skin, -0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(10, 11); ctx.stroke(); }
    ctx.restore(); return;
  }
  // human-ish head: skull + jaw
  ctx.beginPath(); ctx.moveTo(-15, -6); ctx.quadraticCurveTo(-16, -22, 0, -19); ctx.quadraticCurveTo(17, -19, 16, -2); ctx.quadraticCurveTo(16, 8, 10, 16); ctx.quadraticCurveTo(4, 20, -3, 18); ctx.quadraticCurveTo(-13, 14, -15, -6); ctx.closePath();
  if (flash) { ctx.fillStyle = '#fff'; ctx.fill(); }
  else {
    const g = ctx.createRadialGradient(5, -6, 4, 0, 0, 24); g.addColorStop(0, shade(skin, 0.18)); g.addColorStop(0.7, skin); g.addColorStop(1, shade(skin, -0.3));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    const eyeCol = style && style.boss ? c.accent : '#1a1410';
    if (type !== 'mask' && type !== 'hood') {
      // eye
      ctx.fillStyle = '#f8f4ee'; ctx.beginPath(); ctx.ellipse(7, -3, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.arc(8, -3, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2.5, -5); ctx.quadraticCurveTo(7, -7.5, 11.5, -5); ctx.stroke();
      // brow
      ctx.strokeStyle = hair === '#dddddd' ? '#999' : shade(hair, 0.05); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(2, -9); ctx.quadraticCurveTo(7, -11, 12.5, -7.5); ctx.stroke();
      // nose
      ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(12, -3); ctx.quadraticCurveTo(15.5, 2, 12, 4.5); ctx.stroke();
      // mouth
      ctx.strokeStyle = shade(skin, -0.55); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(5, 9.5); ctx.quadraticCurveTo(9, 10.5, 12.5, 8.5); ctx.stroke();
      if (style && style.boss) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(7.5, 15); ctx.lineTo(9, 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, 9.5); ctx.lineTo(11.5, 14); ctx.lineTo(13, 9); ctx.fill(); ctx.shadowColor = c.accent; ctx.shadowBlur = 10; ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(8, -3, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
      // jaw shadow
      ctx.strokeStyle = shade(skin, -0.25); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, 12); ctx.quadraticCurveTo(0, 17, 8, 15); ctx.stroke();
    }
  }
  // headgear / hair (front)
  const H = F(hair);
  ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE;
  const hairCap = (fringe) => { ctx.beginPath(); ctx.moveTo(-16, -4); ctx.quadraticCurveTo(-17, -23, 0, -21); ctx.quadraticCurveTo(17, -21, 16, -8); ctx.lineTo(12, -10); ctx.quadraticCurveTo(6, -16, fringe ? -2 : 2, -12); ctx.quadraticCurveTo(-8, -10, -14, -2); ctx.closePath(); fillOutline(ctx, H, flash); };
  switch (type) {
    case 'short': case 'ponytail': case 'long': hairCap(true); break;
    case 'beard': hairCap(false); ctx.beginPath(); ctx.moveTo(-6, 6); ctx.quadraticCurveTo(-2, 24, 8, 22); ctx.quadraticCurveTo(14, 18, 12, 9); ctx.quadraticCurveTo(4, 12, -6, 6); ctx.closePath(); fillOutline(ctx, H, flash); break;
    case 'bald': if (!flash) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(2, -12, 6, 3, 0.3, 0, Math.PI * 2); ctx.fill(); } break;
    case 'topknot': hairCap(false); ctx.beginPath(); ctx.ellipse(-3, -24, 8, 5, 0, 0, Math.PI * 2); fillOutline(ctx, H, flash); break;
    case 'bun': hairCap(true); ctx.beginPath(); ctx.arc(-9, -19, 7, 0, Math.PI * 2); fillOutline(ctx, H, flash); break;
    case 'spiky': for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 6 - 6, -14); ctx.lineTo(i * 6 - 1, -32); ctx.lineTo(i * 6 + 5, -14); ctx.closePath(); fillOutline(ctx, H, flash); } break;
    case 'mohawk': for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 5 - 5, -16); ctx.lineTo(i * 5 - 2, -36); ctx.lineTo(i * 5 + 3, -16); ctx.closePath(); fillOutline(ctx, H, flash); } break;
    case 'mask': {
      ctx.beginPath(); ctx.moveTo(-15, -6); ctx.quadraticCurveTo(-16, -22, 0, -19); ctx.quadraticCurveTo(17, -19, 16, -2); ctx.quadraticCurveTo(16, 8, 10, 16); ctx.quadraticCurveTo(4, 20, -3, 18); ctx.quadraticCurveTo(-13, 14, -15, -6); ctx.closePath(); fillOutline(ctx, F(c.mask), flash);
      if (!flash) { ctx.fillStyle = c.hair; ctx.beginPath(); ctx.moveTo(-4, -19); ctx.lineTo(4, -34); ctx.lineTo(10, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(7, -3, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(8, -3, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(8, 9, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.strokeStyle = shade(skin, -0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(5, 9.5); ctx.lineTo(11, 9); ctx.stroke(); }
      break;
    }
    case 'hood': {
      ctx.beginPath(); ctx.moveTo(-17, 2); ctx.quadraticCurveTo(-19, -26, 0, -23); ctx.quadraticCurveTo(20, -22, 17, 0); ctx.lineTo(14, 4); ctx.quadraticCurveTo(6, -6, -6, -4); ctx.quadraticCurveTo(-13, -2, -15, 6); ctx.closePath(); fillOutline(ctx, F(c.top), flash);
      ctx.beginPath(); ctx.moveTo(-14, 4); ctx.quadraticCurveTo(0, 2, 15, 3); ctx.quadraticCurveTo(14, 16, 4, 20); ctx.quadraticCurveTo(-8, 18, -14, 8); ctx.closePath(); fillOutline(ctx, F(c.top), flash);
      if (!flash) { ctx.fillStyle = '#f8f4ee'; ctx.beginPath(); ctx.ellipse(7, -2, 4.5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(8, -2, 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(2, -7); ctx.lineTo(12, -5); ctx.stroke(); }
      break;
    }
    case 'viking': {
      ctx.beginPath(); ctx.moveTo(-17, -4); ctx.quadraticCurveTo(-17, -26, 0, -25); ctx.quadraticCurveTo(18, -25, 17, -4); ctx.closePath(); fillOutline(ctx, F('#8a8a90'), flash);
      if (!flash) { ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(17, -6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(13, 6); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-15, -10); ctx.quadraticCurveTo(-30, -18, -26, -34); ctx.quadraticCurveTo(-22, -22, -14, -18); ctx.closePath(); fillOutline(ctx, F('#f0e8d0'), flash);
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.quadraticCurveTo(-4, 26, 8, 24); ctx.quadraticCurveTo(15, 20, 12, 9); ctx.quadraticCurveTo(4, 12, -6, 6); ctx.closePath(); fillOutline(ctx, H, flash);
      break;
    }
    case 'afro': ctx.beginPath(); ctx.moveTo(-16, -6); ctx.quadraticCurveTo(-18, -28, 2, -26); ctx.quadraticCurveTo(20, -26, 16, -9); ctx.quadraticCurveTo(8, -14, 0, -13); ctx.quadraticCurveTo(-10, -13, -16, -6); ctx.closePath(); fillOutline(ctx, H, flash); break;
    case 'horns': hairCap(false); break;
  }
  if (c.headband && !flash) { ctx.strokeStyle = c.headband; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-16, -9); ctx.quadraticCurveTo(0, -13, 16, -8); ctx.stroke(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke(); ctx.strokeStyle = c.headband; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, -9); ctx.lineTo(-22, 4); ctx.moveTo(-15, -9); ctx.lineTo(-24, -2); ctx.stroke(); }
  ctx.restore();
}

// Portrait into a rect (bust)
function drawPortrait(ctx, ch, x, y, w, h, bg) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bg || '#222'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, STYLES[ch.style].fx + '55'); g.addColorStop(1, '#00000000'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const s = h / 128;
  drawFighter(ctx, ch, P.idle, x + w * 0.5 - 6 * s, y + h * 0.16 + 220 * s, 1, s / ch.body.h);
  ctx.restore();
}

// ---------- Stage rendering ----------
const stageCache = {};
function drawStageBG(ctx, st, camX, t, zoom) {
  const theme = st.theme;
  const par = (f) => -(camX - STAGE_W / 2) * f;
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, st.sky[0]); g.addColorStop(0.6, st.sky[1]); g.addColorStop(1, st.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!stageCache[st.id]) stageCache[st.id] = makeStageProps(st);
  const props = stageCache[st.id];
  ctx.save();
  if (theme === 'dojo') {
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(W * 0.7 + par(0.05), 220, 70, 0, Math.PI * 2); ctx.fill();
    // mountains
    ctx.fillStyle = '#5a2a5a'; ctx.beginPath(); ctx.moveTo(0, GROUND); for (const m of props.mtn) ctx.lineTo(m[0] + par(0.15), m[1]); ctx.lineTo(W, GROUND); ctx.fill();
    // pagoda roof + dojo walls
    ctx.fillStyle = '#3a1a1a'; const px = par(0.35);
    for (let i = -1; i < 3; i++) { const bx = px + i * 700 + 200; ctx.fillRect(bx, 330, 420, 280); ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(bx - 40, 340); ctx.lineTo(bx + 210, 250); ctx.lineTo(bx + 460, 340); ctx.fill(); ctx.fillStyle = '#e8d8b8'; for (let j = 0; j < 4; j++) ctx.fillRect(bx + 30 + j * 100, 380, 60, 120); ctx.fillStyle = '#3a1a1a'; }
    // lanterns
    for (let i = -1; i < 5; i++) { const lx = par(0.6) + i * 500 + 100, ly = 300 + Math.sin(t / 40 + i) * 4; ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.ellipse(lx, ly, 16, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly - 22); ctx.lineTo(lx, ly - 60); ctx.stroke(); }
  } else if (theme === 'city') {
    ctx.fillStyle = '#0d0d24'; for (const b of props.bld) { const bx = b[0] + par(0.2); ctx.fillRect(bx, b[1], b[2], GROUND - b[1]); ctx.fillStyle = '#ffe07a'; for (let y = b[1] + 12; y < GROUND - 10; y += 22) for (let x = bx + 8; x < bx + b[2] - 8; x += 18) if (((x * 7 + y * 13) % 11) < 5) ctx.fillRect(x, y, 8, 10); ctx.fillStyle = '#0d0d24'; }
    for (const n of props.neon) { const nx = n[0] + par(0.45); ctx.fillStyle = n[2]; ctx.shadowColor = n[2]; ctx.shadowBlur = 25 + Math.sin(t / 8 + n[0]) * 8; ctx.fillRect(nx, n[1], n[3], 26); ctx.shadowBlur = 0; ctx.fillStyle = '#000'; ctx.fillRect(nx + 4, n[1] + 4, n[3] - 8, 18); ctx.fillStyle = n[2]; ctx.font = 'bold 14px Arial'; ctx.fillText(n[4], nx + 8, n[1] + 19); }
    ctx.fillStyle = '#1a1a34'; for (let i = -1; i < 4; i++) { const bx = par(0.7) + i * 640; ctx.fillRect(bx, 380, 500, 230); ctx.fillStyle = '#ff2a8a'; ctx.fillRect(bx + 40, 420, 200, 8); ctx.fillStyle = '#2af0ff'; ctx.fillRect(bx + 260, 460, 180, 8); ctx.fillStyle = '#1a1a34'; }
  } else if (theme === 'temple') {
    ctx.fillStyle = '#ffe8a0'; ctx.beginPath(); ctx.arc(W * 0.3 + par(0.05), 180, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a4a1a'; for (let i = -1; i < 4; i++) { const bx = par(0.3) + i * 560 + 100; ctx.fillRect(bx, 380, 320, 230); ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.moveTo(bx + 160, 160); ctx.lineTo(bx + 40, 380); ctx.lineTo(bx + 280, 380); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx + 160, 100); ctx.lineTo(bx + 120, 200); ctx.lineTo(bx + 200, 200); ctx.fill(); ctx.fillStyle = '#c0301a'; ctx.fillRect(bx + 40, 380, 240, 30); ctx.fillStyle = '#8a4a1a'; }
    ctx.fillStyle = '#c8a040'; for (let i = -2; i < 6; i++) { const px = par(0.65) + i * 380 + 40; ctx.fillRect(px, 300, 30, 310); ctx.fillStyle = '#e8c860'; ctx.fillRect(px - 8, 290, 46, 16); ctx.fillStyle = '#c8a040'; }
  } else if (theme === 'desert') {
    ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(W * 0.75 + par(0.05), 150, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8934a'; ctx.beginPath(); ctx.moveTo(0, GROUND); for (const m of props.mtn) ctx.lineTo(m[0] + par(0.12), m[1] + 120); ctx.lineTo(W, GROUND); ctx.fill();
    for (let i = -1; i < 3; i++) { const bx = par(0.3) + i * 800 + 150; ctx.fillStyle = '#b8823a'; ctx.beginPath(); ctx.moveTo(bx, 560); ctx.lineTo(bx + 220, 260); ctx.lineTo(bx + 440, 560); ctx.fill(); ctx.fillStyle = '#9a6a2a'; ctx.beginPath(); ctx.moveTo(bx + 220, 260); ctx.lineTo(bx + 440, 560); ctx.lineTo(bx + 300, 560); ctx.fill(); }
    ctx.fillStyle = '#a07040'; for (let i = -2; i < 6; i++) { const px = par(0.65) + i * 420 + 60; ctx.fillRect(px, 340 + (i % 2) * 60, 44, 300); ctx.fillRect(px - 12, 330 + (i % 2) * 60, 68, 18); }
  } else if (theme === 'ice') {
    ctx.fillStyle = '#e8f8ff'; ctx.beginPath(); ctx.moveTo(0, GROUND); for (const m of props.mtn) ctx.lineTo(m[0] + par(0.15), m[1] - 40); ctx.lineTo(W, GROUND); ctx.fill();
    ctx.fillStyle = '#8fc8f0'; for (let i = -1; i < 4; i++) { const bx = par(0.4) + i * 520; ctx.beginPath(); ctx.moveTo(bx, 610); ctx.lineTo(bx + 90, 300); ctx.lineTo(bx + 200, 610); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx + 220, 610); ctx.lineTo(bx + 280, 400); ctx.lineTo(bx + 360, 610); ctx.fill(); }
    ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 3; for (let i = -1; i < 6; i++) { const cx = par(0.65) + i * 400 + 100; ctx.beginPath(); ctx.moveTo(cx, 610); ctx.lineTo(cx + 30, 470); ctx.lineTo(cx + 70, 610); ctx.stroke(); }
  } else if (theme === 'space') {
    for (const s of props.stars) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t / 30 + s[0]))})`; ctx.fillRect(s[0] + par(0.03), s[1], s[2], s[2]); }
    const pg = ctx.createRadialGradient(W * 0.75 + par(0.06), 260, 20, W * 0.75 + par(0.06), 260, 150); pg.addColorStop(0, '#4a80ff'); pg.addColorStop(0.7, '#1a3a9a'); pg.addColorStop(1, '#0a1a4a'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(W * 0.75 + par(0.06), 260, 150, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a3040'; for (let i = -1; i < 4; i++) { const bx = par(0.4) + i * 600; ctx.fillRect(bx, 250, 480, 360); ctx.fillStyle = '#5a6a80'; ctx.fillRect(bx + 20, 270, 440, 12); ctx.fillStyle = '#00f0ff'; for (let j = 0; j < 6; j++) ctx.fillRect(bx + 40 + j * 70, 320, 40, 90); ctx.fillStyle = '#2a3040'; }
    ctx.fillStyle = '#404858'; for (let i = -2; i < 6; i++) { const px = par(0.7) + i * 380 + 20; ctx.fillRect(px, 280, 36, 330); ctx.fillStyle = '#ff5030'; ctx.fillRect(px + 12, 300 + ((t / 10 + i * 40) % 300), 12, 12); ctx.fillStyle = '#404858'; }
  } else if (theme === 'volcano') {
    ctx.fillStyle = '#2a0a0a'; ctx.beginPath(); ctx.moveTo(0, GROUND); for (const m of props.mtn) ctx.lineTo(m[0] + par(0.12), m[1] - 60); ctx.lineTo(W, GROUND); ctx.fill();
    const lx = W * 0.5 + par(0.12); ctx.fillStyle = '#ff6a20'; ctx.shadowColor = '#ff4000'; ctx.shadowBlur = 40; ctx.beginPath(); ctx.moveTo(lx - 40, 210); ctx.lineTo(lx + 40, 210); ctx.lineTo(lx + 120, 430); ctx.lineTo(lx - 90, 430); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0a0a'; for (let i = -1; i < 4; i++) { const bx = par(0.4) + i * 560 + 80; ctx.beginPath(); ctx.moveTo(bx, 610); ctx.lineTo(bx + 60, 380); ctx.lineTo(bx + 160, 340); ctx.lineTo(bx + 260, 610); ctx.fill(); }
    ctx.fillStyle = '#ff8a30'; for (let i = -2; i < 6; i++) { const px = par(0.65) + i * 400 + 100; const gl = 0.6 + 0.4 * Math.sin(t / 15 + i); ctx.globalAlpha = gl; ctx.fillRect(px, 560, 120, 50); ctx.globalAlpha = 1; }
  } else if (theme === 'abyss') {
    for (const s of props.stars) { ctx.fillStyle = `rgba(200,120,255,${0.3 + 0.5 * Math.abs(Math.sin(t / 20 + s[0]))})`; ctx.fillRect(s[0] + par(0.05), s[1], s[2], s[2]); }
    const mg = ctx.createRadialGradient(W * 0.5 + par(0.05), 250, 10, W * 0.5 + par(0.05), 250, 200); mg.addColorStop(0, '#ff2050'); mg.addColorStop(0.3, '#5a0030'); mg.addColorStop(1, '#00000000'); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(W * 0.5 + par(0.05), 250, 200, 0, Math.PI * 2); ctx.fill();
    if (Math.floor(t / 7) % 23 === 0) { ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 3; ctx.beginPath(); let lx = W * 0.3 + par(0.1) + ((t * 37) % 600), ly = 0; ctx.moveTo(lx, ly); for (let k = 0; k < 8; k++) { lx += rnd(-40, 40); ly += 60; ctx.lineTo(lx, ly); } ctx.stroke(); }
    ctx.fillStyle = '#12061e'; for (let i = -1; i < 5; i++) { const bx = par(0.4) + i * 480; ctx.beginPath(); ctx.moveTo(bx, 610); ctx.lineTo(bx + 60, 250); ctx.lineTo(bx + 120, 610); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx + 200, 610); ctx.lineTo(bx + 240, 340); ctx.lineTo(bx + 300, 610); ctx.fill(); }
    ctx.fillStyle = '#3a1050'; for (let i = -2; i < 6; i++) { const px = par(0.7) + i * 380 + 100; ctx.fillRect(px, 380, 30, 230); ctx.fillStyle = '#ff2050'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 10 + i); ctx.fillRect(px + 8, 360, 14, 14); ctx.globalAlpha = 1; ctx.fillStyle = '#3a1050'; }
  }
  ctx.restore();
}

function makeStageProps(st) {
  const props = { mtn: [], bld: [], neon: [], stars: [] };
  let x = -200; while (x < W + 400) { props.mtn.push([x, GROUND - 200 - Math.random() * 180]); x += 120 + Math.random() * 100; }
  x = -300; while (x < W + 600) { const w = 60 + Math.random() * 120; props.bld.push([x, 150 + Math.random() * 250, w]); x += w + 10; }
  const cols = ['#ff2a8a', '#2af0ff', '#ffe040', '#7a3fff', '#3dff8a'];
  const words = ['RAMEN', 'BAR', 'DOJO', 'NEO', 'FIGHT', 'HOTEL', '24H', 'ARCADE'];
  for (let i = 0; i < 10; i++) props.neon.push([-300 + i * 220 + Math.random() * 80, 300 + Math.random() * 120, cols[i % cols.length], 70 + Math.random() * 60, words[i % words.length]]);
  for (let i = 0; i < 120; i++) props.stars.push([Math.random() * (W + 400) - 200, Math.random() * 500, 1 + Math.random() * 2]);
  return props;
}

// Floor drawn in world space
function drawStageFloor(ctx, st) {
  ctx.fillStyle = st.floor; ctx.fillRect(-400, GROUND, STAGE_W + 800, 400);
  ctx.fillStyle = st.floor2; ctx.fillRect(-400, GROUND + 60, STAGE_W + 800, 340);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  for (let x = 0; x <= STAGE_W; x += 100) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + (x - STAGE_W / 2) * 0.3, GROUND + 60); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-400, GROUND); ctx.lineTo(STAGE_W + 400, GROUND); ctx.stroke();
  // walls
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-60, GROUND - 400, 60, 400); ctx.fillRect(STAGE_W, GROUND - 400, 60, 400);
}

// Ambient particles (screen space)
function drawAmbient(ctx, st, t) {
  const a = st.ambient; ctx.save();
  if (a === 'rain') { ctx.strokeStyle = 'rgba(180,200,255,0.35)'; ctx.lineWidth = 1; for (let i = 0; i < 90; i++) { const x = (i * 137 + t * 9) % (W + 100) - 50, y = (i * 91 + t * 21) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 18); ctx.stroke(); } }
  else if (a === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 70; i++) { const x = (i * 173 + t * 1.2 + Math.sin(t / 30 + i) * 30) % W, y = (i * 97 + t * 1.5) % H; ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
  else if (a === 'embers') { for (let i = 0; i < 50; i++) { const x = (i * 211 + Math.sin(t / 20 + i) * 40) % W, y = H - ((i * 131 + t * 2.5) % H); ctx.fillStyle = `rgba(255,${120 + (i % 5) * 20},40,${0.5 + 0.5 * Math.sin(t / 5 + i)})`; ctx.fillRect(x, y, 3, 3); } }
  else if (a === 'petals') { ctx.fillStyle = 'rgba(255,200,120,0.8)'; for (let i = 0; i < 40; i++) { const x = (i * 191 + t * 1.8 + Math.sin(t / 25 + i) * 40) % (W + 40) - 20, y = (i * 113 + t * 1.1) % H; ctx.beginPath(); ctx.ellipse(x, y, 4, 2, t / 20 + i, 0, Math.PI * 2); ctx.fill(); } }
  else if (a === 'leaves') { ctx.fillStyle = 'rgba(255,120,60,0.7)'; for (let i = 0; i < 30; i++) { const x = (i * 191 + t * 2.2 + Math.sin(t / 25 + i) * 50) % (W + 40) - 20, y = (i * 113 + t * 0.9) % H; ctx.beginPath(); ctx.ellipse(x, y, 5, 3, t / 15 + i, 0, Math.PI * 2); ctx.fill(); } }
  else if (a === 'sand') { ctx.fillStyle = 'rgba(255,230,160,0.5)'; for (let i = 0; i < 60; i++) { const x = (i * 151 + t * 6) % (W + 40) - 20, y = 300 + (i * 89 + Math.sin(t / 10 + i) * 20) % 420; ctx.fillRect(x, y, 3, 1.5); } }
  else if (a === 'void') { for (let i = 0; i < 40; i++) { const x = (i * 211 + Math.sin(t / 20 + i) * 60) % W, y = H - ((i * 131 + t * 1.6) % H); ctx.fillStyle = `rgba(200,80,255,${0.3 + 0.5 * Math.sin(t / 6 + i)})`; ctx.fillRect(x, y, 3, 3); } }
  ctx.restore();
}

// Thumbnails for stage select
const stageThumbs = {};
function getStageThumb(st) {
  if (stageThumbs[st.id]) return stageThumbs[st.id];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const cx = c.getContext('2d');
  drawStageBG(cx, st, STAGE_W / 2, 100, 1);
  cx.save(); cx.translate(0, 0); cx.translate(-(STAGE_W / 2 - W / 2), 0); drawStageFloor(cx, st); cx.restore();
  stageThumbs[st.id] = c; return c;
}

// ---------- Text ----------
function txt(ctx, s, x, y, size, color, align, o) {
  o = o || {};
  ctx.save(); ctx.font = `${o.weight || ''} ${size}px ${o.font || 'Impact, "Arial Black", sans-serif'}`; ctx.textAlign = align || 'left'; ctx.textBaseline = o.base || 'middle';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.stroke) { ctx.lineWidth = o.strokeW || Math.max(2, size / 10); ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.blur || 16; }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
function roundRect(ctx, x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
