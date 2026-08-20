import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/mobile-tab-location-refinement.mjs', root), 'utf8');
const mobilePolish = await readFile(new URL('js/mobile-polish.mjs', root), 'utf8');
const firstPaintCss = await readFile(new URL('css/mobile-first-paint.css', root), 'utf8');
const app = await readFile(new URL('js/app.js', root), 'utf8');
const iconUpgrade = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');
const icons = await readFile(new URL('assets/icons.svg', root), 'utf8');

test('Search Add and List hide the map and Search does not show a selected tray', () => {
  assert.match(firstPaintCss, /data-command-surface="search"[\s\S]*#map[\s\S]*visibility: hidden !important/);
  assert.match(source, /data-command-surface="add"[\s\S]*#map[\s\S]*visibility: hidden !important/);
  assert.match(source, /data-command-surface="list"[\s\S]*#map[\s\S]*visibility: hidden !important/);
  assert.match(firstPaintCss, /data-command-surface="search"[\s\S]*#venue-tray[\s\S]*display: none !important/);
});

test('Search Add and List presentation is owned by static first-paint CSS', () => {
  assert.doesNotMatch(source, /command-surface__header|command-surface__back|tray-list__header|close-list-button/);
  assert.match(firstPaintCss, /\.mobile-destination-header \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(firstPaintCss, /data-command-surface="list"[\s\S]*tray-list__header\.mobile-destination-header[\s\S]*padding: 16px 16px 11px !important/);
  assert.match(firstPaintCss, /data-command-surface="list"[\s\S]*tray-list__toolbar/);
  assert.match(firstPaintCss, /#clear-search-button:not\(\[hidden\]\)[\s\S]*border-radius: 999px/);
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

test('canonical application owns location lookup and Nearby focus', () => {
  assert.match(app, /dom\.listLocation\.addEventListener\('click'/);
  assert.match(app, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(app, /rememberNearbyOrigin\(\)/);
  assert.match(app, /setTrayState\('full'\)/);
  assert.match(app, /focusLocation\(state\.origin, nearby\)/);
  assert.match(app, /function focusLocation[\s\S]*fitBounds/);
  assert.doesNotMatch(source, /handleLocateClick|requestLocation|rankNearbyVenues|focusLocation/);
});

test('mobile List toggles Nearby to all locations and back without a second geolocation request', () => {
  assert.match(app, /function rememberNearbyOrigin[\s\S]*state\.nearbyOrigin = location/);
  assert.match(app, /function showAllLocations\(\)[\s\S]*state\.origin = null[\s\S]*setTrayState\('full'\)/);
  assert.match(app, /function showNearbyLocations[\s\S]*state\.nearbyOrigin[\s\S]*state\.origin = \{ \.\.\.remembered \}/);
  assert.match(app, /dom\.listLocationAction\.textContent = usingNearby[\s\S]*canRestoreNearby \? 'Show nearby' : 'Near me'/);
  assert.match(app, /dom\.listLocation\.addEventListener\('click'[\s\S]*showAllLocations\(\)[\s\S]*showNearbyLocations\(\)[\s\S]*navigator\.geolocation/);
  assert.doesNotMatch(source, /nearbyOrigin|showAllLocations|showNearbyLocations|navigator\.geolocation/);
  assert.doesNotMatch(iconUpgrade, /syncListLocationLabel|#clear-search-button/);
});

test('desktop Show all preserves the resolved user location and Near me becomes Show nearby', () => {
  assert.match(app, /function renderLocationControl[\s\S]*state\.nearbyOrigin[\s\S]*canRestoreNearby \? 'Show nearby' : 'Near me'/);
  assert.match(app, /function showAllLocations\(\)[\s\S]*Your location is saved for Nearby/);
  assert.match(app, /function showNearbyLocations[\s\S]*using your saved location/);
  assert.doesNotMatch(source, /syncNearMeControl|handleLocateClick/);
});

test('Nearby sheet handle remains tappable to open the List destination', () => {
  assert.match(firstPaintCss, /tray--peek \.tray-handle[\s\S]*display: grid !important/);
  assert.match(mobilePolish, /function handleTrayControl[\s\S]*openListFromMap\(event\)/);
  assert.match(mobilePolish, /trayHandle\?\.addEventListener\('click', handleTrayControl, \{ capture: true \}\)/);
  assert.doesNotMatch(source, /disablePeekHandleNavigation/);
});
