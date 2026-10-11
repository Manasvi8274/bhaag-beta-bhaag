import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createStickman } from '../src/stickman.js';

const MODES = ['idle', 'run', 'jump', 'slide', 'stumble', 'caught', 'spank'];
const JOINTS = ['body', 'pelvis', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
const height = (g) => { g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g); return b.max.y - b.min.y; };
const settle = (m, mode, secs = 1) => { m.setMode(mode); for (let i = 0; i < secs * 60; i++) m.update(1 / 60, 12); };

for (const type of ['beta', 'papa']) {
  test(`${type}: structure`, () => {
    const m = createStickman(type);
    assert.ok(m.group instanceof THREE.Group);
    for (const j of JOINTS) assert.ok(m.joints[j] instanceof THREE.Object3D, j);
    let meshes = 0, shadows = 0;
    m.group.traverse(o => { if (o.isMesh) { meshes++; if (o.castShadow) shadows++; } });
    assert.ok(meshes >= 16, `meshes ${meshes}`);
    assert.equal(shadows, meshes);
    const h = height(m.group);
    assert.ok(h > 1.6 && h < 2.3, `standing height ${h}`);
  });

  test(`${type}: all modes run without NaN`, () => {
    const m = createStickman(type);
    for (const mode of MODES) {
      settle(m, mode, 0.5);
      m.group.traverse(o => { for (const v of [o.rotation.x, o.rotation.z, o.position.y]) assert.ok(Number.isFinite(v), `${mode} ${o.type}`); });
    }
  });
}

test('run animates legs alternately and smoothly', () => {
  const m = createStickman('beta');
  settle(m, 'run', 1);
  const seen = new Set();
  let maxJump = 0, prev = m.joints.hipL.rotation.x;
  for (let i = 0; i < 120; i++) {
    m.update(1 / 60, 12);
    const v = m.joints.hipL.rotation.x;
    maxJump = Math.max(maxJump, Math.abs(v - prev)); prev = v;
    seen.add(Math.sign(v));
    assert.ok(Math.sign(m.joints.hipL.rotation.x) !== Math.sign(m.joints.hipR.rotation.x) || Math.abs(v) < 0.2);
  }
  assert.ok(seen.has(1) && seen.has(-1), 'hip swings both ways');
  assert.ok(maxJump < 0.35, `no popping, max per-frame change ${maxJump}`);
  assert.ok(m.joints.kneeL.rotation.x <= 0.01 && m.joints.kneeR.rotation.x <= 0.01, 'knees bend backwards only');
});

test('slide is low, jump raises arms', () => {
  const m = createStickman('beta');
  settle(m, 'slide');
  assert.ok(height(m.group) < 1.1, `slide height ${height(m.group)}`);
  settle(m, 'jump');
  assert.ok(m.joints.shoulderL.rotation.x < -2);
  settle(m, 'idle');
  assert.ok(height(m.group) > 1.6);
});

test('papa is bigger and spank swings the right arm', () => {
  const b = createStickman('beta'), p = createStickman('papa');
  assert.ok(height(p.group) > height(b.group));
  p.setMode('spank');
  const vals = [];
  for (let i = 0; i < 60; i++) { p.update(1 / 60); vals.push(p.joints.shoulderR.rotation.x); }
  assert.ok(Math.max(...vals) - Math.min(...vals.slice(20)) > 0.5);
});
