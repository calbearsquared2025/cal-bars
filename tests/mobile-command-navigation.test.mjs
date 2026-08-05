import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('mobile primary navigation is Map, Search, Add, List', async () => {
  const html = await source('index.html');
  const mapIndex = html.indexOf('<span>Map</span>');
  const searchIndex = html.indexOf('<span>Search</span>');
  const addIndex = html.indexOf('<span>Add</span>');
  const listIndex = html.indexOf('<span>List</span>');
  assert.ok(mapIndex >= 0 && mapIndex < searchIndex && searchIndex < addIndex && addIndex < listIndex);
  assert.doesNotMatch(html, /id="mobile-game-button"/);
});

test('search and add are dedicated mobile surfaces', async () => {
  const html = await source('index.html');
  assert.match(html, /id="search-surface"/);
  assert.match(html, /id="search-surface-form-slot"/);
  assert.match(html, /Search Cal Golden Bars or find another place to add to the map/);
  assert.match(html, /id="add-surface"/);
  assert.match(html, /Plan a Watch Party/);
  assert.match(html, /Nominate a Cal Bar/);
  assert.match(html, /Report a problem/);
});

test('mobile styling removes the permanent map search and presents full command surfaces', async () => {
  const css = await source('css/mobile-command-navigation.css');
  assert.match(css, /\.map-toolbar \.location-search\s*\{\s*display: none;/);
  assert.match(css, /\.command-surface:not\(\[hidden\]\)[\s\S]*position: fixed;/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.mobile-command__add-mark/);
});

test('navigation delegates to existing search, tray, and contribution contracts', async () => {
  const script = await source('js/shell-controls.mjs');
  assert.match(script, /buildWatchPartyPrefillUrl/);
  assert.match(script, /buildCalBarNominationPrefillUrl/);
  assert.match(script, /buildListingUpdatePrefillUrl/);
  assert.match(script, /buildMissingLocationFormUrl/);
  assert.match(script, /dom\.searchSlot\.append\(dom\.searchForm\)/);
  assert.match(script, /dom\.trayHandle\?\.click\(\)/);
  assert.doesNotMatch(script, /MutationObserver/);
});
