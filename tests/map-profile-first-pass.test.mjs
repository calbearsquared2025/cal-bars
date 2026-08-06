import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const profile = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const icons = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Map header is compact after statistics move into the Map', () => {
  assert.match(profile, /const MAP_HEADER_HEIGHT = 124/);
  assert.match(profile, /data-command-surface="map"[\s\S]*--header-height/);
  assert.match(profile, /grid-template-rows: 38px minmax\(0, 1fr\)/);
});

test('statistics are not restored on Search Add List or Detail', () => {
  assert.match(profile, /data-command-surface="search"[\s\S]*data-command-surface="add"[\s\S]*data-command-surface="list"/);
  assert.match(profile, /data-view="detail"[\s\S]*opening-stat/);
  assert.doesNotMatch(profile, /opening-stat[\s\S]*display: grid/);
});

test('List and Search behavior remain available without selected-tray ownership', () => {
  assert.match(profile, /function openListSurface/);
  assert.match(profile, /tray--full/);
  assert.match(profile, /search-field:focus-within/);
  assert.match(profile, /Search Cal Golden Bars or add another location to the map\./);
  assert.doesNotMatch(profile, /selected-card|selectedDensity|Plan a Watch Party/);
});

test('profile module remains loaded and adds no important rule', () => {
  assert.match(icons, /import '\.\/map-profile-first-pass\.mjs';/);
  assert.doesNotMatch(profile, /!important/);
});
