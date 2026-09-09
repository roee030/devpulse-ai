# Cut each figure into rig parts with proper joint discs so limbs stay connected when they rotate.
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, json, math, colorsys, os
from scipy import ndimage
IDS = ['pyros','vex','kade','dorian','silas','thorn','kryll','jax','rook','nyx','warden','dez','ivo','shade','mira','mirage']
KIND = {'pyros':'golem','thorn':'plant','kryll':'insect','mirage':'phantom'}
# per-id energy colour, used to strip a baked-in glowing weapon before cutting.
# build_rig() also takes an `accent` argument for one-off fighters.
ACCENT = {'dorian':'#ff2a2a','rook':'#ffe040','nyx':'#ff40c0','shade':'#a040ff'}
MANUAL = {
 'pyros': {'nose':[0.50,0.09],'earL':[0.56,0.09],'earR':[0.44,0.09],'shL':[0.72,0.20],'shR':[0.30,0.21],
           'elL':[0.84,0.27],'elR':[0.19,0.30],'wrL':[0.87,0.32],'wrR':[0.13,0.36],
           'hipL':[0.58,0.47],'hipR':[0.40,0.47],'knL':[0.68,0.68],'knR':[0.31,0.68],
           'anL':[0.78,0.90],'anR':[0.22,0.90],'ftL':[0.84,0.97],'ftR':[0.16,0.97]},
}

def capsule(w, h, A, B, r, ext_start=0.0, ext_end=0.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ax, ay = A; bx, by = B; dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy) or 1
    ux, uy = dx/L, dy/L
    ax2, ay2 = ax - ux*ext_start*L, ay - uy*ext_start*L
    bx2, by2 = bx + ux*ext_end*L, by + uy*ext_end*L
    L2 = math.hypot(bx2-ax2, by2-ay2)
    t = np.clip((xx-ax2)*ux + (yy-ay2)*uy, 0, L2)
    return np.hypot(xx - (ax2+ux*t), yy - (ay2+uy*t)) <= r

def taper(w, h, A, B, rA, rB, rMid=None, ext_end=0.0):
    """capsule whose radius runs from rA at A to rB at B (with an optional mid bulge)"""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ax, ay = A; bx, by = B; dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy) or 1
    ux, uy = dx/L, dy/L
    L2 = L * (1.0 + ext_end)
    t = np.clip((xx-ax)*ux + (yy-ay)*uy, 0, L2)
    d = np.hypot(xx-(ax+ux*t), yy-(ay+uy*t))
    u = np.clip(t / L, 0, 1)
    r = rA + (rB-rA)*u
    if rMid:
        bulge = max(0.0, rMid - (rA+rB)*0.5)
        r = r + bulge * 4 * u * (1-u)
    return d <= r

def disc(w, h, C, r):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return np.hypot(xx-C[0], yy-C[1]) <= r

def half_width(alpha, A, B, t, w):
    """perpendicular half-width of the silhouette at parameter t along bone A->B"""
    ax, ay = A; bx, by = B; dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy) or 1
    nx, ny = -dy/L, dx/L
    cx, cy = ax+dx*t, ay+dy*t
    ext = 0
    for sgn in (1, -1):
        k = 0
        while k < w*0.3:
            x, y = int(round(cx+nx*k*sgn)), int(round(cy+ny*k*sgn))
            if x < 0 or y < 0 or x >= alpha.shape[1] or y >= alpha.shape[0] or alpha[y, x] < 40: break
            k += 1
        ext = max(ext, k)
    return float(ext)

def inpaint(rgba, hole):
    rgb = rgba[:,:,:3].astype(np.float32); a = rgba[:,:,3] > 30
    out = rgb.copy(); filled = a & ~hole
    for _ in range(60):
        todo = hole & ~filled
        if not todo.any(): break
        acc = np.zeros_like(out); cnt = np.zeros(hole.shape, np.float32)
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if dx == 0 and dy == 0: continue
                sh = np.roll(np.roll(out, dy, 0), dx, 1); shf = np.roll(np.roll(filled, dy, 0), dx, 1)
                acc += sh * shf[:,:,None]; cnt += shf
        newly = todo & (cnt > 0)
        out[newly] = acc[newly] / cnt[newly][:,None]; filled |= newly
    res = rgba.copy(); res[:,:,:3] = np.clip(out,0,255).astype(np.uint8); res[:,:,3][hole] = 255
    return res

def boost(rgba):
    a = rgba.astype(np.float32); rgb = a[:,:,:3]; lum = rgb.mean(2, keepdims=True)
    a[:,:,:3] = np.clip((lum + (rgb-lum)*1.10) * 1.10 + 5, 0, 255)
    return a.astype(np.uint8)

def save_part(rgba, mask, name, pivot, cid, feather=1.0, parts_dir='rig/parts'):
    m = np.asarray(Image.fromarray((mask.astype(np.uint8))*255).filter(ImageFilter.GaussianBlur(feather))).astype(np.float32)/255
    part = rgba.copy(); part[:,:,3] = (part[:,:,3].astype(np.float32)*m).astype(np.uint8)
    # drop stray specks: keep the blob under the pivot plus any other substantial blob
    solid = part[:,:,3] > 24
    lab, n = ndimage.label(solid, structure=np.ones((3,3)))
    if n > 1:
        sizes = ndimage.sum(solid, lab, range(1, n+1))
        big = sizes.max()
        px, py = int(round(pivot[0])), int(round(pivot[1]))
        keepL = set()
        if 0 <= py < lab.shape[0] and 0 <= px < lab.shape[1] and lab[py, px]: keepL.add(int(lab[py, px]))
        for i, sz in enumerate(sizes, start=1):
            if sz >= max(60, big*0.12): keepL.add(i)
        if keepL:
            drop = ~np.isin(lab, list(keepL)) & solid
            part[:,:,3][drop] = 0
            part[:,:,3][(part[:,:,3] <= 24) & (part[:,:,3] > 0) & drop] = 0
    ys, xs = np.where(part[:,:,3] > 8)
    if len(xs) == 0: return None
    x0,x1,y0,y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
    img = Image.fromarray(boost(part[y0:y1, x0:x1]))
    os.makedirs(parts_dir, exist_ok=True)
    img.save(f'{parts_dir}/{cid}_{name}.webp', quality=92, method=6)
    return {'w':int(x1-x0), 'h':int(y1-y0), 'px':round(float(pivot[0]-x0),2), 'py':round(float(pivot[1]-y0),2)}

def ang(A, B): return round(math.degrees(math.atan2(B[0]-A[0], B[1]-A[1])), 2)

def build_rig(main_png, cid, keypoints, parts_dir='rig/parts', kind='human', accent=None):
    """Cut one cleaned figure into 10 rig parts. Returns the rig.json entry."""
    ACCENT_LOCAL = dict(ACCENT)
    if accent: ACCENT_LOCAL[cid] = accent
    im = Image.open(main_png).convert('RGBA'); w, h = im.size
    rgba = np.asarray(im).copy()
    kp = {k: (v[:2] if isinstance(v, (list, tuple)) else v) for k, v in keypoints.items()}
    P = {k: (v[0]*w, v[1]*h) for k, v in kp.items()}
    alpha = rgba[:,:,3]; A_ = alpha > 30
    neck = ((P['shL'][0]+P['shR'][0])/2, (P['shL'][1]+P['shR'][1])/2 - 0.02*h)
    hipC = ((P['hipL'][0]+P['hipR'][0])/2, (P['hipL'][1]+P['hipR'][1])/2)
    headC = ((P['nose'][0]+P.get('earL',P['nose'])[0]+P.get('earR',P['nose'])[0])/3,
             (P['nose'][1]+P.get('earL',P['nose'])[1]+P.get('earR',P['nose'])[1])/3)

    # ---- bone widths and joint radii ----
    bones = {}
    for side in ('L','R'):
        bones['uArm'+side] = (P['sh'+side], P['el'+side])
        bones['fArm'+side] = (P['el'+side], P['wr'+side])
        bones['thigh'+side] = (P['hip'+side], P['kn'+side])
        bones['shin'+side] = (P['kn'+side], P['an'+side])
    BW = {}
    for n,(A,B) in bones.items():
        BW[n] = {'a': half_width(alpha,A,B,0.22,w), 'b': half_width(alpha,A,B,0.78,w), 'm': half_width(alpha,A,B,0.5,w)}
    # A limb width measured straight off the silhouette is wrong whenever the arm rests against
    # the torso: the ray marches across the whole body. Cap every radius by the bone's own length
    # and by a fraction of the figure height, so a part can never swallow the body next to it.
    CAP = {'uArm': 0.085, 'fArm': 0.075, 'thigh': 0.115, 'shin': 0.095}
    for nm in list(BW):
        base, side = nm[:-1], nm[-1]
        A, B = bones[nm]
        blen = math.hypot(B[0]-A[0], B[1]-A[1])
        lim = min(0.60 * blen, CAP[base] * h)
        for key in ('a','b','m'):
            BW[nm][key] = min(BW[nm][key], lim)
    JR = {}
    for side in ('L','R'):
        # a joint radius must fit inside the silhouette on BOTH sides, so limbs meet exactly with no gap and no stub
        JR['sh'+side]  = max(6.0, min(BW['uArm'+side]['a'], 0.085*h) * 0.98)
        JR['el'+side]  = max(5.0, min(BW['uArm'+side]['b'], BW['fArm'+side]['a']) * 0.98)
        JR['wr'+side]  = max(4.5, BW['fArm'+side]['b'] * 1.0)
        JR['hip'+side] = max(6.5, min(BW['thigh'+side]['a'], 0.085*h) * 0.98)
        JR['kn'+side]  = max(5.5, min(BW['thigh'+side]['b'], BW['shin'+side]['a']) * 0.98)
        JR['an'+side]  = max(4.5, BW['shin'+side]['b'] * 1.0)
    JR['neck'] = max(5.0, half_width(alpha, neck, headC, 0.12, w) * 0.98)

    masks = {}
    for side, tag in (('L','F'), ('R','B')):
        sh, el, wr, hp, kn, an = (P['sh'+side], P['el'+side], P['wr'+side], P['hip'+side], P['kn'+side], P['an'+side])
        ft = P.get('ft'+side, an)
        # parent bones taper from one joint radius to the next; the child repeats the joint disc so rotation never opens a seam
        masks['uArm'+tag] = taper(w,h,sh,el, JR['sh'+side], JR['el'+side], BW['uArm'+side]['m']) | disc(w,h,sh,JR['sh'+side]) | disc(w,h,el,JR['el'+side])
        masks['thigh'+tag] = taper(w,h,hp,kn, JR['hip'+side], JR['kn'+side], BW['thigh'+side]['m']) | disc(w,h,hp,JR['hip'+side]) | disc(w,h,kn,JR['kn'+side])
        hand = (wr[0] + (wr[0]-el[0])*0.42, wr[1] + (wr[1]-el[1])*0.42)
        masks['fArm'+tag] = (taper(w,h,el,wr, JR['el'+side], JR['wr'+side], BW['fArm'+side]['m'])
                             | disc(w,h,el,JR['el'+side]) | disc(w,h,wr, JR['wr'+side]*1.35) | disc(w,h,hand, JR['wr'+side]*1.25))
        sole = (an[0] + (ft[0]-an[0])*1.45, an[1] + (ft[1]-an[1])*1.45)
        masks['shin'+tag] = (taper(w,h,kn,an, JR['kn'+side], JR['an'+side], BW['shin'+side]['m'])
                             | disc(w,h,kn,JR['kn'+side]) | taper(w,h,an,sole, JR['an'+side]*1.15, JR['an'+side]*1.0) | disc(w,h,an, JR['an'+side]*1.2))
    # head with a neck disc
    ry = math.hypot(headC[0]-neck[0], headC[1]-neck[1])*1.5 + 5
    rx = max(ry*0.86, abs(P['shL'][0]-P['shR'][0])*0.44)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    head = ((xx-headC[0])**2/rx**2 + (yy-headC[1])**2/ry**2) <= 1
    head |= (yy < neck[1]-0.03*h) & (np.abs(xx-neck[0]) < abs(P['shL'][0]-P['shR'][0])*0.55)
    head |= disc(w,h,neck,JR['neck']) | taper(w,h,neck,headC, JR['neck'], JR['neck']*1.3)
    masks['head'] = head
    # torso polygon reaching over both shoulders and hips
    out = 0.055*w
    poly = Image.new('L',(w,h),0)
    ImageDraw.Draw(poly).polygon([(P['shR'][0]-out,P['shR'][1]-0.05*h),(P['shL'][0]+out,P['shL'][1]-0.05*h),
                                  (P['hipL'][0]+out*0.95,P['hipL'][1]+0.10*h),(P['hipR'][0]-out*0.95,P['hipR'][1]+0.10*h)], fill=255)
    torso = (np.asarray(poly) > 0)
    for side in ('L','R'):
        torso |= disc(w,h,P['sh'+side], JR['sh'+side]) | disc(w,h,P['hip'+side], JR['hip'+side])
    torso |= capsule(w,h,hipC,neck, min(max(abs(P['shL'][0]-P['shR'][0])*0.5, 0.09*w)*0.72, 0.16*h))

    arms = masks['uArmF']|masks['fArmF']|masks['uArmB']|masks['fArmB']
    legs = masks['thighF']|masks['shinF']|masks['thighB']|masks['shinB']
    body_core = arms | head | legs | torso
    leftover = A_ & ~body_core
    if kind == 'human':
        km = Image.fromarray((body_core*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(int(max(3,(0.05*h)//2*2+1))))
        keep = np.asarray(km) > 0
        sk = Image.new('L',(w,h),0)
        ImageDraw.Draw(sk).polygon([(P['hipR'][0]-0.07*w,P['hipR'][1]-0.02*h),(P['hipL'][0]+0.07*w,P['hipL'][1]-0.02*h),
                                    (P['knL'][0]+0.06*w,P['knL'][1]+0.10*h),(P['knR'][0]-0.06*w,P['knR'][1]+0.10*h)], fill=255)
        keep |= np.asarray(sk) > 0
        bx = np.where(body_core.any(0))[0]; bmin, bmax = bx.min()-0.035*w, bx.max()+0.035*w
        seen = np.zeros((h,w), bool)
        for sy, sx in np.argwhere(leftover):
            if seen[sy,sx]: continue
            stack=[(sy,sx)]; seen[sy,sx]=True; comp=[]
            while stack:
                y,x = stack.pop(); comp.append((y,x))
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        ny,nx2 = y+dy,x+dx
                        if 0<=ny<h and 0<=nx2<w and leftover[ny,nx2] and not seen[ny,nx2]:
                            seen[ny,nx2]=True; stack.append((ny,nx2))
            comp = np.array(comp)
            inside = keep[comp[:,0],comp[:,1]].mean()
            outx = ((comp[:,1]<bmin)|(comp[:,1]>bmax)).mean()
            if inside < 0.6 or outx > 0.05 or len(comp) > 0.10*w*h:
                leftover[comp[:,0],comp[:,1]] = False
                rgba[:,:,3][comp[:,0],comp[:,1]] = 0
        alpha = rgba[:,:,3]; A_ = alpha > 30
    hole = torso & arms & A_
    trgba = inpaint(rgba, hole) if hole.any() else rgba
    torso_mask = (torso & ~head) | leftover

    parts = {}
    def seg(name, A, B, mask, src=None):
        r = save_part(src if src is not None else rgba, mask & (alpha > 0), name, A, cid, parts_dir=parts_dir)
        if r: r.update({'ang': ang(A,B), 'len': round(math.hypot(B[0]-A[0], B[1]-A[1]), 2)}); parts[name] = r
    for side, tag in (('L','F'), ('R','B')):
        seg('uArm'+tag, P['sh'+side], P['el'+side], masks['uArm'+tag])
        seg('fArm'+tag, P['el'+side], P['wr'+side], masks['fArm'+tag])
        seg('thigh'+tag, P['hip'+side], P['kn'+side], masks['thigh'+tag])
        seg('shin'+tag, P['kn'+side], P['an'+side], masks['shin'+tag])
    seg('head', neck, headC, masks['head'])
    seg('torso', hipC, neck, torso_mask, trgba)
    sole_y = max(P['anL'][1], P['anR'][1])
    entry = {'w': w, 'h': h, 'parts': parts,
                'joints': {k: [round(P[k][0]-hipC[0],2), round(P[k][1]-hipC[1],2)] for k in ('shL','shR','hipL','hipR')},
                'neck': [round(neck[0]-hipC[0],2), round(neck[1]-hipC[1],2)],
                'sole': round(h - sole_y, 2), 'jr': {k: round(v,2) for k,v in JR.items()}}
    return entry
