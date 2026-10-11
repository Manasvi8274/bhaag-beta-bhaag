import test from 'node:test';
import assert from 'node:assert/strict';
import { aabbOverlap, classifyHit, firstHit } from '../src/collision.js';

const box = (x, y, z, w = 1, h = 1, d = 1, kind) => ({ x, y, z, w, h, d, kind });
const P = (x = 0, y = 0, h = 1.8) => box(x, y, 0, 0.8, h, 0.6);

test('overlap basics and touching edges', () => {
  assert.equal(aabbOverlap(box(0, 0, 0), box(0.5, 0.5, 0.5)), true);
  assert.equal(aabbOverlap(box(0, 0, 0), box(1, 0, 0)), false);   // touching on x
  assert.equal(aabbOverlap(box(0, 0, 0), box(0, 1, 0)), false);   // touching on y
  assert.equal(aabbOverlap(box(0, 0, 0), box(0, 0, 1)), false);   // touching on z
  assert.equal(aabbOverlap(box(0, 0, 0), box(0, 0, 3)), false);
  assert.equal(aabbOverlap(box(0, 2, 0), box(0, 0, 0, 1, 3)), true);
});

test('low obstacle: jump clears it, standing stumbles', () => {
  const stone = box(0, 0, 0, 1.2, 0.5, 0.8, 'low');
  assert.equal(classifyHit(P(), stone), 'stumble');
  assert.equal(classifyHit(P(0, 0.6), stone), 'none');
});

test('high obstacle: slide under clears it', () => {
  const line = box(0, 1.0, 0, 6, 0.3, 0.3, 'high');
  assert.equal(classifyHit(P(), line), 'stumble');
  assert.equal(classifyHit(P(0, 0, 0.8), line), 'none');
});

test('block: head-on caught, side swipe stumble, other lane none', () => {
  const cow = box(2, 0, 0, 1.4, 1.6, 2.2, 'block');
  assert.equal(classifyHit(P(2), cow), 'caught');
  assert.equal(classifyHit(P(1.2), cow), 'stumble');
  assert.equal(classifyHit(P(0), cow), 'none');
  assert.equal(classifyHit(P(2), { ...cow, kind: 'ghost' }), 'none');
});

test('firstHit picks most severe, then earliest', () => {
  const stone = box(0, 0, 0, 1, 0.5, 1, 'low');
  const stone2 = box(0, 0, 0.2, 1, 0.5, 1, 'low');
  const bus = box(0, 0, 0.1, 1.8, 3, 6, 'block');
  assert.deepEqual(firstHit(P(), []), { result: 'none', obstacle: null });
  assert.equal(firstHit(P(), [stone, stone2]).obstacle, stone);
  const r = firstHit(P(), [stone, bus]);
  assert.equal(r.result, 'caught'); assert.equal(r.obstacle, bus);
});
