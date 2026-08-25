import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/map-zoom-coordination.mjs', root), 'utf8');
const loader = await readFile(new URL('js/final-functional-stabilization.mjs', root), 'utf8');

test('MapLibre zoom controls are intercepted before the native control starts a separate camera ease', () => {
  assert.match(source, /\.maplibregl-ctrl-zoom-in, \.maplibregl-ctrl-zoom-out/);
  assert.match(source, /document\.addEventListener\('click', handleZoomControlClick, \{ capture: true \}\)/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
});

test('selected Venue zoom keeps the existing tray-aware marker position in the same camera transition', () => {
  assert.match(source, /const around = venueId \? selectedVenueCoordinates\(state\) : null/);
  assert.match(source, /if \(around\) options\.around = around/);
  assert.match(source, /easeTo\.call\(map, options\)/);
  assert.doesNotMatch(source, /panTo|flyTo/);
});

test('zoom controls use a short transition and preserve reduced-motion behavior', () => {
  assert.match(source, /const ZOOM_CONTROL_DURATION_MS = 220/);
  assert.match(source, /const duration = reducedMotion\(\) \? 0 : ZOOM_CONTROL_DURATION_MS/);
  assert.match(source, /prefers-reduced-motion: reduce/);
});

test('rapid zoom clicks accumulate one target instead of queueing independent camera jumps', () => {
  assert.match(source, /pendingTargetMap === map && Number\.isFinite\(pendingTargetZoom\)/);
  assert.match(source, /const targetZoom = clampZoom\(map, baseZoom \+ delta\)/);
  assert.match(source, /pendingTargetZoom = targetZoom/);
  assert.match(source, /resetPendingZoomTarget/);
});

test('selected-Venue visibility correction is suppressed only during the matching zoom interaction', () => {
  assert.match(source, /state\?\.selectedVenueId !== suppressionVenueId/);
  assert.match(source, /options\.offset != null \|\| options\.around != null \|\| options\.padding != null/);
  assert.match(source, /Math\.abs\(requestedZoom - currentZoom\) > ZOOM_MATCH_EPSILON/);
  assert.match(source, /Date\.now\(\) <= suppressionExpiresAt/);
  assert.match(source, /return originalEaseTo\.call\(this, options, \.\.\.args\)/);
});

test('camera coordination is loaded through the existing refinement bootstrap', () => {
  assert.match(loader, /^import '\.\/map-zoom-coordination\.mjs';/);
});
