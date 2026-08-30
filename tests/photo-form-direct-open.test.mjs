import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const photoFormSource = readFileSync(new URL('../js/photo-form.js', import.meta.url), 'utf8');

test('photo contribution stays in the normal profile flow instead of overlaying the local map', () => {
  assert.match(photoFormSource, /entryPoint: 'contribution'/);
  assert.match(photoFormSource, /className: 'detail-contribution__action'/);
  assert.match(photoFormSource, /label: 'Add a new photo'/);
  assert.doesNotMatch(photoFormSource, /entryPoint: 'map-overlay'/);
  assert.doesNotMatch(photoFormSource, /detail-local-map__photo-action/);
});
