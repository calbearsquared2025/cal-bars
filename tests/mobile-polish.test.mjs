import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('Map preview has one governing owner', async () => {
  const mobilePolish = await source('js/mobile-polish.mjs');
  const mapMobile = await source('js/map-mobile-refinement.mjs');
  assert.doesNotMatch(mobilePolish, /updatePeek|rankedLead|rankVenues|tray-summary-title/);
  assert.match(mapMobile, /function updatePreviewIntent/);
  assert.match(mapMobile, /state\?\.selectedVenueId/);
});

test('navigation derives one active Map Search Add or List state', async () => {
  const script = await source('js/mobile-polish.mjs');
  assert.match(script, /const VALID_VIEWS = new Set\(\['map', 'search', 'add', 'list'\]\)/);
  assert.match(script, /function setActiveView/);
  assert.match(script, /removeAttribute\('aria-current'\)/);
  assert.match(script, /function inferActiveView/);
});

test('statistics retain large-number and supporting-label markup', async () => {
  const script = await source('js/mobile-polish.mjs');
  assert.match(script, /opening-stat__number/);
  assert.match(script, /opening-stat__copy/);
  assert.match(script, /Watch parties/);
  assert.match(script, /Locations/);
});

test('mobile polish remains event-driven', async () => {
  const script = await source('js/mobile-polish.mjs');
  assert.match(script, /CGBApp\?\.subscribe/);
  assert.doesNotMatch(script, /MutationObserver/);
});
