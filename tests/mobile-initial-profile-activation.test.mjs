import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile selected profile activates its canonical venue route on initial selection', async () => {
  const source = await read('js/map-mobile-refinement.mjs');
  assert.match(source, /function syncSelectedVenueRoute\(state = appState\(\)\)[\s\S]*?buildVenueUrl\(venue\.slug, game, window\.location\.href\)[\s\S]*?history\.replaceState/);
  assert.match(source, /const routeChanged = selectedProfileActive \? syncSelectedVenueRoute\(state\) : false;/);
  assert.match(source, /focusVenue\(state\.selectedVenueId, \{ force: routeChanged \}\);/);
});

test('selected profile no longer requires the obsolete swipe-to-detail navigation', async () => {
  const source = await read('js/map-mobile-refinement.mjs');
  assert.doesNotMatch(source, /SELECTED_DETAIL_SWIPE_THRESHOLD/);
  assert.doesNotMatch(source, /handleSelectedHandleSwipe/);
  assert.doesNotMatch(source, /openSelectedVenueDetail/);
  assert.doesNotMatch(source, /window\.location\.assign\(buildVenueUrl/);
});

test('direct venue links defer camera focus to the shared mobile map refinement', async () => {
  const [directBridge, mapRefinement] = await Promise.all([
    read('js/mobile-direct-venue-profile.mjs'),
    read('js/map-mobile-refinement.mjs')
  ]);
  assert.doesNotMatch(directBridge, /focusDirectVenue|focusLocation\?\./);
  assert.match(mapRefinement, /const routeActive = selectedProfileActive && selectedVenueRouteActive\(state\);/);
  assert.match(mapRefinement, /if \(restoredCamera[\s\S]*?!routeActive\)/);
});
