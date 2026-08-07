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

test('collapsed preview uses the selected Venue and otherwise returns to guidance', () => {
  assert.match(source, /function previewCandidate/);
  assert.match(source, /rankedVenue\(state, state\?\.selectedVenueId\)/);
  assert.match(source, /mode: 'selected'/);
  assert.doesNotMatch(source, /rankNearbyVenues/);
  assert.doesNotMatch(source, /mode: 'nearby'/);
  assert.match(source, /Find your Cal crowd/);
  assert.match(source, /Watch Parties first, then Cal Bars and Community Locations\./);
});

test('selected preview opens directly while guidance remains available to List', () => {
  assert.match(source, /function openPreviewVenue/);
  assert.match(source, /data-direct-venue-id/);
  assert.match(source, /if \(!button \|\| !isMobile\(\) \|\| !button\.dataset\.directVenueId\) return;[\s\S]*event\.preventDefault\(\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /card\.click\(\)/);
});

test('zero-count selected previews do not place long empty-state copy in the compact count slot', () => {
  assert.match(source, /count\.textContent = Number\(fanCount\) > 0 \? bearCountCopy\(fanCount\) : ''/);
});

test('selected tray density defaults compact and remains owned by the mobile map controller', () => {
  assert.match(source, /let selectedTrayExpanded = false/);
  assert.match(source, /state\.selectedVenueId !== lastSelectedVenueId[\s\S]*selectedTrayExpanded = false/);
  assert.match(source, /setSelectedTrayDensity\(selectedTrayExpanded\)/);
  assert.match(source, /selectedTrayExpanded = false;[\s\S]*lastSelectedVenueId = '';[\s\S]*card\.click\(\)/);
});

test('Search forces selected Venue compact while Map retains tray-top toggling', () => {
  assert.match(source, /dataset\.commandSurface === 'search'/);
  assert.match(source, /setSelectedTrayDensity\(false\)/);
  assert.match(source, /dataset\.commandSurface !== 'map'/);
});

test('attribution is placed left of the right-side map controls', () => {
  assert.match(source, /maplibregl-ctrl-bottom-right[\s\S]*left: 8px !important/);
  assert.match(source, /attribution\.style\.left = '8px'/);
  assert.match(source, /attribution\.style\.right = 'auto'/);
});
