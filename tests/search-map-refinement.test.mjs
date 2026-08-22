import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/search-map-refinement.mjs', root), 'utf8');
const firstPaintCss = await readFile(new URL('css/mobile-first-paint.css', root), 'utf8');
const supportCss = await readFile(new URL('css/support-dialog.css', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Search never displays a selected or Nearby mini tray', () => {
  assert.match(firstPaintCss, /data-command-surface="search"\] #map-view > #venue-tray\.venue-tray[\s\S]*display: none !important/);
  assert.doesNotMatch(source, /has-selected-venue/);
});

test('submitted searches and existing CGB result clicks are tracked as map-return actions', () => {
  assert.match(source, /handleSearchSubmit/);
  assert.match(source, /#location-search/);
  assert.match(source, /handleSearchResultClick/);
  assert.match(source, /#search-suggestions button\[data-venue-id\]/);
  assert.match(source, /PENDING_TIMEOUT_MS = 8000/);
});

test('selected results preserve the selection while area and multi-match results clear stale selections', () => {
  assert.match(source, /trayState !== 'selected' && trayState !== 'full'/);
  assert.match(source, /if \(trayState === 'full' && state\) state\.selectedVenueId = ''/);
  assert.match(source, /mobile-map-button/);
  assert.match(source, /CGBApp\?\.render/);
});

test('desktop Add Location stays in the existing search form without a second action owner', () => {
  assert.match(source, /if \(button\.parentElement !== form\) form\.append\(button\)/);
  assert.match(source, /if \(button\.parentElement !== dropdown\) dropdown\.append\(button\)/);
  assert.match(source, /Don’t see it\? Add a location\./);
  assert.match(source, /No matching locations found\. Add a location\./);
  assert.match(source, /rankVenues\(state\.snapshot, state\.gameId, state\.origin, query\)/);
  assert.doesNotMatch(source, /MutationObserver|stopImmediatePropagation/);
});

test('desktop filtered list chrome distinguishes Search results from All locations', () => {
  assert.match(source, /listToggle\.hidden = Boolean\(listQuery\)/);
  assert.match(source, /clearSearch\.textContent = listQuery \? 'Clear search' : 'All locations'/);
  assert.match(source, /listEyebrow\.textContent = listQuery \? 'Search results' : 'Browse'/);
});

test('desktop search results and Add Location action form one connected stack', () => {
  assert.match(supportCss, /\.map-toolbar \.search-suggestions[\s\S]*position: static !important;[\s\S]*overflow-y: auto !important;/);
  assert.match(supportCss, /\.map-toolbar \.search-add-location-action:not\(\[hidden\]\)[\s\S]*width: 100%;[\s\S]*border-top: 0;/);
  assert.match(supportCss, /location-search:has\(\.search-add-location-action:not\(\[hidden\]\)\) \.search-field[\s\S]*clip-path: none !important/);
});

test('search refinement is loaded after the profile aesthetic layer', () => {
  assert.match(icons, /import '\.\/map-profile-aesthetic-refinement\.mjs';[\s\S]*import '\.\/search-map-refinement\.mjs';/);
});
