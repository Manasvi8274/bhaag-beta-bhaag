import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoice } from '../src/voice.js';

class U { constructor(text) { this.text = text; } }
const synth = (langs) => {
  const s = { spoken: [], cancels: 0, listeners: {}, getVoices: () => langs.map((lang) => ({ lang })),
    speak(u) { s.spoken.push(u); }, cancel() { s.cancels++; }, addEventListener(e, f) { s.listeners[e] = f; } };
  return s;
};

test('speaks Hindi in the chaser\'s voice, newest shout wins', () => {
  const s = synth(['en-US', 'hi-IN']);
  const v = createVoice(s, U);
  assert.equal(v.available(), true);
  assert.equal(v.say('रुक जा!', 'papa'), true);
  assert.equal(s.spoken[0].lang, 'hi-IN');
  assert.ok(s.spoken[0].pitch < 1, 'Papa is deep');
  v.say('बेलन देखा है?', 'mummy');
  assert.ok(s.spoken[1].pitch > 1);
  assert.equal(s.cancels, 2);
});

test('silent without a Hindi voice, when off, or without speech at all; picks up voices loaded later', () => {
  const s = synth(['en-US']);
  const v = createVoice(s, U);
  assert.equal(v.say('रुक जा!', 'papa'), false);
  s.getVoices = () => [{ lang: 'hi-IN' }];
  s.listeners.voiceschanged();
  assert.equal(v.say('रुक जा!', 'papa'), true);
  v.setOn(false);
  assert.equal(v.say('रुक जा!', 'papa'), false);
  assert.equal(createVoice(undefined, undefined).say('x', 'papa'), false);
  const broken = { getVoices() { throw new Error('no'); }, addEventListener() {} };
  assert.equal(createVoice(broken, U).available(), false);
});
