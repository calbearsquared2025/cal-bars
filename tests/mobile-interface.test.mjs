import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
const appState = await readFile(new URL('../js/app-state.mjs', import.meta.url), 'utf8');

test('interface uses the normalized v2 JSON fallback instead of the public CSV', () => {
  assert.match(app, /data\/fallback-v2\.json/);
  assert.doesNotMatch(html, /papaparse/i);
  assert.doesNotMatch(html, /output=csv|docs\.google\.com\/spreadsheets/i);
});

test('mobile shell includes game selection, map, search, and tray states', () => {
  assert.match(html, /id="game-dialog"/);
  assert.match(html, /id="map"/);
  assert.match(html, /id="location-search"/);
  assert.match(html, /id="venue-tray"/);
  assert.match(css, /tray--peek/);
  assert.match(css, /tray--selected/);
  assert.match(css, /tray--full/);
});

test('tray handle is a keyboard button and controls all tray surfaces', () => {
  assert.match(html, /id="tray-handle"[^>]*type="button"/);
  assert.match(html, /aria-controls="tray-peek tray-selected tray-list"/);
  assert.match(app, /trayHandle\.addEventListener\('click'/);
  assert.match(app, /trayHandle\.addEventListener\('pointercancel'/);
  assert.match(app, /resolveTrayState\(state\.trayState, action/);
  assert.match(css, /--tray-handle-height:\s*44px/);
});

test('selected mobile tray is content-sized with a viewport-relative cap', () => {
  assert.match(css, /\.tray--selected\s*\{[^}]*height:\s*auto/);
  assert.match(css, /\.tray--selected\s*\{[^}]*max-height:\s*var\(--selected-tray-max-height\)/);
  assert.match(css, /\.tray--selected \.tray-selected\s*\{[^}]*height:\s*auto[^}]*max-height:/);
  assert.doesNotMatch(css, /\.tray--selected\s*\{[^}]*height:\s*min\(/);
});

test('full-list tray remains a distinct fixed-height state', () => {
  assert.match(css, /\.tray--full\s*\{[^}]*height:\s*min\(78dvh, 680px\)/);
  assert.match(css, /\.tray--full \.tray-list\s*\{[^}]*height:\s*calc\(100% - var\(--tray-handle-height\)\)/);
});

test('tray measurement uses layout observation instead of CSS-duration timeout coupling', () => {
  assert.match(app, /new ResizeObserver/);
  assert.match(app, /trayResizeObserver\.observe\(dom\.tray\)/);
  assert.doesNotMatch(app, /TRAY_TRANSITION_FALLBACK_MS/);
  assert.doesNotMatch(app, /transitionend/);
  assert.doesNotMatch(app, /venueVisibilityTimer/);
});

test('search state separates active list filtering from visible input text', () => {
  assert.match(appState, /listQuery:\s*''/);
  assert.match(app, /function renderLocationList\(query = state\.listQuery\)/);
  assert.match(app, /findExactVenueMatch\(mappedMatches\.map/);
  assert.match(app, /if \(mappedMatches\.length && !queryMatchesMappedLocationField\(normalizedQuery\)\) \{/);
  assert.match(app, /function showAllLocations\(\)/);
  assert.match(app, /if \(state\.origin \|\| state\.listQuery\) showAllLocations\(\)/);
  assert.doesNotMatch(app, /function clearSearchResults\(\)/);
  assert.doesNotMatch(app, /function renderLocationList\(query = dom\.searchInput\.value\)/);
  assert.doesNotMatch(app, /rankVenues\(state\.snapshot, state\.gameId, state\.origin, normalized\)\[0\]/);
});

test('geocoded and Near me results use a 25-mile boundary', () => {
  assert.match(app, /NEARBY_RADIUS_MILES/);
  assert.match(app, /rankNearbyVenues\(state\.snapshot, state\.gameId, state\.origin\)/);
  assert.match(app, /within \${NEARBY_RADIUS_MILES} miles/);
  assert.match(app, /No listed Cal gathering locations within \${NEARBY_RADIUS_MILES} miles\./);
  assert.match(app, /Try another city or ZIP, or choose All locations/);
  assert.match(app, /queryMatchesMappedLocationField/);
  assert.match(app, /renderMarkers\(\);[\s\S]*setTrayState\('full'\)/);
});

test('compact footer keeps the requested affiliation line and social handle', () => {
  assert.match(html, /Not affiliated with Cal Athletics/);
  assert.match(html, /https:\/\/x\.com\/calbearsquared/);
  assert.match(html, />@calbearsquared<\/a>/);
  assert.match(css, /--footer-height:\s*calc\(26px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /\.site-footer\s*\{[^}]*flex-wrap:\s*nowrap[^}]*font-size:\s*\.68rem[^}]*white-space:\s*nowrap/);
  assert.doesNotMatch(css, /\.site-footer\s*\{[^}]*overflow:\s*hidden/);
});

test('custom venue markers retain MapLibre absolute positioning', () => {
  assert.match(css, /\.cgb-marker\s*\{[^}]*position:\s*absolute/);
  assert.doesNotMatch(css, /\.cgb-marker\s*\{[^}]*position:\s*relative/);
});

test('marker counts and accessible labels retain the approved Bear-count copy', () => {
  assert.match(app, /badge\.textContent = bearCountCopy\(count\)/);
  assert.match(app, /button\.setAttribute\('aria-label', `\$\{venue\.name\}[^`]*\$\{bearCountCopy\(count\)\}`\)/);
});

test('every rendered list and detail current-game count has explicit Bear meaning', () => {
  assert.match(app, /countLine\.textContent = bearCountCopy\(count\)/);
  assert.match(app, /count\.textContent = bearCountCopy\(fanCount\)/);
  assert.match(app, /renderDetailAttendanceCopy\(current, activityPresentation\.primary\)/);
  assert.doesNotMatch(app, /count\.textContent = String\(fanCount\)/);
});

test('Watch Party and allowed venue badges render through shared descriptors', () => {
  assert.match(app, /venueBadgeDescriptors\(venue, party\)/);
  assert.match(css, /\.venue-badges/);
});

test('selected markers use actual viewport obstructions and preserve zoom', () => {
  const panBlock = app.match(/function panToVenue\(venue\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(app, /dom\.tray\.getBoundingClientRect\(\)/);
  assert.match(app, /calculateMinimalPan\(\{ point, viewport, insets \}\)/);
  assert.match(panBlock, /const currentZoom = state\.map\.getZoom\(\)/);
  assert.match(panBlock, /zoom: currentZoom/);
  assert.doesNotMatch(panBlock, /Math\.max\(state\.map\.getZoom\(\), 12\)/);
  assert.doesNotMatch(panBlock, /center: \[Number\(venue\.longitude\), Number\(venue\.latitude\)\]/);
});

test('venue details and sharing preserve game context through stable query URLs', () => {
  assert.match(app, /buildVenueUrl/);
  assert.match(html, /id="detail-view"/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /navigator\.clipboard/);
});

test('sharing includes native, Clipboard, legacy-copy, and selectable manual states', () => {
  assert.match(app, /navigator\.canShare/);
  assert.match(app, /shareOrCopy/);
  assert.match(app, /document\.execCommand\('copy'\)/);
  assert.match(app, /showManualCopy/);
  assert.match(app, /input\.readOnly = true/);
  assert.match(css, /\.manual-copy-panel/);
});

test('deferred external search and contribution features are not implemented', () => {
  assert.match(app, /intent\.disabled = true/);
  assert.doesNotMatch(html, /Add a Photo|photo upload/i);
  assert.doesNotMatch(app, /joinExternalVenue|externalPlace|createCommunityLocation/);
});

test('preview copy does not expose internal milestone numbering to users', () => {
  assert.doesNotMatch(html, /read-only milestone|later milestones/i);
  assert.doesNotMatch(app, /Milestone 3|later milestones/i);
  assert.match(app, /intent\.textContent = 'I’ll be here'/);
  assert.doesNotMatch(app, /check-ins are coming soon|Preview: check-ins/i);
});

test('responsive desktop layout retains the same application', () => {
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.doesNotMatch(css, /grid-template-columns: minmax\(0, 1fr\) 410px/);
  assert.doesNotMatch(css, /\.map\s*\{[^}]*grid-column:\s*1/);
});
