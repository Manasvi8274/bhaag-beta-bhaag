// Timed power-ups. Pure.
export const POWERUP_TIME = { shield: 15, magnet: 10, jump: 10, double: 12 };
export const POWERUP_LABEL = { shield: "Mummy's Shield", magnet: "Dadi's Ladoo Magnet", jump: 'Doodh Power Jump', double: 'Double Coins' };

export const createPowerups = () => ({ timers: {} });

export function activate(pu, name) { pu.timers[name] = POWERUP_TIME[name]; }

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

export const listActive = (pu) => Object.entries(pu.timers).map(([name, t]) => ({ name, frac: t / POWERUP_TIME[name] }));
