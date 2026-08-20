import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [html, shellControls, commandCss, mobilePolish, locationRefinement, app, appState] = await Promise.all([
  read('../index.html'),
  read('../js/shell-controls.mjs'),
  read('../css/mobile-command-navigation.css'),
  read('../js/mobile-polish.mjs'),
  read('../js/mobile-tab-location-refinement.mjs'),
  read('../js/app.js'),
  read('../js/app-state.mjs')
]);

test('desktop map toolbar separates Search, Near me, and Add location', () => {
  assert.match(html, /class="map-actions"[\s\S]*id="near-me-button"[\s\S]*id="desktop-add-location-button"[\s\S]*Add location[\s\S]*id="desktop-add-location-hint"/);
  assert.match(commandCss, /@media \(min-width: 900px\)[\s\S]*\.map-toolbar \.map-actions \{[\s\S]*position: static;[\s\S]*display: flex;/);
  assert.match(commandCss, /\.map-toolbar \.map-actions \.secondary-button \{[\s\S]*width: auto;[\s\S]*font-size: \.72rem;/);
  assert.doesNotMatch(commandCss.match(/@media \(min-width: 900px\)[\s\S]*/)?.[0] || '', /\.map-toolbar \.map-actions \{[\s\S]*position: absolute;/);
});

test('desktop Add location enters an explicit search mode instead of only focusing the field', () => {
  const desktopAddSource = shellControls.match(/function setDesktopAddLocationMode\(active\)[\s\S]*?function beginContribution/)?.[0] || '';
  assert.match(desktopAddSource, /dataset\.desktopSearchMode = 'add-location'/);
  assert.match(desktopAddSource, /desktopAddLocationButton\.setAttribute\('aria-pressed'/);
  assert.match(desktopAddSource, /desktopAddLocationHint\.hidden = !enabled/);
  assert.match(desktopAddSource, /Search for the location to add/);
  assert.match(desktopAddSource, /showStatus\('Search for the place you want to add\./);
  assert.match(desktopAddSource, /dom\.searchInput\?\.focus/);
  assert.doesNotMatch(desktopAddSource, /setSurface\('add'\)|showAdd\(/);
  assert.match(commandCss, /body\[data-desktop-search-mode="add-location"\] \.map-toolbar \.search-field/);
});

test('desktop rail keeps only Locations and Selected while mobile retains generic Add', () => {
  assert.match(commandCss, /@media \(min-width: 900px\)[\s\S]*\.mobile-command-bar \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(commandCss, /#mobile-search-button,[\s\S]*#mobile-add-button \{[\s\S]*display: none/);
  assert.match(html, /id="mobile-add-button"[\s\S]*data-command="add"[\s\S]*<span>Add<\/span>/);
  assert.match(shellControls, /document\.querySelector\('#mobile-add-button'\)\?\.addEventListener\('click', showAdd\)/);
});

test('desktop Locations presents nearby state and guidance as one compact browse header', () => {
  assert.match(html, /id="list-heading">Locations<\/h2>[\s\S]*class="tray-list__toolbar"[\s\S]*id="clear-search-button"[\s\S]*class="desktop-locations-guidance"[\s\S]*<strong>Find your Cal crowd<\/strong>[\s\S]*id="location-list"/);
  assert.match(commandCss, /\.venue-tray \.tray-list__header \{[\s\S]*background: var\(--cgb-white/);
  assert.match(commandCss, /#clear-search-button:not\(\[hidden\]\)[\s\S]*border-radius: 999px/);
  assert.match(commandCss, /content: attr\(data-proximity-label\)/);
  assert.match(shellControls, /dataset\.proximityLabel = `Nearby · within \$\{NEARBY_RADIUS_MILES\} miles`/);
  assert.match(shellControls, /clearSearchButton\.textContent = 'Show all'/);
});

test('desktop Show all can return to Nearby without requesting location again', () => {
  assert.match(appState, /nearbyOrigin: null/);
  assert.match(app, /function showAllLocations\(\)[\s\S]*rememberNearbyOrigin\(\)[\s\S]*state\.origin = null[\s\S]*state\.detailMode = false[\s\S]*setTrayState\('full'\)[\s\S]*renderAll\(\)/);
  assert.match(app, /function showNearbyLocations[\s\S]*state\.origin = \{ \.\.\.remembered \}[\s\S]*state\.detailMode = false[\s\S]*renderAll\(\)/);
  assert.match(app, /dom\.nearMe\.addEventListener\('click'[\s\S]*showNearbyLocations\(\)[\s\S]*navigator\.geolocation\.getCurrentPosition/);
  assert.match(locationRefinement, /function syncNearMeControl[\s\S]*state\?\.nearbyOrigin[\s\S]*'Show nearby'/);
  assert.doesNotMatch(locationRefinement, /handleDesktopClearSearchClick|rememberedLocation|locationFilterSuppressed/);
});

test('desktop Locations is a canonical browse transition that does not re-enter a retained Venue profile', () => {
  assert.match(app, /function showLocations\(\)[\s\S]*state\.detailMode = false[\s\S]*setTrayState\('full'\)[\s\S]*renderAll\(\)/);
  assert.match(app, /!mobile && state\.selectedVenueId && !state\.detailMode && state\.trayState !== 'full'/);
  assert.match(shellControls, /function showList\(\)[\s\S]*CGBApp\?\.showLocations[\s\S]*CGBApp\.showLocations\(\)/);
});

test('desktop browse heading is no longer overwritten by the mobile Nearby heading refinement', () => {
  const headingSource = mobilePolish.match(/function updateListHeading\(\)[\s\S]*?function normalizeSearchLabels/)?.[0] || '';
  assert.match(headingSource, /if \(!isMobile\(\)\) return;/);
  assert.match(shellControls, /dom\.listHeading\.textContent = 'Locations'/);
  assert.match(shellControls, /dom\.listEyebrow\.textContent = 'Browse'/);
});
