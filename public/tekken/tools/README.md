# Fighter art pipeline

The 16 fighters are cut out of the concept sheet and rigged as cut-out puppets, so the
original artwork itself is what moves in game.

1. `01_extract_and_keypoints.py` - slices the 4x4 concept sheet, removes the background
   from each main figure (rembg / U2Net with alpha matting) and detects 17 body keypoints
   per figure (MediaPipe Pose Landmarker, heavy model). Writes `rig/<id>_main.png`,
   `rig/keypoints_auto.json` and a skeleton overlay sheet for review.
2. `02_cut_rig_parts.py` - turns each figure into 10 rig parts (head, torso, two upper arms,
   two forearms with hands, two thighs, two shins with feet) using capsule masks around the
   detected bones, inpaints the torso where the arms covered it, drops baked-in energy
   weapons and glows for human fighters (they are re-drawn live in the fighter's accent
   colour), and records each part's pivot, rest angle and bone length in `rig/rig.json`.

Requirements: `pip install rembg onnxruntime mediapipe pillow numpy`, plus the
`pose_landmarker_heavy.task` model and system packages `libegl1 libgles2 libgl1`.
At runtime `js/rig.js` reads `rig/rig.json` and animates the parts from the skeleton poses
in `js/render.js`, so every fighter gets walking, attacks, hit reactions and knockdowns.
