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

// ---------- Fighter drawing ----------
const LIMB = { thigh: 56, shin: 54, torso: 66, neck: 8, headR: 17, upper: 42, lower: 40 };

function drawFighter(ctx, ch, pose, x, feetY, facing, scaleOverride, opts) {
  opts = opts || {};
  const body = ch.body, s = (scaleOverride || 0.86) * body.h, wScale = body.w;
  const c = opts.flash ? { skin:'#fff', top:'#fff', bottom:'#fff', hair:'#fff', accent:'#fff', shoe:'#fff', glove:'#fff', mask:'#fff', wrap:'#fff' } : ch.colors;
  const style = STYLES[ch.style];
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(facing * s, s);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const hipY = -(LIMB.thigh + LIMB.shin) + (pose.hy || 0);
  const hip = { x: 0, y: hipY };
  const tor = (pose.tor || 0) * DEG;
  const sh = { x: hip.x + Math.sin(tor) * LIMB.torso, y: hip.y - Math.cos(tor) * LIMB.torso };
  const headA = tor + (pose.head || 0) * DEG;
  const headC = { x: sh.x + Math.sin(headA) * (LIMB.neck + LIMB.headR), y: sh.y - Math.cos(headA) * (LIMB.neck + LIMB.headR) };

  const limb = (start, a, len, col, width) => {
    const rad = a * DEG, end = { x: start.x + Math.sin(rad) * len, y: start.y + Math.cos(rad) * len };
    ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    return end;
  };
  const leg = (angles, hx, front) => {
    const k = limb({ x: hx, y: hip.y }, angles[0], LIMB.thigh, c.bottom, 17 * wScale);
    const f = limb(k, angles[0] + angles[1], LIMB.shin, c.bottom, 15 * wScale);
    // foot
    const fa = (angles[0] + angles[1]) * DEG;
    ctx.strokeStyle = c.shoe; ctx.lineWidth = 11 * wScale; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(fa) * 14 + 4, f.y - Math.sin(fa) * 14); ctx.stroke();
    return f;
  };
  const arm = (angles, front, open) => {
    const sx = sh.x, sy = sh.y + 6;
    const sleeve = c.top === c.skin ? c.skin : c.top;
    const e = limb({ x: sx, y: sy }, angles[0], LIMB.upper, sleeve, 13 * wScale);
    const abs = angles[0] + angles[1];
    const h = limb(e, abs, LIMB.lower, c.wrap && front ? c.wrap : c.skin, 11 * wScale);
    // hand
    ctx.fillStyle = c.glove || c.skin;
    ctx.beginPath(); ctx.arc(h.x, h.y, (c.glove ? 9 : 7) * wScale, 0, Math.PI * 2); ctx.fill();
    if (open) { ctx.strokeStyle = c.skin; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + Math.sin(abs * DEG) * 10, h.y + Math.cos(abs * DEG) * 10); ctx.stroke(); }
    // weapon (bokken) in front hand
    if (front && style.weapon === 'bokken' && !opts.flash) {
      const wa = abs * DEG; ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 6; ctx.beginPath();
      ctx.moveTo(h.x - Math.sin(wa) * 10, h.y - Math.cos(wa) * 10); ctx.lineTo(h.x + Math.sin(wa) * 80, h.y + Math.cos(wa) * 80); ctx.stroke();
    }
    return h;
  };

  // aura when meter full
  if (opts.aura) {
    const g = ctx.createRadialGradient(sh.x, sh.y, 10, sh.x, sh.y, 120); g.addColorStop(0, opts.aura + 'aa'); g.addColorStop(1, opts.aura + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sh.x, sh.y, 120, 0, Math.PI * 2); ctx.fill();
  }

  // back limbs
  leg(pose.lB, -6, false);
  arm(pose.aB, false, pose.open);
  // torso
  ctx.strokeStyle = c.top; ctx.lineWidth = 34 * wScale; ctx.beginPath(); ctx.moveTo(hip.x, hip.y + 4); ctx.lineTo(sh.x, sh.y); ctx.stroke();
  // belt / trunks
  ctx.strokeStyle = c.bottom; ctx.lineWidth = 30 * wScale; ctx.beginPath(); ctx.moveTo(hip.x, hip.y + 8); ctx.lineTo(hip.x + Math.sin(tor) * 12, hip.y - Math.cos(tor) * 12); ctx.stroke();
  ctx.strokeStyle = c.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hip.x - 15 * wScale, hip.y - Math.cos(tor) * 10 + 2); ctx.lineTo(hip.x + 15 * wScale, hip.y - Math.cos(tor) * 10 - 2); ctx.stroke();
  // head
  drawHead(ctx, c, body.head, headC, headA, wScale, opts.flash);
  // front limbs
  leg(pose.lF, 6, true);
  arm(pose.aF, true, pose.open);
  ctx.restore();
}

function drawHead(ctx, c, type, hc, a, w, flash) {
  const r = LIMB.headR;
  ctx.save(); ctx.translate(hc.x, hc.y); ctx.rotate(a);
  // hair behind
  ctx.fillStyle = c.hair;
  if (type === 'afro') { ctx.beginPath(); ctx.arc(0, -3, r + 11, 0, Math.PI * 2); ctx.fill(); }
  if (type === 'long' || type === 'ponytail') { ctx.beginPath(); ctx.ellipse(-8, 8, 10, 22, 0.3, 0, Math.PI * 2); ctx.fill(); }
  if (type === 'viking') { ctx.beginPath(); ctx.ellipse(-8, 8, 12, 20, 0.2, 0, Math.PI * 2); ctx.fill(); }
  // face
  if (type === 'robot') {
    ctx.fillStyle = c.skin; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = flash ? '#fff' : c.accent; ctx.fillRect(-r + 3, -6, r * 2 - 3, 7);
    ctx.fillStyle = c.top; ctx.fillRect(-r, -r, r * 2, 5);
  } else if (type === 'alien') {
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.ellipse(0, -4, r - 1, r + 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#111'; ctx.beginPath(); ctx.ellipse(6, -2, 6, 9, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-4, -2, 4, 7, 0.4, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    if (type === 'mask') { ctx.fillStyle = c.mask; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = c.skin; ctx.beginPath(); ctx.ellipse(7, -2, 5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = c.hair; ctx.beginPath(); ctx.moveTo(-6, -r); ctx.lineTo(0, -r - 10); ctx.lineTo(6, -r); ctx.fill(); }
    else if (type === 'hood') { ctx.fillStyle = c.top; ctx.beginPath(); ctx.arc(0, 0, r + 3, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(r + 3, 8); ctx.lineTo(-r - 3, 8); ctx.fill(); ctx.fillStyle = c.top; ctx.fillRect(-r, 3, r * 2, 10); }
    else if (type === 'horns') { ctx.fillStyle = c.hair; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-18, -34); ctx.lineTo(-2, -16); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(18, -34); ctx.lineTo(2, -16); ctx.fill(); }
    // hair
    ctx.fillStyle = c.hair;
    if (type === 'short' || type === 'ponytail' || type === 'long' || type === 'beard' || type === 'topknot' || type === 'bun') { ctx.beginPath(); ctx.arc(0, -2, r + 1, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(r - 4, -6); ctx.lineTo(-r + 2, -4); ctx.fill(); }
    if (type === 'spiky' || type === 'mohawk') { for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 6 - 4, -r + 6); ctx.lineTo(i * 6, -r - 14 - (type === 'mohawk' ? 6 : 0)); ctx.lineTo(i * 6 + 4, -r + 6); ctx.fill(); } }
    if (type === 'topknot') { ctx.beginPath(); ctx.arc(-2, -r - 6, 7, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'bun') { ctx.beginPath(); ctx.arc(-6, -r - 2, 8, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'beard') { ctx.beginPath(); ctx.arc(2, 6, r - 3, 0.1, Math.PI - 0.1); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, 16, 8, 10, 0, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'viking') { ctx.fillStyle = '#7a7a7a'; ctx.beginPath(); ctx.arc(0, -3, r + 2, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = c.hair; ctx.beginPath(); ctx.ellipse(4, 14, 9, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8e8d0'; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-26, -26); ctx.lineTo(-8, -14); ctx.fill(); }
    // eye
    if (type !== 'mask') { ctx.fillStyle = flash ? '#fff' : '#222'; ctx.beginPath(); ctx.ellipse(8, -2, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    // eyebrow
    ctx.strokeStyle = flash ? '#fff' : (c.hair === '#111' ? '#111' : '#333'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(12, -6); ctx.stroke();
  }
  ctx.restore();
}

// Portrait into a rect (bust)
function drawPortrait(ctx, ch, x, y, w, h, bg) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bg || '#222'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, STYLES[ch.style].fx + '55'); g.addColorStop(1, '#00000000'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const s = h / 150;
  drawFighter(ctx, ch, P.idle, x + w * 0.5 - 8 * s, y + h * 0.12 + 220 * s, 1, s / ch.body.h);
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
