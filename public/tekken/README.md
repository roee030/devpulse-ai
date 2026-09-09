# Iron Fist Legends

A Tekken-style 2D fighting game that runs entirely in the browser. No server, no build step,
no external assets: every character, arena, sound effect, voice and rock track is generated
procedurally with Canvas 2D and the Web Audio API.

Open `index.html` directly, or when the DevPulse site is deployed it is served at `/devpulse-ai/tekken/`.

## What is in it

- **16 playable fighters** from the neon-arena concept sheet, each with a unique style, energy weapon and
  body type: Pyros (magma golem), Vex Halden (laser filaments), Kade Frost (cryo), Dorian Ashe (crimson
  plasma blade), Silas Echo (sonic), Thorn (plant tendrils), Kryll (four-armed insectoid), Jax Razor
  (energy claws), Rook Sentinel (twin volt blades), Nyx Valen (twin neon blades), Brakkus Warden (plasma
  hammer, arcade boss), Dez Pulse (kinetic fists), Ivo Bolt (lightspeed), Shade (void blades), Mira Synn
  (psionics) and Mirage (hard-light clones).
- Each style has its own stats, 6 moves and a SUPER, a hit-spark colour, and a synthesized voice
  (grunts, hurt sounds, KO cries and spoken quotes via the browser's speech synthesis).
- Move types: normals, projectiles (fireballs, ice shards, blade waves, nets, spike volleys, clones),
  stationary eruptions and ground quakes, dashes, launchers, multi-hit chains, spins, command grabs,
  counters, teleports and cinematic supers.
- Fighters are drawn procedurally: cel-shaded muscular bodies, faces, tactical suits with glowing seams,
  energy blades, hammers, claws and threads, plus species bodies (lava cracks, tendrils, extra arms).
- **8 arenas**, each with its own procedural rock track (different tempo, key, riff and drums).
- **Arcade mode**: a ladder of 7 opponents with rising difficulty, then the Siege Warden on the Shadow
  Realm stage. Continues are limited; clears and best times are saved in `localStorage`.
- **Versus CPU** and **Versus 2P** (two players on one keyboard, or two gamepads).
- Fighters gallery with move lists and live move previews, options and a controls screen.
- Menu placeholders for **Online Match** and **Create Fighter** (photo upload + style pick),
  which are planned for a later phase that needs a server.

## Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move / jump / crouch | W A S D | Arrow keys |
| Light / heavy punch | J / K | , / . (or Numpad 1 / 2) |
| Light / heavy kick | U / I | N / M (or Numpad 4 / 5) |
| Special 1 / Special 2 | L / S+L | / and Down+/ (or Numpad 3) |
| Super (full meter) | ; | Right Shift (or Numpad 0) |
| Block | hold back (down+back for lows) | hold back |
| Pause / back | Esc | Esc |

Gamepads use the standard layout: X/Y punches, A/B kicks, LB special, RB super.

**Phones and tablets** are detected automatically: a floating joystick appears on the left, six attack
buttons (P, P+, K, K+, SP, super star) on the right, plus pause and fullscreen buttons. Menus accept
direct taps (tap once to highlight, again to confirm) or joystick + OK/BACK. Landscape is recommended.

## Code layout

- `js/data.js` - move library, the 20 styles, 21 characters, arenas and music tracks.
- `js/audio.js` - Web Audio engine: distorted power-chord guitar, bass, lead, drums, SFX and voices.
- `js/render.js` - skeletal pose system, fighter and head drawing, procedural arenas, text helpers.
- `js/fighter.js` - fighter state machine, hit boxes, projectiles, grabs/counters/teleports and CPU AI.
- `js/game.js` - screens, input (keyboard + gamepad), fight orchestration, camera, HUD and effects.
