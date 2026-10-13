import * as THREE from '../vendor/three.module.js';
import { mulberry32 } from './spawner.js';
import { mergeStatic } from './merge.js';

// Gradient sky dome + stars, sun, moon and a few patang (kites). Follows the camera, so it is always "infinitely" far.
const radial = (size, power) => {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.min(1, Math.hypot(x / (size - 1) - 0.5, y / (size - 1) - 0.5) * 2), i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(255 * (1 - d) ** power);
  }
  const t = new THREE.DataTexture(data, size, size);
  t.needsUpdate = true;
  return t;
};
const HALO = radial(64, 2.2);
const WHITE = new THREE.Color(0xffffff);
const KITE_COLORS = [0xff006e, 0xffbe0b, 0x3a86ff, 0x2a9d8f, 0xfb5607, 0x8338ec];

export function createSky(scene) {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
      void main() { gl_FragColor = vec4(mix(horizon, top, pow(max(vDir.y, 0.0), 0.55)), 1.0);
      #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  dome.renderOrder = -10;
  group.add(dome);

  const rng = mulberry32(11), pos = [];
  for (let i = 0; i < 380; i++) {
    const a = rng() * Math.PI * 2, e = 0.06 + rng() * 1.3;
    pos.push(Math.cos(a) * Math.cos(e) * 190, Math.sin(e) * 190, Math.sin(a) * Math.cos(e) * 190);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -9;
  group.add(stars);

  const body = (dir, r, color, haloSize) => {
    const g = new THREE.Group();
    g.position.copy(new THREE.Vector3(...dir).normalize().multiplyScalar(180));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color, transparent: true, fog: false, depthWrite: false }));
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(haloSize, haloSize),
      new THREE.MeshBasicMaterial({ color, map: HALO, transparent: true, opacity: 0.6, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.renderOrder = disc.renderOrder = -8;
    g.add(halo, disc);
    group.add(g);
    return { g, disc, halo };
  };
  const sun = body([-0.35, 0.16, -1], 7, 0xfff3c4, 60);
  const moon = body([0.3, 0.2, -1], 5, 0xf3f0ff, 34);
  for (const b of [sun, moon]) b.g.lookAt(0, 0, 0);

  // Kites: a diamond with a little tail, drifting and swaying high over the rooftops.
  const kiteGeo = new THREE.PlaneGeometry(1.4, 1.4), tailGeo = new THREE.PlaneGeometry(0.12, 1.3);
  const kites = KITE_COLORS.map((color, i) => {
    const k = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true });
    const d = new THREE.Mesh(kiteGeo, mat);
    d.rotation.z = Math.PI / 4;
    d.scale.y = 1.25;
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.y = -1.6;
    k.add(d, tail);
    k.userData = { mat, x: (i % 2 ? 1 : -1) * (12 + rng() * 20), y: 22 + rng() * 14, z: -45 - rng() * 50, ph: rng() * 6 };
    group.add(k);
    return k;
  });

  // Low-poly clouds: puffs merged into one mesh, slowly drifting round; tinted by the sun, grey in the rain.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, fog: false, depthWrite: false });
  const puffs = new THREE.Group(), puffGeo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 14; i++) {
    // mostly ahead, down the street (-z), low enough to show in the strip of sky between the buildings
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.2, r = 110 + rng() * 40, y = 16 + rng() * 16, n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(puffGeo, cloudMat);
      const sz = 5 + rng() * 4.5;
      m.scale.set(sz * 1.4, sz * 0.7, sz);
      m.position.set(Math.cos(a) * r + (k - n / 2) * sz * 1.3, y + rng() * 3, Math.sin(a) * r + (rng() - 0.5) * 8);
      puffs.add(m);
    }
  }
  const clouds = mergeStatic(puffs);
  clouds.children.forEach((c) => { c.renderOrder = -7; });
  group.add(clouds);

  scene.add(group);
  const tmp = new THREE.Color(), CLOUD_DAY = new THREE.Color(0xffffff);
  return {
    // s = skyAt(t)
    update(camera, s, t) {
      group.position.copy(camera.position);
      dome.material.uniforms.top.value.setHex(s.top);
      dome.material.uniforms.horizon.value.setHex(s.horizon);
      starMat.opacity = s.night ** 2;
      clouds.rotation.y = Math.sin(t * 0.01) * 0.25; // drift to and fro, staying ahead
      cloudMat.color.lerpColors(CLOUD_DAY, tmp.setHex(s.horizon), 0.45); // sunset-pink clouds, grey in the rain
      cloudMat.opacity = 0.92 - s.night * 0.75;
      stars.rotation.y = t * 0.004;
      sun.disc.material.color.copy(tmp.setHex(s.sunColor)).lerp(WHITE, 0.4);
      sun.halo.material.color.setHex(s.sunColor);
      sun.disc.material.opacity = sun.halo.material.opacity = 1 - s.night;
      sun.g.visible = s.night < 0.99;
      moon.disc.material.opacity = s.night;
      moon.halo.material.opacity = s.night * 0.5;
      moon.g.visible = s.night > 0.01;
      for (const k of kites) {
        const u = k.userData;
        k.position.set(u.x + Math.sin(t * 0.3 + u.ph) * 3, u.y + Math.sin(t * 0.9 + u.ph) * 1.2, u.z);
        k.rotation.z = Math.sin(t * 1.3 + u.ph) * 0.35;
        u.mat.opacity = 1 - s.night;
        k.visible = s.night < 0.95;
      }
    },
  };
}

// Rain streaks around the camera: one instanced mesh, falling and rushing past with the run.
export function createRain(scene, n = 260) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.7, 0.018),
    new THREE.MeshBasicMaterial({ color: 0xc8dcff, transparent: true, opacity: 0, depthWrite: false, fog: false }), n);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const rng = mulberry32(7);
  const drops = Array.from({ length: n }, () => new THREE.Vector3((rng() - 0.5) * 16, rng() * 12, -rng() * 34 + 4));
  const m = new THREE.Matrix4(), tilt = new THREE.Matrix4().makeRotationX(0.25);
  return {
    update(dt, camera, amount, speed) {
      mesh.visible = amount > 0.01;
      if (!mesh.visible) return;
      mesh.material.opacity = amount * 0.55;
      drops.forEach((d, i) => {
        d.y -= 16 * dt;
        d.z += speed * dt;
        if (d.y < 0) d.y += 12;
        if (d.z > 4) d.z -= 34;
        m.makeTranslation(camera.position.x + d.x, d.y, camera.position.z - 6 + d.z).multiply(tilt);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// Crows on the electric wires (one wire crossing every 30 m, ~6.5 m up). They sit until Beta is close, then flap
// off. A small pool hops ahead from wire to wire. Returns true from update() when one takes off (for a "kaa").
const WIRE_EVERY = 30, WIRE_Y = 6.82;
export function createCrows(scene, n = 5) {
  const ink = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
  const bodyGeo = new THREE.CapsuleGeometry(0.09, 0.18, 3, 8), headGeo = new THREE.SphereGeometry(0.08, 8, 6);
  const beakGeo = new THREE.ConeGeometry(0.03, 0.1, 6), wingGeo = new THREE.BoxGeometry(0.28, 0.02, 0.14);
  const rng = mulberry32(5);
  const crows = Array.from({ length: n }, () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, ink); body.rotation.x = Math.PI / 2 - 0.5; body.position.y = 0.1;
    const head = new THREE.Mesh(headGeo, ink); head.position.set(0, 0.2, 0.1);
    const beak = new THREE.Mesh(beakGeo, ink); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.19, 0.2);
    const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.06, 0.13, 0); const m = new THREE.Mesh(wingGeo, ink); m.position.x = s * 0.14; w.add(m); g.add(w); return w; });
    g.add(body, head, beak);
    g.scale.setScalar(1.9); // bigger than life so they read on a phone
    g.visible = false;
    scene.add(g);
    return { g, wings, wire: null, fly: 0, vx: 0 };
  });
  let nextWire = null;
  return {
    reset() { nextWire = null; for (const c of crows) { c.g.visible = false; c.wire = null; } },
    update(dt, playerZ, t) {
      if (nextWire === null) nextWire = Math.floor((playerZ - 20) / WIRE_EVERY) * WIRE_EVERY;
      let cawed = false;
      for (const c of crows) {
        if (c.wire === null || (c.fly > 0 && c.fly > 3) || c.wire > playerZ + 15) { // perch on the next wire ahead
          c.wire = nextWire; nextWire -= WIRE_EVERY * (1 + Math.floor(rng() * 2));
          c.g.position.set((rng() - 0.5) * 6, WIRE_Y, c.wire);
          c.g.rotation.y = rng() < 0.5 ? 0 : Math.PI; c.fly = 0; c.vx = (rng() - 0.5) * 6;
          c.g.visible = true;
        }
        if (c.fly === 0 && c.wire > playerZ - 14) { c.fly = 0.001; cawed = true; } // Beta is close: off it goes
        if (c.fly > 0) {
          c.fly += dt;
          c.g.position.y += (3 + c.fly * 2) * dt;
          c.g.position.x += c.vx * dt;
          c.g.position.z -= 4 * dt;
          const flap = Math.sin(t * 28) * 0.9;
          c.wings[0].rotation.z = flap; c.wings[1].rotation.z = -flap;
        } else {
          c.wings[0].rotation.z = 0.15; c.wings[1].rotation.z = -0.15;
          c.g.rotation.z = Math.sin(t * 2 + c.wire) * 0.05; // bobbing on the wire
        }
      }
      return cawed;
    },
  };
}
