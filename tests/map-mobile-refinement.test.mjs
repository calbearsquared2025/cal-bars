import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/map-mobile-refinement.mjs', import.meta.url), 'utf8');

test('selected venues focus the map at city scale with tray-aware offset', () => {
  assert.match(source, /const FOCUS_ZOOM = 11/);
  assert.match(source, /zoom: Math\.max\(currentZoom, FOCUS_ZOOM\)/);
  assert.match(source, /offset: \[0, verticalOffset\]/);
});

test('zoom controls are removed and hidden', () => {
  assert.match(source, /maplibregl-ctrl-top-right/);
  assert.match(source, /maplibregl-ctrl-zoom-in/);
  assert.match(source, /button\.remove\(\)/);
});

test('preview follows the selected Venue before the ranked nearby fallback', () => {
  assert.match(source, /function previewCandidate/);
  assert.match(source, /rankedVenue\(state, state\?\.selectedVenueId\)/);
  assert.match(source, /rankNearbyVenues/);
  assert.match(source, /NEARBY_RADIUS_MILES/);
  assert.match(source, /mode: 'selected'/);
  assert.match(source, /mode: 'nearby'/);
});

test('Nearby venue opens the selected tray directly instead of routing through List', () => {
  assert.match(source, /function openPreviewVenue/);
  assert.match(source, /data-direct-venue-id/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /card\.click\(\)/);
});

test('selected venues default compact and Map retains tray-top toggling', () => {
  assert.match(source, /let selectedTrayExpanded = false/);
  assert.match(source, /state\.selectedVenueId !== lastSelectedVenueId[\s\S]*selectedTrayExpanded = false/);
  assert.match(source, /dataset\.commandSurface === 'search'/);
  assert.match(source, /setSelectedTrayDensity\(false\)/);
  assert.match(source, /dataset\.commandSurface !== 'map'/);
  assert.match(source, /setSelectedTrayDensity\(!selectedTrayExpanded\)/);
});

test('map interactions use one delegated document click listener', () => {
  assert.match(source, /function handleDocumentClick\(event\)/);
  assert.match(source, /document\.addEventListener\('click', handleDocumentClick, \{ capture: true \}\)/);
  assert.equal((source.match(/document\.addEventListener\('click'/g) || []).length, 1);
});

test('attribution is placed left of the right-side map controls', () => {
  assert.match(source, /maplibregl-ctrl-bottom-right[\s\S]*left: 8px !important/);
  assert.match(source, /attribution\.style\.left = '8px'/);
  assert.match(source, /attribution\.style\.right = 'auto'/);
});
