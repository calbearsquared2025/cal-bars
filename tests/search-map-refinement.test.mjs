import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/search-map-refinement.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Search never displays a selected or Nearby mini tray', () => {
  assert.match(source, /data-command-surface="search"\] #map-view > #venue-tray\.venue-tray[\s\S]*display: none !important/);
  assert.match(source, /has-selected-venue \.command-surface:not\(\[hidden\]\)[\s\S]*bottom: var\(--footer-height\) !important/);
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

test('search refinement is loaded after the profile aesthetic layer', () => {
  assert.match(icons, /import '\.\/map-profile-aesthetic-refinement\.mjs';[\s\S]*import '\.\/search-map-refinement\.mjs';/);
});
