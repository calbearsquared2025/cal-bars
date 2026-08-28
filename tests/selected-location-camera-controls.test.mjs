import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile selected venue camera uses city focus when isolated and regional bounds when nearby venues exist', async () => {
  const refinement = await read('js/map-mobile-refinement.mjs');

  assert.match(refinement, /const FOCUS_ZOOM = 11;/);
  assert.match(refinement, /const REGIONAL_FOCUS_MAX_ZOOM = 9\.75;/);
  assert.match(refinement, /function nearbyVenuesForSelected\([\s\S]*?Number\(distance\) <= NEARBY_RADIUS_MILES/);
  assert.match(refinement, /if \(nearby\.length > 0\) \{[\s\S]*?state\.map\.fitBounds\([\s\S]*?maxZoom: REGIONAL_FOCUS_MAX_ZOOM/);
  assert.match(refinement, /state\.map\.easeTo\([\s\S]*?zoom: Math\.max\(currentZoom, FOCUS_ZOOM\)[\s\S]*?offset: \[0, verticalOffset\]/);
});

test('selected venue camera still focuses only once unless the user explicitly selects a marker again', async () => {
  const refinement = await read('js/map-mobile-refinement.mjs');

  assert.match(refinement, /if \(!force && lastAutoFocusedVenueId === venueId\) return;/);
  assert.match(refinement, /lastAutoFocusedVenueId = venueId;/);
  assert.match(refinement, /lastAutoFocusedVenueId = '';[\s\S]*?focusVenue\(marker\.dataset\.venueId, \{ force: true \}\)/);
});

test('mobile Locate me control follows the live selected tray edge', async () => {
  const refinement = await read('js/map-mobile-refinement.mjs');

  assert.match(refinement, /function syncLocateControlPosition\(\)[\s\S]*?state\?\.trayState === 'selected'/);
  assert.match(refinement, /const preferredTop = trayRect\.top - controlHeight - MAP_ACTION_GAP;/);
  assert.match(refinement, /actions\.style\.setProperty\('top', `\$\{Math\.round\(top\)\}px`, 'important'\);/);
  assert.match(refinement, /new ResizeObserver\(scheduleLocateControlPosition\)/);
  assert.match(refinement, /window\.visualViewport\?\.addEventListener\?\.\('resize', scheduleLocateControlPosition\)/);
});
