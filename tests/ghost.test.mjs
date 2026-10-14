import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecorder, record, ghostAt, ghostDistance, GHOST_DT } from '../src/ghost.js';

test('records a run at a fixed rate and replays it smoothly', () => {
  const r = createRecorder();
  for (let t = 0; t <= 10; t += 1 / 60) record(r, t, Math.sin(t), t > 5 ? 1 : 0, t * 12, t > 5 ? 'jump' : 'run');
  assert.ok(Math.abs(r.d.length - 10 / GHOST_DT) <= 2);
  const g = JSON.parse(JSON.stringify(r)); // survives saving
  const a = ghostAt(g, 2.05);
  assert.ok(Math.abs(a.d - 24.6) < 0.5, `d ${a.d}`);
  assert.equal(a.mode, 'run');
  assert.equal(ghostAt(g, 7).mode, 'jump');
  assert.equal(ghostAt(g, 99), null, 'over at the end of its run');
  assert.equal(ghostAt(null, 1), null);
  assert.ok(Math.abs(ghostDistance(g) - 120) < 2);
  assert.equal(ghostDistance(null), 0);
});
