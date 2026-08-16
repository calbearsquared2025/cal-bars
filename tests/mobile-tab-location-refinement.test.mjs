import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/mobile-tab-location-refinement.mjs', root), 'utf8');
const firstPaintCss = await readFile(new URL('css/mobile-first-paint.css', root), 'utf8');
const app = await readFile(new URL('js/app.js', root), 'utf8');
const iconUpgrade = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');
const icons = await readFile(new URL('assets/icons.svg', root), 'utf8');

test('Search Add and List hide the map and Search does not show a selected tray', () => {
  assert.match(source, /data-command-surface="search"[\s\S]*#map[\s\S]*visibility: hidden !important/);
  assert.match(source, /data-command-surface="add"[\s\S]*#map[\s\S]*visibility: hidden !important/);
  assert.match(source, /data-command-surface="list"[\s\S]*#map[\s\S]*visibility: hidden !important/);
  assert.match(source, /data-command-surface="search"[\s\S]*#venue-tray[\s\S]*display: none !important/);
});

test('Search Add and List use compact spacing below the shared branded header', () => {
  assert.match(source, /@media \(max-width: 899px\) and \(orientation: portrait\)[\s\S]*data-command-surface="search"[\s\S]*data-command-surface="add"[\s\S]*padding-top: 18px !important[\s\S]*data-command-surface="list"[\s\S]*padding-top: 16px !important/);
});

test('mobile tab refinement does not override the accepted desktop selected-profile actions', () => {
  assert.doesNotMatch(source, /@media \(min-width: 900px\)/);
  assert.doesNotMatch(source, /selected-card__details/);
});

test('Add does not duplicate selected-game context and makes Cal Bar nomination contextual', () => {
  assert.doesNotMatch(source, /add-game-context|Current game|gameTitle\(|formatKickoff\(/);
  assert.match(source, /function syncCalBarNominationAction/);
  assert.match(source, /venue\.venue_type === 'community_location'/);
  assert.match(source, /button\.hidden = !canNominate/);
  assert.match(source, /Nominate as a Cal Bar/);
  assert.match(source, /regular Cal gathering place/);
  assert.match(source, /assets\/icons\.svg#icon-cal-bar/);
  assert.match(icons, /id="icon-cal-bar"/);
});

test('Locate Me stays on Map and restores Nearby preview', () => {
  assert.match(source, /handleLocateClick/);
  assert.match(source, /requestLocation\('map'\)/);
  assert.match(source, /setTrayState\('peek'\)/);
  assert.match(source, /setCommandActive\('map'\)/);
  assert.match(source, /rankNearbyVenues/);
  assert.match(source, /CGBApp\?\.focusLocation/);
  assert.match(app, /function focusLocation[\s\S]*fitBounds/);
});

test('List toggles between Near me and All locations', () => {
  assert.match(source, /button\.textContent = usingLocation \? 'All locations' : 'Near me'/);
  assert.match(source, /requestLocation\('list'\)/);
  assert.match(source, /showAllLocations\(\)/);
  assert.doesNotMatch(iconUpgrade, /syncListLocationLabel|#clear-search-button/);
});

test('Nearby sheet restores its handle without allowing it to open List', () => {
  assert.match(firstPaintCss, /tray--peek \.tray-handle[\s\S]*display: grid !important/);
  assert.match(source, /disablePeekHandleNavigation/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
});
