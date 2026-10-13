import { POWERUP_TIME } from './powerups.js';

// Saved player progress: wallet, best, missions, skins, daily reward, settings. Pure (storage injected).
export const SKINS = {
  classic: { name: 'School Day', cap: 0xd62828, bag: 0x1d4ed8, price: 0 },
  cricket: { name: 'Cricket Star', cap: 0x1d4ed8, bag: 0xf5f5f0, price: 300 },
  hara: { name: 'Hara Bhara', cap: 0x2a9d8f, bag: 0xe9c46a, price: 600 },
  gulabi: { name: 'Gulabi', cap: 0xff70a6, bag: 0x8338ec, price: 1000 },
  sona: { name: 'Sone Ka Beta', cap: 0xffc300, bag: 0x1b1b1b, price: 2500 },
};

// Who runs, and who chases. Bought once with coins, then picked in the shop.
export const CHARACTERS = {
  hero: { beta: { name: 'Beta', price: 0 }, beti: { name: 'Beti', price: 800 } },
  chaser: { papa: { name: 'Papa · chappal', price: 0 }, mummy: { name: 'Mummy · belan', price: 1500 }, dadi: { name: 'Dadi · lathi', price: 3000 } },
};

const POOL = [
  { stat: 'coins', text: (n) => `Collect ${n} coins in one run`, base: 30, step: 20 },
  { stat: 'distance', text: (n) => `Run ${n} m in one run`, base: 300, step: 250 },
  { stat: 'jumps', text: (n) => `Jump ${n} times in one run`, base: 10, step: 5 },
  { stat: 'slides', text: (n) => `Slide ${n} times in one run`, base: 6, step: 4 },
  { stat: 'powerups', text: (n) => `Grab ${n} power-ups in one run`, base: 1, step: 1 },
  { stat: 'dodges', text: (n) => `Change lane ${n} times in one run`, base: 20, step: 10 },
  { stat: 'nearMisses', text: (n) => `Bal bal bache! Dodge ${n} vehicles at the last moment`, base: 2, step: 2 },
  { stat: 'areas', text: (n) => `Run through ${n} mohallas in one run`, base: 2, step: 1 },
];
// Power-up upgrades: each level makes that power-up last 25% longer.
export const UPGRADE_COST = [250, 600, 1200, 2500, 5000];
export const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];
const KEY = 'bbb-save-v1';
const DEFAULTS = { coins: 0, best: 0, skin: 'classic', owned: ['classic'], muted: false, vibrate: true,
  tutorialDone: false, level: 0, missions: null, lastDaily: null, streak: 0, challengeDone: null, badges: [], bestDistance: 0, hero: 'beta', chaser: 'papa', chars: ['beta', 'papa'] };

function makeMission(level, taken) {
  const tier = Math.floor(level / 3);
  for (let i = 0; i < POOL.length; i++) {
    const p = POOL[(level * 5 + i) % POOL.length];
    if (taken.includes(p.stat)) continue;
    const goal = p.base + p.step * tier;
    return { stat: p.stat, goal, text: p.text(goal), reward: 50 + 25 * tier, flashed: false };
  }
}

// Badges: earned once, paid once. run = this run's stats, life = lifetime totals (after adding this run).
export const ACHIEVEMENTS = [
  { id: 'first', icon: '👟', text: 'Pehla Kadam: finish your first run', reward: 50, ok: (r, l) => l.runs >= 1 },
  { id: 'night', icon: '🌙', text: 'Raat ka Raja: keep running till night falls', reward: 150, ok: (r) => r.night >= 1 },
  { id: 'railway', icon: '🛤️', text: 'Railway Express: reach the Railway Colony', reward: 100, ok: (r) => r.areas >= 2 },
  { id: 'mandir', icon: '🛕', text: 'Mandir Darshan: reach Mandir Marg', reward: 200, ok: (r) => r.areas >= 3 },
  { id: 'rain', icon: '🌧️', text: 'Bheeg Gaye: run through a monsoon spell', reward: 100, ok: (r) => r.rain >= 1 },
  { id: 'km', icon: '🏁', text: 'Kilometre King: 1000 m in one run', reward: 200, ok: (r) => r.distance >= 1000 },
  { id: 'km3', icon: '🚀', text: 'Papa se Tez: 3000 m in one run', reward: 500, ok: (r) => r.distance >= 3000 },
  { id: 'near', icon: '😅', text: 'Bal Bal Bache Pro: 5 near misses in one run', reward: 200, ok: (r) => r.nearMisses >= 5 },
  { id: 'smash', icon: '🚲', text: 'Cycle Toofan: smash 8 things in one run', reward: 200, ok: (r) => r.smashes >= 8 },
  { id: 'marathon', icon: '🏃', text: 'Marathon: 10 km in total', reward: 300, ok: (r, l) => l.distance >= 10000 },
  { id: 'gullak', icon: '🐷', text: 'Gullak Bhar Gaya: 2000 coins collected in total', reward: 300, ok: (r, l) => l.coins >= 2000 },
];
const LIFE = ['runs', 'distance', 'coins', 'nearMisses', 'smashes'];

// Aaj ka Challenge: one seeded street per date (same obstacles for everyone that day) and a distance goal.
export const CHALLENGE_REWARD = 300;
export function dailyChallenge(date) {
  let h = 2166136261;
  for (const ch of date) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return { seed: h >>> 0, goal: 600 + ((h >>> 8) % 5) * 200, reward: CHALLENGE_REWARD };
}

const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

export function createProgress(storage) {
  let d;
  try { d = { ...DEFAULTS, ...JSON.parse(storage?.getItem(KEY) || '{}') }; } catch { d = { ...DEFAULTS }; }
  if (!SKINS[d.skin]) d.skin = 'classic';
  if (!Array.isArray(d.chars)) d.chars = [...DEFAULTS.chars];
  for (const kind of ['hero', 'chaser']) if (!CHARACTERS[kind][d[kind]] || !d.chars.includes(d[kind])) d[kind] = DEFAULTS[kind];
  d.upgrades = { ...(d.upgrades || {}) };
  d.life = Object.fromEntries(LIFE.map((k) => [k, d.life?.[k] || 0]));
  if (!Array.isArray(d.badges)) d.badges = [];
  if (!Array.isArray(d.missions) || d.missions.length !== 3) {
    d.missions = [];
    for (let i = 0; i < 3; i++) d.missions.push(makeMission(d.level + i, d.missions.map((m) => m.stat)));
  }
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(d)); } catch { /* storage full or blocked */ } };

  return {
    get data() { return d; },
    save,
    multiplier: () => 1 + Math.min(9, Math.floor(d.level / 3)),
    addCoins(n) { d.coins += n; save(); },
    spend(n) { if (d.coins < n) return false; d.coins -= n; save(); return true; },
    buy(id) {
      const s = SKINS[id];
      if (!s || d.owned.includes(id) || d.coins < s.price) return false;
      d.coins -= s.price; d.owned.push(id); d.skin = id; save(); return true;
    },
    upgradeLevel: (name) => d.upgrades[name] || 0,
    upgradeCost(name) { return UPGRADE_COST[this.upgradeLevel(name)]; }, // undefined at max level
    upgrade(name) {
      const cost = this.upgradeCost(name);
      if (!(name in POWERUP_TIME) || cost === undefined || d.coins < cost) return false;
      d.coins -= cost; d.upgrades[name] = this.upgradeLevel(name) + 1; save(); return true;
    },
    powerupTime(name) { return POWERUP_TIME[name] * (1 + 0.25 * this.upgradeLevel(name)); },
    select(id) { if (!d.owned.includes(id)) return false; d.skin = id; save(); return true; },
    // kind: 'hero' | 'chaser'. Picks it if owned, else buys it (and picks it) if affordable.
    pickChar(kind, id) {
      const c = CHARACTERS[kind]?.[id];
      if (!c) return false;
      if (!d.chars.includes(id)) {
        if (d.coins < c.price) return false;
        d.coins -= c.price; d.chars.push(id);
      }
      d[kind] = id; save(); return true;
    },
    setSetting(key, value) { if (key === 'muted' || key === 'vibrate' || key === 'tutorialDone') { d[key] = value; save(); } },
    // Missions reached during a run, reported once each (for a mid-run toast).
    liveMissions(stats) {
      const out = d.missions.filter((m) => !m.flashed && (stats[m.stat] || 0) >= m.goal);
      out.forEach((m) => { m.flashed = true; });
      return out;
    },
    // Ends a run: updates best, completes missions, pays rewards. Safe to call again after a revive.
    finishRun(stats) {
      const isNewBest = stats.score > d.best;
      if (isNewBest) d.best = stats.score;
      const completed = [];
      for (let i = 0; i < 3; i++) {
        const m = d.missions[i];
        if ((stats[m.stat] || 0) >= m.goal) {
          completed.push(m);
          d.coins += m.reward;
          d.level += 1;
          d.missions[i] = makeMission(d.level, d.missions.filter((_, j) => j !== i).map((x) => x.stat));
        } else m.flashed = false;
      }
      save();
      return { isNewBest, completed };
    },
    // Adds a run to the lifetime records and pays any badges it earned. Pass only what is new since the last call
    // (a revived run is recorded again with the rest): delta = stats growth, newRun = first record of this run,
    // stats = the run so far (for per-run badges). Returns the badges earned now.
    recordRun(delta, newRun, stats) {
      if (newRun) d.life.runs += 1;
      for (const k of LIFE) if (k !== 'runs') d.life[k] += delta[k] || 0;
      d.bestDistance = Math.max(d.bestDistance, stats.distance || 0);
      const earned = ACHIEVEMENTS.filter((a) => !d.badges.includes(a.id) && a.ok(stats, d.life));
      for (const a of earned) { d.badges.push(a.id); d.coins += a.reward; }
      save();
      return earned;
    },
    // Pays the day's challenge once, if the run reached the goal. Returns the coins paid (0 if not).
    completeChallenge(today, distance) {
      const c = dailyChallenge(today);
      if (d.challengeDone === today || distance < c.goal) return 0;
      d.challengeDone = today; d.coins += c.reward; save();
      return c.reward;
    },
    dailyStatus(today) {
      if (d.lastDaily === today) return { available: false, streak: d.streak, reward: 0 };
      const streak = d.lastDaily && dayDiff(d.lastDaily, today) === 1 ? d.streak + 1 : 1;
      return { available: true, streak, reward: DAILY_REWARDS[(streak - 1) % DAILY_REWARDS.length] };
    },
    claimDaily(today) {
      const s = this.dailyStatus(today);
      if (!s.available) return 0;
      d.streak = s.streak; d.lastDaily = today; d.coins += s.reward; save();
      return s.reward;
    },
  };
}
