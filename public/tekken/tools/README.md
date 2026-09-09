# Fighter art pipeline

The 16 fighters are cut out of the concept sheet and rigged as cut-out puppets, so the
original artwork itself is what moves in game.

1. `01_extract_and_keypoints.py` - slices the 4x4 concept sheet, removes the background
   from each main figure (rembg / U2Net with alpha matting) and detects 17 body keypoints
   per figure (MediaPipe Pose Landmarker, heavy model). Writes `rig/<id>_main.png`,
   `rig/keypoints_auto.json` and a skeleton overlay sheet for review.
2. `02_cut_rig_parts.py` - turns each figure into 10 rig parts (head, torso, two upper arms,
   two forearms with hands, two thighs, two shins with feet) and records each part's pivot,
   rest angle and bone length in `rig/rig.json`. The important detail is how the joints are cut:
   - Every joint gets ONE radius, measured as the smaller of the two limb half-widths that meet
     there, so it always fits inside the silhouette.
   - Each bone is a tapered capsule that ends at exactly that radius (with a mid-bone bulge kept
     so biceps and calves are not clipped), and **both** the parent and the child repeat a full
     disc of that radius centred on the joint. The child is drawn on top, so rotating a limb can
     never open a seam and the parent can never stick out past it.
   - The torso is inpainted where the arms covered it, gets its own shoulder and hip discs, and
     baked-in energy weapons and glows are removed from human fighters (they are re-drawn live in
     the fighter's accent colour). Stray specks are dropped from every part.
   `seamtest.html` measures the result: it renders each fighter in 21 stress poses and compares
   the opaque coverage around every joint against that fighter's own rest pose, so any gap opened
   by rotation shows up as a number below 1.0.

Requirements: `pip install rembg onnxruntime mediapipe pillow numpy`, plus the
`pose_landmarker_heavy.task` model and system packages `libegl1 libgles2 libgl1`.
At runtime `js/rig.js` reads `rig/rig.json` and animates the parts from the skeleton poses
in `js/render.js`, so every fighter gets walking, attacks, hit reactions and knockdowns.
