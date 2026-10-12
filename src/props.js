import * as THREE from '../vendor/three.module.js';

const mats = new Map();
const mat = (color, extra) => {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra }));
  return mats.get(key);
};

function add(g, geo, color, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
const box = (g, w, h, d, color, x, y, z) => add(g, new THREE.BoxGeometry(w, h, d), color, x, y, z);
const wheel = (g, r, w, x, y, z) => { add(g, new THREE.CylinderGeometry(r, r, w, 16), 0x1b1b1b, x, y, z).rotation.z = Math.PI / 2; };

const BUILD = {
  stone(g) {
    const m = add(g, new THREE.DodecahedronGeometry(0.5), 0x8d8d8d, 0, 0.25, 0, { flatShading: true });
    m.scale.set(1.2, 0.5, 0.8);
    for (const x of [-0.45, 0.45]) add(g, new THREE.DodecahedronGeometry(0.12), 0x777777, x, 0.1, 0.25, { flatShading: true });
  },
  pothole(g) {
    add(g, new THREE.CylinderGeometry(0.7, 0.7, 0.06, 20), 0x3b2f25, 0, 0.03, 0);
    add(g, new THREE.CylinderGeometry(0.58, 0.58, 0.02, 20), 0x5b4a3a, 0, 0.07, 0, { roughness: 0.2 });
    for (const [x, z] of [[-0.6, 0.3], [0.55, -0.4], [0.2, 0.55]]) {
      add(g, new THREE.DodecahedronGeometry(0.15), 0x9a9a9a, x, 0.15, z, { flatShading: true });
    }
  },
  clothesline(g) {
    for (const x of [-3.2, 3.2]) add(g, new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), 0xc8a165, x, 1.1, 0);
    add(g, new THREE.CylinderGeometry(0.015, 0.015, 6.4, 6), 0xeeeeee, 0, 1.45, 0).rotation.z = Math.PI / 2;
    [0xe63946, 0xffb703, 0x219ebc, 0x8ac926, 0xff70a6, 0xffffff].forEach((c, i) => {
      box(g, 0.55, 0.45, 0.03, c, -2.5 + i, 1.22, 0).rotation.z = (i % 2 ? 0.06 : -0.06);
    });
  },
  cow(g) {
    box(g, 1.0, 0.8, 1.7, 0xf2efe9, 0, 0.95, 0);
    for (const x of [-0.36, 0.36]) for (const z of [-0.65, 0.65]) box(g, 0.18, 0.6, 0.18, 0xf2efe9, x, 0.3, z);
    box(g, 0.45, 0.45, 0.55, 0xf2efe9, 0, 1.25, -1.05);
    box(g, 0.3, 0.2, 0.1, 0xf4a3a8, 0, 1.12, -1.33); // nose
    for (const x of [-0.15, 0.15]) add(g, new THREE.ConeGeometry(0.05, 0.3, 8), 0xd9c9a3, x, 1.6, -1.0);
    box(g, 1.02, 0.4, 0.5, 0x6b4226, 0, 1.05, 0.2);
    box(g, 0.5, 0.3, 0.4, 0x6b4226, 0.26, 1.2, -0.5);
    box(g, 0.06, 0.6, 0.06, 0x6b4226, 0, 0.8, 0.88);
  },
  auto(g) {
    box(g, 1.4, 0.8, 2.6, 0x1b9e3e, 0, 0.65, 0);
    box(g, 1.5, 0.7, 2.0, 0xffd60a, 0, 1.65, 0.2);
    for (const x of [-0.7, 0.7]) box(g, 0.06, 0.7, 0.06, 0x1b1b1b, x, 1.3, -0.75);
    box(g, 1.3, 0.5, 0.04, 0x9fd8ff, 0, 1.35, -0.78); // windshield
    box(g, 0.3, 0.12, 0.05, 0xfff3b0, 0, 0.8, -1.32); // headlight
    wheel(g, 0.25, 0.15, 0, 0.25, -1.1);
    for (const x of [-0.65, 0.65]) wheel(g, 0.25, 0.15, x, 0.25, 0.9);
  },
  cart(g) {
    box(g, 1.4, 0.15, 2.0, 0x9c6b3e, 0, 0.85, 0);
    for (const x of [-0.65, 0.65]) wheel(g, 0.45, 0.08, x, 0.45, 0.3);
    for (const z of [-0.85]) for (const x of [-0.5, 0.5]) box(g, 0.08, 0.8, 0.08, 0x7a5230, x, 0.4, z);
    const colors = [0xe63946, 0x2a9d8f, 0xf77f00];
    for (let i = 0; i < 18; i++) {
      const x = ((i % 3) - 1) * 0.35, z = (Math.floor(i / 3) - 2.5) * 0.3, y = 1.04 + (i % 2) * 0.12;
      add(g, new THREE.SphereGeometry(0.12, 8, 6), colors[i % 3], x, y, z);
    }
  },
  bus(g) {
    box(g, 1.9, 2.7, 8, 0xd62828, 0, 1.75, 0);
    box(g, 1.92, 0.25, 8.02, 0xf1e3c4, 0, 1.5, 0);
    box(g, 1.92, 0.7, 7.2, 0x1e3a5f, 0, 2.4, 0.2);
    box(g, 1.7, 0.9, 0.04, 0x1e3a5f, 0, 2.3, -4.01); // front glass
    for (const x of [-0.85, 0.85]) for (const z of [-2.8, 2.8]) wheel(g, 0.4, 0.3, x, 0.4, z);
  },
  coin(g) {
    const m = add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24), 0xffc300, 0, 0.3, 0,
      { metalness: 0.6, roughness: 0.3, emissive: 0x553300 });
    m.rotation.x = Math.PI / 2;
  },
};

export function createProp(name) {
  const build = BUILD[name];
  if (!build) throw new Error(`Unknown prop: ${name}`);
  const g = new THREE.Group();
  build(g);
  return g;
}
