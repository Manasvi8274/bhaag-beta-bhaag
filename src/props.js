import * as THREE from '../vendor/three.module.js';
import { mergeStatic } from './merge.js';

const mats = new Map();
const mat = (color, extra) => {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!mats.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
    m.userData.glow = extra?.emissiveIntensity; // head/tail lights, bulbs: brighter at night
    mats.set(key, m);
  }
  return mats.get(key);
};
// Headlight beams for oncoming vehicles: invisible by day, they announce autos, buses and scooters at night.
const BEAM_MAT = (() => {
  const data = new Uint8Array(32 * 4);
  for (let i = 0; i < 32; i++) { data.fill(255, i * 4, i * 4 + 3); data[i * 4 + 3] = Math.round(255 * (i / 31) ** 2); }
  const map = new THREE.DataTexture(data, 1, 32);
  map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ color: 0xfff1c0, map, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
})();
const BEAM_GEO = new THREE.CylinderGeometry(0.12, 1.1, 6, 12, 1, true);
const LIGHTS = { auto: [[0, 1.12, 1.18]], bus: [[-0.7, 1.0, 4.02], [0.7, 1.0, 4.02]], scooter: [[0, 1.2, 0.7]] };
export function addHeadlights(mesh, name) {
  for (const [x, y, z] of LIGHTS[name] || []) {
    const b = new THREE.Mesh(BEAM_GEO, BEAM_MAT);
    b.rotation.x = -Math.PI / 2 + 0.08; // narrow end at the lamp, widening ahead, dipped a little
    b.position.set(x, y - 0.24, z + 3);
    b.renderOrder = 2;
    mesh.add(b);
  }
  return mesh;
}

export function setPropsNight(night) {
  for (const m of mats.values()) if (m.userData.glow) m.emissiveIntensity = m.userData.glow * (1 + night * 2.5);
  BEAM_MAT.opacity = night * 0.3;
  BEAM_MAT.visible = night > 0.05; // not drawn at all by day
}

function add(g, geo, color, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
const box = (g, w, h, d, color, x, y, z, extra) => add(g, new THREE.BoxGeometry(w, h, d), color, x, y, z, extra);
const cyl = (g, rt, rb, h, color, x, y, z, extra, seg = 12) => add(g, new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, extra);
const ball = (g, r, color, x, y, z, extra) => add(g, new THREE.SphereGeometry(r, 12, 8), color, x, y, z, extra);
const glow = (c) => ({ emissive: c, emissiveIntensity: 0.9 });
// Tyre + hubcap, axle along x.
function wheel(g, r, w, x, y, z) {
  cyl(g, r, r, w, 0x1b1b1b, x, y, z, undefined, 18).rotation.z = Math.PI / 2;
  cyl(g, r * 0.5, r * 0.5, w + 0.02, 0xb8b8b8, x, y, z, { metalness: 0.6, roughness: 0.35 }).rotation.z = Math.PI / 2;
}

// Capsule from point a to point b (stickman limbs).
function limb(g, a, b, r, color) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = add(g, new THREE.CapsuleGeometry(r, A.distanceTo(B), 4, 8), color, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
}

// Beta's bicycle (front at -z, the way he runs): frame, saddle, handlebar; wheels returned so they can spin.
export function buildBicycle(g) {
  const RED = 0xd62828, INK = 0x1b1b1b, wheels = [];
  for (const z of [-0.55, 0.5]) {
    const w = new THREE.Group();
    w.position.set(0, 0.34, z);
    add(w, new THREE.TorusGeometry(0.32, 0.035, 6, 20), INK).rotation.y = Math.PI / 2;
    for (let i = 0; i < 3; i++) box(w, 0.02, 0.6, 0.02, 0xc0c0c0, 0, 0, 0).rotation.x = (i * Math.PI) / 3;
    g.add(w);
    wheels.push(w);
  }
  limb(g, [0, 0.34, 0.5], [0, 0.55, -0.05], 0.03, RED); // chain stay to the pedals
  limb(g, [0, 0.55, -0.05], [0, 0.92, 0.2], 0.03, RED); // seat tube
  limb(g, [0, 0.55, -0.05], [0, 0.9, -0.42], 0.03, RED); // down tube
  limb(g, [0, 0.92, 0.2], [0, 0.9, -0.42], 0.03, RED); // top tube
  limb(g, [0, 0.34, -0.55], [0, 1.05, -0.45], 0.028, 0x9a9a9a); // fork
  box(g, 0.56, 0.04, 0.04, INK, 0, 1.06, -0.45); // handlebar
  box(g, 0.14, 0.05, 0.24, INK, 0, 0.97, 0.22); // saddle
  ball(g, 0.06, 0xfff3b0, 0, 0.98, -0.52, glow(0xffe08a)); // lamp
  return wheels;
}

// Vehicles and animals face +z, towards the player who runs down -z.
const BUILD = {
  bricks(g) { // ent ka dher: half-used pile of red bricks from a building site
    const reds = [0xb5482a, 0xa13d22, 0xc4573a];
    let i = 0;
    const brick = (x, y, z, ry) => { box(g, 0.36, 0.12, 0.18, reds[i++ % 3], x, y, z).rotation.y = ry; };
    for (const [n, y] of [[3, 0.06], [2, 0.18], [1, 0.3]]) {
      for (let k = 0; k < n; k++) for (const z of [-0.2, 0.2]) brick((k - (n - 1) / 2) * 0.38, y, z, 0);
    }
    brick(0.05, 0.42, 0, 0.5);
    brick(-0.45, 0.06, 0.32, 0.9);
    brick(0.45, 0.06, -0.3, -0.4);
    for (const [x, z] of [[-0.3, -0.34], [0.35, 0.34]]) add(g, new THREE.DodecahedronGeometry(0.07), 0x9a8f86, x, 0.05, z, { flatShading: true });
  },
  pothole(g) { // gaddha: muddy water, broken tar, a little warning cone
    cyl(g, 0.66, 0.56, 0.06, 0x2b241e, 0, 0.03, 0, undefined, 20);
    add(g, new THREE.CircleGeometry(0.5, 20), 0x6b5a45, 0, 0.065, 0, { roughness: 0.08, metalness: 0.3 }).rotation.x = -Math.PI / 2;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3, r = 0.5 + (i % 2) * 0.05;
      add(g, new THREE.DodecahedronGeometry(0.1 + (i % 3) * 0.03), i % 2 ? 0x3d3d3d : 0x8a8a8a,
        Math.cos(a) * r, 0.07, Math.sin(a) * r, { flatShading: true }).scale.y = 0.5;
    }
    cyl(g, 0.04, 0.14, 0.3, 0xff6d00, 0.42, 0.15, -0.25);
    cyl(g, 0.075, 0.1, 0.06, 0xffffff, 0.42, 0.17, -0.25);
  },
  barricade(g) { // police barricade: striped planks on A-frame legs
    for (const x of [-0.6, 0.6]) for (const z of [-0.14, 0.14]) {
      box(g, 0.06, 0.85, 0.06, 0x555555, x, 0.42, z).rotation.x = z > 0 ? -0.3 : 0.3;
    }
    for (const y of [0.55, 0.78]) for (let i = 0; i < 6; i++) box(g, 0.23, 0.16, 0.05, i % 2 ? 0x111111 : 0xffd60a, -0.575 + i * 0.23, y, 0.04);
    box(g, 0.5, 0.14, 0.06, 0x1d4ed8, 0, 0.32, 0.04); // "POLICE" board
    box(g, 0.36, 0.04, 0.065, 0xffffff, 0, 0.32, 0.04);
    for (const x of [-0.62, 0.62]) ball(g, 0.05, 0xff2d2d, x, 0.9, 0.04, glow(0xff0000));
  },
  ramp(g) { // wooden plank ramp up to a bus roof: low end at +z (towards the player), 3.2 m high at -z
    const L = 6, H = 3.2, deck = new THREE.Group();
    deck.position.set(0, H / 2, 0);
    deck.rotation.x = Math.atan2(H, L);
    g.add(deck);
    const len = Math.hypot(L, H);
    box(deck, 1.5, 0.1, len, 0xb07a45, 0, 0, 0);
    for (const x of [-0.78, 0.78]) box(deck, 0.08, 0.18, len, 0xffd60a, x, 0.04, 0); // yellow rails
    for (let i = 0; i < 9; i++) box(deck, 1.5, 0.03, 0.12, 0x6e4a26, 0, 0.065, -len / 2 + 0.4 + i * ((len - 0.8) / 8));
    for (const [z, h] of [[-2.6, 2.95], [-0.6, 1.9]]) for (const x of [-0.65, 0.65]) box(g, 0.1, h, 0.1, 0x5a3a1e, x, h / 2, z);
    box(g, 1.4, 0.08, 0.08, 0x5a3a1e, 0, 2.2, -2.6); // cross brace
  },
  chappal(g) { // Papa's thrown hawai chappal, flat; game.js spins it
    box(g, 0.22, 0.04, 0.48, 0xf5f5f0, 0, 0.04, 0);
    box(g, 0.23, 0.03, 0.49, 0x1d4ed8, 0, 0.005, 0);
    for (const s of [-1, 1]) box(g, 0.035, 0.05, 0.2, 0x1d4ed8, s * 0.055, 0.08, -0.08).rotation.y = s * 0.45;
  },
  banner(g) { // shaadi banner across the street: slide under it
    for (const x of [-3.2, 3.2]) {
      cyl(g, 0.07, 0.08, 2.3, 0xc8a165, x, 1.15, 0, undefined, 8);
      ball(g, 0.1, 0xffd60a, x, 2.32, 0, glow(0xaa7700));
    }
    box(g, 5.6, 0.62, 0.04, 0xc1121f, 0, 1.6, 0);
    box(g, 5.7, 0.07, 0.05, 0xffd60a, 0, 1.94, 0);
    box(g, 5.7, 0.07, 0.05, 0xffd60a, 0, 1.27, 0);
    for (const x of [-1.6, 0, 1.6]) box(g, 0.9, 0.22, 0.05, 0xfff1a8, x, 1.6, 0);
    for (let i = 0; i < 22; i++) { // marigold string
      const x = -2.75 + i * (5.5 / 21), y = 1.19 - 0.06 * Math.sin((i / 21) * Math.PI * 4) ** 2;
      ball(g, 0.055, i % 2 ? 0xff8c00 : 0xffc300, x, y, 0.02);
    }
  },
  cow(g) { // white desi cow: painted horns, marigold garland, bell
    const W = 0xf2efe9, PATCH = 0x8b5a2b;
    add(g, new THREE.CapsuleGeometry(0.4, 1.0, 6, 12), W, 0, 1.0, -0.05).rotation.x = Math.PI / 2;
    ball(g, 0.26, W, 0, 1.36, 0.42).scale.set(1, 0.8, 1.2); // hump
    ball(g, 0.3, PATCH, 0.2, 1.12, -0.35).scale.set(0.75, 0.75, 1.1);
    for (const x of [-0.24, 0.24]) for (const z of [-0.6, 0.55]) {
      cyl(g, 0.075, 0.06, 0.6, W, x, 0.33, z);
      cyl(g, 0.065, 0.07, 0.07, 0x3a3027, x, 0.035, z);
    }
    box(g, 0.24, 0.42, 0.32, W, 0, 1.08, 0.86).rotation.x = -0.5; // neck
    box(g, 0.32, 0.34, 0.46, W, 0, 1.24, 1.06).rotation.x = 0.35; // head
    box(g, 0.28, 0.2, 0.12, 0xf4a3a8, 0, 1.12, 1.28); // muzzle
    for (const s of [-1, 1]) {
      ball(g, 0.04, 0x111111, s * 0.15, 1.33, 1.14);
      box(g, 0.2, 0.06, 0.1, W, s * 0.24, 1.33, 0.98).rotation.z = s * -0.4;
      cyl(g, 0.025, 0.055, 0.32, 0xff6d00, s * 0.11, 1.53, 0.96).rotation.z = s * -0.45;
      cyl(g, 0.01, 0.026, 0.1, 0x1d4ed8, s * 0.19, 1.68, 0.96).rotation.z = s * -0.45;
    }
    add(g, new THREE.TorusGeometry(0.26, 0.05, 6, 16), 0xff8c00, 0, 1.0, 0.82).rotation.x = 1.0;
    cyl(g, 0.05, 0.07, 0.1, 0xd4a017, 0, 0.8, 0.94, { metalness: 0.7, roughness: 0.3 });
    cyl(g, 0.02, 0.02, 0.6, W, 0, 0.9, -1.0).rotation.x = 0.25;
    ball(g, 0.05, 0x3a3027, 0, 0.6, -1.08);
  },
  auto(g) { // auto-rickshaw: green body, yellow hood, single front wheel
    const GREEN = 0x1b9e3e, YELLOW = 0xffd60a;
    box(g, 1.4, 0.5, 1.6, GREEN, 0, 0.62, -0.45);
    box(g, 1.42, 0.08, 1.62, 0xffffff, 0, 0.9, -0.45);
    box(g, 1.1, 0.35, 0.8, 0x222222, 0, 1.0, -0.6); // seat
    box(g, 0.62, 1.05, 0.5, GREEN, 0, 0.82, 0.9).rotation.x = 0.18; // front cowl
    box(g, 0.9, 0.12, 0.9, GREEN, 0, 0.45, 0.45); // floor
    ball(g, 0.1, 0xfff3b0, 0, 1.12, 1.18, glow(0xffe08a));
    box(g, 0.3, 0.12, 0.03, 0xffffff, 0, 0.62, 1.17); // number plate
    box(g, 1.3, 0.55, 0.04, 0x9fd8ff, 0, 1.6, 0.88, { roughness: 0.1, metalness: 0.2 }).rotation.x = -0.25;
    box(g, 0.7, 0.04, 0.04, 0x333333, 0, 1.3, 0.72); // handlebar
    const hood = add(g, new THREE.CylinderGeometry(0.72, 0.72, 2.0, 18), YELLOW, 0, 1.75, -0.15);
    hood.rotation.x = Math.PI / 2; hood.scale.set(1, 1, 0.4);
    box(g, 1.4, 0.75, 0.06, YELLOW, 0, 1.4, -1.2);
    for (const x of [-0.68, 0.68]) box(g, 0.05, 1.0, 0.05, 0x1b1b1b, x, 1.3, 0.75);
    wheel(g, 0.25, 0.15, 0, 0.25, 1.05);
    for (const x of [-0.62, 0.62]) wheel(g, 0.25, 0.16, x, 0.25, -0.75);
    for (const x of [-0.5, 0.5]) box(g, 0.18, 0.08, 0.03, 0xff2d2d, x, 0.7, -1.26, glow(0xaa0000));
  },
  cart(g) { // sabzi thela: wooden cart, spoked wheels, heaps of vegetables
    const WOOD = 0x9c6b3e, DARK = 0x7a5230;
    box(g, 1.4, 0.12, 1.9, WOOD, 0, 0.82, 0);
    for (const x of [-0.7, 0.7]) box(g, 0.05, 0.16, 1.9, DARK, x, 0.94, 0);
    for (const x of [-0.45, 0.45]) cyl(g, 0.03, 0.03, 0.5, DARK, x, 0.8, 1.15, undefined, 6).rotation.x = Math.PI / 2;
    for (const x of [-0.7, 0.7]) {
      add(g, new THREE.TorusGeometry(0.38, 0.04, 6, 18), 0x5a3a1e, x, 0.42, 0.2).rotation.y = Math.PI / 2;
      for (let i = 0; i < 3; i++) box(g, 0.03, 0.74, 0.04, DARK, x, 0.42, 0.2).rotation.x = (i * Math.PI) / 3;
    }
    box(g, 0.06, 0.8, 0.06, DARK, 0, 0.4, -0.85);
    const heap = (color, x, z, n, r) => {
      for (let i = 0; i < n; i++) {
        const a = i * 2.4, d = (i % 4) * r * 0.9;
        ball(g, r, color, x + Math.cos(a) * d * 0.8, 0.94 + r + (i < 3 ? r * 1.4 : 0), z + Math.sin(a) * d);
      }
    };
    heap(0xe63946, -0.35, -0.5, 9, 0.09); // tomatoes
    heap(0xf77f00, 0.35, -0.5, 8, 0.1); // oranges
    heap(0x6a2c70, -0.35, 0.25, 8, 0.09); // onions
    heap(0x7cb518, 0.35, 0.25, 4, 0.16); // cabbages
    box(g, 0.25, 0.04, 0.15, 0xc0c0c0, 0, 1.0, 0.75, { metalness: 0.7 }); // weighing pan
  },
  bus(g) { // red state-transport bus: windows, door, glowing destination board
    const RED = 0xc1121f, CREAM = 0xf1e3c4, GLASS = 0x1e3a5f;
    box(g, 1.9, 2.5, 8, RED, 0, 1.65, 0);
    const roof = add(g, new THREE.CylinderGeometry(0.95, 0.95, 8, 16), RED, 0, 2.9, 0);
    roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.3);
    box(g, 1.92, 0.22, 8.02, CREAM, 0, 1.45, 0);
    box(g, 1.92, 0.06, 8.02, 0x1b1b1b, 0, 0.42, 0);
    for (const s of [-1, 1]) {
      box(g, 0.02, 0.75, 7.0, GLASS, s * 0.96, 2.25, -0.3, { roughness: 0.15 });
      for (let i = 0; i < 9; i++) box(g, 0.03, 0.78, 0.08, CREAM, s * 0.965, 2.25, -3.8 + i * 0.88);
    }
    box(g, 0.03, 1.9, 0.75, 0x333333, -0.965, 1.4, 3.1); // door
    box(g, 1.72, 1.0, 0.04, GLASS, 0, 2.2, 4.01, { roughness: 0.1, metalness: 0.2 });
    box(g, 1.3, 0.24, 0.05, 0xff9f1c, 0, 2.86, 4.01, glow(0xcc6a00)); // destination board
    box(g, 1.92, 0.25, 0.12, 0x1b1b1b, 0, 0.55, 4.02); // bumper
    box(g, 0.9, 0.35, 0.04, 0x444444, 0, 1.0, 4.01); // grille
    for (const x of [-0.7, 0.7]) ball(g, 0.12, 0xfff3b0, x, 1.0, 4.02, glow(0xffe08a));
    for (const x of [-0.7, 0.7]) box(g, 0.2, 0.3, 0.05, 0xff2d2d, x, 1.0, -4.02, glow(0x880000));
    box(g, 0.5, 0.2, 0.04, 0xffffff, 0, 0.82, 4.03);
    for (const s of [-1, 1]) box(g, 0.06, 0.3, 0.1, 0x1b1b1b, s * 1.0, 2.2, 3.9); // mirrors
    for (const x of [-0.85, 0.85]) for (const z of [-2.8, 2.6]) wheel(g, 0.42, 0.3, x, 0.42, z);
  },
  scooter(g) { // uncle on his scooter, coming the wrong way: a stickman in a yellow helmet
    const BODY = 0x1d8fbf, INK = 0x151515;
    for (const z of [-0.62, 0.62]) wheel(g, 0.22, 0.12, 0, 0.22, z);
    box(g, 0.5, 0.1, 0.8, 0x2b2b2b, 0, 0.35, 0.05); // floorboard
    box(g, 0.62, 0.42, 0.85, BODY, 0, 0.6, -0.42);
    box(g, 0.44, 0.12, 0.72, 0x222222, 0, 0.87, -0.38); // seat
    box(g, 0.58, 0.8, 0.1, BODY, 0, 0.72, 0.45).rotation.x = -0.18; // leg shield
    box(g, 0.2, 0.1, 0.36, BODY, 0, 0.5, 0.62); // mudguard
    cyl(g, 0.035, 0.035, 0.62, 0x333333, 0, 1.02, 0.56, undefined, 6).rotation.x = -0.25;
    box(g, 0.72, 0.05, 0.05, 0x333333, 0, 1.3, 0.63); // handlebar
    ball(g, 0.08, 0xfff3b0, 0, 1.2, 0.7, glow(0xffe08a));
    box(g, 0.2, 0.08, 0.03, 0xff2d2d, 0, 0.68, -0.86, glow(0xaa0000));
    for (const s of [-1, 1]) {
      box(g, 0.03, 0.2, 0.03, 0x333333, s * 0.38, 1.42, 0.6);
      box(g, 0.1, 0.07, 0.03, 0xc0c0c0, s * 0.4, 1.55, 0.6, { metalness: 0.6, roughness: 0.3 });
      limb(g, [s * 0.17, 1.52, -0.28], [s * 0.3, 1.3, 0.6], 0.05, INK); // arm to the handlebar
      limb(g, [s * 0.1, 0.98, -0.36], [s * 0.15, 1.08, 0.12], 0.06, INK); // thigh
      limb(g, [s * 0.15, 1.08, 0.12], [s * 0.15, 0.44, 0.24], 0.055, INK); // shin to the floorboard
    }
    limb(g, [0, 0.98, -0.36], [0, 1.52, -0.24], 0.1, INK); // body
    ball(g, 0.16, INK, 0, 1.7, -0.22);
    add(g, new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xffd60a, 0, 1.72, -0.22);
    box(g, 0.24, 0.05, 0.02, 0x9fd8ff, 0, 1.69, -0.05, { roughness: 0.1 }); // visor
  },
  dog(g) { // street dog fast asleep across the lane: jump it, don't wake it
    const TAN = 0xc68642, DARK = 0x6b4226;
    add(g, new THREE.CapsuleGeometry(0.2, 0.5, 6, 12), TAN, 0, 0.2, 0).rotation.z = Math.PI / 2;
    ball(g, 0.13, 0xf5e6d0, 0.05, 0.33, 0.04).scale.set(1.6, 0.5, 1);
    ball(g, 0.15, TAN, 0.52, 0.17, 0.06);
    box(g, 0.13, 0.09, 0.17, TAN, 0.58, 0.12, 0.2);
    ball(g, 0.035, 0x111111, 0.58, 0.15, 0.29);
    for (const x of [0.45, 0.6]) cyl(g, 0.0, 0.05, 0.11, DARK, x, 0.31, 0.02, undefined, 6);
    for (const x of [-0.32, -0.18, 0.18, 0.3]) add(g, new THREE.CapsuleGeometry(0.04, 0.2, 4, 6), TAN, x, 0.07, 0.2).rotation.x = Math.PI / 2;
    add(g, new THREE.CapsuleGeometry(0.035, 0.28, 4, 6), DARK, -0.42, 0.1, 0.2).rotation.set(1.2, 0, 0.5);
  },
  pipe(g) { // cement pipe for the new drain, rolled across the lane: jump it
    const p = cyl(g, 0.45, 0.45, 1.3, 0x9e9e9e, 0, 0.45, 0, undefined, 20);
    p.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) {
      add(g, new THREE.CircleGeometry(0.35, 20), 0x2a2a2a, s * 0.652, 0.45, 0).rotation.y = s * Math.PI / 2;
      cyl(g, 0.455, 0.455, 0.07, 0xc1121f, s * 0.42, 0.45, 0, undefined, 20).rotation.z = Math.PI / 2;
      for (const x of [-0.4, 0.4]) box(g, 0.14, 0.12, 0.22, 0x8a5a2b, x, 0.06, s * 0.43);
    }
  },
  // Power-ups: ~0.8 tall, bottom at 0, glowing so they read at speed.
  shield(g) {
    add(g, new THREE.TorusGeometry(0.3, 0.07, 10, 24), 0xff70a6, 0, 0.4, 0, { emissive: 0x991848 });
    add(g, new THREE.SphereGeometry(0.2, 16, 12), 0xffc2dc, 0, 0.4, 0, { emissive: 0xff70a6, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
  },
  magnet(g) {
    add(g, new THREE.IcosahedronGeometry(0.3, 1), 0xf4a300, 0, 0.42, 0, { flatShading: true, emissive: 0x7a4200 });
    add(g, new THREE.CylinderGeometry(0.32, 0.26, 0.06, 20), 0xd9d9d9, 0, 0.06, 0, { metalness: 0.7, roughness: 0.3 });
    for (const [x, y, z] of [[0.12, 0.65, -0.18], [-0.16, 0.55, -0.2], [0.02, 0.3, -0.29]]) add(g, new THREE.SphereGeometry(0.035, 6, 4), 0xfff1a8, x, y, z);
  },
  jump(g) {
    add(g, new THREE.CylinderGeometry(0.17, 0.14, 0.5, 18), 0xffffff, 0, 0.25, 0, { emissive: 0x777777 });
    add(g, new THREE.CylinderGeometry(0.2, 0.17, 0.6, 18, 1, true), 0xbfe6ff, 0, 0.3, 0, { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    add(g, new THREE.ConeGeometry(0.14, 0.2, 12), 0x3a86ff, 0, 0.72, 0, { emissive: 0x1d4ed8 });
  },
  double(g) {
    for (const x of [-0.15, 0.15]) {
      add(g, new THREE.CylinderGeometry(0.28, 0.28, 0.07, 24), 0xffc300, x, 0.4, x, { metalness: 0.6, roughness: 0.3, emissive: 0x885500 }).rotation.x = Math.PI / 2;
    }
    add(g, new THREE.TorusGeometry(0.4, 0.03, 6, 24), 0xfff1a8, 0, 0.4, 0, { emissive: 0xffd60a });
  },
  cycle(g) { // power-up: a little glowing bicycle
    const r = new THREE.Group();
    r.scale.setScalar(0.5);
    r.position.y = 0.05;
    buildBicycle(r);
    g.add(r);
    add(g, new THREE.TorusGeometry(0.42, 0.03, 6, 24), 0xfff1a8, 0, 0.42, 0, { emissive: 0xffd60a });
  },
  coin(g) {
    const m = add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24), 0xffc300, 0, 0.3, 0,
      { metalness: 0.6, roughness: 0.3, emissive: 0x553300, emissiveIntensity: 1 }); // glows brighter at night
    m.rotation.x = Math.PI / 2;
  },
};

export const PROP_NAMES = Object.keys(BUILD);

// Built once per name (merged to one mesh per material), then cloned: clones share geometry, so spawning thousands never leaks GPU memory.
const templates = new Map();
export function createProp(name) {
  const build = BUILD[name];
  if (!build) throw new Error(`Unknown prop: ${name}`);
  if (!templates.has(name)) { const g = new THREE.Group(); build(g); templates.set(name, mergeStatic(g)); }
  return templates.get(name).clone();
}
