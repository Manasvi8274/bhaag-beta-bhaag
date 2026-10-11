import test from 'node:test';
import assert from 'node:assert/strict';
import { createChaser, stumble, catchNow, updateChaser, isVisible } from '../src/chaser.js';
import { STUMBLE_WINDOW, CHASER_FAR, CHASER_NEAR } from '../src/config.js';

const run = (c, secs, dt = 0.1) => { for (let i = 0; i < Math.round(secs / dt); i++) updateChaser(c, dt); };

test('initial', () => {
  const c = createChaser();
  assert.deepEqual(c, { distance: CHASER_FAR, time: 0, lastStumble: -Infinity, caught: false });
  assert.equal(isVisible(c), false);
});

test('first stumble brings papa near, second within window catches', () => {
  const c = createChaser();
  run(c, 10);
  assert.equal(stumble(c), 'stumble');
  assert.equal(c.distance, CHASER_NEAR);
  assert.equal(isVisible(c), true);
  run(c, STUMBLE_WINDOW - 1);
  assert.equal(c.distance, CHASER_NEAR);
  assert.equal(stumble(c), 'caught');
  assert.equal(c.caught, true); assert.equal(c.distance, 0);
  assert.equal(stumble(c), 'caught');
  run(c, 20);
  assert.equal(c.distance, 0);
});

test('after window papa falls back, capped, and next stumble is safe', () => {
  const c = createChaser();
  stumble(c);
  run(c, STUMBLE_WINDOW + 30);
  assert.equal(c.distance, CHASER_FAR);
  assert.equal(isVisible(c), false);
  assert.equal(stumble(c), 'stumble');
  assert.equal(c.caught, false);
});

test('first stumble at time 0 is not a catch', () => {
  assert.equal(stumble(createChaser()), 'stumble');
});

test('catchNow', () => {
  const c = createChaser();
  catchNow(c);
  assert.equal(c.caught, true); assert.equal(c.distance, 0);
});
