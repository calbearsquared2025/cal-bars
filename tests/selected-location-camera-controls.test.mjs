import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('selected desktop venue camera is resolved before the map load animation can become visible', async () => {
  const coordination = await read('js/map-zoom-coordination.mjs');

  assert.match(coordination, /const INITIAL_SELECTED_ZOOM = 11;/);
  assert.match(coordination, /function captureInitialSelection\(state = appState\(\)\)/);
  assert.match(coordination, /if \(initialSelectionCaptured \|\| !state\?\.snapshot\) return false;/);
  assert.match(coordination, /initialSelectedVenueId = state\.selectedVenueId \|\| '';/);
  assert.match(coordination, /function applyInitialSelectedCamera\(\)/);
  assert.match(coordination, /captureInitialSelection\(state\);/);
  assert.match(coordination, /const map = state\?\.map;/);
  assert.match(coordination, /if \(!map \|\| initialSelectedCameraMaps\.has\(map\) \|\| !state\.selectedVenueId\) return false;/);
  assert.match(coordination, /if \(!initialSelectedVenueId \|\| state\.selectedVenueId !== initialSelectedVenueId\) \{[\s\S]*?initialSelectedCameraMaps\.add\(map\);[\s\S]*?return false;/,
    'A list selection made before map load must not be mistaken for the direct-route preload selection.');
  assert.match(coordination, /if \(typeof map\.loaded === 'function' && map\.loaded\(\)\) \{[\s\S]*?initialSelectedCameraMaps\.add\(map\);[\s\S]*?return false;/,
    'The preload camera must not jump again when a user selects a venue on an already-loaded map.');
  assert.match(coordination, /map\.jumpTo\(\{[\s\S]*?center,[\s\S]*?zoom: Math\.max\([\s\S]*?INITIAL_SELECTED_ZOOM\)/);
  assert.match(coordination, /app\.subscribe\('rendered', sync\)/);
  assert.match(coordination, /app\.subscribe\('ready', sync\)/);
});

test('selected desktop venue camera suppresses the follow-up visibility pan while the focus move settles', async () => {
  const coordination = await read('js/map-zoom-coordination.mjs');

  assert.match(coordination, /const SELECTED_CAMERA_SETTLE_MS = 560;/);
  assert.match(coordination, /function cancelSelectedVisibilityFrame/);
  assert.match(coordination, /function suppressRedundantSelectedVisibilityPan/);
  assert.match(coordination, /if \(isDesktopSelectedFocus\(options\)\) suppressRedundantSelectedVisibilityPan\(\);/);
  assert.match(coordination, /queueMicrotask\(cancel\)/);
  assert.match(coordination, /requestAnimationFrame\(cancelUntilSettled\)/);
});

test('mobile selected venue camera uses regional bounds without zooming out from a tighter user view', async () => {
  const refinement = await read('js/map-mobile-refinement.mjs');

  assert.match(refinement, /const FOCUS_ZOOM = 11;/);
  assert.match(refinement, /const REGIONAL_FOCUS_MAX_ZOOM = 9\.75;/);
  assert.match(refinement, /function nearbyVenuesForSelected\([\s\S]*?Number\(distance\) <= NEARBY_RADIUS_MILES/);
  assert.match(refinement, /const regionalCamera = state\.map\.cameraForBounds\?\.\(bounds,[\s\S]*?maxZoom: REGIONAL_FOCUS_MAX_ZOOM/);
  assert.match(refinement, /if \(Number\.isFinite\(regionalZoom\) && currentZoom > regionalZoom\) \{[\s\S]*?state\.map\.easeTo\(\{[\s\S]*?zoom: currentZoom,[\s\S]*?offset: \[0, verticalOffset\]/);
  assert.match(refinement, /state\.map\.fitBounds\(bounds,[\s\S]*?maxZoom: REGIONAL_FOCUS_MAX_ZOOM/);
  assert.match(refinement, /state\.map\.easeTo\([\s\S]*?zoom: Math\.max\(currentZoom, FOCUS_ZOOM\)[\s\S]*?offset: \[0, verticalOffset\]/);
});

test('selected venue camera focuses once through the shared mobile refinement path', async () => {
  const refinement = await read('js/map-mobile-refinement.mjs');

  assert.match(refinement, /if \(!force && lastAutoFocusedVenueId === venueId\) return;/);
  assert.match(refinement, /lastAutoFocusedVenueId = venueId;/);
  assert.match(refinement, /focusVenue\(state\.selectedVenueId, \{ force: routeChanged \}\);/);
  assert.doesNotMatch(refinement, /\.cgb-marker\[data-venue-id\][\s\S]*?focusVenue\(marker\.dataset\.venueId, \{ force: true \}\)/);
});

test('mobile Locate me control follows the live selected tray edge', async () => {
  const refinement = await read('js/map-mobile-refinement.mjs');

  assert.match(refinement, /function syncLocateControlPosition\(\)[\s\S]*?state\?\.trayState === 'selected'/);
  assert.match(refinement, /const preferredTop = trayRect\.top - controlHeight - MAP_ACTION_GAP;/);
  assert.match(refinement, /actions\.style\.setProperty\('top', `\$\{Math\.round\(top\)\}px`, 'important'\);/);
  assert.match(refinement, /selectedTrayResizeObserver = new ResizeObserver\(\(\) => \{[\s\S]*?scheduleLocateControlPosition\(\);[\s\S]*?\}\);/);
  assert.match(refinement, /window\.visualViewport\?\.addEventListener\?\.\('resize', handleViewportGeometryChange\)/);
  assert.match(refinement, /function handleViewportGeometryChange\(\) \{[\s\S]*?scheduleLocateControlPosition\(\);/);
});

test('desktop Locate me preserves a selected Venue Profile so distance can render in its address', async () => {
  const app = await read('js/app.js');

  assert.match(app, /function showNearbyLocations\(\{ trayState = 'full', focus = true, preserveSelectedProfile = false \} = \{\}\)/);
  assert.match(app, /const preserveSelectedProfile = Boolean\(state\.selectedVenueId\) &&[\s\S]*?\(mobile \? state\.trayState === 'selected' : state\.detailMode\)/);
  assert.match(app, /showNearbyLocations\(\{[\s\S]*?trayState: nextTrayState,[\s\S]*?focus: true,[\s\S]*?preserveSelectedProfile[\s\S]*?\}\)/);
  assert.match(app, /if \(!preserveSelectedProfile\) state\.detailMode = false;/);
});
