import * as THREE from '../vendor/three.module.js';

const BLACK = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 });
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10);

function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function buildBody(R) {
  const group = new THREE.Group();
  const body = joint(group, 0, 0, 0);
  const pelvis = joint(body, 0, 0.95, 0);
  mesh(capsule(0.11, 0.45), BLACK, pelvis, 0, 0.3, 0);
  const head = joint(pelvis, 0, 0.8, 0);
  mesh(new THREE.SphereGeometry(0.2, 24, 16), BLACK, head);
  const white = mat(0xffffff);
  for (const x of [-0.07, 0.07]) mesh(new THREE.SphereGeometry(0.035, 8, 6), white, head, x, 0.04, -0.18);
  const arm = (x) => {
    const sh = joint(pelvis, x, 0.55, 0);
    mesh(capsule(R, 0.28), BLACK, sh, 0, -0.17, 0);
    const el = joint(sh, 0, -0.34, 0);
    mesh(capsule(R, 0.26), BLACK, el, 0, -0.15, 0);
    return [sh, el];
  };
  const leg = (x) => {
    const hip = joint(pelvis, x, 0, 0);
    mesh(capsule(R, 0.36), BLACK, hip, 0, -0.22, 0);
    const knee = joint(hip, 0, -0.45, 0);
    mesh(capsule(R, 0.36), BLACK, knee, 0, -0.22, 0);
    mesh(new THREE.BoxGeometry(0.12, 0.06, 0.24), BLACK, knee, 0, -0.47, -0.05);
    return [hip, knee];
  };
  const [shoulderL, elbowL] = arm(-0.2);
  const [shoulderR, elbowR] = arm(0.2);
  const [hipL, kneeL] = leg(-0.1);
  const [hipR, kneeR] = leg(0.1);
  return { group, joints: { body, pelvis, head, shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR } };
}

export const HEROES = ['beta', 'beti'];
export const CHASERS = ['papa', 'mummy', 'dadi'];
const capsuleMesh = (r, len, material, parent, x, y, z) => mesh(capsule(r, len), material, parent, x, y, z);

// What each chaser waves (and throws): held in the right fist, sticking out so it reads from behind.
function weapon(type, j) {
  const hand = joint(j.elbowR, 0, -0.36, 0);
  mesh(new THREE.SphereGeometry(0.075, 10, 8), BLACK, hand); // fist
  if (type === 'papa') { // hawai chappal gripped by the heel
    const sole = mesh(new THREE.BoxGeometry(0.19, 0.44, 0.04), mat(0xf5f5f0), hand, 0, -0.24, 0);
    mesh(new THREE.BoxGeometry(0.2, 0.45, 0.03), mat(0x1d4ed8), sole, 0, 0, 0.032);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.03, 0.17, 0.035), mat(0x1d4ed8), sole, s * 0.05, 0.1, -0.035).rotation.z = s * 0.45;
  } else if (type === 'mummy') { // belan (rolling pin)
    const wood = mat(0xc68642);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 12), wood, hand, 0, -0.26, 0);
    for (const y of [-0.02, -0.52]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), mat(0x8b5a2b), hand, 0, y, 0);
  } else { // dadi's lathi with a curved handle
    const cane = mat(0x6b4226);
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), cane, hand, 0, -0.45, 0);
    mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12, Math.PI), cane, hand, 0.08, 0.04, 0).rotation.z = 0;
  }
}

function addAccessories(type, group, j) {
  const skin = { cap: mat(0xd62828), bag: mat(0x1d4ed8) };
  if (type === 'beta') {
    const red = skin.cap;
    mesh(new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, j.head, 0, 0.02, 0);
    mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), red, j.head, 0, 0.03, -0.17);
    mesh(new THREE.BoxGeometry(0.06, 0.3, 0.02), red, j.pelvis, 0, 0.35, -0.12);
    mesh(new THREE.BoxGeometry(0.3, 0.35, 0.15), skin.bag, j.pelvis, 0, 0.35, 0.16);
  } else if (type === 'beti') { // two choti with ribbons, school frock, same bag
    for (const s of [-1, 1]) {
      capsuleMesh(0.05, 0.22, BLACK, j.head, s * 0.2, -0.12, 0.06);
      mesh(new THREE.BoxGeometry(0.12, 0.06, 0.06), skin.cap, j.head, s * 0.2, 0.0, 0.06); // ribbon bow
    }
    mesh(new THREE.CylinderGeometry(0.12, 0.27, 0.42, 16), skin.cap, j.pelvis, 0, 0.1, 0); // frock
    mesh(new THREE.BoxGeometry(0.3, 0.35, 0.15), skin.bag, j.pelvis, 0, 0.35, 0.16);
  } else if (type === 'papa') {
    group.scale.setScalar(1.12);
    const white = mat(0xf5f5f0);
    mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.45, 16), white, j.pelvis, 0, 0.3, 0);
    mesh(new THREE.SphereGeometry(0.22, 16, 12), white, j.pelvis, 0, 0.18, -0.07);
    mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), BLACK, j.head, 0, -0.06, -0.19);
    weapon(type, j);
  } else { // mummy: pink saree with a gold pallu, bun, bindi / dadi: white saree, grey bun, specs, a little shorter
    group.scale.setScalar(type === 'mummy' ? 1.05 : 0.98);
    const saree = mat(type === 'mummy' ? 0xd63384 : 0xf2efe6), border = mat(type === 'mummy' ? 0xffc300 : 0x2a9d8f);
    mesh(new THREE.CylinderGeometry(0.17, 0.32, 0.85, 16), saree, j.pelvis, 0, -0.2, 0); // skirt over the legs
    mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 16), saree, j.pelvis, 0, 0.32, 0);
    mesh(new THREE.BoxGeometry(0.06, 0.62, 0.36), border, j.pelvis, 0.05, 0.36, 0).rotation.x = 0.6; // pallu over the shoulder
    mesh(new THREE.SphereGeometry(0.11, 12, 8), type === 'mummy' ? BLACK : mat(0xbdbdbd), j.head, 0, 0.06, 0.18); // bun
    if (type === 'mummy') mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(0xe00000), j.head, 0, 0.11, -0.195); // bindi
    else for (const x of [-0.07, 0.07]) mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), mat(0xcfcfcf), j.head, x, 0.04, -0.2);
    weapon(type, j);
  }
  return skin;
}

const KEYS = ['hipL.x', 'hipR.x', 'kneeL.x', 'kneeR.x', 'shoulderL.x', 'shoulderR.x', 'elbowL.x', 'elbowR.x',
  'pelvis.x', 'pelvis.z', 'head.x', 'head.ry', 'pelvis.y', 'body.y'];

function targets(mode, s, t, phase, type) {
  const o = { 'pelvis.y': 0.95, 'body.y': 0 }; // any key not set means 0
  const pair = (name, v) => { o[name + 'L.x'] = v; o[name + 'R.x'] = v; };
  const run = () => {
    o['hipL.x'] = 0.9 * s; o['hipR.x'] = -0.9 * s;
    o['kneeL.x'] = -0.3 - 0.9 * Math.max(0, -s); o['kneeR.x'] = -0.3 - 0.9 * Math.max(0, s);
    o['shoulderL.x'] = -0.8 * s; o['shoulderR.x'] = 0.8 * s;
    pair('elbow', 1.3); o['pelvis.x'] = -0.2; o['body.y'] = 0.07 * Math.abs(Math.cos(phase));
  };
  switch (mode) {
    case 'idle': o['pelvis.y'] = 0.95 + 0.01 * Math.sin(t * 2); pair('elbow', 0.2); break;
    case 'run': run(); break;
    case 'look': run(); o['head.ry'] = 1.3; o['head.x'] = -0.15; break; // glancing back over his shoulder at Papa
    case 'jump': pair('hip', 1.0); pair('knee', -1.6); pair('shoulder', -2.4); pair('elbow', 0.4); o['pelvis.x'] = -0.1; break;
    case 'slide': o['pelvis.y'] = 0.35; o['pelvis.x'] = 1.15; pair('hip', 0.4); pair('knee', -0.2); pair('shoulder', 1.2); pair('elbow', 0.3); break;
    case 'stumble': run(); o['pelvis.z'] = 0.35 * Math.sin(t * 25); o['head.x'] = 0.4; break;
    case 'caught': pair('hip', 0.6 * Math.sin(t * 14)); pair('knee', -0.8); pair('shoulder', 2.6 + 0.5 * Math.sin(t * 16)); pair('elbow', 0.5); o['pelvis.x'] = 0.3; break;
    case 'ride': { // on the bicycle: seated, leaning over the handlebar, pedalling
      const c = Math.sin(phase);
      o['pelvis.y'] = 1.0; o['pelvis.x'] = -0.35;
      o['hipL.x'] = 1.1 + 0.45 * c; o['hipR.x'] = 1.1 - 0.45 * c;
      o['kneeL.x'] = -1.5 + 0.5 * c; o['kneeR.x'] = -1.5 - 0.5 * c;
      pair('shoulder', 1.25); pair('elbow', 0.35); o['head.x'] = 0.2; // arms forward to the handlebar
      break;
    }
    case 'spank': pair('elbow', 0.5); o['shoulderR.x'] = 2.6 + 0.9 * Math.sin(t * 16); o['elbowR.x'] = 0.8; o['shoulderL.x'] = 0.5; o['pelvis.x'] = -0.15; break;
  }
  if (CHASERS.includes(type) && mode === 'run') { // weapon raised overhead, shaking it at the kid
    o['shoulderR.x'] = 2.9 + 0.35 * Math.sin(t * 11);
    o['elbowR.x'] = 0.5 + 0.5 * Math.sin(t * 11 + 0.6);
    if (type === 'dadi') { o['pelvis.x'] = -0.35; o['head.x'] = 0.25; } // a bit bent, still fast
  }
  return o;
}

export function createStickman(type) {
  const R = HEROES.includes(type) ? 0.085 : 0.1;
  const { group, joints } = buildBody(R);
  const skin = addAccessories(type, group, joints);
  let mode = 'idle', phase = 0, t = 0;
  return {
    group,
    joints,
    setColors(cap, bag) { skin.cap.color.setHex(cap); skin.bag.color.setHex(bag); },
    setMode(m) { if (m !== mode) { mode = m; t = 0; } },
    update(dt, speed = 10) {
      t += dt;
      phase += dt * (6 + speed * 0.35);
      const tg = targets(mode, Math.sin(phase), t, phase, type);
      const k = Math.min(1, dt * 15);
      for (const key of KEYS) {
        const [name, axis] = key.split('.');
        const obj = joints[name];
        const target = tg[key] ?? 0;
        if (axis === 'y') obj.position.y += (target - obj.position.y) * k;
        else if (axis === 'ry') obj.rotation.y += (target - obj.rotation.y) * k;
        else obj.rotation[axis] += (target - obj.rotation[axis]) * k;
      }
    },
  };
}
