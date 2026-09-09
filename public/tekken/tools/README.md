# Fighter art pipeline

Every fighter in the game is a cut-out puppet: the artwork itself is split into 10 parts and
driven by a skeleton, so the original picture is what walks, punches and falls over.

## Adding a fighter from one image

```
pip install rembg onnxruntime mediapipe pillow numpy scipy
python3 tools/add_fighter.py --image photo.png --id vega --name "Vega Cross" --style cryo
```

It removes the background, finds 17 body keypoints, checks the pose is usable, cuts the 10 rig
parts, merges them into `rig/rig.json`, writes the character-select portrait, saves a keypoint
review image, and prints a `CHARACTERS` entry to paste into `js/data.js`.

**The photo has to be a full-body, front-facing, standing figure**, feet on the ground, arms away
from the body, the whole person in frame. The tool checks this and refuses with a reason if not:
a side view, a lunge or a crouch foreshortens limbs and produces a broken rig. Useful flags:

| flag | what it does |
| --- | --- |
| `--kind golem\|plant\|insect\|phantom` | keeps tendrils, extra arms and auras instead of stripping them |
| `--kp points.json` | supply keypoints by hand when the detector is wrong on a stylised figure |
| `--accent "#ff2a2a"` | the energy colour, also used to strip a baked-in glowing weapon |
| `--force` | build anyway when a check fails (expect a poor result) |

`L` in the keypoint names is the figure's own left, which appears on the viewer's right.

## How the cut works

1. `01_extract_and_keypoints.py` slices the original 4x4 concept sheet and runs the same
   background removal and pose detection for all 16 shipped fighters.
2. `rigcut.py` does the cutting and is shared by both entry points:
   - Every joint gets ONE radius, the smaller of the two limb half-widths meeting there, so it
     always fits inside the silhouette.
   - Silhouette widths are capped by the bone's own length and by a fraction of the figure
     height. Without this an arm resting against the torso measures the width of the whole body
     and its part swallows the chest.
   - Each bone is a tapered capsule ending exactly at the joint radius, with the mid-bone bulge
     kept so biceps and calves are not clipped, and **both** the parent and the child repeat a
     full disc centred on the joint. The child draws on top, so rotating a limb can never open a
     seam and the parent can never stick out past it.
   - The torso is inpainted where the arms covered it, baked-in energy weapons and glows are
     removed from human fighters (they are redrawn live from the hands in the accent colour),
     and stray specks are dropped from every part.
3. `js/rig.js` reads `rig/rig.json` and rotates each part about its joint. The one rule that
   matters: canvas `rotate(t)` maps a local direction `a` to screen direction `a - t`, so a part
   is rotated by `restAngle - targetAngle`. Getting that sign backwards leaves the joint
   positions correct while every part image turns the wrong way, which looks exactly like the
   body coming apart when it moves.

## Checking your work

Open `seamtest.html` (serve the folder over HTTP) and call `__run()`. It renders every fighter
in `rig.json`, including one you just added, across 21 stress poses and reports three numbers:

| metric | meaning | expected |
| --- | --- | --- |
| bone follow | is the artwork actually sitting on the skeleton | 1.000 |
| joint coverage | opaque area around each joint versus that fighter's own rest pose | above 0.90 |
| wholeness | is the fighter one connected piece | above 0.97 (creatures with tendrils sit lower) |
