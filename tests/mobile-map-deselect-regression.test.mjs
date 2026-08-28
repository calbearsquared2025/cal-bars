import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mapSource = readFileSync(new URL('../js/map-mobile-refinement.mjs', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../js/app-state.mjs', import.meta.url), 'utf8');

test('unused mobile map background still clears the current map selection', () => {
  assert.match(mapSource, /function handleMapDeselect\(event\)/);
  assert.match(mapSource, /event\.target\.closest\?\.\('#map'\)/);
  assert.match(mapSource, /!isMobile\(\)/);
  assert.match(mapSource, /document\.body\.dataset\.commandSurface !== 'map'/);
  assert.match(mapSource, /\.cgb-marker, \.maplibregl-control-container, \.maplibregl-ctrl/);
  assert.match(mapSource, /if \(!clearSelectedMapVenue\(\)\) return;/);
  assert.match(mapSource, /window\.CGBApp\?\.render\?\.\(\)/);
  assert.match(mapSource, /document\.addEventListener\('click', handleMapDeselect\)/);
});

test('map deselection clears navigation state without changing detail-route behavior', () => {
  assert.match(stateSource, /export function clearSelectedMapVenue\(\)/);
  assert.match(stateSource, /if \(appState\.detailMode \|\| !appState\.selectedVenueId\) return false;/);
  assert.match(stateSource, /appState\.selectedVenueId = null;/);
  assert.match(stateSource, /appState\.trayState = 'peek';/);
  assert.match(stateSource, /appState\.locationFocusVenueId = null;/);
});
