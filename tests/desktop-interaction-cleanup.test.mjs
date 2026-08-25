import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [html, shellControls, commandCss, mobilePolishCss, locationRefinement, app, appState, externalSearch, designSystem, designBoard] = await Promise.all([
  read('../index.html'),
  read('../js/shell-controls.mjs'),
  read('../css/mobile-command-navigation.css'),
  read('../css/mobile-polish.css'),
  read('../js/mobile-tab-location-refinement.mjs'),
  read('../js/app.js'),
  read('../js/app-state.mjs'),
  read('../js/external-venue-search.js'),
  read('../css/design-system.css'),
  read('../css/design-board-1.css')
]);

test('desktop map toolbar contains Search while the legacy map action shelf remains globally hidden', () => {
  assert.match(html, /class="map-toolbar"[\s\S]*id="location-search"/);
  assert.match(html, /class="map-actions"[\s\S]*id="near-me-button"/);
  assert.match(mobilePolishCss, /\.map-actions\s*\{\s*display:\s*none;\s*\}/);
  assert.doesNotMatch(html, /id="desktop-add-location-button"|id="desktop-add-location-hint"/);
  assert.doesNotMatch(commandCss, /desktop-add-location|data-desktop-search-mode|\.map-toolbar \.map-actions/);
});

test('Locations owns one canonical fixed-position range toggle on desktop and mobile', () => {
  assert.match(html, /id="tray-list"[\s\S]*id="list-heading">Find your Cal crowd<\/h2>[\s\S]*id="list-location-toggle"[\s\S]*id="list-location-nearby"[\s\S]*>Near me<\/button>[\s\S]*id="list-location-all"[\s\S]*>All locations<\/button>/);
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

test('Search exposes contextual another-location copy and canonical mode behavior', () => {
  assert.match(html, /id="search-add-location-button"[^>]*>Watching somewhere else\? <strong>Search for another location\.<\/strong>/);
  assert.match(shellControls, /function setSearchMode\(mode = 'existing',[\s\S]*state\.searchMode = mode/);
  assert.match(shellControls, /'Search for another location'[\s\S]*'Find a place that isn’t listed in Cal Golden Bars yet\.'[\s\S]*'Venue or address'/);
  assert.match(shellControls, /function showAddLocationSearch\(\)[\s\S]*setSearchMode\('add-location'\)[\s\S]*setSurface\('search'/);
  assert.doesNotMatch(shellControls, /showDesktopAddLocation|setDesktopAddLocationMode/);
});

test('desktop Search keeps results compact and the another-location action in a footer row when shown', () => {
  const desktopRules = commandCss.match(/@media \(min-width: 900px\) \{[\s\S]*$/)?.[0] ?? '';

  assert.match(desktopRules, /\.map-toolbar \.search-field\s*\{[^}]*grid-template-columns: 16px minmax\(0, 1fr\) auto;[^}]*background: var\(--cgb-navy-50, #eef3f8\);[^}]*border: 2px solid var\(--cgb-navy-800, #0b2856\);[^}]*box-shadow: 0 8px 20px rgba\(1, 1, 51, \.2\);[^}]*clip-path: none;/);
  assert.match(desktopRules, /\.map-toolbar \.search-field:focus-within\s*\{[^}]*border-color: var\(--cgb-gold-500, #fdb515\);/);
  assert.match(desktopRules, /\.map-toolbar \.search-field input\s*\{[^}]*color: var\(--cgb-navy-950, #010133\);[^}]*font-weight: 600;/);
  assert.match(desktopRules, /\.map-toolbar \.search-submit\s*\{[^}]*background: var\(--cgb-navy-800, #0b2856\);[^}]*clip-path: none;/);
  assert.match(desktopRules, /\.map-toolbar \.search-suggestions\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\) auto;[^}]*max-height: min\(40dvh, 286px\);[^}]*overflow: hidden;/);
  assert.match(desktopRules, /\.map-toolbar \.search-suggestion-results\s*\{[^}]*overflow-y: auto;/);
  assert.match(desktopRules, /\.map-toolbar #search-suggestions button\s*\{[^}]*min-height: 42px;[^}]*padding: 7px 9px;/);
  assert.match(desktopRules, /\.map-toolbar \.search-add-location-action\s*\{[^}]*min-height: 30px;[^}]*padding: 5px 9px;[^}]*border-top: 1px solid var\(--cgb-neutral-200, #dfe3e8\);[^}]*font-size: \.68rem;[^}]*font-weight: 400;/);
  assert.match(desktopRules, /\.map-toolbar \.search-add-location-action strong\s*\{[^}]*font-weight: 700;/);
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

test('desktop Selected restores the canonical Venue Profile after Locations', () => {
  assert.match(app, /function showSelectedVenue\(\)[\s\S]*if \(!state\.selectedVenueId\)[\s\S]*if \(isMobileLayout\(\)\)[\s\S]*state\.detailMode = true[\s\S]*setTrayState\('selected'\)[\s\S]*updateRouteForGame\(\)[\s\S]*renderAll\(\)/);
  assert.match(app, /dom\.closeList\.addEventListener\('click', showSelectedVenue\)/);
  assert.match(shellControls, /function showMap\(\)[\s\S]*dom\.closeList\?\.click\(\)/);
  assert.match(app, /function placeVenueProfile\(mobile\)[\s\S]*dom\.traySelected\.replaceChildren\(dom\.venueDetail\)/);
});