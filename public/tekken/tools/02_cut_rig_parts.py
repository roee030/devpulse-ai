# Step 2: cut each main sprite into rig parts using keypoints
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, json, math, colorsys, os
IDS = ['pyros','vex','kade','dorian','silas','thorn','kryll','jax','rook','nyx','warden','dez','ivo','shade','mira','mirage']
KP = json.load(open('rig/keypoints_auto.json'))
MANUAL = {
 'pyros': {'nose':[0.50,0.09],'earL':[0.56,0.09],'earR':[0.44,0.09],
           'shL':[0.72,0.20],'shR':[0.30,0.21],'elL':[0.84,0.27],'elR':[0.19,0.30],'wrL':[0.87,0.32],'wrR':[0.13,0.36],
           'hipL':[0.58,0.47],'hipR':[0.40,0.47],'knL':[0.68,0.68],'knR':[0.31,0.68],'anL':[0.78,0.90],'anR':[0.22,0.90],'ftL':[0.84,0.97],'ftR':[0.16,0.97]},
}
KIND = {'pyros':'golem','thorn':'plant','kryll':'insect','mirage':'phantom'}
ACCENT = {'dorian':'#ff2a2a','rook':'#ffe040','nyx':'#ff40c0','shade':'#a040ff'}
os.makedirs('rig/parts', exist_ok=True)
RIG = {}
def capsule_mask(w, h, A, B, r, ext_end=0.0, ext_start=0.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ax, ay = A; bx, by = B; dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy) or 1
    ux, uy = dx/L, dy/L
    ax2, ay2 = ax - ux*ext_start*L, ay - uy*ext_start*L; bx2, by2 = bx + ux*ext_end*L, by + uy*ext_end*L
    L2 = math.hypot(bx2-ax2, by2-ay2)
    t = ((xx-ax2)*ux + (yy-ay2)*uy); t = np.clip(t, 0, L2)
    px, py = ax2 + ux*t, ay2 + uy*t
    d = np.hypot(xx-px, yy-py)
    return d <= r
def radius(alpha, A, B, w):
    ax, ay = A; bx, by = B; dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy) or 1; nx, ny = -dy/L, dx/L
    ext = []
    for t in (0.35, 0.5, 0.65):
        cx, cy = ax+dx*t, ay+dy*t
        e = 0
        for sgn in (1, -1):
            k = 0
            while k < w*0.25:
                x, y = int(round(cx+nx*k*sgn)), int(round(cy+ny*k*sgn))
                if x < 0 or y < 0 or x >= alpha.shape[1] or y >= alpha.shape[0] or alpha[y, x] < 40: break
                k += 1
            e = max(e, k)
        ext.append(e)
    return float(np.clip(np.median(ext)*1.15 + 3, 7, w*0.22))
def inpaint(rgba, hole):
    rgb = rgba[:,:,:3].astype(np.float32); a = rgba[:,:,3] > 30
    known = a & ~hole; out = rgb.copy(); filled = known.copy()
    for _ in range(40):
        todo = hole & ~filled
        if not todo.any(): break
        # average of filled neighbours
        acc = np.zeros_like(out); cnt = np.zeros(hole.shape, np.float32)
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if dx == 0 and dy == 0: continue
                sh = np.roll(np.roll(out, dy, 0), dx, 1); shf = np.roll(np.roll(filled, dy, 0), dx, 1)
                acc += sh * shf[:,:,None]; cnt += shf
        newly = todo & (cnt > 0)
        out[newly] = acc[newly] / cnt[newly][:,None]; filled |= newly
    res = rgba.copy(); res[:,:,:3] = np.clip(out, 0, 255).astype(np.uint8); res[:,:,3][hole] = 255
    return res
def save_part(rgba, mask, name, pivot, cid):
    m = mask.astype(np.float32)
    mimg = Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
    m = np.asarray(mimg).astype(np.float32)/255
    part = rgba.copy(); part[:,:,3] = (part[:,:,3].astype(np.float32) * m).astype(np.uint8)
    ys, xs = np.where(part[:,:,3] > 8)
    if len(xs) == 0: return None
    x0, x1, y0, y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
    sub = part[y0:y1, x0:x1].astype(np.float32)
    rgb = sub[:,:,:3]
    lum = rgb.mean(2, keepdims=True)
    rgb = lum + (rgb - lum) * 1.18            # a little more saturation
    rgb = np.clip((rgb - 8) * 1.30 + 14, 0, 255)   # lift midtones so fighters read against dark stages
    sub[:,:,:3] = rgb
    img = Image.fromarray(sub.astype(np.uint8)); img.save(f'rig/parts/{cid}_{name}.webp', quality=90, method=6); img.save(f'rig/parts/{cid}_{name}.png')
    return { 'w': int(x1-x0), 'h': int(y1-y0), 'px': float(pivot[0]-x0), 'py': float(pivot[1]-y0) }
def ang(A, B): return math.degrees(math.atan2(B[0]-A[0], B[1]-A[1]))   # 0 = straight down, + = toward +x
for cid in IDS:
    im = Image.open(f'rig/{cid}_main.png').convert('RGBA'); w, h = im.size
    rgba = np.asarray(im).copy()
    kp = MANUAL.get(cid) or {k: v[:2] for k, v in KP[cid]['kp'].items()}
    P = {k: (v[0]*w, v[1]*h) for k, v in kp.items()}
    # ---- weapon removal ----
    if cid in ACCENT:
        hr, hg, hb = [int(ACCENT[cid][i:i+2], 16)/255 for i in (1,3,5)]; hh = colorsys.rgb_to_hsv(hr, hg, hb)[0]
        rgbf = rgba[:,:,:3].astype(np.float32)/255; mx = rgbf.max(2); mn = rgbf.min(2); sat = np.where(mx > 0, (mx-mn)/np.maximum(mx, 1e-6), 0)
        r, g, b = rgbf[:,:,0], rgbf[:,:,1], rgbf[:,:,2]
        hue = np.zeros_like(mx); d = mx - mn + 1e-6
        hue = np.where(mx == r, ((g-b)/d) % 6, np.where(mx == g, (b-r)/d + 2, (r-g)/d + 4)) / 6
        hd = np.minimum(np.abs(hue-hh), 1-np.abs(hue-hh))
        key = (hd < 0.07) & (sat > 0.45) & (mx > 0.72) & (rgba[:,:,3] > 30)
        # only outside the torso box (keep suit seams on the chest)
        tx0 = min(P['shR'][0], P['shL'][0]) + 4; tx1 = max(P['shR'][0], P['shL'][0]) - 4
        yy, xx = np.mgrid[0:h, 0:w]; inside_torso = (xx > tx0) & (xx < tx1) & (yy > min(P['shL'][1], P['shR'][1])) & (yy < max(P['hipL'][1], P['hipR'][1]))
        key &= ~inside_torso
        km = Image.fromarray((key*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)); key = np.asarray(km) > 0
        rgba[:,:,3][key] = 0
    if cid == 'warden':
        yy, xx = np.mgrid[0:h, 0:w]
        A = (0.02*w, 0.50*h); B = (0.86*w, 0.36*h)
        haft = capsule_mask(w, h, A, B, 0.035*h); head = (xx < 0.26*w) & (yy > 0.39*h) & (yy < 0.57*h)
        rem = haft | head
        # keep the hands: pixels near wrists
        hands = capsule_mask(w, h, P['wrL'], P['wrL'], 0.07*w) | capsule_mask(w, h, P['wrR'], P['wrR'], 0.07*w)
        rem &= ~hands
        legs = capsule_mask(w, h, P['hipL'], P['knL'], 0.09*w) | capsule_mask(w, h, P['hipR'], P['knR'], 0.09*w)
        # inpaint where the haft crossed the legs, transparent elsewhere
        rgba = inpaint(rgba, rem & legs)
        rgba[:,:,3][rem & ~legs] = 0
    alpha = rgba[:,:,3]
    A_ = alpha > 30
    neck = ((P['shL'][0]+P['shR'][0])/2, (P['shL'][1]+P['shR'][1])/2 - 0.02*h)
    hipC = ((P['hipL'][0]+P['hipR'][0])/2, (P['hipL'][1]+P['hipR'][1])/2)
    headC = ((P['nose'][0]+P.get('earL',P['nose'])[0]+P.get('earR',P['nose'])[0])/3, (P['nose'][1]+P.get('earL',P['nose'])[1]+P.get('earR',P['nose'])[1])/3)
    # ---- masks ----
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    masks = {}
    for side, tag in (('L','F'), ('R','B')):   # person's left = viewer right = front when facing right
        sh, el, wr, hp, kn, an = P['sh'+side], P['el'+side], P['wr'+side], P['hip'+side], P['kn'+side], P['an'+side]
        ft = P.get('ft'+side, an)
        ru = radius(alpha, sh, el, w); rf = radius(alpha, el, wr, w) * 1.1
        rt = radius(alpha, hp, kn, w); rs = radius(alpha, kn, an, w) * 1.05
        masks['uArm'+tag] = capsule_mask(w, h, sh, el, ru, ext_start=0.30)
        masks['fArm'+tag] = capsule_mask(w, h, el, wr, rf, ext_start=0.22, ext_end=0.85)   # includes the hand
        masks['thigh'+tag] = capsule_mask(w, h, hp, kn, rt, ext_start=0.28)
        shin_end = (an[0] + (ft[0]-an[0])*1.3, an[1] + (ft[1]-an[1])*1.3)
        masks['shin'+tag] = capsule_mask(w, h, kn, an, rs, ext_start=0.18, ext_end=0.32) | capsule_mask(w, h, an, shin_end, rs*1.1)
    ry = math.hypot(headC[0]-neck[0], headC[1]-neck[1]) * 1.45 + 4; rx = max(ry*0.85, abs(P['shL'][0]-P['shR'][0])*0.42)
    head = ((xx-headC[0])**2/rx**2 + (yy-headC[1])**2/ry**2) <= 1
    head |= (yy < neck[1] - 0.03*h) & (np.abs(xx - neck[0]) < abs(P['shL'][0]-P['shR'][0])*0.55)  # crests / horns / hair
    masks['head'] = head
    out = 0.07*w
    torso_poly = Image.new('L', (w, h), 0); ImageDraw.Draw(torso_poly).polygon([(P['shR'][0]-out, P['shR'][1]-0.04*h), (P['shL'][0]+out, P['shL'][1]-0.04*h), (P['hipL'][0]+out*0.9, P['hipL'][1]+0.09*h), (P['hipR'][0]-out*0.9, P['hipR'][1]+0.09*h)], fill=255)
    torso = np.asarray(torso_poly) > 0
    arms = masks['uArmF'] | masks['fArmF'] | masks['uArmB'] | masks['fArmB']
    torso_core = torso & ~arms & ~head
    # inpaint arm-covered torso pixels
    hole = torso & arms & A_
    trgba = inpaint(rgba, hole) if hole.any() else rgba
    legs_all = masks['thighF'] | masks['thighB'] | masks['shinF'] | masks['shinB']
    body_core = arms | head | legs_all | torso
    leftover = A_ & ~body_core
    kind = KIND.get(cid, 'human')
    if kind == 'human':
        # keep only leftovers that hug the body (shoulder pads, coat tails, hair); drop blades, hammers and glows
        km = Image.fromarray((body_core*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(int(max(3, (0.05*h)//2*2+1))))
        keep_zone = np.asarray(km) > 0
        sk = Image.new('L', (w, h), 0)
        ImageDraw.Draw(sk).polygon([(P['hipR'][0]-0.07*w, P['hipR'][1]-0.02*h), (P['hipL'][0]+0.07*w, P['hipL'][1]-0.02*h),
                                    (P['knL'][0]+0.06*w, P['knL'][1]+0.10*h), (P['knR'][0]-0.06*w, P['knR'][1]+0.10*h)], fill=255)
        keep_zone |= np.asarray(sk) > 0
        bx = np.where(body_core.any(0))[0]; bxmin, bxmax = bx.min()-0.035*w, bx.max()+0.035*w
        lab = np.zeros((h, w), np.int32); nlab = 0
        idx = np.argwhere(leftover)
        seen = np.zeros((h, w), bool)
        for sy, sx in idx:
            if seen[sy, sx]: continue
            nlab += 1; stack = [(sy, sx)]; seen[sy, sx] = True; comp = []
            while stack:
                y, x = stack.pop(); comp.append((y, x)); lab[y, x] = nlab
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx2 = y+dy, x+dx
                        if 0 <= ny < h and 0 <= nx2 < w and leftover[ny, nx2] and not seen[ny, nx2]:
                            seen[ny, nx2] = True; stack.append((ny, nx2))
            comp = np.array(comp)
            inside = keep_zone[comp[:,0], comp[:,1]].mean()
            outx = ((comp[:,1] < bxmin) | (comp[:,1] > bxmax)).mean()
            if inside < 0.6 or outx > 0.05 or len(comp) > 0.10*w*h:
                leftover[comp[:,0], comp[:,1]] = False
                rgba[:,:,3][comp[:,0], comp[:,1]] = 0
        alpha = rgba[:,:,3]; A_ = alpha > 30
    torso_mask = (torso & ~head) | leftover  # leftovers (pads, coat tails, tendrils, extra limbs) ride with the torso
    # ---- save parts ----
    parts = {}
    def seg(name, A, B, mask, src=None):
        r = save_part(src if src is not None else rgba, mask & (alpha > 0), name, A, cid)
        if r: r.update({ 'ang': ang(A, B), 'len': math.hypot(B[0]-A[0], B[1]-A[1]) }); parts[name] = r
    for side, tag in (('L','F'), ('R','B')):
        sh, el, wr, hp, kn, an = P['sh'+side], P['el'+side], P['wr'+side], P['hip'+side], P['kn'+side], P['an'+side]
        seg('uArm'+tag, sh, el, masks['uArm'+tag]); seg('fArm'+tag, el, wr, masks['fArm'+tag])
        seg('thigh'+tag, hp, kn, masks['thigh'+tag]); seg('shin'+tag, kn, an, masks['shin'+tag])
    seg('head', neck, headC, masks['head']); seg('torso', hipC, neck, torso_mask, trgba)
    RIG[cid] = { 'w': w, 'h': h, 'parts': parts,
      'joints': { k: [P[k][0]-hipC[0], P[k][1]-hipC[1]] for k in ('shL','shR','hipL','hipR') }, 'neck': [neck[0]-hipC[0], neck[1]-hipC[1]], 'hipC': [hipC[0], hipC[1]],
      'feetY': max(P['anL'][1], P['anR'][1]) }
    print(cid, 'parts', len(parts), flush=True)
json.dump(RIG, open('rig/rig.json', 'w'))
print('RIG DONE')
