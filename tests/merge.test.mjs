import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { mergeStatic } from '../src/merge.js';

test('merges to one mesh per material + shadow flags, keeping the shape', () => {
  const g = new THREE.Group(), red = new THREE.MeshStandardMaterial(), blue = new THREE.MeshStandardMaterial();
  const put = (geo, m, x, cast) => { const o = new THREE.Mesh(geo, m); o.position.x = x; o.castShadow = cast; o.rotation.z = x; g.add(o); };
  for (let i = 0; i < 5; i++) put(new THREE.BoxGeometry(1, 2, 1), red, i * 2, true);
  put(new THREE.SphereGeometry(0.5), blue, -3, true);
  put(new THREE.DodecahedronGeometry(0.5), blue, 12, true); // non-indexed geometry mixes in
  put(new THREE.BoxGeometry(1, 1, 1), red, 20, false);
  g.position.set(5, 0, 0); // the group's own transform is not baked in
  const before = new THREE.Box3().setFromObject(g, true);
  const m = mergeStatic(g);
  assert.equal(m.children.length, 3);
  m.position.copy(g.position);
  const after = new THREE.Box3().setFromObject(m, true);
  for (const k of ['min', 'max']) for (const a of ['x', 'y', 'z']) assert.ok(Math.abs(before[k][a] - after[k][a]) < 1e-5, `${k}.${a}`);
  const red1 = m.children.find((c) => c.material === red && c.castShadow);
  assert.equal(red1.geometry.attributes.position.count, 5 * 36);
  assert.ok(m.children.every((c) => c.geometry.attributes.normal));
});
