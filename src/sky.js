import * as THREE from '../vendor/three.module.js';
import { mulberry32 } from './spawner.js';

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

  scene.add(group);
  const tmp = new THREE.Color();
  return {
    // s = skyAt(t)
    update(camera, s, t) {
      group.position.copy(camera.position);
      dome.material.uniforms.top.value.setHex(s.top);
      dome.material.uniforms.horizon.value.setHex(s.horizon);
      starMat.opacity = s.night ** 2;
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
