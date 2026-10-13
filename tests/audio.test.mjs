import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio.js';

let created = 0;
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
const node = () => { created++; return { connect(n) { return n; }, disconnect() {}, start() {}, stop() {}, frequency: param(), gain: param(), Q: param(), type: '', buffer: null }; };
class FakeCtx {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.state = 'running'; FakeCtx.count++; }
  createOscillator() { return node(); }
  createGain() { return node(); }
  createBiquadFilter() { return node(); }
  createBufferSource() { return node(); }
  createBuffer(ch, len) { assert.ok(Number.isInteger(len) && len > 0); return { getChannelData: () => new Float32Array(len) }; }
  resume() { return Promise.resolve(); }
}
FakeCtx.count = 0;

test('no Web Audio: everything is a safe no-op', () => {
  const a = createAudio(undefined);
  a.unlock(); a.play('jump'); a.setMuted(true); a.startMusic(); a.stopMusic();
  assert.equal(a.isMuted(), true);
});

test('nothing plays before unlock; context created once', () => {
  const a = createAudio(FakeCtx);
  created = 0;
  a.play('coin');
  assert.equal(created, 0);
  a.unlock(); a.unlock();
  assert.equal(FakeCtx.count, 1);
});

test('every sound builds nodes; unknown and muted build none', () => {
  const a = createAudio(FakeCtx);
  a.unlock();
  for (const n of ['jump', 'slide', 'coin', 'stumble', 'smack', 'powerup', 'horn', 'train', 'bell', 'cricket', 'firework', 'thunder', 'tring', 'caw']) {
    created = 0; a.play(n); assert.ok(created >= 2, `${n} created ${created}`);
  }
  created = 0; a.play('trumpet'); assert.equal(created, 0);
  a.setMuted(true); assert.equal(a.isMuted(), true);
  created = 0; a.play('jump'); assert.equal(created, 0);
  a.setMuted(false); created = 0; a.play('jump'); assert.ok(created >= 2);
});

test('music starts once and stops', async () => {
  const a = createAudio(FakeCtx);
  a.unlock();
  created = 0;
  a.startMusic(); a.startMusic();
  await new Promise(r => setTimeout(r, 130));
  assert.ok(created > 0, 'music scheduled notes');
  a.stopMusic();
  const n = created;
  await new Promise(r => setTimeout(r, 130));
  assert.equal(created, n, 'nothing after stop');
});

test('rain hiss: nothing until it rains, then one looping source', () => {
  const a = createAudio(FakeCtx);
  a.setRain(1); // before unlock: no-op
  a.unlock();
  created = 0; a.setRain(0); assert.equal(created, 0, 'no rain, no nodes');
  a.setRain(0.5); const n = created; assert.ok(n >= 3);
  a.setRain(1); a.setRain(0); assert.equal(created, n, 'reused');
});
