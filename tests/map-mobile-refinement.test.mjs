import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/map-mobile-refinement.mjs', import.meta.url), 'utf8');

test('selected venues focus the map with a tray-aware offset', () => {
  assert.match(source, /const FOCUS_ZOOM = 11/);
  assert.match(source, /zoom: Math\.max\(currentZoom, FOCUS_ZOOM\)/);
  assert.match(source, /trayHeight \* \.46/);
  assert.match(source, /offset: \[0, verticalOffset\]/);
});

test('the statistics strip is a Map-only floating composition', () => {
  assert.match(source, /function syncStatisticsPlacement/);
  assert.match(source, /mapView\.prepend\(statistics\)/);
  assert.match(source, /#map-view > \.opening-stat[\s\S]*position: absolute/);
  assert.match(source, /opening-stat__number[\s\S]*font-size: clamp\(2\.5rem, 11vw, 3rem\)/);
  assert.match(source, /statistics\.hidden = document\.body\.dataset\.view === 'detail' \|\|[\s\S]*isMobile\(\)[\s\S]*dataset\.commandSurface !== 'map'/);
  assert.doesNotMatch(source, /statisticsHome/);
});

test('preview follows the selected Venue before the nearby fallback', () => {
  assert.match(source, /function previewCandidate/);
  assert.match(source, /rankedVenue\(state, state\?\.selectedVenueId\)/);
  assert.match(source, /mode: 'selected'/);
  assert.match(source, /rankNearbyVenues/);
  assert.match(source, /schedulePreviewUpdate/);
});

test('compact and expanded are the only selected tray densities', () => {
  assert.match(source, /dataset\.selectedDensity = expanded \? 'expanded' : 'compact'/);
  assert.match(source, /dataset\.mapTrayDensity = expanded \? 'expanded' : 'compact'/);
  assert.match(source, /if \(delta < 0 && !selectedTrayExpanded\) setSelectedTrayDensity\(true\)/);
  assert.match(source, /if \(delta > 0 && selectedTrayExpanded\) setSelectedTrayDensity\(false\)/);
  assert.doesNotMatch(source, /setTrayState\('full'\)|applyTrayAction\('up'\)|applyTrayAction\('down'\)/);
});

test('compact tray body and handle expand without direct Detail navigation', () => {
  assert.match(source, /function handleSelectedTrayClick/);
  assert.match(source, /const card = event\.target\.closest\?\.\('\.selected-card'\)/);
  assert.match(source, /setSelectedTrayDensity\(true\)/);
  assert.doesNotMatch(source, /location\.href|location\.assign|buildVenueUrl/);
});

test('map controls share one size and stay below or away from the tray', () => {
  assert.match(source, /\.map-actions \{[\s\S]*z-index: 45/);
  assert.match(source, /data-map-tray-density="expanded"[\s\S]*\.map-actions[\s\S]*display: none/);
  assert.match(source, /map-actions #near-me-button,[\s\S]*maplibregl-ctrl button[\s\S]*min-height: 44px/);
  assert.match(source, /width: 104px[\s\S]*min-width: 104px[\s\S]*height: 44px/);
  assert.match(source, /border-radius: 12px/);
  assert.match(source, /box-shadow: 0 6px 18px/);
  assert.match(source, /removeZoomControls/);
});

test('the work package adds no important declaration', () => {
  assert.doesNotMatch(source, /!important/);
});
