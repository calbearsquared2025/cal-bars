import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('Apps Script excludes published venues with invalid coordinates', () => {
  assert.match(code, /publication_status === 'published' && hasValidVenueCoordinates_\(row\)/);
  assert.match(code, /Number\.isFinite\(latitude\)/);
  assert.match(code, /latitude >= -90 && latitude <= 90/);
  assert.match(code, /longitude >= -180 && longitude <= 180/);
});

test('map sizing is explicit without runtime monkey patches', () => {
  assert.match(html, /width: 100%/);
  assert.match(html, /height: calc\(100dvh - var\(--header-height\) - var\(--footer-height\)\)/);
  assert.doesNotMatch(html, /map-layout-guard|snapshot-coordinate-guard|bootstrap\.mjs/);
});

test('map construction waits for layout and fits bounds only after construction', () => {
  assert.match(app, /getBoundingClientRect\(\)/);
  assert.match(app, /Number\.isFinite\(dimension\) && dimension > 0/);
  assert.match(app, /center: \[-98\.5795, 39\.8283\],[\s\S]*zoom: 3\.2/);
  assert.doesNotMatch(app, /new maplibregl\.Map\(\{[\s\S]*?\bbounds:/);
  assert.doesNotMatch(app, /new maplibregl\.Map\(\{[\s\S]*?\bfitBoundsOptions:/);
  assert.match(app, /state\.map\.fitBounds\(bounds, \{ padding: 56, maxZoom: 7, duration: 0 \}\)/);
});
