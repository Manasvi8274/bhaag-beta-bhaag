import * as THREE from '../vendor/three.module.js';

function createStickman(type) {
  const group = new THREE.Group();
  const joints = {};

  const limbRadius = type === 'papa' ? 0.1 : 0.085;
  const headRadius = 0.2;
  const eyeRadius = 0.035;
  const capRadius = 0.21;
  const bagRadius = 0.3;
  const capHeight = 0.02;
  const capBrimRadius = 0.16;
  const tieRadius = 0.06;
  const banianRadius = 0.19;
  const bellyRadius = 0.22;
  const moustacheRadius = 0.2;
  const chappalRadius = 0.1;

  const createCapsule = (radius, height, segments) => new THREE.CapsuleGeometry(radius, height, segments, 12);
  const createSphere = (radius, segments) => new THREE.SphereGeometry(radius, segments, segments);
  const createCylinder = (radius, height, segments) => new THREE.CylinderGeometry(radius, radius, height, segments, 16);
  const createBox = (width, height, depth) => new THREE.BoxGeometry(width, height, depth);

  const createMesh = (geometry, material) => new THREE.Mesh(geometry, material);

  const createHead = () => {
    const head = new THREE.Group();
    const sphere = createSphere(headRadius, 24);
    const eyes = [
      createMesh(createSphere(eyeRadius, 16), new THREE.MeshStandardMaterial({ color: 0xffffff })),
      createMesh(createSphere(eyeRadius, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }))
    ];
    eyes[0].position.set(0.07, 0.04, -0.18);
    eyes[1].position.set(-0.07, 0.04, -0.18);
    head.add(sphere, eyes[0], eyes[1]);
    return head;
  };

  const createBody = () => {
    const body = new THREE.Group();
    const torso = createMesh(createCapsule(0.11, 0.45, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const head = createHead();
    const shoulderL = createMesh(createCapsule(limbRadius, 0.28, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const shoulderR = createMesh(createCapsule(limbRadius, 0.28, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const elbowL = createMesh(createCapsule(limbRadius, 0.26, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const elbowR = createMesh(createCapsule(limbRadius, 0.26, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const hipL = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const hipR = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const kneeL = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const kneeR = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
    const foot = createMesh(createBox(0.12, 0.06, 0.24), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));

    shoulderL.position.set(-0.2, 0.55, 0);
    shoulderR.position.set(0.2, 0.55, 0);
    elbowL.position.set(0, -0.17, 0);
    elbowR.position.set(0, -0.17, 0);
    kneeL.position.set(0, -0.22, 0);
    kneeR.position.set(0, -0.22, 0);
    foot.position.set(0, -0.47, -0.05);

    body.add(torso, head, shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR, foot);
    return body;
  };

  const createCap = () => {
    const cap = createMesh(createSphere(capRadius, 16), new THREE.MeshStandardMaterial({ color: 0xd62828 }));
    const capBrim = createMesh(createCylinder(capBrimRadius, capHeight, 16), new THREE.MeshStandardMaterial({ color: 0xd62828 }));
    const tie = createMesh(createBox(tieRadius, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0xd62828 }));
    cap.add(capBrim, tie);
    return cap;
  };

  const createBag = () => {
    const bag = createMesh(createBox(bagRadius, 0.35, 0.15), new THREE.MeshStandardMaterial({ color: 0xd62828 }));
    return bag;
  };

  const createBanian = () => {
    const banian = createMesh(createCylinder(bananRadius, 0.22, 0.45, 16), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }));
    return banian;
  };

  const createBelly = () => {
    const belly = createMesh(createSphere(bellyRadius, 16), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }));
    return belly;
  };

  const createMoustache = () => {
    const moustache = createMesh(createBox(moustacheRadius, 0.04, 0.05), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    return moustache;
  };

  const createChappal = () => {
    const chappal = createMesh(createBox(chappalRadius, 0.03, 0.26), new THREE.MeshStandardMaterial({ color: 0x7a4a21 }));
    return chappal;
  };

  const pelvis = new THREE.Group();
  const body = createBody();
  const head = createHead();
  const shoulderL = createMesh(createCapsule(limbRadius, 0.28, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const shoulderR = createMesh(createCapsule(limbRadius, 0.28, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const elbowL = createMesh(createCapsule(limbRadius, 0.26, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const elbowR = createMesh(createCapsule(limbRadius, 0.26, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const hipL = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const hipR = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const kneeL = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const kneeR = createMesh(createCapsule(limbRadius, 0.36, 4, 12), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));
  const foot = createMesh(createBox(0.12, 0.06, 0.24), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.55 }));

  pelvis.add(body, head, shoulderL, shoulderR, elbowL, elbowR, hipL, hipR, kneeL, kneeR, foot);

  if (type === 'beta') {
    const cap = createCap();
    const bag = createBag();
    head.add(cap);
    pelvis.add(bag);
  } else if (type === 'papa') {
    pelvis.scale.setScalar(1.12);
    const banian = createBanian();
    const belly = createBelly();
    const moustache = createMoustache();
    const chappal = createChappal();
    head.add(moustache);
    pelvis.add(banan, belly, chappal);
  }

  group.add(pelvis);

  joints.body = body;
  joints.pelvis = pelvis;
  joints.head = head;
  joints.shoulderL = shoulderL;
  joints.shoulderR = shoulderR;
  joints.elbowL = elbowL;
  joints.elbowR = elbowR;
  joints.hipL = hipL;
  joints.hipR = hipR;
  joints.kneeL = kneeL;
  joints.kneeR = kneeR;

  let mode = 'idle';
  let phase = 0;
  let t = 0;

  const setMode = (m) => {
    if (m !== mode) {
      mode = m;
      phase = 0;
      t = 0;
    }
  };

  const update = (dt, speed = 10) => {
    t += dt;
    phase += dt * (6 + speed * 0.35);
    const s = Math.sin(phase);

    const target = {};
    switch (mode) {
      case 'idle':
        target.pelvis.position.y = 0.95 + 0.01 * Math.sin(t * 2);
        target.elbowL.rotation.x = target.elbowR.rotation.x = 0.2;
        break;
      case 'run':
        target.hipL.x = 0.9 * s;
        target.hipR.x = -0.9 * s;
        target.kneeL.x = -0.3 - 0.9 * Math.max(0, -s);
        target.kneeR.x = -0.3 - 0.9 * Math.max(0, s);
        target.shoulderL.x = -0.8 * s;
        target.shoulderR.x = 0.8 * s;
        target.elbowL.rotation.x = target.elbowR.rotation.x = 1.3;
        target.pelvis.rotation.x = -0.2;
        target.body.position.y = 0.07 * Math.abs(Math.cos(phase));
        break;
      case 'jump':
        target.hipL.x = target.hipR.x = 1.0;
        target.kneeL.x = target.kneeR.x = -1.6;
        target.shoulderL.rotation.x = target.shoulderR.rotation.x = -2.4;
        target.elbowL.rotation.x = target.elbowR.rotation.x = 0.4;
        target.pelvis.rotation.x = -0.1;
        break;
      case 'slide':
        target.pelvis.position.y = 0.35;
        target.pelvis.rotation.x = 1.15;
        target.hipL.x = target.hipR.x = 0.4;
        target.kneeL.x = -0.2;
        target.shoulderL.rotation.x = 1.2;
        target.shoulderR.rotation.x = 1.2;
        target.elbowL.rotation.x = target.elbowR.rotation.x = 0.3;
        break;
      case 'stumble':
        target.pelvis.rotation.z = 0.35 * Math.sin(t * 25);
        target.head.rotation.x = 0.4;
        target.hipL.x = target.hipR.x = 0.8;
        target.kneeL.x = target.kneeR.x = -0.4;
        target.shoulderL.rotation.x = target.shoulderR.rotation.x = -2.4;
        target.elbowL.rotation.x = target.elbowR.rotation.x = 0.4;
        target.pelvis.rotation.x = -0.2;
        break;
      case 'caught':
        target.hipL.x = 0.6 * Math.sin(t * 14);
        target.hipR.x = 0.6 * Math.sin(t * 14);
        target.kneeL.x = -0.8;
        target.kneeR.x = -0.8;
        target.shoulderL.rotation.x = 2.6 + 0.5 * Math.sin(t * 16);
        target.shoulderR.rotation.x = 2.6 + 0.5 * Math.sin(t * 16);
        target.elbowL.rotation.x = target.elbowR.rotation.x = 0.5;
        target.pelvis.rotation.x = 0.3;
        break;
      case 'spank':
        target.shoulderR.x = 2.6 + 0.9 * Math.sin(t * 16);
        target.elbowR.rotation.x = 0.8;
        target.shoulderL.rotation.x = 0.5;
        target.elbowL.rotation.x = 0.5;
        target.pelvis.rotation.x = -0.15;
        break;
    }

    for (const j of Object.keys(joints)) {
      const joint = joints[j];
      const targetValues = target[j];
      for (const prop of ['rotation', 'position']) {
        for (const axis of ['x', 'y', 'z']) {
          const v = joint[prop][axis];
          const targetValue = targetValues[prop][axis];
          if (Number.isFinite(targetValue)) {
            joint[prop][axis] += (targetValue - v) * Math.min(1, dt * 15);
          }
        }
      }
    }
  };

  return { group, joints, setMode, update };
}

export default createStickman;
