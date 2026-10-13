import test from 'node:test';
import assert from 'node:assert/strict';
import { festivalOn } from '../src/festival.js';

test('Diwali week each year, nothing otherwise, forcible for testing', () => {
  assert.equal(festivalOn('2026-11-08'), 'diwali');
  assert.equal(festivalOn('2026-11-01'), 'diwali');
  assert.equal(festivalOn('2026-11-11'), 'diwali');
  assert.equal(festivalOn('2026-10-31'), null);
  assert.equal(festivalOn('2026-11-12'), null);
  assert.equal(festivalOn('2027-10-29'), 'diwali');
  assert.equal(festivalOn('2026-10-14'), null);
  assert.equal(festivalOn('2026-10-14', 'diwali'), 'diwali');
});
