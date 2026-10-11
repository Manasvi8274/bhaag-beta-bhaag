import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createWorld, SEG_LEN, SEG_COUNT } from '../src/world.js';

const zs = (w) => w.segments.map(s => s.position.z).sort((a, b) => b - a);

test('builds segments into the scene', () => {
  const scene = new THREE.Scene();
  const w = createWorld(scene, 3);
  assert.equal(SEG_LEN, 30); assert.equal(SEG_COUNT, 8);
  assert.equal(w.segments.length, SEG_COUNT);
  for (const s of w.segments) assert.equal(s.parent, scene);
  assert.deepEqual(zs(w), [0, -30, -60, -90, -120, -150, -180, -210]);
  let meshes = 0; scene.traverse(o => { if (o.isMesh) meshes++; });
  assert.ok(meshes > SEG_COUNT * 20, `meshes ${meshes}`);
});

test('recycles with no gaps while running, including huge jumps', () => {
  const w = createWorld(new THREE.Scene());
  const check = (pz) => {
    const z = zs(w);
    for (let i = 1; i < z.length; i++) assert.equal(z[i - 1] - z[i], SEG_LEN, `gap at player ${pz}`);
    assert.ok(z[0] - SEG_LEN / 2 <= pz + 15, 'no segment left fully behind');
    assert.ok(z[z.length - 1] <= pz - 150, `enough road ahead at ${pz}`);
  };
  for (let pz = 0; pz > -3000; pz -= 7.3) { w.update(pz); check(pz); }
  w.update(-100000); check(-100000);
});

test('same seed same city, buildings vary in height', () => {
  const h = (seed) => { const s = new THREE.Scene(); createWorld(s, seed); const hs = []; s.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.depth === 9.5) hs.push(o.geometry.parameters.height); }); return hs; };
  const a = h(5);
  assert.deepEqual(a, h(5));
  assert.equal(a.length, SEG_COUNT * 6);
  assert.ok(Math.max(...a) - Math.min(...a) > 3);
  assert.ok(a.every(v => v >= 6 && v <= 14));
});
