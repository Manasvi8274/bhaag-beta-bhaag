import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, applyAction, updatePlayer, getHitbox } from '../src/player.js';
import { LANES, LANE_SWITCH_TIME, SLIDE_TIME, PLAYER_H, PLAYER_SLIDE_H } from '../src/config.js';

const run = (p, secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) updatePlayer(p, dt); };

test('initial state', () => {
  assert.deepEqual(createPlayer(), { lane: 1, x: 0, y: 0, vy: 0, grounded: true, sliding: false, slideTimer: 0, pendingSlide: false });
});

test('lane bounds', () => {
  const p = createPlayer();
  assert.equal(applyAction(p, 'left'), true);
  assert.equal(applyAction(p, 'left'), false);
  assert.equal(p.lane, 0);
  applyAction(p, 'right'); applyAction(p, 'right');
  assert.equal(applyAction(p, 'right'), false);
  assert.equal(p.lane, 2);
  assert.equal(applyAction(p, 'dance'), false);
});

test('lane move reaches target in LANE_SWITCH_TIME without overshoot', () => {
  const p = createPlayer();
  applyAction(p, 'right');
  let max = -Infinity;
  for (let t = 0; t < LANE_SWITCH_TIME * 0.9; t += 1 / 120) { updatePlayer(p, 1 / 120); max = Math.max(max, p.x); }
  assert.ok(p.x > 0 && p.x < LANES[2], `mid-move x=${p.x}`);
  run(p, 0.2, 1 / 120);
  assert.equal(p.x, LANES[2]);
  assert.ok(max <= LANES[2]);
  updatePlayer(p, 0.5); // huge dt must not overshoot
  assert.equal(p.x, LANES[2]);
});

test('jump arc lands and only from ground', () => {
  const p = createPlayer();
  assert.equal(applyAction(p, 'jump'), true);
  assert.equal(applyAction(p, 'jump'), false);
  let peak = 0;
  for (let t = 0; t < 1.2; t += 1 / 60) { updatePlayer(p, 1 / 60); peak = Math.max(peak, p.y); }
  assert.ok(peak > 1.8 && peak < 2.4, `peak ${peak}`);
  assert.equal(p.y, 0); assert.equal(p.vy, 0); assert.equal(p.grounded, true);
});

test('slide timer and hitbox', () => {
  const p = createPlayer();
  assert.equal(applyAction(p, 'slide'), true);
  assert.equal(getHitbox(p).h, PLAYER_SLIDE_H);
  run(p, SLIDE_TIME * 0.5);
  assert.equal(p.sliding, true);
  run(p, SLIDE_TIME);
  assert.equal(p.sliding, false); assert.equal(p.slideTimer, 0);
  assert.equal(getHitbox(p).h, PLAYER_H);
  assert.deepEqual(Object.keys(getHitbox(p)).sort(), ['d', 'h', 'w', 'x', 'y']);
});

test('jump cancels slide; slide in air fast-drops then slides on landing', () => {
  const p = createPlayer();
  applyAction(p, 'slide'); applyAction(p, 'jump');
  assert.equal(p.sliding, false);
  run(p, 0.15);
  const before = p.vy;
  applyAction(p, 'slide');
  assert.ok(p.vy < before && p.vy < 0);
  run(p, 0.3);
  assert.equal(p.grounded, true);
  assert.equal(p.sliding, true);
  assert.equal(p.pendingSlide, false);
});

test('moving LEFT is smooth too (no teleport)', () => {
  const p = createPlayer();
  applyAction(p, 'left');
  updatePlayer(p, 1 / 60);
  const step = (LANES[1] - LANES[0]) / LANE_SWITCH_TIME / 60;
  assert.ok(Math.abs(p.x - (LANES[1] - step)) < 1e-9, `after one frame x=${p.x}`);
  run(p, 0.3);
  assert.equal(p.x, LANES[0]);
});
