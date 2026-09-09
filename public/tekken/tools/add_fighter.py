#!/usr/bin/env python3
"""Add one fighter to Iron Fist Legends from a single image.

    python3 tools/add_fighter.py --image photo.png --id vega --name "Vega Cross"

It removes the background, finds the body keypoints, cuts the figure into the same 10 rig
parts every other fighter uses, merges the result into rig/rig.json, writes the portrait,
saves a keypoint review image, and prints a ready-to-paste CHARACTERS entry.

If the automatic keypoints are wrong (stylised or non-human figures), open the review image,
write the corrected points as fractions of the image into a JSON file and pass --kp that file:

    {"nose":[0.50,0.09], "earL":[0.56,0.09], "earR":[0.44,0.09],
     "shL":[0.72,0.20], "shR":[0.30,0.21], "elL":[0.84,0.27], "elR":[0.19,0.30],
     "wrL":[0.87,0.32], "wrR":[0.13,0.36], "hipL":[0.58,0.47], "hipR":[0.40,0.47],
     "knL":[0.68,0.68], "knR":[0.31,0.68], "anL":[0.78,0.90], "anR":[0.22,0.90],
     "ftL":[0.84,0.97], "ftR":[0.16,0.97]}

L is the figure's own left, which is on the viewer's right when it faces the camera.
"""
import argparse, json, os, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rigcut

KEY_NAMES = ['nose', 'earL', 'earR', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR',
             'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR', 'ftL', 'ftR']
MP_INDEX = {0: 'nose', 7: 'earL', 8: 'earR', 11: 'shL', 12: 'shR', 13: 'elL', 14: 'elR',
            15: 'wrL', 16: 'wrR', 23: 'hipL', 24: 'hipR', 25: 'knL', 26: 'knR',
            27: 'anL', 28: 'anR', 31: 'ftL', 32: 'ftR'}
SKELETON = [('shL', 'shR'), ('shL', 'elL'), ('elL', 'wrL'), ('shR', 'elR'), ('elR', 'wrR'),
            ('shL', 'hipL'), ('shR', 'hipR'), ('hipL', 'hipR'), ('hipL', 'knL'), ('knL', 'anL'),
            ('hipR', 'knR'), ('knR', 'anR'), ('anL', 'ftL'), ('anR', 'ftR')]


def cutout(image_path, out_png, upscale=2):
    """Remove the background and trim to the figure."""
    from rembg import remove, new_session
    im = Image.open(image_path).convert('RGB')
    if upscale != 1:
        im = im.resize((im.width * upscale, im.height * upscale), Image.LANCZOS)
    out = remove(im, session=new_session('u2net'), alpha_matting=True,
                 alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=15,
                 alpha_matting_erode_size=8)
    a = np.asarray(out)
    ys, xs = np.where(a[:, :, 3] > 30)
    if len(xs) == 0:
        raise SystemExit('nothing left after background removal - is the subject clear of the frame?')
    trimmed = out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    os.makedirs(os.path.dirname(out_png) or '.', exist_ok=True)
    trimmed.save(out_png)
    return trimmed


def detect_keypoints(sprite, model):
    """MediaPipe pose landmarks, returned as fractions of the sprite."""
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    det = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=model), num_poses=1,
        min_pose_detection_confidence=0.2, min_pose_presence_confidence=0.2))
    w, h, pad = sprite.width, sprite.height, 60
    bg = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (110, 110, 110, 255))
    bg.alpha_composite(sprite, (pad, pad))
    big = bg.convert('RGB').resize(((w + 2 * pad) * 2, (h + 2 * pad) * 2), Image.LANCZOS)
    res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB,
                              data=np.ascontiguousarray(np.asarray(big))))
    if not res.pose_landmarks:
        return None, 0.0
    lm = res.pose_landmarks[0]
    kp, vis = {}, []
    for i, name in MP_INDEX.items():
        kp[name] = [round((lm[i].x * big.width / 2 - pad) / w, 3),
                    round((lm[i].y * big.height / 2 - pad) / h, 3)]
        vis.append(lm[i].visibility)
    return kp, float(np.mean(vis))


def review_image(sprite, kp, path):
    s = 620 / sprite.height
    w = int(sprite.width * s)
    canvas = Image.new('RGB', (w + 60, 660), (26, 26, 34))
    canvas.paste(sprite.resize((w, 620)).convert('RGB'), (30, 20), sprite.resize((w, 620)))
    d = ImageDraw.Draw(canvas)
    P = lambda n: (30 + kp[n][0] * w, 20 + kp[n][1] * 620)
    for a, b in SKELETON:
        if a in kp and b in kp:
            d.line([P(a), P(b)], fill=(80, 255, 120), width=3)
    for n in kp:
        x, y = P(n)
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(255, 60, 60))
        d.text((x + 6, y - 6), n, fill=(255, 220, 120))
    canvas.save(path)


def validate(kp, size=None):
    """The rig assumes a full-body, front-facing, standing figure. Catch unsuitable photos early.

    Thresholds are calibrated against the 16 shipped fighters, whose worst values are
    thigh/shin length symmetry 0.13, leg-to-torso ratio 1.32-1.62 and hip-to-shoulder
    width 0.43-0.67. A side view or a lunge foreshortens one leg and breaks these.
    """
    w, h = size or (1.0, 1.0)
    mid = lambda a, b: [(kp[a][0] + kp[b][0]) / 2, (kp[a][1] + kp[b][1]) / 2]
    hipC, shC = mid('hipL', 'hipR'), mid('shL', 'shR')
    ankle = max(kp['anL'][1], kp['anR'][1])
    seg = lambda a, b: ((kp[a][0] - kp[b][0]) * w) ** 2 + ((kp[a][1] - kp[b][1]) * h) ** 2
    ln = lambda a, b: seg(a, b) ** 0.5
    sym = lambda a, b: abs(a - b) / max(a, b, 1e-6)
    thighSym = sym(ln('hipL', 'knL'), ln('hipR', 'knR'))
    shinSym = sym(ln('knL', 'anL'), ln('knR', 'anR'))
    torso = (ln('shL', 'hipL') + ln('shR', 'hipR')) / 2
    leg = (ln('hipL', 'knL') + ln('knL', 'anL') + ln('hipR', 'knR') + ln('knR', 'anR')) / 2
    legTorso = leg / max(torso, 1e-6)
    hipShoulder = abs(kp['hipL'][0] - kp['hipR'][0]) / max(abs(kp['shL'][0] - kp['shR'][0]), 1e-6)
    checks = [
        ('facing the camera, not away or side-on (left shoulder on the viewer right)',
         kp['shL'][0] > kp['shR'][0] and kp['hipL'][0] > kp['hipR'][0]),
        (f'both thighs the same length in view ({thighSym:.2f} <= 0.22)', thighSym <= 0.22),
        (f'both shins the same length in view ({shinSym:.2f} <= 0.22)', shinSym <= 0.22),
        (f'leg to torso proportion ({legTorso:.2f} in 1.15-1.85)', 1.15 <= legTorso <= 1.85),
        (f'hip to shoulder width ({hipShoulder:.2f} in 0.35-0.80)', 0.35 <= hipShoulder <= 0.80),
        ('facing the camera (shoulders apart)', abs(kp['shL'][0] - kp['shR'][0]) > 0.16),
        ('facing the camera (hips apart)', abs(kp['hipL'][0] - kp['hipR'][0]) > 0.06),
        ('standing upright (torso vertical)', abs(shC[0] - hipC[0]) < 0.14),
        ('standing upright (head above hips)', hipC[1] - shC[1] > 0.15),
        ('legs extended, not crouched', ankle - hipC[1] > 0.34),
        ('both feet near the ground', ankle > 0.78 and min(kp['anL'][1], kp['anR'][1]) > 0.60),
        ('even stance (feet at similar height)', abs(kp['anL'][1] - kp['anR'][1]) < 0.18),
        ('knees between hips and ankles', kp['knL'][1] > kp['hipL'][1] and kp['knR'][1] > kp['hipR'][1]
                                          and kp['knL'][1] < kp['anL'][1] and kp['knR'][1] < kp['anR'][1]),
        ('arms visible (wrists away from shoulders)',
         abs(kp['wrL'][1] - kp['shL'][1]) + abs(kp['wrL'][0] - kp['shL'][0]) > 0.10),
    ]
    for label, ok in checks:
        print(f'    [{"ok " if ok else "BAD"}] {label}')
    return [label for label, ok in checks if not ok]


def sample_colours(sprite, kp):
    """Rough palette: skin from the head, top from the chest, bottom from the thigh,
    accent from the most saturated bright pixels."""
    a = np.asarray(sprite).astype(np.float32)
    h, w = a.shape[:2]
    def patch(nx, ny, r=0.035):
        x, y = int(nx * w), int(ny * h); rr = int(max(3, r * h))
        box = a[max(0, y - rr):y + rr, max(0, x - rr):x + rr]
        m = box[:, :, 3] > 120
        if m.sum() < 5: return (140, 140, 150)
        return tuple(int(v) for v in box[:, :, :3][m].mean(0))
    hexs = lambda c: '#%02x%02x%02x' % c
    head = ((kp['nose'][0]), (kp['nose'][1]))
    chest = ((kp['shL'][0] + kp['shR'][0]) / 2, (kp['shL'][1] + kp['hipL'][1]) / 2)
    thigh = ((kp['hipL'][0] + kp['knL'][0]) / 2, (kp['hipL'][1] + kp['knL'][1]) / 2)
    shoe = (kp['anL'][0], min(0.99, kp['anL'][1] + 0.04))
    rgb = a[:, :, :3] / 255.0
    mask = a[:, :, 3] > 150
    mx, mn = rgb.max(2), rgb.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    score = np.where(mask, sat * mx, 0)
    idx = np.argsort(score.ravel())[-max(40, mask.sum() // 400):]
    acc = rgb.reshape(-1, 3)[idx].mean(0)
    hh, ss, vv = colorsys.rgb_to_hsv(*acc)
    acc = colorsys.hsv_to_rgb(hh, min(1, ss * 1.5 + 0.25), min(1, vv * 1.25 + 0.2))
    return {'skin': hexs(patch(*head)), 'top': hexs(patch(*chest)), 'bottom': hexs(patch(*thigh)),
            'hair': hexs(patch(head[0], max(0.01, head[1] - 0.05))), 'shoe': hexs(patch(*shoe)),
            'accent': hexs(tuple(int(c * 255) for c in acc))}


def main():
    ap = argparse.ArgumentParser(description='Add a fighter to Iron Fist Legends from an image.')
    ap.add_argument('--image', required=True, help='photo or artwork of a standing figure, facing the camera')
    ap.add_argument('--id', required=True, help='short lowercase id, e.g. vega')
    ap.add_argument('--name', help='display name (defaults to the id, capitalised)')
    ap.add_argument('--style', default='kravmaga_placeholder', help='style key from js/data.js STYLES')
    ap.add_argument('--kind', default='human', choices=['human', 'golem', 'plant', 'insect', 'phantom'],
                    help='human strips baked-in weapons and glows; the others keep tendrils, extra arms and auras')
    ap.add_argument('--kp', help='JSON file of manual keypoints (fractions of the image)')
    ap.add_argument('--game', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'),
                    help='path to public/tekken')
    ap.add_argument('--model', default='pose_landmarker_heavy.task', help='MediaPipe pose model')
    ap.add_argument('--accent', help='override the energy colour, e.g. #ff2a2a')
    ap.add_argument('--force', action='store_true', help='build even if the pose checks fail')
    args = ap.parse_args()

    game = os.path.abspath(args.game)
    rig_dir, parts_dir, spr_dir = (os.path.join(game, 'rig'), os.path.join(game, 'rig', 'parts'),
                                   os.path.join(game, 'sprites'))
    for d in (rig_dir, parts_dir, spr_dir):
        os.makedirs(d, exist_ok=True)
    main_png = os.path.join(rig_dir, f'{args.id}_main.png')

    print('1/6 removing background ...')
    sprite = cutout(args.image, main_png)
    print(f'    figure is {sprite.width}x{sprite.height}')

    print('2/6 finding body keypoints ...')
    if args.kp:
        kp = json.load(open(args.kp)); conf = 1.0
        print('    using manual keypoints')
    else:
        kp, conf = detect_keypoints(sprite, args.model)
        if kp is None:
            raise SystemExit('no pose found - pass --kp with manual keypoints (see the module docstring)')
        print(f'    mean landmark confidence {conf:.2f}')
        if conf < 0.55:
            print('    WARNING: low confidence. Check the review image and pass --kp if the skeleton is wrong.')
    missing = [n for n in KEY_NAMES if n not in kp]
    if missing:
        raise SystemExit('keypoints missing: ' + ', '.join(missing))
    review = os.path.join(rig_dir, f'review_{args.id}.png')
    review_image(sprite, kp, review)
    print(f'    review image: {review}')

    print('3/6 checking the pose is usable ...')
    bad = validate(kp, (sprite.width, sprite.height))
    if bad and not args.force:
        print('\n  This image will not rig well: ' + '; '.join(bad) + '.')
        print('  Use a full-body photo of someone STANDING and FACING the camera, feet on the ground,')
        print('  arms away from the body, the whole figure in frame. Action shots, side views, crouches')
        print('  and cropped bodies produce a broken rig.')
        print('  Fix the photo, or pass --kp with corrected keypoints, or --force to build anyway.')
        raise SystemExit(1)
    if bad:
        print('    --force given, building anyway')

    print('4/6 cutting the rig parts ...')
    entry = rigcut.build_rig(main_png, args.id, kp, parts_dir=parts_dir, kind=args.kind, accent=args.accent)
    print(f'    wrote 10 parts to {parts_dir}')

    print('5/6 merging rig.json and writing the portrait ...')
    rig_json = os.path.join(rig_dir, 'rig.json')
    data = json.load(open(rig_json)) if os.path.exists(rig_json) else {}
    data[args.id] = entry
    json.dump(data, open(rig_json, 'w'))
    a = np.asarray(Image.open(main_png).convert('RGBA')).astype(np.float32)
    lum = a[:, :, :3].mean(2, keepdims=True)
    a[:, :, :3] = np.clip((lum + (a[:, :, :3] - lum) * 1.10) * 1.10 + 5, 0, 255)
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(spr_dir, f'{args.id}_main.webp'),
                                             quality=92, method=6)

    print('6/6 done. Paste this into CHARACTERS in js/data.js:\n')
    c = sample_colours(sprite, kp)
    if args.accent: c['accent'] = args.accent
    name = args.name or args.id.capitalize()
    hgt = round(min(1.3, max(0.9, sprite.height / 320.0)), 2)
    wid = round(min(1.4, max(0.85, (sprite.width / sprite.height) / 0.62)), 2)
    print(f"""  {{ id:'{args.id}', name:'{name}', country:'Unknown', style:'{args.style}',
    bio:'A new challenger.',
    colors:{{ skin:'{c['skin']}', top:'{c['top']}', bottom:'{c['bottom']}', hair:'{c['hair']}', accent:'{c['accent']}', shoe:'{c['shoe']}', suit:true, sleeves:true }},
    body:{{ h:{hgt}, w:{wid}, head:'short', kind:'{args.kind}' }},
    voice:{{ type:'sawtooth', base:130, formant:950, sp:0.95, rate:1.0 }},
    quotes:{{ intro:'Let us begin.', win:'As expected.' }} }},""")
    print('\nThen open seamtest.html to confirm bone follow is 1.000 for the new fighter.')


if __name__ == '__main__':
    main()
