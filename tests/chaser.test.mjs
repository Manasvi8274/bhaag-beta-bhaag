import test from 'node:test';
import assert from 'node:assert/strict';
import { createChaser, stumble, chappalHit, catchNow, updateChaser, isVisible, throwDue, THROW_AT, angryThrowDue, angryGap, ANGRY_FROM, startChase, chaseActive, CHASE_TIME, CHASE_DIST } from '../src/chaser.js';
import { STUMBLE_WINDOW, CHASER_FAR, CHASER_NEAR } from '../src/config.js';

const run = (c, secs, dt = 0.1) => { for (let i = 0; i < Math.round(secs / dt); i++) updateChaser(c, dt); };

test('initial', () => {
  const c = createChaser();
  assert.deepEqual(c, { distance: CHASER_FAR, time: 0, lastStumble: -Infinity, caught: false, thrown: 0, nextAngry: null });
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

test('Papa throws the chappal at set times after a stumble, once each, never without one', () => {
  const c = createChaser();
  run(c, 10);
  assert.equal(throwDue(c), false, 'no stumble, no throw');
  stumble(c);
  const at = [];
  for (let i = 0; i < 40; i++) { updateChaser(c, 0.1); if (throwDue(c)) at.push(+c.time.toFixed(1)); }
  assert.equal(at.length, THROW_AT.length);
  at.forEach((t, i) => assert.ok(Math.abs(t - 10 - THROW_AT[i]) < 0.15, `throw ${i} at ${t}`));
  stumble(c); updateChaser(c, 1.1); // still inside the stumble window
  assert.equal(throwDue(c), false, 'second stumble = caught, no more throws');
});

test('angry Papa: no long throws early on, then regular ones that speed up with distance', () => {
  const c = createChaser();
  const count = (secs, dist) => { let n = 0; for (let i = 0; i < secs * 10; i++) { updateChaser(c, 0.1); if (angryThrowDue(c, dist)) n++; } return n; };
  assert.equal(count(60, ANGRY_FROM - 1), 0);
  const slow = count(60, ANGRY_FROM), fast = count(60, 5000);
  assert.ok(slow >= 3 && slow <= 5, `slow ${slow}`);
  assert.ok(fast >= 9 && fast <= 11, `fast ${fast}`);
  assert.equal(angryGap(100000), 6);
  stumble(c);
  assert.equal(count(STUMBLE_WINDOW - 0.5, 5000), 0, 'not while he is right behind after a stumble');
  catchNow(c);
  assert.equal(count(30, 5000), 0);
});

test('cycle chase: closes in, throws every couple of seconds, then drops back', () => {
  const c = createChaser();
  run(c, 30);
  startChase(c);
  assert.equal(chaseActive(c), true);
  let throws = 0, mid = 0;
  for (let i = 0; i < CHASE_TIME * 10; i++) { updateChaser(c, 0.1); if (angryThrowDue(c, 2000)) throws++; if (i === 50) mid = c.distance; }
  assert.equal(mid, CHASE_DIST, 'right behind during the chase');
  assert.ok(throws >= 4 && throws <= 5, `throws ${throws}`);
  assert.equal(chaseActive(c), false);
  assert.equal(c.chaseFrom, c.lastStumble, 'clean escape');
  run(c, 10);
  assert.equal(c.distance, CHASER_FAR);
});

test('a chappal hit right after a stumble keeps Papa close but does not catch', () => {
  const c = createChaser();
  assert.equal(chappalHit(c), 'stumble', 'first hit is a normal stumble');
  run(c, 2);
  assert.equal(chappalHit(c), 'stumble');
  assert.equal(c.caught, false);
  assert.equal(c.distance, CHASER_NEAR);
  run(c, 1);
  assert.equal(stumble(c), 'caught', 'an obstacle still catches inside the window');
});
