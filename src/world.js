import * as THREE from '../vendor/three.module.js';
import { mulberry32 } from './spawner.js';

export const SEG_LEN = 30;
export const SEG_COUNT = 8;

const WALLS = [0xf4a261, 0xe9c46a, 0x2a9d8f, 0xe76f51, 0xa8dadc, 0xffb4a2, 0xcdb4db, 0x90be6d, 0xf1faee];
const SIGNS = [0xff006e, 0xfb5607, 0xffbe0b, 0x3a86ff, 0x8338ec];

// Shared geometry/materials keep draw-call setup and memory low on phones.
const mats = new Map();
const mat = (color) => {
  if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  return mats.get(color);
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

function building(seg, rng, side, z) {
  const h = 6 + rng() * 8;
  const face = side * 5.5; // road-facing wall
  add(seg, new THREE.BoxGeometry(6, h, 9.5), WALLS[Math.floor(rng() * WALLS.length)], side * 8.5, h / 2, z, true);
  for (const y of [5, 7.8]) {
    if (y > h - 1) continue;
    for (const dz of [-3, 0, 3]) {
      const w = add(seg, G.window, 0x2b2d42, face - side * 0.04, y, z + dz);
      if (rng() < 0.5) w.material = WIN_LIT;
    }
  }
  const signColor = SIGNS[Math.floor(rng() * SIGNS.length)];
  add(seg, G.sign, signColor, face - side * 0.1, 3.2, z).material = signMat(signColor);
  add(seg, G.awning, signColor === 0xffbe0b ? 0xff006e : 0xffbe0b, face - side * 0.6, 2.5, z).rotation.z = side * 0.25;
}

function buildSegment(rng, i) {
  const seg = new THREE.Group();
  add(seg, G.road, 0x3b3b3b, 0, 0, 0).rotation.x = -Math.PI / 2;
  for (let z = -SEG_LEN / 2 + 3; z < SEG_LEN / 2; z += 6) for (const x of [-1, 1]) add(seg, G.dash, 0xffffff, x, 0.01, z);
  for (const side of [-1, 1]) {
    add(seg, G.walk, 0xb5a99a, side * 4.5, 0.075, 0);
    add(seg, G.kerb, 0xf2c94c, side * 3.55, 0.09, 0);
    for (const z of [-10, 0, 10]) building(seg, rng, side, z);
  }
  add(seg, G.pole, 0x555555, 3.7, 3.5, 0, true);
  for (const y of [6.2, 6.5, 6.8]) add(seg, G.wire, 0x222222, 0, y, 0).rotation.z = Math.PI / 2;
  for (const [n, side, z] of [[0, -1, 7.5], [1, 1, -7.5]]) streetlight(seg, side, z, LAMPS[(i * 2 + n) % 3]);
  return seg;
}

// Municipal streetlight: grey pole on the kerb, arm over the road, sodium lamp, a light pool and a faint beam at night.
function streetlight(seg, side, z, lamp) {
  const x = side * 3.75, hx = side * 2.65; // hx matches lampAt()
  add(seg, G.lampPole, 0x7d8085, x, 3.2, z, true);
  add(seg, G.lampArm, 0x7d8085, (x + hx) / 2, 6.3, z).rotation.z = Math.PI / 2 + side * 0.18;
  add(seg, G.lampHead, 0x5b5f66, hx, LAMP_HEAD_Y + 0.08, z, true);
  const bulb = add(seg, G.bulb, 0, hx, LAMP_HEAD_Y, z);
  bulb.material = lamp.bulb;
  const pool = new THREE.Mesh(G.pool, lamp.pool);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(hx * 0.8, 0.04, z);
  pool.renderOrder = 1;
  const beam = new THREE.Mesh(G.beam, lamp.beam);
  beam.position.set(hx, LAMP_HEAD_Y - 3, z);
  beam.renderOrder = 2;
  seg.add(pool, beam);
}

export function createWorld(scene, seed = 1) {
  const rng = mulberry32(seed);
  const segments = [];
  for (let i = 0; i < SEG_COUNT; i++) {
    const seg = buildSegment(rng, i);
    seg.position.z = 0 - i * SEG_LEN; // not -i*SEG_LEN: that gives -0
    scene.add(seg);
    segments.push(seg);
  }
  return {
    segments,
    // night 0..1, t = seconds (for the switch-on flicker).
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
    },
    lampLevel: () => LAMPS.reduce((a, l) => a + l.level, 0) / LAMPS.length,
    reset() { segments.forEach((seg, i) => { seg.position.z = 0 - i * SEG_LEN; }); },
    update(playerZ) {
      for (const seg of segments) {
        if (seg.position.z - SEG_LEN / 2 > playerZ + 15) {
          // Jump in whole loops so the strip stays contiguous after huge moves.
          const loops = Math.ceil((seg.position.z - SEG_LEN / 2 - playerZ - 15) / (SEG_COUNT * SEG_LEN));
          seg.position.z -= loops * SEG_COUNT * SEG_LEN;
        }
      }
    },
  };
}
