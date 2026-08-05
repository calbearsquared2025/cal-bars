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

test('Nearby is a shorter edge-anchored guidance sheet', () => {
  assert.match(source, /tray--peek[\s\S]*inset: auto 0 0 0 !important/);
  assert.match(source, /height: 92px !important/);
  assert.match(source, /border-radius: 22px 22px 0 0 !important/);
});

test('Nearby begins as guidance and only opens a Venue after Locate Me', () => {
  assert.match(source, /if \(!state\?\.origin\)/);
  assert.match(source, /Tap a map pin or use Locate Me to find the nearest Cal Bar or Watch Party/);
  assert.match(source, /button\.dataset\.previewMode = 'guidance'/);
  assert.match(source, /button\.dataset\.previewMode = 'venue'/);
  assert.match(source, /button\.removeAttribute\('data-direct-venue-id'\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /if \(!button\.dataset\.directVenueId\) return/);
});

test('selected tray top toggles expanded and compact views without opening List', () => {
  assert.match(source, /data-selected-density="compact"/);
  assert.match(source, /height: 170px !important/);
  assert.match(source, /function handleTrayTopTap/);
  assert.match(source, /setSelectedTrayDensity\(!selectedTrayExpanded\)/);
  assert.match(source, /Collapse selected location/);
  assert.match(source, /Expand selected location/);
});

test('selected card collapse icon is removed in favor of the tray-top interaction', () => {
  assert.match(source, /selected-card__header > \.icon-button/);
  assert.match(source, /display: none !important/);
});

test('attribution follows the visible tray instead of creating layout space', () => {
  assert.match(source, /function positionAttribution/);
  assert.match(source, /attribution\.style\.bottom/);
});
