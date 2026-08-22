import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('js/mobile-tab-location-refinement.mjs', root), 'utf8');
const mobilePolish = await readFile(new URL('js/mobile-polish.mjs', root), 'utf8');
const firstPaintCss = await readFile(new URL('css/mobile-first-paint.css', root), 'utf8');
const app = await readFile(new URL('js/app.js', root), 'utf8');
const shellControls = await readFile(new URL('js/shell-controls.mjs', root), 'utf8');
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

test('Add does not duplicate selected-game context and makes Cal Bar contribution contextual', () => {
  assert.doesNotMatch(source, /add-game-context|Current game|gameTitle\(|formatKickoff\(/);
  assert.match(source, /function syncCalBarNominationAction/);
  assert.match(source, /\['community_location', 'cal_bar'\]\.includes\(venue\.venue_type\)/);
  assert.match(source, /button\.hidden = !supportedVenue/);
  assert.match(source, /Tell us what makes this Cal Bar special/);
  assert.match(source, /Is this your local Cal Bar\? Tell us why/);
  assert.match(source, /Do Cal fans gather here regularly\? Tell us what makes it a Cal Bar\./);
  assert.match(source, /regular Cal gathering place/);
  assert.match(source, /assets\/icons\.svg#icon-cal-bar/);
  assert.match(icons, /id="icon-cal-bar"/);
  assert.match(shellControls, /!\['community_location', 'cal_bar'\]\.includes\(venue\.venue_type\)/);
});

test('canonical application owns location lookup and Nearby focus', () => {
  assert.match(app, /dom\.listLocationNearby\.addEventListener\('click'/);
  assert.match(app, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(app, /rememberNearbyOrigin\(\)/);
  assert.match(app, /setTrayState\('full'\)/);
  assert.match(app, /focusLocation\(state\.origin, nearby\)/);
  assert.match(app, /function focusLocation[\s\S]*fitBounds/);
  assert.doesNotMatch(source, /handleLocateClick|requestLocation|rankNearbyVenues|focusLocation/);
});

test('mobile List keeps Near me and All locations fixed while switching state without a second geolocation request', () => {
  assert.match(app, /function rememberNearbyOrigin[\s\S]*state\.nearbyOrigin = location/);
  assert.match(app, /function showAllLocations\(\)[\s\S]*state\.origin = null[\s\S]*setTrayState\('full'\)/);
  assert.match(app, /function showNearbyLocations[\s\S]*state\.nearbyOrigin[\s\S]*state\.origin = \{ \.\.\.remembered \}/);
  assert.match(app, /dom\.listLocationNearby\.setAttribute\('aria-pressed', String\(usingNearby\)\)[\s\S]*dom\.listLocationAll\.setAttribute\('aria-pressed', String\(!usingNearby\)\)/);
  assert.match(app, /dom\.listLocationAll\.addEventListener\('click'[\s\S]*showAllLocations\(\)[\s\S]*dom\.listLocationNearby\.addEventListener\('click'[\s\S]*showNearbyLocations\(\)[\s\S]*navigator\.geolocation/);
  assert.match(app, /navigator\.geolocation\.getCurrentPosition[\s\S]*setTrayState\('full'\);[\s\S]*renderLocationControl\(\);[\s\S]*focusLocation\(state\.origin, nearby\)/);
  assert.doesNotMatch(app, /listLocationNearby\.textContent|listLocationAll\.textContent/);
  assert.doesNotMatch(source, /nearbyOrigin|showAllLocations|showNearbyLocations|navigator\.geolocation/);
  assert.doesNotMatch(iconUpgrade, /syncListLocationLabel|#clear-search-button/);
});

test('desktop All locations preserves resolved coordinates and fixed Near me restores them', () => {
  assert.match(app, /function renderLocationControl[\s\S]*state\.nearbyOrigin[\s\S]*Show nearby locations using your saved location/);
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
