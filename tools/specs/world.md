Write `src/world.js`: an endless, colourful Indian street that recycles segments as the player runs toward -Z.
Imports: `import * as THREE from '../vendor/three.module.js';` and `import { mulberry32 } from './spawner.js';`

Export `SEG_LEN = 30`, `SEG_COUNT = 8`, and `createWorld(scene, seed = 1)`.

`createWorld` builds SEG_COUNT segment Groups, adds them to `scene`, and places segment i at z = -i * SEG_LEN
(segment origin = its centre). It returns `{ segments, update(playerZ) }`.

Each segment (use rng = mulberry32(seed) for all randomness, all meshes receiveShadow = true, buildings castShadow = true):
- Road: PlaneGeometry(7, SEG_LEN) rotated x = -PI/2, colour 0x3b3b3b, at y 0.
- Lane dashes: white BoxGeometry(0.12, 0.02, 2) at x = -1 and x = 1, every 6 m along the segment.
- Sidewalks: BoxGeometry(2, 0.15, SEG_LEN) at x = -4.5 and x = 4.5, y 0.075, colour 0xb5a99a; kerb stripes optional.
- Buildings on both sides: 3 per side, each BoxGeometry(6, height, 9.5) with height = 6 + rng() * 8, centred at
  x = +-(5.5 + 3) and spaced along z inside the segment (z = -10, 0, 10). Colour picked with rng from
  [0xf4a261, 0xe9c46a, 0x2a9d8f, 0xe76f51, 0xa8dadc, 0xffb4a2, 0xcdb4db, 0x90be6d, 0xf1faee].
  On the face that looks at the road add: 2 rows of dark windows (BoxGeometry(1.1, 1.3, 0.1), colour 0x2b2d42)
  and a shop signboard BoxGeometry(0.15, 0.9, 6) at y 3.2 in a bright colour (0xff006e, 0xfb5607, 0xffbe0b, 0x3a86ff, 0x8338ec)
  sticking out slightly toward the road. Faces toward the road are the ones at smaller |x|.
- Electric pole: CylinderGeometry(0.08, 0.1, 7) colour 0x555555 at x = 3.7, y 3.5, z = 0, and 3 sagging wires
  (thin CylinderGeometry(0.015, 0.015, 8) rotated z = PI/2) crossing the road at y = 6.2, 6.5, 6.8.

`update(playerZ)`: for every segment whose `position.z - SEG_LEN / 2 > playerZ + 15` (fully behind the camera),
move it forward: `position.z -= SEG_COUNT * SEG_LEN`. Use a while loop so very large jumps also work.
