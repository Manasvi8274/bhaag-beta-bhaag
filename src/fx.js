import * as THREE from '../vendor/three.module.js';

// Pooled particle bursts (coin sparkle, dust, chappal stars). Fixed pool = no allocations during play.
export function createFx(scene, size = 160) {
  const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const pool = [];
  for (let i = 0; i < size; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, fog: false })); // fireworks stay bright far away
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

// Speed lines streaking past the camera near top speed. One instanced mesh = one draw call.
export function createSpeedLines(scene, n = 28) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.025, 2.6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }), n);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const rel = Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return new THREE.Vector3(side * (1.6 + Math.random() * 3), 0.4 + Math.random() * 4.5, -Math.random() * 24);
  });
  const m = new THREE.Matrix4();
  return {
    // amount 0..1
    update(dt, camera, amount, speed) {
      mesh.visible = amount > 0.01;
      if (!mesh.visible) return;
      mesh.material.opacity = amount * 0.45;
      rel.forEach((r, i) => {
        r.z += speed * 1.6 * dt;
        if (r.z > 2) r.z -= 26;
        m.makeTranslation(camera.position.x + r.x, camera.position.y - 3.2 + r.y, camera.position.z - 6 + r.z);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
