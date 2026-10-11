Write `src/spawner.js`: generates obstacle rows and coins ahead of the player. PURE: no imports.
The player runs toward NEGATIVE z. Lanes are x = -2, 0, 2.

Export exactly:

1. `mulberry32(seed)`: returns a function rng() giving floats in [0, 1). Use the standard mulberry32:
```
return function () {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
```

2. `CATALOG`: an object of obstacle templates `{ kind, w, h, d, y }` (y = bottom height):
   stone {low, 1.2, 0.5, 0.8, 0}, pothole {low, 1.4, 0.3, 1.2, 0}, clothesline {high, 6.4, 0.3, 0.3, 1.0},
   cow {block, 1.2, 1.6, 2.4, 0}, auto {block, 1.6, 2.0, 2.8, 0}, cart {block, 1.4, 1.3, 2.0, 0},
   bus {block, 1.9, 3.2, 8, 0}.

3. `createSpawner(seed)` returns `{ rng: mulberry32(seed), nextZ: -40, row: 0 }`.

4. `spawnUntil(s, playerZ, ahead = 120)`: while `s.nextZ > playerZ - ahead`, generate one row at
   z = s.nextZ, then `s.row += 1` and `s.nextZ -= 14 + s.rng() * 8` (gap 14..22). Return an array
   of ALL items created in this call.
   Row generation (z = row z):
   - With probability 0.15: one clothesline obstacle at x = 0, plus 4 coins in a random lane at y = 0.4.
   - Otherwise: shuffle lane indices [0,1,2] with rng. Pick blockCount = Math.floor(rng() * 3) (0, 1 or 2).
     The first blockCount shuffled lanes get a random block (cow, auto, cart or bus).
     Each remaining lane gets a random low obstacle (stone or pothole) with probability 0.4.
     Then pick one lane that has NO block and place 5 coins in it at y = 0.8.
   - Coins in a lane go at z, z-2, z-4, ... BUT if that lane has a low obstacle, start the coins at
     z - 3 instead (so they are past the obstacle) and place only 4 coins. (Coin z values are less than or equal to the row z.)
   Obstacle item: `{ type: 'obstacle', name, kind, x, y, z, w, h, d }` (copy fields from CATALOG).
   Coin item: `{ type: 'coin', x, y, z, w: 0.6, h: 0.6, d: 0.6 }`.
   Lane x = [-2, 0, 2][laneIndex].

## REQUIRED SKELETON (fill in every TODO; keep names, exports and structure exactly)
```js
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CATALOG = {
  stone: { kind: 'low', w: 1.2, h: 0.5, d: 0.8, y: 0 },
  // TODO: pothole, clothesline, cow, auto, cart, bus exactly as listed
};

const LANE_X = [-2, 0, 2];
const BLOCKS = ['cow', 'auto', 'cart', 'bus'];
const LOWS = ['stone', 'pothole'];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function obstacle(name, x, z) {
  const c = CATALOG[name];
  return { type: 'obstacle', name, kind: c.kind, x, y: c.y, z, w: c.w, h: c.h, d: c.d };
}

function coins(x, y, z, count) {
  // TODO: return array of `count` coin items at z, z-2, z-4, ...
}

function makeRow(rng, z) {
  const items = [];
  if (rng() < 0.15) {
    // TODO: clothesline at x 0 + 4 coins at y 0.4 in pick(rng, LANE_X)
    return items;
  }
  const lanes = [0, 1, 2];
  for (let i = 2; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [lanes[i], lanes[j]] = [lanes[j], lanes[i]]; }
  const blockCount = Math.floor(rng() * 3);
  const lowLanes = new Set();
  // TODO: lanes[0..blockCount-1] get obstacle(pick(rng, BLOCKS), LANE_X[lane], z)
  // TODO: other lanes: if rng() < 0.4 push obstacle(pick(rng, LOWS), ...) and add lane to lowLanes
  // TODO: coin lane = lanes[blockCount] (first lane without a block);
  //       if lowLanes.has(coinLane) push coins(x, 0.8, z - 3, 4) else coins(x, 0.8, z, 5)
  return items;
}

export function createSpawner(seed) { return { rng: mulberry32(seed), nextZ: -40, row: 0 }; }

export function spawnUntil(s, playerZ, ahead = 120) {
  const out = [];
  // TODO: while (s.nextZ > playerZ - ahead) { out.push(...makeRow(s.rng, s.nextZ)); s.row += 1; s.nextZ -= 14 + s.rng() * 8; }
  return out;
}
```
