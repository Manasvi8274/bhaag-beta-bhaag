import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, SKINS, DAILY_REWARDS, UPGRADE_COST, CHARACTERS, dailyChallenge, CHALLENGE_REWARD, ACHIEVEMENTS } from '../src/progress.js';
import { createPowerups, activate, updatePowerups, isActive, consume, listActive } from '../src/powerups.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('defaults, persistence, corrupt save', () => {
  const s = mem();
  const p = createProgress(s);
  assert.equal(p.data.coins, 0);
  assert.equal(p.data.missions.length, 3);
  assert.equal(new Set(p.data.missions.map((m) => m.stat)).size, 3, 'missions distinct');
  p.addCoins(120);
  assert.equal(createProgress(s).data.coins, 120);
  s.setItem('bbb-save-v1', '{not json');
  assert.equal(createProgress(s).data.coins, 0);
  assert.doesNotThrow(() => createProgress(undefined).addCoins(5));
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.doesNotThrow(() => createProgress(throwing).addCoins(5));
});

test('shop: buy needs coins, cannot buy twice, select only owned', () => {
  const p = createProgress(mem());
  assert.equal(p.buy('cricket'), false);
  p.addCoins(SKINS.cricket.price + 10);
  assert.equal(p.buy('cricket'), true);
  assert.equal(p.data.coins, 10);
  assert.equal(p.data.skin, 'cricket');
  assert.equal(p.buy('cricket'), false);
  assert.equal(p.buy('nope'), false);
  assert.equal(p.select('sona'), false);
  assert.equal(p.select('classic'), true);
  assert.equal(p.spend(11), false);
  assert.equal(p.spend(10), true);
});

test('missions complete, pay, get replaced and raise the multiplier', () => {
  const p = createProgress(mem());
  const [m0] = p.data.missions;
  const stats = { score: 500, coins: 0, distance: 0, jumps: 0, slides: 0, powerups: 0, dodges: 0, [m0.stat]: m0.goal };
  assert.deepEqual(p.liveMissions(stats).map((m) => m.stat), [m0.stat]);
  assert.equal(p.liveMissions(stats).length, 0, 'toast only once');
  const r = p.finishRun(stats);
  assert.equal(r.isNewBest, true);
  assert.equal(r.completed.length, 1);
  assert.equal(p.data.coins, m0.reward);
  assert.equal(p.data.level, 1);
  assert.equal(new Set(p.data.missions.map((m) => m.stat)).size, 3);
  assert.equal(p.finishRun({ score: 100 }).isNewBest, false);
  for (let i = 0; i < 2; i++) { const m = p.data.missions[0]; p.finishRun({ score: 0, [m.stat]: m.goal }); }
  assert.equal(p.multiplier(), 2);
  for (let i = 0; i < 40; i++) { const m = p.data.missions[i % 3]; p.finishRun({ score: 0, [m.stat]: m.goal }); }
  assert.equal(p.multiplier(), 10, 'capped');
  assert.ok(p.data.missions.every((m) => m.goal > 0 && m.text.includes(String(m.goal))));
});

test('daily reward streak', () => {
  const p = createProgress(mem());
  assert.equal(p.claimDaily('2026-10-12'), DAILY_REWARDS[0]);
  assert.equal(p.claimDaily('2026-10-12'), 0, 'once per day');
  assert.equal(p.claimDaily('2026-10-13'), DAILY_REWARDS[1]);
  assert.equal(p.claimDaily('2026-10-14'), DAILY_REWARDS[2]);
  assert.equal(p.claimDaily('2026-10-20'), DAILY_REWARDS[0], 'missed days reset');
  assert.equal(p.dailyStatus('2026-10-20').available, false);
});

test('power-ups time out, shield can be consumed', () => {
  const pu = createPowerups();
  activate(pu, 'magnet'); activate(pu, 'shield');
  assert.ok(isActive(pu, 'magnet'));
  updatePowerups(pu, 5);
  assert.equal(listActive(pu).find((x) => x.name === 'magnet').frac, 0.5);
  updatePowerups(pu, 5.01);
  assert.equal(isActive(pu, 'magnet'), false);
  assert.equal(consume(pu, 'shield'), true);
  assert.equal(consume(pu, 'shield'), false);
  activate(pu, 'jump'); updatePowerups(pu, 3); activate(pu, 'jump');
  assert.equal(listActive(pu)[0].frac, 1, 'picking again refreshes');
  activate(pu, 'double', 24); updatePowerups(pu, 12);
  assert.equal(listActive(pu).find((x) => x.name === 'double').frac, 0.5, 'upgraded duration');
});

test('power-up upgrades: cost coins, +25% duration each, max 5, saved', () => {
  const store = mem();
  const p = createProgress(store);
  assert.equal(p.upgrade('magnet'), false, 'no coins');
  p.addCoins(10000);
  assert.equal(p.upgradeCost('magnet'), UPGRADE_COST[0]);
  for (let i = 0; i < 5; i++) assert.equal(p.upgrade('magnet'), true);
  assert.equal(p.upgrade('magnet'), false, 'max level');
  assert.equal(p.upgradeCost('magnet'), undefined);
  assert.equal(p.data.coins, 10000 - UPGRADE_COST.reduce((a, b) => a + b));
  assert.equal(p.powerupTime('magnet'), 10 * 2.25);
  assert.equal(p.powerupTime('shield'), 15);
  assert.equal(p.upgrade('elephant'), false);
  assert.equal(createProgress(store).upgradeLevel('magnet'), 5, 'persisted');
  assert.equal(createProgress(mem()).upgradeLevel('magnet'), 0, 'fresh save not shared');
});

test('characters: Beta and Papa free, others bought once, then picked for free', () => {
  const s = mem();
  const p = createProgress(s);
  assert.equal(p.data.hero, 'beta'); assert.equal(p.data.chaser, 'papa');
  assert.equal(p.pickChar('chaser', 'mummy'), false, 'no coins');
  p.addCoins(CHARACTERS.chaser.mummy.price);
  assert.equal(p.pickChar('chaser', 'mummy'), true);
  assert.equal(p.data.coins, 0);
  assert.equal(p.pickChar('chaser', 'papa'), true);
  assert.equal(p.pickChar('chaser', 'mummy'), true, 'owned: free');
  assert.equal(p.data.coins, 0);
  assert.equal(p.pickChar('hero', 'mummy'), false, 'wrong kind');
  assert.equal(p.pickChar('hero', 'nope'), false);
  assert.equal(createProgress(s).data.chaser, 'mummy', 'saved');
  s.setItem('bbb-save-v1', JSON.stringify({ hero: 'beti', chaser: 'ghost', chars: ['beta', 'papa'] }));
  const q = createProgress(s);
  assert.equal(q.data.hero, 'beta', 'not owned -> default'); assert.equal(q.data.chaser, 'papa');
});

test('daily challenge: same street all day, new one tomorrow, paid once on reaching the goal', () => {
  const a = dailyChallenge('2026-10-14');
  assert.deepEqual(a, dailyChallenge('2026-10-14'));
  assert.notEqual(a.seed, dailyChallenge('2026-10-15').seed);
  const goals = new Set();
  for (let d = 1; d <= 28; d++) { const g = dailyChallenge(`2026-02-${String(d).padStart(2, '0')}`).goal; goals.add(g); assert.ok(g >= 600 && g <= 1400 && g % 200 === 0); }
  assert.ok(goals.size >= 3, 'goals vary');
  const p = createProgress(mem());
  assert.equal(p.completeChallenge('2026-10-14', a.goal - 1), 0);
  assert.equal(p.completeChallenge('2026-10-14', a.goal), CHALLENGE_REWARD);
  assert.equal(p.data.coins, CHALLENGE_REWARD);
  assert.equal(p.completeChallenge('2026-10-14', 99999), 0, 'once a day');
  assert.equal(p.completeChallenge('2026-10-15', 99999), CHALLENGE_REWARD);
});

test('records and badges: lifetime totals add up across revives, each badge pays once', () => {
  const s = mem();
  const p = createProgress(s);
  const run = { distance: 600, coins: 40, nearMisses: 2, smashes: 0, areas: 1, night: 0, rain: 0 };
  let got = p.recordRun(run, true, run);
  assert.deepEqual(got.map((a) => a.id), ['first']);
  assert.equal(p.data.coins, 50);
  const more = { distance: 500, coins: 10, nearMisses: 3 }; // revived and ran on
  const now = { distance: 1100, coins: 50, nearMisses: 5, smashes: 0, areas: 2, night: 1, rain: 0 };
  got = p.recordRun(more, false, now);
  assert.deepEqual(got.map((a) => a.id).sort(), ['km', 'near', 'night', 'railway']);
  assert.deepEqual(p.data.life, { runs: 1, distance: 1100, coins: 50, nearMisses: 5, smashes: 0 });
  assert.equal(p.data.bestDistance, 1100);
  assert.equal(p.recordRun(now, true, now).length, 0, 'never twice');
  assert.equal(createProgress(s).data.life.runs, 2, 'saved');
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
});
