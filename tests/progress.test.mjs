import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, SKINS, DAILY_REWARDS, UPGRADE_COST } from '../src/progress.js';
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
