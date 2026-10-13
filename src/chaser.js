import { STUMBLE_WINDOW, CHASER_FAR, CHASER_NEAR } from './config.js';

export function createChaser() {
  return { distance: CHASER_FAR, time: 0, lastStumble: -Infinity, caught: false, thrown: 0, nextAngry: null };
}

export function stumble(c) {
  if (c.caught) return 'caught';
  if (c.time - c.lastStumble <= STUMBLE_WINDOW) {
    c.caught = true;
    c.distance = 0;
    return 'caught';
  }
  c.lastStumble = c.time;
  c.thrown = 0;
  c.distance = CHASER_NEAR;
  return 'stumble';
}

export function catchNow(c) {
  c.caught = true;
  c.distance = 0;
}

// Cycle chase: for CHASE_TIME seconds the chaser pedals right behind and throws every CHASE_GAP seconds.
export const CHASE_TIME = 12, CHASE_GAP = 2.5, CHASE_DIST = 4;
export const chaseActive = (c) => c.time < (c.chaseUntil ?? -1);
export function startChase(c) {
  c.chaseUntil = c.time + CHASE_TIME;
  c.chaseFrom = c.lastStumble; // a clean escape = no new stumble by the end
  c.nextAngry = c.time + 1.5;
}

export function updateChaser(c, dt) {
  c.time += dt;
  if (c.caught) return;
  if (chaseActive(c)) { c.distance = Math.min(c.distance + 3 * dt, CHASE_DIST); return; }
  if (c.time - c.lastStumble > STUMBLE_WINDOW && c.distance < CHASER_FAR) {
    c.distance += 3 * dt;
    c.distance = Math.min(c.distance, CHASER_FAR);
  }
}

// Papa throws his chappal at these times (s) after a stumble, while he is still right behind.
export const THROW_AT = [1.0, 3.4];
export function throwDue(c) {
  if (c.caught || c.thrown >= THROW_AT.length || c.time - c.lastStumble < THROW_AT[c.thrown]) return false;
  c.thrown += 1;
  return c.time - c.lastStumble <= STUMBLE_WINDOW;
}

export function isVisible(c) {
  return c.distance < CHASER_FAR;
}

// Past ANGRY_FROM metres Papa loses patience and throws from afar too, more often the further Beta gets
// (every 13.5 s at 1 km, down to every 6 s). Never while he is already close after a stumble.
export const ANGRY_FROM = 1000;
export const angryGap = (distance) => Math.max(6, 16 - distance / 400);
export function angryThrowDue(c, distance) {
  if (c.caught || distance < ANGRY_FROM) return false;
  if (c.nextAngry === null) c.nextAngry = c.time + 3;
  if (c.time < c.nextAngry) return false;
  const chasing = chaseActive(c);
  c.nextAngry = c.time + (chasing ? CHASE_GAP : angryGap(distance));
  return chasing || c.time - c.lastStumble > STUMBLE_WINDOW;
}
