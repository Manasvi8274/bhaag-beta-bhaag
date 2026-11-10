import test from 'node:test';
import assert from 'node:assert/strict';
import { shareText, shareRun, GAME_URL, challengeUrl, parseChallenge, dayNumber } from '../src/share.js';

const info = { distance: 1234, score: 5678, area: 'Railway Colony', chaser: 'mummy', hero: 'beti', seed: 987654321, name: 'Rahul' };

test('brag text names the run, the area and the chaser', () => {
  const t = shareText(info);
  for (const s of ['1234 m', 'Railway Colony', 'Mummy', 'belan', '5678']) assert.ok(t.includes(s), s);
});

test('shares the image when it can, else text, else copies; never throws', async () => {
  const blob = new Blob(['x'], { type: 'image/png' });
  const got = [];
  const full = { canShare: () => true, share: async (d) => { got.push(d); } };
  assert.equal(await shareRun(blob, info, full), 'shared');
  assert.equal(got[0].files.length, 1); assert.ok(got[0].text.includes(GAME_URL));
  const textOnly = { share: async (d) => { got.push(d); } };
  assert.equal(await shareRun(blob, info, textOnly), 'shared');
  assert.equal(got[1].files, undefined);
  let copied = '';
  assert.equal(await shareRun(blob, info, { clipboard: { writeText: async (t) => { copied = t; } } }), 'copied');
  assert.ok(copied.includes(GAME_URL));
  const abort = { share: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } };
  assert.equal(await shareRun(blob, info, abort), 'cancelled');
  assert.equal(await shareRun(blob, info, {}), 'failed');
});

test('challenge link round-trips, and a bad or hostile link is no challenge', () => {
  const url = challengeUrl({ seed: 4294967295, distance: 1234.9, name: 'राहुल <b>!' });
  assert.deepEqual(parseChallenge(new URL(url).search), { seed: 4294967295, distance: 1234, name: 'राहुल b' });
  assert.equal(parseChallenge(new URL(challengeUrl({ seed: 7, distance: 300, name: '' })).search).name, 'Dost');
  for (const bad of ['', '?c=', '?c=abc', '?c=zzzzzzzz-100-x', '?c=zzzzzzz-100-x', '?c=1-0-x', '?c=1-999999-x', '?c=-5-100-x', '?c=1-1e3-x']) assert.equal(parseChallenge(bad), null, bad);
  assert.equal(parseChallenge('?c=1-100-' + encodeURIComponent('<img src=x onerror=alert(1)>')).name, 'img srcx one');
});

test('share text carries the link; daily and beat-a-friend variants', () => {
  assert.ok(shareText(info).includes(challengeUrl(info)));
  const beat = shareText({ ...info, beat: { name: 'Priya', distance: 900 } });
  assert.ok(beat.includes('Priya') && beat.includes('900 m') && beat.includes('1234 m'));
  assert.equal(dayNumber('2026-10-12'), 1);
  const daily = shareText({ ...info, daily: { date: '2026-10-14', goal: 2000 } });
  assert.ok(daily.includes('#3') && daily.includes('🟩🟩🟩⬜⬜') && !daily.includes('✅'));
  assert.ok(shareText({ ...info, daily: { date: '2026-10-14', goal: 1000 } }).includes('🟩🟩🟩🟩🟩 ✅'));
});
