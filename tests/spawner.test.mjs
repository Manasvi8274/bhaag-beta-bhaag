import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, CATALOG, createSpawner, spawnUntil } from '../src/spawner.js';

test('rng deterministic and in range', () => {
  const a = mulberry32(7), b = mulberry32(7);
  for (let i = 0; i < 1000; i++) { const v = a(); assert.equal(v, b()); assert.ok(v >= 0 && v < 1); }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('catalog', () => {
  assert.deepEqual(CATALOG.cow, { kind: 'block', w: 1.2, h: 1.6, d: 2.4, y: 0 });
  assert.equal(CATALOG.clothesline.kind, 'high');
  assert.equal(CATALOG.clothesline.y, 1.0);
  assert.deepEqual(Object.keys(CATALOG).sort(), ['auto', 'bus', 'cart', 'clothesline', 'cow', 'pothole', 'stone']);
});

const rowsOf = (items) => {
  const m = new Map();
  for (const it of items) if (it.type === 'obstacle') { const k = it.z; (m.get(k) || m.set(k, []).get(k)).push(it); }
  return m;
};

test('spawns ahead, deterministic, gaps 14..22', () => {
  const s1 = createSpawner(42), s2 = createSpawner(42);
  const a = spawnUntil(s1, 0), b = spawnUntil(s2, 0);
  assert.deepEqual(a, b);
  assert.ok(s1.nextZ <= -120);
  assert.equal(spawnUntil(s1, 0).length, 0, 'nothing new when player has not moved');
  const s = createSpawner(3);
  let last = s.nextZ;
  for (let pz = 0; pz > -20000; pz -= 50) {
    spawnUntil(s, pz);
    assert.ok(s.nextZ <= pz - 120);
  }
  assert.ok(s.row > 800);
  const g = createSpawner(5); const zsRow = [];
  for (let i = 0; i < 300; i++) { zsRow.push(g.nextZ); spawnUntil(g, g.nextZ + 120 - 0.001); }
  for (let i = 1; i < zsRow.length; i++) { const gap = zsRow[i - 1] - zsRow[i]; assert.ok(gap >= 14 && gap <= 22, `gap ${gap}`); }
  void last;
});

test('every row is passable and items are well formed', () => {
  const s = createSpawner(99);
  const items = spawnUntil(s, -10000);
  let coins = 0;
  for (const it of items) {
    assert.ok(['obstacle', 'coin'].includes(it.type));
    for (const f of ['x', 'y', 'z', 'w', 'h', 'd']) assert.equal(typeof it[f], 'number', f);
    assert.ok([-2, 0, 2].includes(it.x), `x ${it.x}`);
    if (it.type === 'coin') { coins++; assert.ok(it.y === 0.8 || it.y === 0.4); }
    else { assert.ok(CATALOG[it.name]); assert.equal(it.kind, CATALOG[it.name].kind); }
  }
  assert.ok(coins > 1000);
  for (const [z, obs] of rowsOf(items)) {
    const blocked = new Set(obs.filter(o => o.kind === 'block').map(o => o.x));
    assert.ok(blocked.size <= 2, `row ${z} fully blocked`);
    const lanes = obs.filter(o => o.name !== 'clothesline').map(o => o.x);
    assert.equal(new Set(lanes).size, lanes.length, `row ${z} two obstacles in one lane`);
  }
  // coins never overlap an obstacle in their lane (blocks or low ones)
  const solid = items.filter(i => i.type === 'obstacle' && i.name !== 'clothesline');
  for (const c of items.filter(i => i.type === 'coin')) {
    for (const o of solid) {
      if (o.x === c.x) assert.ok(Math.abs(o.z - c.z) >= o.d / 2 + 0.3, `coin z=${c.z} inside ${o.name} z=${o.z}`);
    }
  }
  const types = new Set(items.filter(i => i.type === 'obstacle').map(i => i.name));
  assert.equal(types.size, 7, 'all obstacle types appear');
});
