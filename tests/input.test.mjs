import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';

const ev = (type, props) => Object.assign(new Event(type), props);
const setup = () => { const t = new EventTarget(), got = []; const dispose = createInput(t, a => got.push(a)); return { t, got, dispose }; };

test('keys map to actions and preventDefault is called', () => {
  const { t, got } = setup();
  let prevented = 0;
  for (const key of ['ArrowLeft', 'a', 'ArrowRight', 'D', 'ArrowUp', ' ', 'w', 'ArrowDown', 'S', 'x', 'Enter'])
    t.dispatchEvent(ev('keydown', { key, preventDefault: () => prevented++ }));
  assert.deepEqual(got, ['left', 'left', 'right', 'right', 'jump', 'jump', 'jump', 'slide', 'slide']);
  assert.equal(prevented, 9);
});

test('key repeat ignored, missing preventDefault ok', () => {
  const { t, got } = setup();
  t.dispatchEvent(ev('keydown', { key: 'ArrowLeft', repeat: true }));
  t.dispatchEvent(ev('keydown', { key: 'ArrowLeft' }));
  assert.deepEqual(got, ['left']);
});

const swipe = (t, x0, y0, x1, y1) => {
  t.dispatchEvent(ev('pointerdown', { clientX: x0, clientY: y0 }));
  t.dispatchEvent(ev('pointerup', { clientX: x1, clientY: y1 }));
};

test('swipes', () => {
  const { t, got } = setup();
  swipe(t, 100, 100, 40, 110);   // left
  swipe(t, 100, 100, 180, 90);   // right
  swipe(t, 100, 100, 110, 20);   // up
  swipe(t, 100, 100, 95, 200);   // down
  swipe(t, 100, 100, 120, 110);  // tap (20px) -> nothing
  assert.deepEqual(got, ['left', 'right', 'jump', 'slide']);
});

test('pointerup without pointerdown, and start cleared after up', () => {
  const { t, got } = setup();
  t.dispatchEvent(ev('pointerup', { clientX: 0, clientY: 0 }));
  swipe(t, 100, 100, 0, 100);
  t.dispatchEvent(ev('pointerup', { clientX: 300, clientY: 100 }));
  assert.deepEqual(got, ['left']);
});

test('swipe fires mid-move once, not again on up', () => {
  const { t, got } = setup();
  t.dispatchEvent(ev('pointerdown', { clientX: 100, clientY: 100 }));
  t.dispatchEvent(ev('pointermove', { clientX: 90, clientY: 100 }));
  assert.deepEqual(got, []);
  t.dispatchEvent(ev('pointermove', { clientX: 60, clientY: 100 }));
  t.dispatchEvent(ev('pointermove', { clientX: 20, clientY: 100 }));
  t.dispatchEvent(ev('pointerup', { clientX: 10, clientY: 100 }));
  assert.deepEqual(got, ['left']);
  t.dispatchEvent(ev('pointerdown', { clientX: 100, clientY: 100 }));
  t.dispatchEvent(ev('pointercancel', {}));
  t.dispatchEvent(ev('pointerup', { clientX: 300, clientY: 100 }));
  assert.deepEqual(got, ['left']);
});

test('dispose removes listeners', () => {
  const { t, got, dispose } = setup();
  dispose();
  t.dispatchEvent(ev('keydown', { key: 'ArrowLeft' }));
  swipe(t, 100, 100, 0, 100);
  assert.deepEqual(got, []);
});

test('tap clears start point too', () => {
  const { t, got } = setup();
  swipe(t, 100, 100, 105, 100);
  t.dispatchEvent(ev('pointerup', { clientX: 0, clientY: 100 }));
  assert.deepEqual(got, []);
});
