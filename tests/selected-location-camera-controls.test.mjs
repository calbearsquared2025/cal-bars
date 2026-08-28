import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile selected venue camera moves from national view to city or regional context', async () => {
  const polish = await read('js/mobile-polish.mjs');

  assert.match(polish, /import \{ rankNearbyVenues \} from '\.\/core\.mjs';/);
  assert.match(polish, /const SELECTED_CAMERA_CITY_ZOOM = 11;/);
  assert.match(polish, /const SELECTED_CAMERA_REGIONAL_MAX_ZOOM = 9\.75;/);
  assert.match(polish, /rankNearbyVenues\([\s\S]*?SELECTED_CAMERA_RADIUS_MILES[\s\S]*?candidate\.venue_id !== venue\.venue_id/);
  assert.match(polish, /if \(points\.length === 1\) \{[\s\S]*?state\.map\.easeTo\([\s\S]*?SELECTED_CAMERA_CITY_ZOOM[\s\S]*?duration: 0/);
  assert.match(polish, /state\.map\.fitBounds\([\s\S]*?maxZoom: SELECTED_CAMERA_REGIONAL_MAX_ZOOM,[\s\S]*?duration: 0/);
});

test('selected venue camera runs only for a new selection so Locate me can retain its explicit viewport', async () => {
  const polish = await read('js/mobile-polish.mjs');

  assert.match(polish, /if \(venueId === lastCameraVenueId\) return;/);
  assert.match(polish, /lastCameraVenueId = venueId;/);
  assert.match(polish, /if \(!venueId\) \{[\s\S]*?lastCameraVenueId = null;/);
});

test('mobile Locate me control is positioned from the live selected tray edge', async () => {
  const polish = await read('js/mobile-polish.mjs');

  assert.match(polish, /function syncMapActionPosition\(\)[\s\S]*?state\?\.trayState === 'selected'/);
  assert.match(polish, /const preferredTop = trayRect\.top - controlHeight - MAP_ACTION_GAP;/);
  assert.match(polish, /actions\.style\.setProperty\('top', `\$\{Math\.round\(top\)\}px`, 'important'\);/);
  assert.match(polish, /new ResizeObserver\(scheduleMapGeometry\)/);
  assert.match(polish, /window\.visualViewport\?\.addEventListener\?\.\('resize', scheduleMapGeometry\)/);
});
