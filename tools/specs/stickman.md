Write `src/stickman.js`: a stylish 3D stickman built from Three.js primitives, with smooth procedural animation.
`import * as THREE from '../vendor/three.module.js';` (no other imports). Y is up, the character FACES -Z.

Export exactly one function: `createStickman(type)` where type is 'beta' (son) or 'papa' (father).
It returns `{ group, joints, setMode(mode), update(dt, speed) }`.

## Build (all meshes: castShadow = true)
Materials: limbs + head `MeshStandardMaterial({ color: 0x151515, roughness: 0.55 })`. R = 0.085 limb radius (papa 0.1).
Hierarchy (positions relative to parent):
- `group` (THREE.Group, returned) -> `body` Group at (0,0,0) -> `pelvis` Group at (0, 0.95, 0)
- pelvis children:
  - torso: CapsuleGeometry(0.11, 0.45, 4, 12) at (0, 0.3, 0)
  - `head` Group at (0, 0.8, 0) containing a SphereGeometry(0.2, 24, 16) mesh and two white eyes
    (SphereGeometry(0.035), MeshStandardMaterial white) at (+-0.07, 0.04, -0.18)
  - `shoulderL` Group at (-0.2, 0.55, 0), `shoulderR` at (0.2, 0.55, 0). Each has an upper arm
    CapsuleGeometry(R, 0.28) at (0, -0.17, 0) and an elbow Group (`elbowL`/`elbowR`) at (0, -0.34, 0)
    holding a forearm CapsuleGeometry(R, 0.26) at (0, -0.15, 0).
  - `hipL` Group at (-0.1, 0, 0), `hipR` at (0.1, 0, 0). Each has a thigh CapsuleGeometry(R, 0.36) at
    (0, -0.22, 0) and a knee Group (`kneeL`/`kneeR`) at (0, -0.45, 0) holding a shin CapsuleGeometry(R, 0.36)
    at (0, -0.22, 0) and a foot BoxGeometry(0.12, 0.06, 0.24) at (0, -0.47, -0.05).
- `joints` = { body, pelvis, head, shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR }.
Accessories:
- beta: red (0xd62828) cap = SphereGeometry(0.21, 16, 8, 0, Math.PI*2, 0, Math.PI/2) on the head at (0, 0.02, 0)
  plus a brim CylinderGeometry(0.16, 0.16, 0.02, 16) at (0, 0.03, -0.17); red tie BoxGeometry(0.06, 0.3, 0.02)
  on pelvis at (0, 0.35, -0.12); blue (0x1d4ed8) school bag BoxGeometry(0.3, 0.35, 0.15) on pelvis at (0, 0.35, 0.16).
- papa: group.scale.setScalar(1.12). White (0xf5f5f0) banian CylinderGeometry(0.19, 0.22, 0.45, 16) on pelvis at (0, 0.3, 0);
  white belly SphereGeometry(0.22, 16, 12) at (0, 0.18, -0.07); black moustache BoxGeometry(0.2, 0.04, 0.05) in head
  group at (0, -0.06, -0.19); brown (0x7a4a21) chappal BoxGeometry(0.1, 0.03, 0.26) in elbowR at (0, -0.32, -0.05).

## Animation
Keep `mode` (default 'idle'), `phase` (0), `t` (0). `setMode(m)` sets mode (one of idle, run, jump, slide,
stumble, caught, spank) and resets t = 0 when the mode changes.
`update(dt, speed = 10)`: t += dt; phase += dt * (6 + speed * 0.35); s = Math.sin(phase).
Compute TARGET values, then ease every joint toward its target: `v += (target - v) * Math.min(1, dt * 15)`.
Positive rotation.x swings a limb FORWARD (toward -Z). Knees bend with NEGATIVE rotation.x. Elbows bend with POSITIVE.
Targets (anything not listed = 0; body.position.y target = 0; pelvis.position.y target = 0.95):
- idle: pelvis.position.y = 0.95 + 0.01*Math.sin(t*2); elbows 0.2.
- run: hipL.x = 0.9*s, hipR.x = -0.9*s; kneeL.x = -0.3 - 0.9*Math.max(0, -s); kneeR.x = -0.3 - 0.9*Math.max(0, s);
  shoulderL.x = -0.8*s, shoulderR.x = 0.8*s; elbows 1.3; pelvis.rotation.x = -0.2; body.position.y = 0.07*Math.abs(Math.cos(phase)).
- jump: hips 1.0; knees -1.6; shoulders -2.4 (arms up); elbows 0.4; pelvis.rotation.x = -0.1.
- slide: pelvis.position.y = 0.35; pelvis.rotation.x = 1.15 (lean back); hips 0.4; knees -0.2; shoulders 1.2; elbows 0.3.
- stumble: like run but pelvis.rotation.z = 0.35*Math.sin(t*25) and head.rotation.x = 0.4.
- caught: hips 0.6*Math.sin(t*14), knees -0.8, shoulders 2.6 + 0.5*Math.sin(t*16) (arms flailing up), elbows 0.5, pelvis.rotation.x = 0.3.
- spank (papa): shoulderR.x = 2.6 + 0.9*Math.sin(t*16) (chappal arm swinging), elbowR.x = 0.8, shoulderL.x = 0.5, elbows 0.5, pelvis.rotation.x = -0.15.
Apply rotations with `joint.rotation.x` / `.z` and positions with `.position.y`.

## REQUIRED SKELETON. Copy it exactly and fill in ONLY the two TODO functions (addAccessories, targets).
```js
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

function addAccessories(type, group, j) {
  // TODO: if type === 'beta': cap, brim (in j.head), tie and bag (in j.pelvis) exactly as in the spec, using mesh().
  // TODO: if type === 'papa': group.scale.setScalar(1.12); banian + belly (j.pelvis), moustache (j.head), chappal (j.elbowR).
}

// Animation targets for one frame. Keys are 'joint.axis': '.x'/'.z' = rotation, '.y' = position.y.
const KEYS = ['hipL.x', 'hipR.x', 'kneeL.x', 'kneeR.x', 'shoulderL.x', 'shoulderR.x', 'elbowL.x', 'elbowR.x',
  'pelvis.x', 'pelvis.z', 'head.x', 'pelvis.y', 'body.y'];

function targets(mode, s, t, phase) {
  const o = { 'pelvis.y': 0.95, 'body.y': 0 }; // any key not set means 0
  switch (mode) {
    // TODO: one case per mode (idle, run, jump, slide, stumble, caught, spank) setting o[...] from the
    // spec's Targets list. "hips 1.0" means o['hipL.x'] = o['hipR.x'] = 1.0 (same for knees, shoulders, elbows).
    // pelvis.rotation.x -> o['pelvis.x'], pelvis.rotation.z -> o['pelvis.z'], head.rotation.x -> o['head.x'].
  }
  return o;
}

export function createStickman(type) {
  const R = type === 'papa' ? 0.1 : 0.085;
  const { group, joints } = buildBody(R);
  addAccessories(type, group, joints);
  let mode = 'idle', phase = 0, t = 0;
  return {
    group,
    joints,
    setMode(m) { if (m !== mode) { mode = m; t = 0; } },
    update(dt, speed = 10) {
      t += dt;
      phase += dt * (6 + speed * 0.35);
      const tg = targets(mode, Math.sin(phase), t, phase);
      const k = Math.min(1, dt * 15);
      for (const key of KEYS) {
        const [name, axis] = key.split('.');
        const obj = joints[name];
        const target = tg[key] ?? 0;
        if (axis === 'y') obj.position.y += (target - obj.position.y) * k;
        else obj.rotation[axis] += (target - obj.rotation[axis]) * k;
      }
    },
  };
}
```
