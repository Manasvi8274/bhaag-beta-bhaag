import { ZONES, zoneAt } from './zones.js';

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CATALOG = {
  bricks: { kind: 'low', w: 1.2, h: 0.5, d: 0.8, y: 0 },
  barricade: { kind: 'low', w: 1.4, h: 0.9, d: 0.5, y: 0 },
  pothole: { kind: 'low', w: 1.4, h: 0.3, d: 1.2, y: 0 },
  banner: { kind: 'high', w: 6.4, h: 0.3, d: 0.3, y: 1.0 },
  cow: { kind: 'block', w: 1.2, h: 1.6, d: 2.4, y: 0 },
  auto: { kind: 'block', w: 1.6, h: 2.0, d: 2.8, y: 0 },
  cart: { kind: 'block', w: 1.4, h: 1.3, d: 2.0, y: 0 },
  bus: { kind: 'block', w: 1.9, h: 3.2, d: 8, y: 0 },
  scooter: { kind: 'block', w: 0.9, h: 1.7, d: 1.8, y: 0, vz: 3.5 }, // rides towards Beta once he is near (game.js)
  dog: { kind: 'low', w: 1.2, h: 0.45, d: 0.6, y: 0 },
  pipe: { kind: 'low', w: 1.4, h: 0.9, d: 0.9, y: 0 },
};

const LANE_X = [-2, 0, 2];
const RAMP_LEN = 6;
export const POWERUP_KINDS = ['shield', 'magnet', 'jump', 'double', 'cycle'];

function obstacle(name, x, z) {
  const c = CATALOG[name];
  const o = { type: 'obstacle', name, kind: c.kind, x, y: c.y, z, w: c.w, h: c.h, d: c.d };
  if (c.vz) o.vz = c.vz;
  return o;
}

function coins(x, y, z, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ type: 'coin', x, y, z: z - i * 2, w: 0.6, h: 0.6, d: 0.6 });
  return out;
}

function makeRow(rng, z) {
  const items = [], { blocks, lows } = ZONES[zoneAt(z)];
  if (rng() < 0.15) {
    items.push(obstacle('banner', 0, z));
    items.push(...coins(pick(rng, LANE_X), 0.4, z, 4));
    return items;
  }
  const lanes = [0, 1, 2];
  for (let i = 2; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [lanes[i], lanes[j]] = [lanes[j], lanes[i]]; }
  const blockCount = Math.floor(rng() * 3);
  const lowLanes = new Set();
  for (let i = 0; i < blockCount; i++) {
    const name = pick(rng, blocks), x = LANE_X[lanes[i]];
    items.push(obstacle(name, x, z));
    if (name === 'bus' && rng() < 0.6) { // ramp up to the roof, with a coin trail on top
      items.push({ type: 'ramp', name: 'ramp', x, y: 0, z: z + 4 + RAMP_LEN / 2, w: 1.6, h: CATALOG.bus.h, d: RAMP_LEN });
      items.push(...coins(x, CATALOG.bus.h + 0.8, z + 3, 4));
    }
  }
  for (let i = blockCount; i < 3; i++) {
    if (rng() < 0.4) { items.push(obstacle(pick(rng, lows), LANE_X[lanes[i]], z)); lowLanes.add(lanes[i]); }
  }
  const coinLane = lanes[blockCount];
  if (lowLanes.has(coinLane)) items.push(...coins(LANE_X[coinLane], 0.8, z - 3, 4));
  else if (rng() < 0.12) {
    // short coin run then a power-up; z - 7 stays clear of the next row (>= 14 m away, half a bus is 4 m)
    items.push(...coins(LANE_X[coinLane], 0.8, z, 3));
    items.push({ type: 'powerup', name: pick(rng, POWERUP_KINDS), x: LANE_X[coinLane], y: 0.8, z: z - 7, w: 0.8, h: 0.8, d: 0.8 });
  } else items.push(...coins(LANE_X[coinLane], 0.8, z, 5));
  return items;
}

export function createSpawner(seed) { return { rng: mulberry32(seed), nextZ: -40, row: 0 }; }

export function spawnUntil(s, playerZ, ahead = 120) {
  const out = [];
  while (s.nextZ > playerZ - ahead) {
    out.push(...makeRow(s.rng, s.nextZ));
    s.row += 1;
    s.nextZ -= 14 + s.rng() * 8;
  }
  return out;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
