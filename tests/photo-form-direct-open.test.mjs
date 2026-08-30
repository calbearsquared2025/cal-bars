import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const photoFormSource = readFileSync(new URL('../js/photo-form.js', import.meta.url), 'utf8');

test('photo overlay follows the local map when desktop profile layout moves it out of the hero', () => {
  assert.match(
    photoFormSource,
    /:scope > \.detail-hero > \.detail-local-map, :scope > \.detail-local-map/
  );
  assert.match(photoFormSource, /entryPoint: 'map-overlay'/);
  assert.match(photoFormSource, /className: 'detail-local-map__photo-action'/);
});
