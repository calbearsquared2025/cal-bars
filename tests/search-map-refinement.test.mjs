import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/search-map-refinement.mjs', root), 'utf8');
const shell = await readFile(new URL('js/shell-controls.mjs', root), 'utf8');
const external = await readFile(new URL('js/external-venue-search.js', root), 'utf8');
const app = await readFile(new URL('js/app.js', root), 'utf8');
const html = await readFile(new URL('index.html', root), 'utf8');
const firstPaintCss = await readFile(new URL('css/mobile-first-paint.css', root), 'utf8');
const supportCss = await readFile(new URL('css/support-dialog.css', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Search never displays a selected or Nearby mini tray', () => {
  assert.match(firstPaintCss, /data-command-surface="search"\] #map-view > #venue-tray\.venue-tray[\s\S]*display: none !important/);
  assert.doesNotMatch(source, /has-selected-venue/);
});

test('mobile Search handoff is owned by the shell instead of a second refinement state machine', () => {
  assert.doesNotMatch(source, /searchResultPending|PENDING_TIMEOUT_MS|handleSearchSubmit|handleSearchResultClick|mobile-map-button/);
  assert.match(shell, /let searchSubmissionPending = false/);
  assert.match(shell, /state\?\.searchMode !== 'add-location'/);
  assert.match(shell, /searchSubmissionPending = false;[\s\S]*configureMissingLocationLink\(\)/);
  assert.match(shell, /if \(isMobileLayout\(\)\)[\s\S]*trayState === 'full' && state\) state\.selectedVenueId = ''/);
  assert.match(shell, /trayState === 'full' && state\?\.listQuery\) showList\(\);[\s\S]*else showMap\(\)/);
});

test('normal Search submit stays with canonical app while external submit interception is Add Location only', () => {
  assert.match(app, /dom\.searchForm\.addEventListener\('submit'[\s\S]*runSearch\(query\)/);
  assert.match(external, /appState\.searchMode !== 'add-location'\) return/);
  assert.doesNotMatch(external, /mappedLocationFieldMatches|US_ZIP_PATTERN|renderSubmittedZip/);
});

test('canonical area geocoding is US-scoped and rejects explicit non-US results before map movement', () => {
  assert.match(app, /url\.searchParams\.set\('country', 'us'\)/);
  assert.match(app, /url\.searchParams\.set\('autocomplete', 'false'\)/);
  assert.match(app, /const explicitCountry = mapTilerCountryCode\(feature\)/);
  assert.match(app, /if \(explicitCountry && explicitCountry !== 'US'\) continue/);
  assert.match(app, /Number\.isFinite\(lon\)[\s\S]*Number\.isFinite\(lat\)/);
  assert.match(app, /throw new Error\('Location not found'\)/);
  assert.match(app, /state\.origin = await geocode\(normalizedQuery\)/);
  assert.match(app, /catch \(_\) \{\s*showStatus\('Location not found'\);\s*\}/);
});

test('desktop Add Location stays in the existing search form without a second action owner', () => {
  assert.match(source, /if \(button\.parentElement !== form\) form\.append\(button\)/);
  assert.match(source, /if \(button\.parentElement !== dropdown\) dropdown\.append\(button\)/);
  assert.match(source, /Don’t see it\? Add a location\./);
  assert.match(source, /No matching locations found\. Add a location\./);
  assert.match(source, /rankVenues\(state\.snapshot, state\.gameId, state\.origin, query\)/);
  assert.doesNotMatch(source, /MutationObserver|stopImmediatePropagation/);
});

test('desktop filtered list chrome labels Search results without taking ownership of range controls', () => {
  assert.match(source, /listEyebrow\.textContent = listQuery \? 'Search results' : 'Browse'/);
  assert.doesNotMatch(source, /listToggle|clearSearch/);
});

test('canonical range toggle replaces the legacy clear-search control and represents filtered state', () => {
  assert.doesNotMatch(html, /id="clear-search-button"/);
  assert.match(app, /const usingNearby = Boolean\(normalizedUserLocation\(state\.origin\)\)/);
  assert.match(app, /const filteringSearch = Boolean\(state\.listQuery \|\| \(state\.origin && !usingNearby\)\)/);
  assert.match(app, /const browsingAll = !usingNearby && !filteringSearch/);
  assert.match(app, /listLocationNearby\.setAttribute\('aria-pressed', String\(usingNearby\)\)/);
  assert.match(app, /listLocationAll\.setAttribute\('aria-pressed', String\(browsingAll\)\)/);
  assert.match(app, /if \(state\.origin \|\| state\.listQuery\) showAllLocations\(\)/);
  assert.doesNotMatch(app, /clearSearch|clearSearchResults/);
});

test('desktop search results and Add Location action form one connected stack', () => {
  assert.match(supportCss, /\.map-toolbar \.search-suggestions[\s\S]*position: static !important;[\s\S]*overflow-y: auto !important;/);
  assert.match(supportCss, /\.map-toolbar \.search-add-location-action:not\(\[hidden\]\)[\s\S]*width: 100%;[\s\S]*border-top: 0;/);
  assert.match(supportCss, /location-search:has\(\.search-add-location-action:not\(\[hidden\]\)\) \.search-field[\s\S]*clip-path: none !important/);
});

test('search refinement is loaded after the profile aesthetic layer', () => {
  assert.match(icons, /import '\.\/map-profile-aesthetic-refinement\.mjs';[\s\S]*import '\.\/search-map-refinement\.mjs';/);
});
