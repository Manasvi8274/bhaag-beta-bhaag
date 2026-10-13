import * as THREE from '../vendor/three.module.js';
import { mulberry32 } from './spawner.js';
import { ZONES, ZONE_LEN, zoneAt } from './zones.js';
import { mergeStatic } from './merge.js';

export const SEG_LEN = 30;
export const SEG_COUNT = 8;

const WALLS = [0xf4a261, 0xe9c46a, 0x2a9d8f, 0xe76f51, 0xa8dadc, 0xffb4a2, 0xcdb4db, 0x90be6d, 0xf1faee];
const SIGNS = [0xff006e, 0xfb5607, 0xffbe0b, 0x3a86ff, 0x8338ec];
const QUARTERS = [0xf1e3c4, 0xe9c46a, 0xd9a066, 0xefd9b4];
const MANDIR_WALLS = [0xff9933, 0xffe8b0, 0xf6bd60, 0xffc4d6, 0xfdf0d5, 0xf28482];
const FLAGS = [0xff9933, 0x2a9d8f, 0xffffff, 0xff006e, 0xffd60a];
const BULBS = [0xff3b3b, 0xffd60a, 0x3aff7a, 0x3a86ff, 0xff70ff];

// Shared geometry/materials keep draw-call setup and memory low on phones.
const mats = new Map();
const mat = (color) => {
  if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  return mats.get(color);
};
const triangle = (pts) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.computeVertexNormals();
  return g;
};
const G = {
  road: new THREE.PlaneGeometry(7, SEG_LEN),
  dash: new THREE.BoxGeometry(0.12, 0.02, 2),
  walk: new THREE.BoxGeometry(2, 0.15, SEG_LEN),
  kerb: new THREE.BoxGeometry(0.2, 0.18, SEG_LEN),
  window: new THREE.BoxGeometry(0.1, 1.3, 1.1),
  sign: new THREE.BoxGeometry(0.15, 0.9, 6),
  awning: new THREE.BoxGeometry(1.2, 0.08, 5),
  pole: new THREE.CylinderGeometry(0.08, 0.1, 7, 8),
  wire: new THREE.CylinderGeometry(0.015, 0.015, 8, 4),
  lampPole: new THREE.CylinderGeometry(0.07, 0.11, 6.4, 8),
  lampArm: new THREE.CylinderGeometry(0.045, 0.045, 1.5, 6),
  lampHead: new THREE.BoxGeometry(0.34, 0.14, 0.7),
  bulb: new THREE.BoxGeometry(0.24, 0.05, 0.56),
  pool: new THREE.PlaneGeometry(7, 7),
  beam: new THREE.CylinderGeometry(0.16, 2.3, 6, 16, 1, true),
  tank: new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12),
  poster: new THREE.BoxGeometry(0.04, 0.9, 0.65),
  trunk: new THREE.CylinderGeometry(0.14, 0.2, 2.6, 7),
  leaves: new THREE.DodecahedronGeometry(1.1),
  sleeper: new THREE.BoxGeometry(2.4, 0.1, 0.25),
  rail: new THREE.BoxGeometry(0.08, 0.12, SEG_LEN),
  ballast: new THREE.BoxGeometry(4, 0.3, SEG_LEN),
  wall: new THREE.BoxGeometry(0.3, 2.2, SEG_LEN),
  wallBand: new THREE.BoxGeometry(0.32, 0.5, SEG_LEN),
  catWire: new THREE.CylinderGeometry(0.02, 0.02, SEG_LEN, 4),
  pennant: triangle([-0.18, 0, 0, 0.18, 0, 0, 0, -0.42, 0]),
  templeFlag: triangle([0, 0, 0, 0, -0.8, 0, 1.3, -0.35, 0]),
  string: new THREE.CylinderGeometry(0.01, 0.01, 7, 3),
  bulbBall: new THREE.SphereGeometry(0.07, 6, 4),
  marigold: new THREE.SphereGeometry(0.09, 6, 4),
  diya: new THREE.SphereGeometry(0.06, 6, 4),
  stallPole: new THREE.CylinderGeometry(0.03, 0.03, 1.3, 5),
};

// Night lighting: shared materials, so one value per group lights every lamp/window at once (no per-frame traversal).
// Lamps switch on in 3 groups, one after another, each with a short flicker.
const fadeTex = (w, h, alpha) => {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, alpha(x / (w - 1), y / (h - 1)))));
  }
  const t = new THREE.DataTexture(data, w, h);
  t.needsUpdate = true;
  return t;
};
const POOL_TEX = fadeTex(64, 64, (u, v) => (1 - Math.min(1, Math.hypot(u - 0.5, v - 0.5) * 2)) ** 1.6);
const BEAM_TEX = fadeTex(1, 32, (u, v) => v ** 2.2);
const SODIUM = 0xffa646;
const LAMP_ON_AT = [0.3, 0.42, 0.54];
const glowMat = (map, opacity) => new THREE.MeshBasicMaterial({ color: SODIUM, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
const LAMPS = LAMP_ON_AT.map(() => ({
  bulb: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: SODIUM, emissiveIntensity: 0 }),
  pool: glowMat(POOL_TEX, 0),
  beam: glowMat(BEAM_TEX, 0),
  level: 0, onAt: -1,
}));
for (const l of LAMPS) l.beam.side = THREE.DoubleSide;
const WIN_LIT = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.85, emissive: 0xffa94d, emissiveIntensity: 0 });
const DIYA = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8c00, emissiveIntensity: 0.4 });
const BULB_MATS = BULBS.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 }));
const FLAG_MATS = FLAGS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }));
const GOLD = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.8, roughness: 0.3 });
const signMats = new Map();
const signMat = (color) => {
  if (!signMats.has(color)) signMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: color, emissiveIntensity: 0 }));
  return signMats.get(color);
};

// Lamp k sits at z = 7.5 - 15k, alternating sides (segments are 30 m, two lamps each), so the pattern survives recycling.
export const LAMP_HEAD_Y = 6.15;
export const lampAt = (k) => ({ x: k % 2 ? 2.65 : -2.65, z: 7.5 - 15 * k });
// The lamp for light j (of n) nearest ahead of the camera: each light only ever jumps far ahead, hidden in the fog.
export const lampForLight = (j, n, playerZ) => {
  const k0 = Math.max(0, Math.ceil((7.5 - (playerZ + 10)) / 15));
  return lampAt(k0 + ((((j - k0) % n) + n) % n));
};

function add(parent, geo, color, x, y, z, cast = false) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = cast;
  parent.add(m);
  return m;
}

// Per area: wall colours, height range, depth, whether it has a shop sign + awning, roof water tank chance.
const STYLE = [
  { walls: WALLS, h: [6, 8], depth: 9.5, signs: SIGNS, tank: 0.6 },
  { walls: QUARTERS, h: [5, 2.5], depth: 9.4, band: 0x9c4a2f, tank: 0.8 },
  { walls: MANDIR_WALLS, h: [5, 4], depth: 9.4, signs: [0xff9933, 0xc1121f, 0xffbe0b], tank: 0.3 },
];

function building(seg, rng, side, z, st) {
  const h = st.h[0] + rng() * st.h[1];
  (seg.userData.heights ||= []).push(h);
  const face = side * 5.5; // road-facing wall
  add(seg, new THREE.BoxGeometry(6, h, st.depth), st.walls[Math.floor(rng() * st.walls.length)], side * 8.5, h / 2, z, true);
  for (const y of [5, 7.8]) {
    if (y > h - 1) continue;
    for (const dz of [-3, 0, 3]) {
      const w = add(seg, G.window, 0x2b2d42, face - side * 0.04, y, z + dz);
      if (rng() < 0.5) w.material = WIN_LIT;
    }
  }
  if (st.signs) {
    const signColor = st.signs[Math.floor(rng() * st.signs.length)];
    add(seg, G.sign, signColor, face - side * 0.1, 3.2, z).material = signMat(signColor);
    add(seg, G.awning, signColor === 0xffbe0b ? 0xff006e : 0xffbe0b, face - side * 0.6, 2.5, z).rotation.z = side * 0.25;
  } else { // colony quarters: a ground-floor row of windows and a brick-red band
    add(seg, new THREE.BoxGeometry(0.1, 0.35, st.depth), st.band, face - side * 0.04, 3.4, z);
    for (const dz of [-3, 0, 3]) {
      const w = add(seg, G.window, 0x2b2d42, face - side * 0.04, 2.0, z + dz);
      if (rng() < 0.5) w.material = WIN_LIT;
    }
  }
  if (rng() < st.tank) add(seg, G.tank, 0x1b1b1b, side * 9, h + 0.6, z + (rng() - 0.5) * 4, true); // water tank on the roof
  if (rng() < 0.5) add(seg, G.poster, [0xffd60a, 0x3a86ff, 0xff006e, 0xffffff][Math.floor(rng() * 4)], face - side * 0.05, 1.5, z + (rng() < 0.5 ? -1.6 : 1.6));
}

function tree(seg, x, z, rng) { // neem tree
  add(seg, G.trunk, 0x6b4f3a, x, 1.3, z, true);
  for (const [dx, dy, dz, s] of [[0, 3.2, 0, 1.2], [0.6, 2.8, 0.5, 0.9], [-0.5, 3.0, -0.6, 0.95]]) {
    add(seg, G.leaves, rng() < 0.5 ? 0x3a7d44 : 0x4c9a52, x + dx, dy, z + dz, true).scale.setScalar(s);
  }
}

function chaiTapri(seg, side, z) {
  const x = side * 4.7, WOOD = 0x8b5a2b;
  add(seg, new THREE.BoxGeometry(1.1, 1.0, 1.9), WOOD, x, 0.5, z, true);
  add(seg, new THREE.BoxGeometry(1.12, 0.1, 1.92), 0xffd60a, x, 1.03, z);
  for (const dz of [-0.85, 0.85]) for (const dx of [-0.5, 0.5]) add(seg, G.stallPole, 0x555555, x + dx, 1.7, z + dz);
  add(seg, new THREE.BoxGeometry(1.5, 0.06, 2.3), 0x3a86ff, x, 2.38, z, true).rotation.z = side * 0.12;
  add(seg, new THREE.BoxGeometry(0.06, 0.4, 1.2), 0xff6d00, x - side * 0.62, 2.0, z).material = signMat(0xff6d00); // chai board
  add(seg, new THREE.SphereGeometry(0.16, 10, 8), 0xc0c0c0, x, 1.25, z - 0.4); // kettle
  for (const dz of [0.1, 0.3, 0.5]) add(seg, new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8), 0xfff1d0, x - side * 0.3, 1.14, z + dz);
  add(seg, new THREE.BoxGeometry(0.4, 0.45, 1.6), WOOD, x - side * 1.0, 0.23, z); // bench
}

function railway(seg, rng) { // right side of the Railway Colony: boundary wall, tracks, overhead line
  add(seg, G.wall, 0xe8e1d4, 5.6, 1.1, 0, true);
  add(seg, G.wallBand, 0x9c4a2f, 5.6, 0.25, 0);
  for (const z of [-11, 4]) add(seg, G.poster, rng() < 0.5 ? 0xffd60a : 0xff006e, 5.43, 1.4, z);
  add(seg, G.ballast, 0x7a7068, 9.5, 0.15, 0);
  for (let z = -14; z < 15; z += 2) add(seg, G.sleeper, 0x4a3b30, 9.5, 0.33, z);
  for (const x of [8.8, 10.2]) add(seg, G.rail, 0x9a9a9a, x, 0.42, 0);
  add(seg, G.pole, 0x6b6b6b, 12, 3.5, 0, true);
  add(seg, new THREE.BoxGeometry(3, 0.12, 0.12), 0x6b6b6b, 10.5, 6.3, 0);
  add(seg, G.catWire, 0x222222, 9.5, 6.0, 0).rotation.x = Math.PI / 2;
  for (const z of [-8, 9]) tree(seg, 14 + rng() * 3, z, rng);
}

function temple(seg, side, z) { // small mandir: plinth, steps, pillared hall, shikhara with kalash and flag, diyas
  const WHITE = 0xfff3e0, SAFFRON = 0xff9933, x0 = side * 8.6, tx = x0 + side * 0.4;
  add(seg, new THREE.BoxGeometry(6, 1, 9), 0xe8dcc8, x0, 0.5, z, true);
  for (let i = 0; i < 3; i++) add(seg, new THREE.BoxGeometry(0.4, 0.33 * (i + 1), 3), 0xd9cbb3, side * (6.5 - i * 0.4), 0.165 * (i + 1), z);
  for (const dz of [-3, -1, 1, 3]) add(seg, new THREE.CylinderGeometry(0.18, 0.2, 2.6, 8), WHITE, side * 6.1, 2.3, z + dz, true);
  add(seg, new THREE.BoxGeometry(1.4, 0.3, 8.4), SAFFRON, side * 6.4, 3.75, z, true);
  add(seg, new THREE.BoxGeometry(3.8, 3, 7), WHITE, tx, 2.5, z, true);
  for (let i = 0; i < 6; i++) {
    const w = 4.6 - i * 0.7;
    add(seg, new THREE.BoxGeometry(w, 1.1, w), i % 2 ? SAFFRON : WHITE, tx, 4.55 + i * 1.05, z, true);
  }
  add(seg, new THREE.SphereGeometry(0.55, 12, 6), WHITE, tx, 10.9, z).scale.y = 0.5;
  add(seg, new THREE.SphereGeometry(0.28, 10, 8), 0, tx, 11.35, z).material = GOLD; // kalash
  add(seg, new THREE.CylinderGeometry(0.03, 0.03, 2, 5), 0x555555, tx, 12.4, z);
  const flag = new THREE.Mesh(G.templeFlag, FLAG_MATS[0]);
  flag.position.set(tx, 13.35, z);
  flag.rotation.y = -side * Math.PI / 2;
  seg.add(flag);
  add(seg, new THREE.ConeGeometry(0.12, 0.25, 8), 0, side * 6.1, 3.35, z).material = GOLD; // bell
  for (let i = 0; i < 7; i++) add(seg, G.diya, 0, side * 5.85, 1.06, z - 1.4 + i * 0.47).material = DIYA;
}

function flowerStall(seg, side, z) {
  const x = side * 4.6;
  add(seg, new THREE.BoxGeometry(1.0, 0.8, 1.8), 0x8b5a2b, x, 0.4, z, true);
  for (let i = 0; i < 18; i++) {
    add(seg, G.marigold, i % 3 ? 0xff8c00 : 0xffc300, x + ((i % 3) - 1) * 0.25, 0.88 + (i % 2) * 0.06, z - 0.75 + Math.floor(i / 3) * 0.3);
  }
  add(seg, new THREE.BoxGeometry(1.3, 0.05, 2.1), 0xc1121f, x, 2.1, z);
  for (const dz of [-0.9, 0.9]) add(seg, G.stallPole, 0x555555, x - side * 0.45, 1.45, z + dz);
}

// A string across the street (bunting or bulbs), sagging in the middle.
function across(seg, z, y, n, makeMesh) {
  add(seg, G.string, 0x222222, 0, y - 0.3, z).rotation.z = Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), m = makeMesh(i);
    m.position.set(-3.4 + t * 6.8, y - Math.sin(t * Math.PI) * 0.6, z);
    seg.add(m);
  }
}

function buildSegment(rng, i, zone = 0) {
  const seg = new THREE.Group(), st = STYLE[zone];
  add(seg, G.road, 0x3b3b3b, 0, 0, 0).rotation.x = -Math.PI / 2;
  for (let z = -SEG_LEN / 2 + 3; z < SEG_LEN / 2; z += 6) for (const x of [-1, 1]) add(seg, G.dash, 0xffffff, x, 0.01, z);
  const templeSide = i % 2 ? 1 : -1;
  for (const side of [-1, 1]) {
    add(seg, G.walk, zone === 2 ? 0xc9b8a0 : 0xb5a99a, side * 4.5, 0.075, 0);
    add(seg, G.kerb, zone === 1 ? 0xe9e9e9 : 0xf2c94c, side * 3.55, 0.09, 0);
    if (zone === 1 && side === 1) { railway(seg, rng); continue; }
    for (const z of [-10, 0, 10]) {
      if (zone === 2 && z === 0 && side === templeSide) temple(seg, side, z);
      else building(seg, rng, side, z, st);
    }
  }
  if (zone === 0 && rng() < 0.6) chaiTapri(seg, rng() < 0.5 ? -1 : 1, rng() < 0.5 ? -3.5 : 3.5);
  if (zone === 1) for (const z of [-3, 12]) tree(seg, -4.7, z, rng);
  if (zone === 2) {
    flowerStall(seg, -templeSide, rng() < 0.5 ? -3.5 : 3.5);
    across(seg, -11, 5.4, 15, (k) => new THREE.Mesh(G.pennant, FLAG_MATS[k % FLAG_MATS.length]));
    across(seg, 3.5, 5.0, 17, (k) => new THREE.Mesh(G.bulbBall, BULB_MATS[k % BULB_MATS.length]));
  }
  add(seg, G.pole, 0x555555, 3.7, 3.5, 0, true);
  for (const y of [6.2, 6.5, 6.8]) add(seg, G.wire, 0x222222, 0, y, 0).rotation.z = Math.PI / 2;
  if (zone === 0) for (const [y, r] of [[5.9, 0.05], [6.05, -0.06]]) add(seg, G.wire, 0x222222, 0, y, 12).rotation.set(0, r, Math.PI / 2 + r); // tangled extra wires
  for (const [n, side, z] of [[0, -1, 7.5], [1, 1, -7.5]]) streetlight(seg, side, z, LAMPS[(i * 2 + n) % 3]);
  const merged = mergeStatic(seg);
  merged.userData.heights = seg.userData.heights || [];
  return merged;
}

// Municipal streetlight: grey pole on the kerb, arm over the road, sodium lamp, a light pool and a faint beam at night.
function streetlight(seg, side, z, lamp) {
  const x = side * 3.75, hx = side * 2.65; // hx matches lampAt()
  add(seg, G.lampPole, 0x7d8085, x, 3.2, z, true);
  add(seg, G.lampArm, 0x7d8085, (x + hx) / 2, 6.3, z).rotation.z = Math.PI / 2 + side * 0.18;
  add(seg, G.lampHead, 0x5b5f66, hx, LAMP_HEAD_Y + 0.08, z, true);
  add(seg, G.bulb, 0, hx, LAMP_HEAD_Y, z).material = lamp.bulb;
  const pool = new THREE.Mesh(G.pool, lamp.pool);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(hx * 0.8, 0.04, z);
  pool.renderOrder = 1;
  const beam = new THREE.Mesh(G.beam, lamp.beam);
  beam.position.set(hx, LAMP_HEAD_Y - 3, z);
  beam.renderOrder = 2;
  seg.add(pool, beam);
}

// Swagat dwar at the start of each area, with its name when a canvas is available (the browser; tests run without).
function nameTexture(text, color) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 512, 128);
  x.strokeStyle = '#ffd60a'; x.lineWidth = 10; x.strokeRect(5, 5, 502, 118);
  x.font = '800 62px "Baloo 2", "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = '#1b1b1b'; x.strokeText(text, 256, 68);
  x.fillStyle = '#fff'; x.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const ARCH_COLORS = ['#c1121f', '#1d4ed8', '#e85d04'];
function buildArch() {
  const g = new THREE.Group();
  for (const x of [-4.3, 4.3]) {
    add(g, new THREE.BoxGeometry(0.8, 6.4, 0.8), 0xc1121f, x, 3.2, 0, true);
    add(g, new THREE.BoxGeometry(1.1, 0.5, 1.1), 0xffd60a, x, 6.6, 0, true);
    add(g, new THREE.ConeGeometry(0.5, 0.9, 4), 0xff9933, x, 7.3, 0).rotation.y = Math.PI / 4;
  }
  add(g, new THREE.BoxGeometry(9.6, 0.5, 0.7), 0xffd60a, 0, 6.15, 0, true);
  add(g, new THREE.BoxGeometry(5.4, 1.5, 0.3), 0x1b1b1b, 0, 5.2, 0.2);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshBasicMaterial({ color: 0xc1121f }));
  board.position.set(0, 5.2, 0.36);
  g.add(board);
  for (let i = 0; i < 26; i++) { // marigold toran
    const t = i / 25;
    add(g, G.marigold, 0, -3.8 + t * 7.6, 4.3 - Math.sin(t * Math.PI * 4) ** 2 * 0.25, 0.42).material = DIYA;
  }
  const tex = ZONES.map((z, i) => nameTexture(z.name, ARCH_COLORS[i]));
  return {
    g: mergeStatic(g),
    setZone(i) {
      board.material.map = tex[i];
      board.material.color.set(tex[i] ? 0xffffff : ARCH_COLORS[i]);
      board.material.needsUpdate = true;
    },
  };
}

// Railway Colony: an express train thunders past on the tracks now and then.
export const TRAIN_LEN = 4 * 17.6;
function buildTrain() {
  const g = new THREE.Group(), BLUE = 0x1f4e8c, CREAM = 0xf1e3c4;
  const coach = (z, engine) => {
    add(g, new THREE.BoxGeometry(2.9, 3.4, 17), engine ? 0xc1121f : BLUE, 0, 2.3, z, true);
    add(g, new THREE.BoxGeometry(2.94, 0.5, 17.02), CREAM, 0, engine ? 1.4 : 3.0, z);
    add(g, new THREE.BoxGeometry(2.6, 0.3, 16.8), 0x8a8f96, 0, 4.15, z);
    add(g, new THREE.BoxGeometry(2.4, 0.5, 15), 0x222222, 0, 0.45, z);
    if (!engine) add(g, new THREE.BoxGeometry(2.96, 0.6, 15.5), 0, 0, 2.4, z).material = WIN_LIT;
  };
  coach(0, true);
  add(g, new THREE.BoxGeometry(2.4, 1.0, 0.1), 0x1e3a5f, 0, 3.1, 8.52); // cab glass
  add(g, new THREE.SphereGeometry(0.22, 10, 8), 0, 0, 3.8, 8.55).material =
    new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffe08a, emissiveIntensity: 1.5 });
  for (let i = 1; i < 4; i++) coach(-i * 17.6, false);
  const train = mergeStatic(g);
  train.position.x = 9.5;
  train.visible = false;
  return train;
}

export function createWorld(scene, seed = 1) {
  const rng = mulberry32(seed);
  // Every slot has a ready-built segment per area; recycling a slot into a new area just swaps which one it shows.
  const variants = ZONES.map((_, zone) => Array.from({ length: SEG_COUNT }, (__, i) => buildSegment(rng, i, zone)));
  const place = (slot, i) => {
    const zone = zoneAt(slot.position.z);
    if (slot.userData.zone === zone) return;
    slot.clear();
    slot.add(variants[zone][i]);
    slot.userData.zone = zone;
  };
  const segments = [];
  for (let i = 0; i < SEG_COUNT; i++) {
    const slot = new THREE.Group();
    slot.position.z = 0 - i * SEG_LEN; // not -i*SEG_LEN: that gives -0
    place(slot, i);
    scene.add(slot);
    segments.push(slot);
  }
  const arch = buildArch(), train = buildTrain();
  scene.add(arch.g, train);
  let trainWait = 3, archAt = null, honked = false;
  const placeArch = (playerZ) => {
    const b = Math.max(1, Math.floor((-playerZ - 15) / ZONE_LEN) + 1); // next area start ahead (or just passed)
    if (b !== archAt) { archAt = b; arch.g.position.z = -b * ZONE_LEN - 5; arch.setZone(b % ZONES.length); }
  };
  placeArch(0);
  return {
    segments,
    train,
    variants: variants.flat(), // for shader warm-up
    // night 0..1, t = seconds (for the switch-on flicker and twinkling bulbs).
    setNight(night, t) {
      LAMPS.forEach((l, g) => {
        const on = night > LAMP_ON_AT[g];
        if (on && l.onAt < 0) l.onAt = t;
        if (!on) l.onAt = -1;
        const since = t - l.onAt;
        l.level = !on ? 0 : since > 0.7 ? 1 : Math.sin(since * 47 + g) > 0.1 ? 0.9 : 0.15;
        l.bulb.emissiveIntensity = l.level * 3;
        l.pool.opacity = l.level * 0.75;
        l.beam.opacity = l.level * 0.07;
      });
      WIN_LIT.emissiveIntensity = Math.max(0, night - 0.2) * 2.2;
      for (const m of signMats.values()) m.emissiveIntensity = night * 0.55;
      DIYA.emissiveIntensity = 0.4 + night * 2.5;
      BULB_MATS.forEach((m, k) => { m.emissiveIntensity = 0.3 + night * (2 + Math.sin(t * 3 + k * 1.3)); });
    },
    lampLevel: () => LAMPS.reduce((a, l) => a + l.level, 0) / LAMPS.length,
    // rain 0..1: the road goes dark and shiny, so lamps and headlights glint on it
    setWet(rain) {
      const road = mat(0x3b3b3b);
      road.roughness = 0.85 - rain * 0.5; // no metalness: without an environment map that just turns it black
      road.color.setHex(0x3b3b3b).multiplyScalar(1 + rain * 0.15); // a touch lighter: Beta is black and must read on it
    },
    reset() {
      segments.forEach((seg, i) => { seg.position.z = 0 - i * SEG_LEN; place(seg, i); });
      train.visible = false;
      trainWait = 3;
      placeArch(0);
    },
    // Returns true the moment the train's horn should blow.
    update(playerZ, dt = 0) {
      segments.forEach((seg, i) => {
        if (seg.position.z - SEG_LEN / 2 > playerZ + 15) {
          // Jump in whole loops so the strip stays contiguous after huge moves.
          const loops = Math.ceil((seg.position.z - SEG_LEN / 2 - playerZ - 15) / (SEG_COUNT * SEG_LEN));
          seg.position.z -= loops * SEG_COUNT * SEG_LEN;
          place(seg, i);
        }
      });
      placeArch(playerZ);
      let horn = false;
      if (train.visible) {
        train.position.z += 24 * dt;
        if (!honked && train.position.z >= playerZ - 70) horn = honked = true;
        if (train.position.z - TRAIN_LEN > playerZ + 30) { train.visible = false; trainWait = 4 + Math.random() * 5; }
      } else if (zoneAt(playerZ + TRAIN_LEN + 35) === 1 && zoneAt(playerZ - 200 - TRAIN_LEN) === 1 && (trainWait -= dt) <= 0) {
        // only when its whole run (from the fog to behind the camera) stays on this area's tracks
        train.position.z = playerZ - 200;
        train.visible = true;
        honked = false;
      }
      return horn;
    },
  };
}
