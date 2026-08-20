import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [html, shellControls, commandCss, locationRefinement, app, appState, externalSearch, designSystem, designBoard] = await Promise.all([
  read('../index.html'),
  read('../js/shell-controls.mjs'),
  read('../css/mobile-command-navigation.css'),
  read('../js/mobile-tab-location-refinement.mjs'),
  read('../js/app.js'),
  read('../js/app-state.mjs'),
  read('../js/external-venue-search.js'),
  read('../css/design-system.css'),
  read('../css/design-board-1.css')
]);

test('desktop map toolbar contains Search without a standalone Nearby or Add shelf', () => {
  assert.match(html, /class="map-toolbar"[\s\S]*id="location-search"/);
  assert.doesNotMatch(html, /class="map-actions"|id="near-me-button"|id="desktop-add-location-button"|id="desktop-add-location-hint"/);
  assert.doesNotMatch(commandCss, /desktop-add-location|data-desktop-search-mode|\.map-toolbar \.map-actions/);
});

test('Locations owns one canonical fixed-position range toggle on desktop and mobile', () => {
  assert.match(html, /id="list-heading">Locations<\/h2>[\s\S]*id="list-location-toggle"[\s\S]*id="list-location-nearby"[\s\S]*>Near me<\/button>[\s\S]*id="list-location-all"[\s\S]*>All locations<\/button>/);
  assert.match(app, /function renderLocationControl\(\)[\s\S]*listLocationNearby\.setAttribute\('aria-pressed'[\s\S]*listLocationAll\.setAttribute\('aria-pressed'/);
  assert.match(app, /dom\.listLocationAll\.addEventListener\('click'[\s\S]*showAllLocations\(\)[\s\S]*dom\.listLocationNearby\.addEventListener\('click'[\s\S]*showNearbyLocations\(\)[\s\S]*navigator\.geolocation\.getCurrentPosition/);
  assert.doesNotMatch(app, /listLocationNearby\.textContent|listLocationAll\.textContent/);
  assert.doesNotMatch(locationRefinement, /near-me-button|ensureListLocationControl|handleListLocationClick|requestLocation/);
});

test('Show all preserves remembered coordinates and Locations browse ownership', () => {
  assert.match(appState, /nearbyOrigin: null/);
  assert.match(app, /function showAllLocations\(\)[\s\S]*rememberNearbyOrigin\(\)[\s\S]*state\.origin = null[\s\S]*state\.detailMode = false[\s\S]*setTrayState\('full'\)[\s\S]*renderAll\(\)/);
  assert.match(app, /function showNearbyLocations[\s\S]*state\.origin = \{ \.\.\.remembered \}[\s\S]*state\.detailMode = false[\s\S]*setTrayState\(trayState\)[\s\S]*renderAll\(\)/);
  assert.match(app, /!mobile && state\.selectedVenueId && !state\.detailMode && state\.trayState !== 'full'/);
});

test('Search exposes the exact persistent add-location footer and canonical mode copy', () => {
  assert.match(html, /id="search-add-location-button"[\s\S]*Not yet listed\? Add a location/);
  assert.match(shellControls, /function setSearchMode\(mode = 'existing',[\s\S]*state\.searchMode = mode/);
  assert.match(shellControls, /'Add a location'[\s\S]*'Search for the place you want to add\.'[\s\S]*'Search for the location to add'/);
  assert.match(shellControls, /function showAddLocationSearch\(\)[\s\S]*setSearchMode\('add-location'\)[\s\S]*setSurface\('search'/);
  assert.doesNotMatch(shellControls, /showDesktopAddLocation|setDesktopAddLocationMode/);
});

test('normal Search never starts MapTiler external search', () => {
  assert.match(appState, /searchMode: 'existing'/);
  assert.match(externalSearch, /function externalSearchAllowed\(\)[\s\S]*searchMode === 'add-location'[\s\S]*searchMode === 'contribution-external'/);
  assert.match(externalSearch, /if \(!externalSearchAllowed\(\) \|\| query\.length < MINIMUM_QUERY_LENGTH\)/);
  assert.match(externalSearch, /searchCurrentQuery: scheduleExternalSearch/);
});

test('one static owner provides the desktop Search focus treatment', () => {
  assert.doesNotMatch(designSystem, /\.search-field:focus-within/);
  assert.match(designBoard, /\.search-field:focus-within\s*\{[^}]*border-color: var\(--cgb-gold-500\);[^}]*box-shadow: 0 0 0 2px/);
  assert.doesNotMatch(commandCss, /data-desktop-search-mode[^}]*search-field/);
});

test('desktop Locations remains a canonical browse transition', () => {
  assert.match(app, /function showLocations\(\)[\s\S]*state\.detailMode = false[\s\S]*setTrayState\('full'\)[\s\S]*renderAll\(\)/);
  assert.match(shellControls, /function showList\(\)[\s\S]*CGBApp\?\.showLocations[\s\S]*CGBApp\.showLocations\(\)/);
});
