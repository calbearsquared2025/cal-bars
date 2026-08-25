import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/map-profile-final-pass.mjs', import.meta.url), 'utf8');

test('mobile selected venue title removes the inherited clipping clamp', () => {
  assert.match(source, /\.selected-card h2\s*\{[^}]*display: block !important[^}]*overflow: visible !important[^}]*line-height: 1\.08 !important[^}]*-webkit-line-clamp: unset !important/s);
});

test('selected venue location separates proximity from the address line on mobile', () => {
  assert.match(source, /const distanceCopy = mobile \? formatSelectedDistance\(state, venue\) : ''/);
  assert.match(source, /if \(mobile\) \{[\s\S]*location\.textContent = compactVenueLocation\(venue\)[\s\S]*selected-card__proximity-row/);
  assert.match(source, /function formatSelectedDistance\(state, venue\)[\s\S]*haversineMiles\([\s\S]*mi away/);
  assert.match(source, /selected-card__distance[\s\S]*white-space: nowrap !important/);
});

test('Directions shares the mobile proximity row while desktop keeps its existing placement', () => {
  assert.match(source, /proximity\.dataset\.hasDistance = String\(Boolean\(distanceCopy\)\)/);
  assert.match(source, /if \(mobile\) proximity\.append\(directions\);\s*else location\.append\(directions\);/);
  assert.match(source, /selected-card__proximity-row\[data-has-distance="true"\][\s\S]*selected-card__directions-inline::before/);
});
