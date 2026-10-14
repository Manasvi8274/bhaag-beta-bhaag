// Timed power-ups. Pure.
export const POWERUP_TIME = { shield: 15, magnet: 10, jump: 10, double: 12, cycle: 8, rocket: 7, score2x: 15 };
export const POWERUP_LABEL = { shield: "Mummy's Shield", magnet: "Dadi's Ladoo Magnet", jump: 'Doodh Power Jump', double: 'Double Coins',
  cycle: 'Bhaiya Ki Cycle', rocket: 'Diwali Rocket', score2x: 'Score Dugna' };
export const HEADSTART_TIME = 10; // a Rocket Start: the rocket, longer, right at the start of a run

// Mystery Dabba: r in [0, 1) -> coins (45%), a random timed power-up (30%) or a Rocket Start (25%).
export function mysteryPrize(r) {
  if (r < 0.45) return { coins: 50 + Math.floor((r / 0.45) * 4) * 50 };
  if (r < 0.75) { const kinds = Object.keys(POWERUP_TIME); return { powerup: kinds[Math.floor(((r - 0.45) / 0.3) * kinds.length)] }; }
  return { headstart: 1 };
}

export const createPowerups = () => ({ timers: {}, max: {} });

export function activate(pu, name, secs = POWERUP_TIME[name]) { pu.timers[name] = pu.max[name] = secs; }

export function updatePowerups(pu, dt) {
  for (const k of Object.keys(pu.timers)) {
    pu.timers[k] -= dt;
    if (pu.timers[k] <= 0) delete pu.timers[k];
  }
}

export const isActive = (pu, name) => name in pu.timers;

// Uses up a power-up early (e.g. the shield absorbing a hit). Returns whether it was active.
export function consume(pu, name) {
  if (!isActive(pu, name)) return false;
  delete pu.timers[name];
  return true;
}

export const listActive = (pu) => Object.entries(pu.timers).map(([name, t]) => ({ name, left: t, frac: t / (pu.max[name] || POWERUP_TIME[name]) }));
