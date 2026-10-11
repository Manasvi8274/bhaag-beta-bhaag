Write `src/props.js`: 3D models of obstacles and coins built from Three.js primitives. Bright, cheerful,
cartoon-real look of an Indian street. `import * as THREE from '../vendor/three.module.js';` only.

Export exactly one function: `createProp(name)` returning a THREE.Group whose origin is at the
BOTTOM CENTRE (y = 0 is the ground). Unknown name -> throw an Error. All meshes castShadow = true.
Use MeshStandardMaterial with flat colours (roughness ~0.7). The finished model's bounding box must
match the size table (width = x, height = y, depth = z) within about 20%.

| name | w | h | d | look |
|---|---|---|---|---|
| stone | 1.2 | 0.5 | 0.8 | grey (0x8d8d8d) DodecahedronGeometry(0.5) scaled to size, flatShading true |
| pothole | 1.4 | 0.3 | 1.2 | dark brown ring CylinderGeometry(0.7,0.7,0.06,20) at y 0.03, muddy water disc (0x5b4a3a) slightly smaller on top, plus 3 small grey rocks around the edge reaching 0.3 high |
| clothesline | 6.4 | 2.2 | 0.15 | two bamboo poles (0xc8a165, CylinderGeometry(0.06,0.06,2.2)) at x = +-3.2; rope (thin cylinder rotated along x) at y 1.45; 6 clothes hanging from the rope: BoxGeometry(0.55, 0.45, 0.03) at y 1.22, x spread from -2.5 to 2.5, colours 0xe63946, 0xffb703, 0x219ebc, 0x8ac926, 0xff70a6, 0xffffff |
| cow | 1.0 | 1.6 | 2.4 | white (0xf2efe9) body Box(1.0,0.8,1.7) at y 0.95; 4 legs Box(0.18,0.6,0.18) at corners, y 0.3; head Box(0.45,0.45,0.55) at (0, 1.25, -1.05); 2 horns ConeGeometry(0.05, 0.3) at head top (+-0.15) going up to 1.6; brown (0x6b4226) patches as thin boxes on the body; tail thin box at back |
| auto | 1.6 | 2.0 | 2.8 | auto-rickshaw: green (0x1b9e3e) lower body Box(1.4,0.8,2.6) at y 0.65; yellow (0xffd60a) canopy Box(1.5,0.7,2.0) at y 1.6, z +0.2; black windshield frame; 3 black wheels CylinderGeometry(0.25,0.25,0.15) rotated z = PI/2 (one front centre at z -1.1, two rear at x +-0.65, z 0.9), wheel centres at y 0.25 |
| cart | 1.4 | 1.3 | 2.0 | sabzi thela: wooden (0x9c6b3e) tray Box(1.4,0.15,2.0) at y 0.85; 2 big wheels radius 0.45 at the sides; legs; a heap of vegetables on top: 18 small spheres radius 0.12 (red 0xe63946, green 0x2a9d8f, orange 0xf77f00) between y 0.95 and 1.3 |
| bus | 1.9 | 3.2 | 8 | red-orange (0xd62828) body Box(1.9,2.7,8) at y 1.75; cream stripe; dark blue window strip Box(1.92,0.7,7.2) at y 2.4; 4 black wheels radius 0.4 at y 0.4 |
| coin | 0.6 | 0.6 | 0.08 | gold (0xffc300, metalness 0.6, roughness 0.3, emissive 0x553300) CylinderGeometry(0.3,0.3,0.08,24) rotated x = PI/2 so its face looks along z; centre at y 0.3 |

Keep the code tidy: a small helper `box(w, h, d, color, x, y, z)` that creates a mesh and adds it to the
group is a good idea.
