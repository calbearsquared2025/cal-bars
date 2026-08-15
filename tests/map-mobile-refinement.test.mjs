import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { TRAY_GUIDANCE_COPY } from '../js/core.mjs';

const source = await readFile(new URL('../js/map-mobile-refinement.mjs', import.meta.url), 'utf8');
const firstPaintCss = await readFile(new URL('../css/mobile-first-paint.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('selected venues focus the map at city scale with tray-aware offset', () => {
  assert.match(source, /const FOCUS_ZOOM = 11/);
  assert.match(source, /zoom: Math\.max\(currentZoom, FOCUS_ZOOM\)/);
  assert.match(source, /offset: \[0, verticalOffset\]/);
  assert.match(source, /locationFocusVenueId === state\.selectedVenueId/);
});

test('zoom controls are removed and hidden', () => {
  assert.match(firstPaintCss, /maplibregl-ctrl-top-right[\s\S]*display: none !important/);
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
  assert.match(source, /copy\.textContent = TRAY_GUIDANCE_COPY/);
  assert.match(html, new RegExp(TRAY_GUIDANCE_COPY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('selected mini profile opens the existing full selected profile directly', () => {
  assert.match(source, /function openPreviewVenue/);
  assert.match(source, /data-direct-venue-id/);
  assert.match(source, /if \(!button \|\| !isMobile\(\) \|\| !button\.dataset\.directVenueId\) return;[\s\S]*event\.preventDefault\(\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /card\.click\(\)/);
});

test('zero-count selected previews do not place long empty-state copy in the mini count slot', () => {
  assert.match(source, /count\.textContent = Number\(fanCount\) > 0 \? bearCountCopy\(fanCount\) : ''/);
});

test('selected tray toggles from the full profile directly to the existing mini profile', () => {
  assert.match(source, /function handleTrayTopTap/);
  assert.match(source, /tray\.dataset\.state !== 'selected'/);
  assert.match(source, /selected-card__header > \.icon-button'\)\?\.click\(\)/);
  assert.match(source, /Collapse selected location/);
  assert.doesNotMatch(source, /selectedTrayExpanded|lastSelectedVenueId|setSelectedTrayDensity|selectedDensity|data-selected-density/);
});

test('selected profile uses content-driven height rather than a medium fixed-height override', () => {
  assert.doesNotMatch(source, /tray--selected\[data-selected-density/);
  assert.doesNotMatch(source, /height: 170px !important/);
  assert.doesNotMatch(source, /max-height: 170px !important/);
});

test('attribution is placed left of the right-side map controls', () => {
  assert.match(firstPaintCss, /maplibregl-ctrl-bottom-right[\s\S]*left: 8px !important/);
  assert.match(source, /attribution\.style\.left = '8px'/);
  assert.match(source, /attribution\.style\.right = 'auto'/);
});
