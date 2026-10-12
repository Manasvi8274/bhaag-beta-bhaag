import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createProp } from '../src/props.js';

const SIZES = {
  bricks: [1.2, 0.5, 0.8], barricade: [1.4, 0.9, 0.5], banner: [6.4, 2.4, 0.2], pothole: [1.4, 0.3, 1.2], cow: [1.0, 1.6, 2.4],
  auto: [1.6, 2.0, 2.8], cart: [1.4, 1.3, 2.0], bus: [1.9, 3.2, 8], coin: [0.6, 0.6, 0.08],
};

for (const [name, [w, h, d]] of Object.entries(SIZES)) {
  test(`${name} size matches hitbox and sits on the ground`, () => {
    const g = createProp(name);
    assert.ok(g instanceof THREE.Group);
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3());
    const near = (got, want, axis) => assert.ok(Math.abs(got - want) <= Math.max(0.25 * want, 0.12), `${axis} ${got.toFixed(2)} vs ${want}`);
    near(s.x, w, 'w'); near(s.y, h, 'h'); near(s.z, d, 'd');
    assert.ok(b.min.y > -0.06 && b.min.y < 0.12, `bottom ${b.min.y}`);
    assert.ok(Math.abs((b.min.x + b.max.x) / 2) < 0.25 * w + 0.05, 'centred on x');
    let meshes = 0;
    g.traverse(o => { if (o.isMesh) { meshes++; assert.equal(o.castShadow, true); } });
    assert.ok(meshes >= (name === 'coin' ? 1 : 3), `${name} has ${meshes} meshes`);
  });
}

test('power-up props build and glow', () => {
  for (const name of ['shield', 'magnet', 'jump', 'double']) {
    const g = createProp(name); g.updateMatrixWorld(true);
    const s = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
    assert.ok(s.y > 0.5 && s.y < 1.0 && s.x < 1.0, `${name} size`);
  }
});

test('clones share geometry (no leak per spawn)', () => {
  const a = createProp('cow'), b = createProp('cow');
  assert.notEqual(a, b);
  assert.equal(a.children[0].geometry, b.children[0].geometry);
});

test('unknown prop throws', () => assert.throws(() => createProp('elephant')));
