import { STUMBLE_WINDOW, CHASER_FAR, CHASER_NEAR } from './config.js';

export function createChaser() {
  return { distance: CHASER_FAR, time: 0, lastStumble: -Infinity, caught: false };
}

export function stumble(c) {
  if (c.caught) return 'caught';
  if (c.time - c.lastStumble <= STUMBLE_WINDOW) {
    c.caught = true;
    c.distance = 0;
    return 'caught';
  }
  c.lastStumble = c.time;
  c.distance = CHASER_NEAR;
  return 'stumble';
}

export function catchNow(c) {
  c.caught = true;
  c.distance = 0;
}

export function updateChaser(c, dt) {
  c.time += dt;
  if (c.caught) return;
  if (c.time - c.lastStumble > STUMBLE_WINDOW && c.distance < CHASER_FAR) {
    c.distance += 3 * dt;
    c.distance = Math.min(c.distance, CHASER_FAR);
  }
}

export function isVisible(c) {
  return c.distance < CHASER_FAR;
}
