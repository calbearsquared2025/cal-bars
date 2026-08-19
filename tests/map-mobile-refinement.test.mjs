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

test('collapsed preview prefers selected Venue then the physically nearest nearby Venue', () => {
  assert.match(source, /function nearestNearbyVenue/);
  assert.match(source, /rankVenues\(state\.snapshot, state\.gameId, state\.origin\)\.reduce/);
  assert.match(source, /distance > NEARBY_RADIUS_MILES/);
  assert.match(source, /distance < Number\(nearest\.distance\)/);
  assert.match(source, /rankedVenue\(state, state\?\.selectedVenueId\)/);
  assert.match(source, /mode: 'selected'/);
  assert.match(source, /mode: 'nearby'/);
});

test('collapsed preview labels reflect selection and location context without a Nearby first-paint flash', () => {
  assert.match(source, /eyebrow\.textContent = usingLocation \? 'Near you' : 'Explore'/);
  assert.match(source, /eyebrow\.textContent = mode === 'selected' \? 'Selected' : 'Near you'/);
  assert.match(source, /title\.textContent = usingLocation \? 'No nearby locations' : 'Find your Cal crowd'/);
  assert.match(source, /copy\.textContent = usingLocation[\s\S]*No mapped locations within/);
  assert.match(source, /copy\.textContent = \[type, compactVenueLocation\(venue\), formatDistance\(distance\)\]/);
  assert.match(firstPaintCss, /#browse-locations-button:not\(\[data-preview-mode\]\) \.eyebrow[\s\S]*font-size: 0 !important/);
  assert.match(firstPaintCss, /#browse-locations-button:not\(\[data-preview-mode\]\) \.eyebrow::after[\s\S]*content: "EXPLORE"/);
  assert.match(html, new RegExp(TRAY_GUIDANCE_COPY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('nearest location preview highlights the matching map marker without selecting it', () => {
  assert.match(source, /function syncNearbyPreviewMarker/);
  assert.match(source, /candidate\?\.mode === 'nearby'/);
  assert.match(source, /marker\.classList\.toggle\('is-nearby-preview'/);
  assert.match(source, /syncNearbyPreviewMarker\(candidate\)/);
  assert.match(source, /\.cgb-marker\.is-nearby-preview \.marker-pin/);
  assert.match(source, /\.cgb-marker\.is-nearby-preview \.marker-star/);
  assert.match(source, /drop-shadow\(0 0 5px rgba\(253,181,21,\.78\)\)/);
});

test('selected mini profile opens the existing full selected profile directly', () => {
  assert.match(source, /function openPreviewVenue/);
  assert.match(source, /data-direct-venue-id/);
  assert.match(source, /if \(!button \|\| !isMobile\(\) \|\| !button\.dataset\.directVenueId\) return;[\s\S]*event\.preventDefault\(\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /card\.click\(\)/);
});

test('empty map clicks deselect the current Venue without intercepting markers or controls', () => {
  assert.match(source, /import \{ clearSelectedMapVenue \} from '\.\/app-state\.mjs'/);
  assert.match(source, /function handleMapDeselect/);
  assert.match(source, /event\.target\.closest\?\.\('#map'\)/);
  assert.match(source, /\.cgb-marker, \.maplibregl-control-container, \.maplibregl-ctrl/);
  assert.match(source, /if \(!clearSelectedMapVenue\(\)\) return/);
  assert.match(source, /window\.CGBApp\?\.render\?\.\(\)/);
  assert.match(source, /document\.addEventListener\('click', handleMapDeselect\)/);
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
