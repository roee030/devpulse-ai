# Step 1: high-quality main sprites (2x, alpha matting) + automatic keypoints + overlay sheet
from rembg import remove, new_session
from PIL import Image, ImageDraw
import numpy as np, json, mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
IDS = ['pyros','vex','kade','dorian','silas','thorn','kryll','jax','rook','nyx','warden','dez','ivo','shade','mira','mirage']
im = Image.open('/root/.claude/uploads/fce90a88-f15f-5987-80e4-f1e0385a306b/813079a1-image.png').convert('RGB')
xs=[0,352,705,1057,1408]; ys=[59,236,414,591,768]
sess = new_session('u2net')
det = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(base_options=python.BaseOptions(model_asset_path='pose_landmarker_heavy.task'), num_poses=1, min_pose_detection_confidence=0.2, min_pose_presence_confidence=0.2))
KP = {}
for i, cid in enumerate(IDS):
    r, c = divmod(i, 4)
    cell = im.crop((xs[c], ys[r], xs[c+1], ys[r+1])); W, H = cell.size
    crop = cell.crop((0, 0, int(W*0.44), H)).resize((int(W*0.44)*2, H*2), Image.LANCZOS)
    out = remove(crop, session=sess, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=15, alpha_matting_erode_size=8)
    a = np.asarray(out); alpha = a[:,:,3]
    ys_, xs_ = np.where(alpha > 30); x0,x1,y0,y1 = xs_.min(), xs_.max()+1, ys_.min(), ys_.max()+1
    spr = out.crop((x0,y0,x1,y1)); spr.save(f'rig/{cid}_main.png')
    w, h = spr.size; pad = 60
    bg = Image.new('RGBA', (w+2*pad, h+2*pad), (110,110,110,255)); bg.alpha_composite(spr, (pad,pad)); big = bg.convert('RGB').resize(((w+2*pad)*2, (h+2*pad)*2), Image.LANCZOS)
    res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(np.asarray(big))))
    kp = None
    if res.pose_landmarks:
        lm = res.pose_landmarks[0]
        def P(i): return [round((lm[i].x*big.width/2 - pad)/w,3), round((lm[i].y*big.height/2 - pad)/h,3), round(lm[i].visibility,2)]
        names = {0:'nose',7:'earL',8:'earR',11:'shL',12:'shR',13:'elL',14:'elR',15:'wrL',16:'wrR',23:'hipL',24:'hipR',25:'knL',26:'knR',27:'anL',28:'anR',31:'ftL',32:'ftR'}
        kp = {n:P(i) for i,n in names.items()}
    KP[cid] = { 'w': w, 'h': h, 'kp': kp }
    print(cid, w, h, 'ok' if kp else 'NO POSE', flush=True)
json.dump(KP, open('rig/keypoints_auto.json','w'), indent=1)
# overlay sheet
sheet = Image.new('RGB', (8*260, 2*420), 'black'); d = ImageDraw.Draw(sheet)
for i, cid in enumerate(IDS):
    spr = Image.open(f'rig/{cid}_main.png'); w,h = spr.size; s = 380/h
    X, Y = (i%8)*260 + 20, (i//8)*420 + 20
    sheet.paste(spr.resize((int(w*s), int(h*s))).convert('RGB'), (X, Y))
    d.text((X, Y-14), cid, fill='yellow')
    kp = KP[cid]['kp']
    if kp:
        def pt(n): return (X + kp[n][0]*w*s, Y + kp[n][1]*h*s)
        for a,b in [('shL','shR'),('shL','elL'),('elL','wrL'),('shR','elR'),('elR','wrR'),('shL','hipL'),('shR','hipR'),('hipL','hipR'),('hipL','knL'),('knL','anL'),('hipR','knR'),('knR','anR')]:
            d.line([pt(a), pt(b)], fill='lime', width=2)
        for n in kp: x,y = pt(n); d.ellipse((x-3,y-3,x+3,y+3), fill='red')
sheet.save('rig/kp_sheet.png'); print('SHEET')
