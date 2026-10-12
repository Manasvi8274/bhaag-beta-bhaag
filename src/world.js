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
    for (const dz of [-3, 0, 3]) add(seg, G.window, 0x2b2d42, face - side * 0.04, y, z + dz);
  }
  const signColor = SIGNS[Math.floor(rng() * SIGNS.length)];
  add(seg, G.sign, signColor, face - side * 0.1, 3.2, z);
  add(seg, G.awning, signColor === 0xffbe0b ? 0xff006e : 0xffbe0b, face - side * 0.6, 2.5, z).rotation.z = side * 0.25;
}

function buildSegment(rng) {
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
  return seg;
}

export function createWorld(scene, seed = 1) {
  const rng = mulberry32(seed);
  const segments = [];
  for (let i = 0; i < SEG_COUNT; i++) {
    const seg = buildSegment(rng);
    seg.position.z = 0 - i * SEG_LEN; // not -i*SEG_LEN: that gives -0
    scene.add(seg);
    segments.push(seg);
  }
  return {
    segments,
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
