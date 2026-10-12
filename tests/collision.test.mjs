import test from 'node:test';
import assert from 'node:assert/strict';
import { aabbOverlap, classifyHit, firstHit, groundAt } from '../src/collision.js';

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

test('groundAt: ramp rises to the bus roof, roof only counts once you are up there', () => {
  const bus = { type: 'obstacle', name: 'bus', kind: 'block', x: 0, y: 0, z: -20, w: 1.9, h: 3.2, d: 8 };
  const ramp = { type: 'ramp', name: 'ramp', x: 0, y: 0, z: -13, w: 1.6, h: 3.2, d: 6 };
  const at = (z, y = 0, x = 0) => groundAt({ x, y, z, w: 0.8, h: 1.8, d: 0.6 }, [bus, ramp]);
  assert.equal(at(-5), 0);
  assert.ok(Math.abs(at(-13 + 0.3) - 1.6) < 1e-9, 'halfway up');
  assert.equal(at(-16 + 0.3), 3.2, 'top of ramp = roof height');
  assert.equal(at(-20, 3.2), 3.2, 'on the roof');
  assert.equal(at(-20, 0), 0, 'from the road the bus is a wall, not a floor');
  assert.equal(at(-20, 3.2, 2), 0, 'next lane: nothing under you');
  assert.equal(at(-24.5, 3.2), 0, 'past the end of the bus');
  // walking the whole ramp at speed never clips the bus
  let y = 0;
  for (let z = -6; z > -24; z -= 0.3) {
    y = Math.max(at(z, y), 0);
    assert.equal(aabbOverlap({ x: 0, y, z, w: 0.8, h: 1.8, d: 0.6 }, bus), false, `clipped at z=${z.toFixed(1)} y=${y}`);
  }
});
