import test from 'node:test';
import assert from 'node:assert/strict';
import { skyAt, menuTime, CYCLE } from '../src/daynight.js';
import { lampAt, lampForLight } from '../src/world.js';

test('a run starts in the day, night falls ~40 s in, then dawn, and it loops', () => {
  assert.equal(skyAt(0).night, 0);
  assert.equal(skyAt(20).night, 0);
  assert.equal(skyAt(60).night, 1);
  assert.ok(skyAt(32).night > 0 && skyAt(32).night < 1, 'sunset is in between');
  assert.deepEqual(skyAt(5), skyAt(5 + CYCLE));
  assert.ok(skyAt(60).sun < skyAt(0).sun && skyAt(60).hemi < skyAt(0).hemi, 'darker at night');
  for (let t = 0; t < CYCLE * 2; t += 0.37) {
    const s = skyAt(t);
    assert.ok(s.night >= 0 && s.night <= 1 && s.top >= 0 && s.top <= 0xffffff, `t ${t}`);
  }
});

test('menu follows the real clock', () => {
  assert.equal(skyAt(menuTime(21)).night, 1);
  assert.equal(skyAt(menuTime(3)).night, 1);
  assert.equal(skyAt(menuTime(12)).night, 0);
});

test('each lamp light sits on a distinct lamp just ahead of the camera, and only jumps far ahead', () => {
  assert.deepEqual(lampAt(0), { x: -2.65, z: 7.5 });
  assert.deepEqual(lampAt(1), { x: 2.65, z: -7.5 });
  let prev = null;
  for (let z = 0; z > -2000; z -= 0.5) {
    const ls = [0, 1, 2].map((j) => lampForLight(j, 3, z));
    assert.equal(new Set(ls.map((l) => l.z)).size, 3);
    for (const l of ls) assert.ok(l.z <= z + 10 && l.z > z + 10 - 46, `lamp ${l.z} at ${z}`);
    if (prev) ls.forEach((l, j) => assert.ok(l.z === prev[j].z || l.z < z - 25, 'a light only moves to a lamp far ahead'));
    prev = ls;
  }
});

test('monsoon: only some runs, rolls in and clears', async () => {
  const { rainAt, rainStartFor, RAIN_CHANCE, RAIN_LEN } = await import('../src/daynight.js');
  assert.equal(rainStartFor(RAIN_CHANCE + 0.01), null);
  const s = rainStartFor(0.1);
  assert.ok(s >= 45 && s <= 75);
  assert.equal(rainAt(100, null), 0);
  assert.equal(rainAt(s - 1, s), 0);
  assert.ok(rainAt(s + 2, s) > 0 && rainAt(s + 2, s) < 1);
  assert.equal(rainAt(s + RAIN_LEN / 2, s), 1);
  assert.equal(rainAt(s + RAIN_LEN + 1, s), 0);
});
