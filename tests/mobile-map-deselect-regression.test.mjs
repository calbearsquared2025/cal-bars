import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  appState,
  clearSelectedMapVenue,
  resetAppStateForTests
} from '../js/app-state.mjs';

const mobileMapSource = readFileSync(new URL('../js/map-mobile-refinement.mjs', import.meta.url), 'utf8');
const desktopMapSource = readFileSync(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');

test('unused mobile map background still clears the current map selection', () => {
  assert.match(mobileMapSource, /function handleMapDeselect\(event\)/);
  assert.match(mobileMapSource, /event\.target\.closest\?\.\('#map'\)/);
  assert.match(mobileMapSource, /!isMobile\(\)/);
  assert.match(mobileMapSource, /document\.body\.dataset\.commandSurface !== 'map'/);
  assert.match(mobileMapSource, /\.cgb-marker, \.maplibregl-control-container, \.maplibregl-ctrl/);
  assert.match(mobileMapSource, /if \(!clearSelectedMapVenue\(\)\) return;/);
  assert.match(mobileMapSource, /window\.CGBApp\?\.render\?\.\(\)/);
  assert.match(mobileMapSource, /document\.addEventListener\('click', handleMapDeselect\)/);
});

test('unused desktop map background clears the selected Venue and returns to Locations', () => {
  assert.match(desktopMapSource, /function handleDesktopMapDeselect\(event\)/);
  assert.match(desktopMapSource, /if \(isMobile\(\) \|\| document\.body\.dataset\.commandSurface !== 'map'\) return;/);
  assert.match(desktopMapSource, /event\.target\.closest\?\.\('#map'\)/);
  assert.match(desktopMapSource, /\.cgb-marker, \.maplibregl-control-container, \.maplibregl-ctrl/);
  assert.match(desktopMapSource, /clearSelectedMapVenue\(\{ allowDetailMode: true \}\)/);
  assert.match(desktopMapSource, /window\.CGBApp\?\.showLocations\?\.\(\)/);
  assert.match(desktopMapSource, /document\.addEventListener\('click', handleDesktopMapDeselect\)/);
});

test('desktop opt-in can clear detail-mode map selection without changing the default mobile guard', () => {
  resetAppStateForTests();
  appState.selectedVenueId = 'ven_1';
  appState.trayState = 'selected';
  appState.locationFocusVenueId = 'ven_1';
  appState.detailMode = true;

  assert.equal(clearSelectedMapVenue(), false);
  assert.equal(appState.selectedVenueId, 'ven_1');
  assert.equal(appState.detailMode, true);

  assert.equal(clearSelectedMapVenue({ allowDetailMode: true }), true);
  assert.equal(appState.selectedVenueId, null);
  assert.equal(appState.trayState, 'peek');
  assert.equal(appState.locationFocusVenueId, null);
  assert.equal(appState.detailMode, false);
});
