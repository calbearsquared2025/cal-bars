import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('mobile primary navigation is Map, Search, Add, List, and About', async () => {
  const html = await source('index.html');
  const mapIndex = html.indexOf('<span>Map</span>');
  const searchIndex = html.indexOf('<span>Search</span>');
  const addIndex = html.indexOf('<span>Add</span>');
  const listIndex = html.indexOf('<span>List</span>');
  const aboutIndex = html.indexOf('<span>About</span>');
  assert.ok(mapIndex >= 0 && mapIndex < searchIndex && searchIndex < addIndex && addIndex < listIndex && listIndex < aboutIndex);
  assert.doesNotMatch(html, /id="mobile-game-button"/);
});

test('search and add are dedicated mobile surfaces', async () => {
  const html = await source('index.html');
  assert.match(html, /id="search-surface"/);
  assert.match(html, /id="search-surface-form-slot"/);
  assert.match(html, /Find a location already listed in Cal Golden Bars/);
  assert.match(html, /Not yet listed\? <strong>Add a location\.<\/strong>/);
  assert.match(html, /id="add-surface"/);
  assert.match(html, /Plan a Watch Party/);
  assert.match(html, /Nominate a Cal Bar/);
  assert.match(html, /Report a problem/);
});

test('Search Add and List retain parallel destination header markup', async () => {
  const html = await source('index.html');
  const sharedHeaders = html.match(/class="[^"]*mobile-destination-header[^"]*"/g) || [];
  assert.equal(sharedHeaders.length, 4);
  assert.match(html, /id="search-surface"[\s\S]*mobile-destination-header[\s\S]*<span class="eyebrow">Find a place<\/span>[\s\S]*<h2 id="search-surface-title">Search locations<\/h2>/);
  assert.match(html, /id="add-surface"[\s\S]*mobile-destination-header[\s\S]*<span class="eyebrow">Contribute<\/span>[\s\S]*<h2 id="add-surface-title">Add to the map<\/h2>/);
  assert.match(html, /id="tray-list"[\s\S]*mobile-destination-header[\s\S]*<span class="eyebrow">Browse<\/span>[\s\S]*<h2 id="list-heading">Find your Cal crowd<\/h2>[\s\S]*class="tray-list__toolbar"/);
});

test('mobile styling removes the permanent map search and presents full command surfaces', async () => {
  const css = await source('css/mobile-command-navigation.css');
  assert.match(css, /\.map-toolbar \.location-search\s*\{\s*display: none;/);
  assert.match(css, /\.command-surface:not\(\[hidden\]\)[\s\S]*position: fixed;/);
  assert.match(css, /calc\(var\(--header-height\) \+ 27px\)/);
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.mobile-command__add-mark/);
});

test('mobile Detail reuses the global command bar, keeps Back to map, and anchors primary actions above navigation', async () => {
  const css = await source('css/venue-detail.css');
  const mobile = css.slice(css.indexOf('@media (max-width: 899px)'));
  assert.match(mobile, /body\[data-view="detail"\] \.mobile-command-bar\s*\{\s*display: grid !important;/);
  assert.doesNotMatch(mobile, /body\[data-view="detail"\] \.back-link\s*\{[^}]*display: none !important;/);
  assert.match(mobile, /body\[data-view="detail"\] \.venue-detail > \.action-row\.detail-primary-actions\s*\{[^}]*position: fixed !important;[^}]*bottom: var\(--footer-height\) !important;/);
});

test('navigation delegates to existing search, tray, contribution, and Detail-return contracts', async () => {
  const script = await source('js/shell-controls.mjs');
  assert.match(script, /buildWatchPartyPrefillUrl/);
  assert.match(script, /buildCalBarNominationPrefillUrl/);
  assert.match(script, /buildListingUpdatePrefillUrl/);
  assert.match(script, /buildMissingLocationFormUrl/);
  assert.match(script, /dom\.searchSlot\.append\(dom\.searchForm\)/);
  assert.match(script, /dom\.trayHandle\?\.click\(\)/);
  assert.match(script, /dom\.addContext\.hidden = !venue/);
  assert.match(script, /function leaveDetailForCommand\(\)/);
  assert.match(script, /document\.querySelector\('#detail-back'\)/);
  assert.match(script, /back\.click\(\)/);
  assert.match(script, /function showMap\(\) \{\s*leaveDetailForCommand\(\);/);
  assert.match(script, /function showList\(\) \{\s*leaveDetailForCommand\(\);/);
  assert.match(script, /function showSearch\(intent = ''\) \{\s*leaveDetailForCommand\(\);/);
  assert.match(script, /function showAdd\(\) \{\s*leaveDetailForCommand\(\);/);
  assert.match(script, /import \{ subscribeAppEvent \} from '\.\/app-state\.mjs'/);
  assert.match(script, /subscribeAppEvent\('rendered', syncViewState\)/);
  assert.match(script, /subscribeAppEvent\('ready', syncViewState\)/);
  assert.doesNotMatch(script, /window\.CGBApp\?\.subscribe\?\.\('rendered', syncViewState\)/);
  assert.doesNotMatch(script, /MutationObserver/);
});

test('desktop reuses the shared command owner as Locations and Selected only', async () => {
  const [css, script, app] = await Promise.all([
    source('css/mobile-command-navigation.css'),
    source('js/shell-controls.mjs'),
    source('js/app.js')
  ]);
  const desktop = css.slice(css.lastIndexOf('@media (min-width: 900px)'));
  assert.match(desktop, /\.mobile-command-bar\s*\{[^}]*right:\s*24px/);
  assert.match(desktop, /\.mobile-command-bar\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(desktop, /#mobile-list-button\s*\{[^}]*grid-row:\s*1[^}]*grid-column:\s*1[^}]*width:\s*100%[^}]*justify-content:\s*center[^}]*border:\s*1px solid rgba\(1, 1, 51, \.18\)[^}]*border-radius:\s*9px 0 0 9px/);
  assert.match(desktop, /#mobile-map-button\s*\{[^}]*grid-row:\s*1[^}]*grid-column:\s*2[^}]*width:\s*100%[^}]*justify-content:\s*center[^}]*border:\s*1px solid rgba\(1, 1, 51, \.18\)[^}]*border-left:\s*0[^}]*border-radius:\s*0 9px 9px 0/);
  assert.match(desktop, /#mobile-search-button,[\s\S]*#mobile-add-button,[\s\S]*#mobile-about-button\s*\{[^}]*display:\s*none/);
  assert.match(desktop, /\.mobile-command-bar\s*\{[^}]*width:\s*min\(390px, 34vw\)/);
  assert.doesNotMatch(desktop, /left:\s*18px/);
  assert.doesNotMatch(desktop, /top:\s*78px !important/);
  assert.match(script, /map: 'Selected'/);
  assert.match(script, /list: 'Locations'/);
  assert.match(script, /selectedButton\.disabled = !mobile && !selectedVenue\(\)/);
  assert.match(script, /selectedButton\.setAttribute\('aria-disabled', String\(selectedButton\.disabled\)\)/);
  assert.match(script, /!mobile && !selectedVenue\(\)[\s\S]*\? 'list'/);
  assert.match(script, /function normalizeDesktopTray\(\)/);
  assert.match(script, /currentSurface = 'list'[\s\S]*CGBApp\?\.showLocations[\s\S]*CGBApp\.showLocations\(\)/);
  assert.match(app, /function renderSelectedCard\(\)[\s\S]*if \(!venue\) \{[\s\S]*setTrayState\(isMobileLayout\(\) \? 'peek' : 'full'\)/);
  const sharedVenueSelections = app.match(/button\.addEventListener\('click', \(\) => selectVenue\(venue\.venue_id\)\);/g) || [];
  assert.equal(sharedVenueSelections.length >= 2, true);
  assert.doesNotMatch(script, /MutationObserver/);
});
