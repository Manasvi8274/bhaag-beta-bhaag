import test from 'node:test';
import assert from 'node:assert/strict';
import { shareText, shareRun, GAME_URL } from '../src/share.js';

const info = { distance: 1234, score: 5678, area: 'Railway Colony', chaser: 'mummy', hero: 'beti' };

test('brag text names the run, the area and the chaser', () => {
  const t = shareText(info);
  for (const s of ['1234 m', 'Railway Colony', 'Mummy', 'belan', '5678']) assert.ok(t.includes(s), s);
});

test('shares the image when it can, else text, else copies; never throws', async () => {
  const blob = new Blob(['x'], { type: 'image/png' });
  const got = [];
  const full = { canShare: () => true, share: async (d) => { got.push(d); } };
  assert.equal(await shareRun(blob, info, full), 'shared');
  assert.equal(got[0].files.length, 1); assert.equal(got[0].url, GAME_URL);
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
