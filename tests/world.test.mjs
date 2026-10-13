import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createWorld, SEG_LEN, SEG_COUNT, TRAIN_LEN } from '../src/world.js';
import { zoneAt, ZONE_LEN } from '../src/zones.js';

const zs = (w) => w.segments.map(s => s.position.z).sort((a, b) => b - a);

test('builds segments into the scene', () => {
  const scene = new THREE.Scene();
  const w = createWorld(scene, 3);
  assert.equal(SEG_LEN, 30); assert.equal(SEG_COUNT, 8);
  assert.equal(w.segments.length, SEG_COUNT);
  for (const s of w.segments) assert.equal(s.parent, scene);
  assert.deepEqual(zs(w), [0, -30, -60, -90, -120, -150, -180, -210]);
  let meshes = 0; scene.traverse(o => { if (o.isMesh) meshes++; });
  assert.ok(meshes > SEG_COUNT * 10 && meshes < SEG_COUNT * 60, `meshes ${meshes} (merged per material)`);
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
  const h = (seed) => createWorld(new THREE.Scene(), seed).segments.flatMap((s) => s.children[0].userData.heights);
  const a = h(5);
  assert.deepEqual(a, h(5));
  assert.equal(a.length, SEG_COUNT * 6);
  assert.ok(Math.max(...a) - Math.min(...a) > 3);
  assert.ok(a.every(v => v >= 6 && v <= 14));
});

test('each area shows its own street, and recycled slots switch to the right one', () => {
  const w = createWorld(new THREE.Scene());
  const zonesShown = () => w.segments.map((s) => s.userData.zone);
  assert.deepEqual(zonesShown(), Array(SEG_COUNT).fill(0));
  for (let pz = 0; pz > -2000; pz -= 5) {
    w.update(pz, 1 / 60);
    for (const s of w.segments) {
      assert.equal(s.children.length, 1);
      assert.equal(s.userData.zone, zoneAt(s.position.z), `slot at ${s.position.z}`);
    }
  }
  w.reset();
  assert.deepEqual(zonesShown(), Array(SEG_COUNT).fill(0));
});

test('the train only runs on the Railway Colony tracks and blows its horn once per pass', () => {
  const w = createWorld(new THREE.Scene());
  let horns = 0, seen = 0;
  for (let pz = 0, t = 0; pz > -ZONE_LEN * 6; pz -= 20 / 60, t++) {
    if (w.update(pz, 1 / 60)) horns++;
    if (!w.train.visible) continue;
    seen++;
    for (const z of [w.train.position.z, w.train.position.z - TRAIN_LEN]) assert.equal(zoneAt(z), 1, `train at ${z}, player ${pz}`);
  }
  assert.ok(seen > 0 && horns >= 2, `seen ${seen} horns ${horns}`);
});
