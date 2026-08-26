import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const renderer = await readFile(new URL('js/selected-profile-renderer.mjs', root), 'utf8');
const styles = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');

test('mobile selected venue title retains the accepted unclipped presentation', () => {
  assert.match(styles, /\.selected-card h2\s*\{[^}]*display: block !important[^}]*overflow: visible !important[^}]*line-height: 1\.08 !important[^}]*-webkit-line-clamp: unset !important/s);
});

test('canonical renderer separates mobile location from proximity and Directions', () => {
  assert.match(renderer, /location\.textContent = mobile[\s\S]*compactVenueLocation\(venue\)/);
  assert.match(renderer, /selected-card__proximity-row/);
  assert.match(renderer, /proximity\.dataset\.hasDistance/);
  assert.match(renderer, /selected-card__distance/);
  assert.match(renderer, /selected-card__directions-inline/);
  assert.match(styles, /selected-card__distance[\s\S]*white-space: nowrap !important/);
});

test('desktop retains inline Directions on the location line', () => {
  assert.match(renderer, /else \{[\s\S]*location\.append\(createLocationSeparator\(documentObject\), createDirectionsLink\(directionsHref, documentObject\)\);[\s\S]*\}/);
});
