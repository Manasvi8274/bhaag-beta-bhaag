import * as THREE from '../vendor/three.module.js';

// Pooled particle bursts (coin sparkle, dust, chappal stars). Fixed pool = no allocations during play.
export function createFx(scene, size = 90) {
  const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const pool = [];
  for (let i = 0; i < size; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    m.visible = false;
    m.frustumCulled = false;
    scene.add(m);
    pool.push({ m, v: new THREE.Vector3(), life: 0, max: 1, gravity: -12 });
  }
  let next = 0;

  return {
    burst(x, y, z, color, count = 10, { speed = 4, up = 3, life = 0.6, gravity = -12, scale = 1 } = {}) {
      for (let i = 0; i < count; i++) {
        const p = pool[next];
        next = (next + 1) % size;
        p.m.position.set(x, y, z);
        p.m.material.color.setHex(color);
        p.m.scale.setScalar(scale);
        p.m.visible = true;
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.4 + Math.random() * 0.6);
        p.v.set(Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s);
        p.life = p.max = life * (0.7 + Math.random() * 0.6);
        p.gravity = gravity;
      }
    },
    update(dt) {
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.m.visible = false; continue; }
        p.v.y += p.gravity * dt;
        p.m.position.addScaledVector(p.v, dt);
        p.m.rotation.x += dt * 8;
        p.m.rotation.y += dt * 6;
        p.m.material.opacity = Math.min(1, (p.life / p.max) * 2);
      }
    },
    clear() { for (const p of pool) { p.life = 0; p.m.visible = false; } },
  };
}
