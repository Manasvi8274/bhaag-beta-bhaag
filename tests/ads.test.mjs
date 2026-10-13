import test from 'node:test';
import assert from 'node:assert/strict';
import { createAds, createWebAds } from '../src/ads.js';

// Fake AdMob plugin. behaviour: 'reward' | 'skip' | 'failShow' | 'failLoad'
function fake(behaviour) {
  const ls = new Map();
  const emit = (e) => (ls.get(e) || []).forEach((f) => f());
  const p = {
    calls: { init: 0, prepare: 0, show: 0 }, listeners: () => [...ls.values()].reduce((n, a) => n + a.length, 0),
    async initialize() { p.calls.init++; },
    async requestConsentInfo() { return { status: 'NOT_REQUIRED', canRequestAds: true }; },
    async showConsentForm() {},
    async prepareRewardVideoAd() { p.calls.prepare++; if (behaviour === 'failLoad') throw new Error('no fill'); return {}; },
    async addListener(e, f) {
      if (!ls.has(e)) ls.set(e, []);
      ls.get(e).push(f);
      return { remove: () => ls.set(e, ls.get(e).filter((x) => x !== f)) };
    },
    async showRewardVideoAd() {
      p.calls.show++;
      if (behaviour === 'failShow') { emit('onRewardedVideoAdFailedToShow'); throw new Error('fail'); }
      if (behaviour === 'reward') emit('onRewardedVideoAdReward');
      emit('onRewardedVideoAdDismissed');
      return behaviour === 'reward' ? { type: 'coins', amount: 1 } : { type: '', amount: 0 };
    },
  };
  return p;
}

test('no plugin (web): unavailable, safe no-ops', async () => {
  const a = createAds(undefined);
  assert.equal(a.available, false);
  await a.preload();
  assert.equal(await a.showRewarded(), false);
});

test('watched to the end -> rewarded, listeners cleaned, next ad preloaded', async () => {
  const p = fake('reward');
  const a = createAds(p);
  assert.equal(a.available, true);
  await a.preload(); await a.preload();
  assert.equal(p.calls.prepare, 1, 'no double load');
  assert.equal(await a.showRewarded(), true);
  assert.equal(p.listeners(), 0);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(p.calls.prepare, 2, 'next ad loading');
  assert.equal(p.calls.init, 1, 'initialised once');
});

test('closed early -> no reward', async () => {
  const p = fake('skip');
  assert.equal(await createAds(p).showRewarded(), false);
  assert.equal(p.listeners(), 0);
});

test('failures never throw and give no reward', async () => {
  assert.equal(await createAds(fake('failShow')).showRewarded(), false);
  const p = fake('failLoad');
  assert.equal(await createAds(p).showRewarded(), false);
  assert.equal(p.calls.show, 0, 'never shows an ad that did not load');
});

// Fake page for the web adapter. outcome: 'viewed' | 'dismissed' | 'noFill' | 'blocked'
function fakePage(outcome) {
  const w = { scripts: [] };
  w.document = {
    createElement: () => ({ setAttribute() {} }),
    head: { append(s) {
      w.scripts.push(s);
      if (outcome === 'blocked') return setTimeout(s.onerror); // browsers fire this async
      const q = w.adsbygoogle; // the real script swaps the queue for a live handler
      w.adsbygoogle = { push(o) {
        if (o.type !== 'reward') return;
        if (outcome !== 'noFill') o.beforeReward(() => (outcome === 'viewed' ? o.adViewed() : o.adDismissed()));
        o.adBreakDone({ breakStatus: outcome === 'noFill' ? 'notReady' : outcome });
      } };
      q.forEach((o) => w.adsbygoogle.push(o));
      s.onload();
    } },
  };
  return w;
}

test('web: rewarded only when watched; script loaded once', async () => {
  const w = fakePage('viewed');
  const a = createWebAds({ client: 'ca-pub-x', test: true }, w);
  assert.equal(a.available, true);
  assert.equal(await a.showRewarded(), true);
  assert.equal(await a.showRewarded(), true);
  assert.equal(w.scripts.length, 1);
  assert.equal(await createWebAds({ client: 'x', enabled: true }, fakePage('dismissed')).showRewarded(), false);
  assert.equal(await createWebAds({ client: 'x', enabled: true }, fakePage('noFill')).showRewarded(), false);
});

test('web: ad blocker -> false, retries the script next time; no document -> unavailable', async () => {
  const w = fakePage('blocked');
  const a = createWebAds({ client: 'x', enabled: true }, w);
  assert.equal(await a.showRewarded(), false);
  assert.equal(await a.showRewarded(), false);
  assert.equal(w.scripts.length, 2);
  assert.equal(createWebAds({ client: 'x', enabled: true }, {}).available, false);
});

test('web: not enabled (site not approved yet) -> hidden, never loads the script', async () => {
  const w = fakePage('viewed');
  const a = createWebAds({ client: 'x', enabled: false, test: false }, w);
  assert.equal(a.available, false);
  assert.equal(await a.showRewarded(), false);
  assert.equal(w.scripts.length, 0);
});
