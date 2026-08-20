import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [
  html,
  app,
  core,
  mobile,
  css,
  detailCss,
  profileCss,
  detailRefinement,
  shellControls,
  fanIntent,
  watchPartyDisplay,
  watchPartyForm,
  calBarNomination,
  listingUpdate,
  harness,
  detailHarness,
  runner,
  fixtureText
] = await Promise.all([
  read('../index.html'),
  read('../js/app.js'),
  read('../js/core.mjs'),
  read('../js/map-mobile-refinement.mjs'),
  read('../css/design-board-4.css'),
  read('../css/venue-detail.css'),
  read('../css/venue-profile.css'),
  read('../js/icon-upgrade.mjs'),
  read('../js/shell-controls.mjs'),
  read('../js/fan-intent.js'),
  read('../js/watch-party-display.js'),
  read('../js/watch-party-form.js'),
  read('../js/cal-bar-nomination.js'),
  read('../js/listing-update.js'),
  read('./browser/production-runtime-harness.mjs'),
  read('./browser/venue-detail-runtime-harness.mjs'),
  read('../scripts/run-browser-harness.mjs'),
  read('./fixtures/public-snapshot.synthetic.json')
]);
const fixture = JSON.parse(fixtureText);

test('selected mini and full profiles share the compact useful-address formatter', () => {
  assert.match(app, /locationLine\.textContent = \[compactVenueLocation\(venue\), formatDistance\(distance\)\]/);
  assert.match(mobile, /\[context, type, compactVenueLocation\(venue\), formatDistance\(distance\)\]/);
});

test('the global selector owns full game context while Watch Party modules carry compact game identity', () => {
  assert.match(html, /id="game-button"/);
  assert.match(app, /dom\.headerGameLabel\.textContent = gameTitle\(game\)/);
  assert.match(app, /dom\.headerKickoff\.textContent = formatKickoff\(game\)/);
  assert.match(app, /function selectGame\(gameId\)[\s\S]*updateRouteForGame\(\)[\s\S]*renderAll\(\)/);
  assert.doesNotMatch(app, /function renderGameContext\(|detail-game-context|Selected game/);
  assert.doesNotMatch(detailCss, /detail-game-context/);
  assert.match(watchPartyDisplay, /import \{ formatGameDate, gameTitle \} from '\.\/core\.mjs'/);
  assert.match(watchPartyDisplay, /function watchPartyGameContext\(snapshot, party\)[\s\S]*return \[gameTitle\(game\), formatGameDate\(game\)\]\.filter\(Boolean\)\.join\(' · '\)/);
  assert.match(watchPartyDisplay, /appendText\(module, watchPartyGameContext\(snapshot, party\), 'party-game-context'\)/);
  assert.doesNotMatch(watchPartyDisplay, /formatKickoff/);
  assert.match(detailHarness, /Global game selector should remain visible and functional/);
  assert.match(detailHarness, /Profile should not duplicate selected-game context below the global selector/);
});

test('direct Venue first paint is viewport-aware instead of forcing desktop into standalone Detail', () => {
  const detailStyles = html.indexOf('href="css/venue-detail.css"');
  const applicationModule = html.indexOf('src="js/app.js"');
  assert.ok(detailStyles > -1 && detailStyles < applicationModule);
  assert.match(html, /directVenueRoute[\s\S]*matchMedia\('\(max-width: 899px\)'\)\.matches[\s\S]*document\.body\.dataset\.view = 'detail'/);
  assert.match(detailCss, /body\[data-view="detail"\] #map-view[\s\S]*display: none !important/);
  assert.match(detailCss, /body\[data-view="detail"\] #detail-view\[hidden\][\s\S]*display: block !important/);
  assert.match(shellControls, /pendingDirectDetail = isMobileLayout\(\)[\s\S]*aria-busy[\s\S]*has\('venue'\)/);
  assert.doesNotMatch(profileCss, /@media \(min-width: 900px\)[\s\S]*body\[data-view="detail"\]/);
  assert.doesNotMatch(css, /body\[data-view="detail"\] \.venue-detail[\s\S]*grid-template-columns: minmax\(0, 1\.15fr\)/);
});

test('initial mobile Detail render still waits for contribution adapters to register', () => {
  const applicationModule = html.indexOf('src="js/app.js"');
  const contributionModule = html.indexOf('src="js/watch-party-form.js"');
  assert.ok(applicationModule > -1 && contributionModule > applicationModule);
  assert.match(app, /document\.addEventListener\('DOMContentLoaded', boot, \{ once: true \}\)/);
  assert.match(watchPartyForm, /app\.subscribe\('rendered', render\)[\s\S]*initializeCalBarNominationEntry[\s\S]*initializeListingUpdateEntry/);
  assert.match(detailHarness, /await waitFor\(\(\) => Boolean\(element\('#venue-detail > \.detail-contribution'\)\), 'compact contribution section'\)/);
});

test('one Venue Profile element and one structural builder serve mobile Detail and desktop rail', () => {
  assert.match(app, /function placeVenueProfile\(mobile\)[\s\S]*dom\.detailShell\.append\(dom\.venueDetail\)[\s\S]*dom\.traySelected\.replaceChildren\(dom\.venueDetail\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*placeVenueProfile\(mobile\)[\s\S]*createDetailLocalMap\(venue\)[\s\S]*createBadges\(venue, party\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*createDetailContribution\(\)[\s\S]*createDetailActionRow\(venue\)/);
  assert.doesNotMatch(app, /function renderDetailView\(/);
  assert.doesNotMatch(app, /function createDetailBadges\(/);
  assert.doesNotMatch(detailRefinement, /function refineVenueDetail|function refineDetailIdentity|function refineDetailAttendance|function refineDetailContribution|function refineDetailPrimaryActions/);
  assert.doesNotMatch(fanIntent, /function renderDetailActivity/);
  assert.match(detailRefinement, /syncDetailLocalMap\(hero, venue, state\)/);
});

test('desktop Venue selection keeps the map active, opens the complete Profile, and canonicalizes the Venue URL', () => {
  assert.match(app, /function selectVenue\(venueId\)[\s\S]*if \(!isMobileLayout\(\)\) \{[\s\S]*state\.detailMode = true[\s\S]*updateRouteForGame\(\)[\s\S]*renderAll\(\)/);
  assert.match(app, /function initMap\(\)[\s\S]*state\.detailMode && isMobileLayout\(\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*if \(mobile\) \{[\s\S]*dom\.mapView\.hidden = true[\s\S]*\} else \{[\s\S]*dom\.mapView\.hidden = false[\s\S]*setTrayState\('selected'\)/);
  assert.match(app, /function renderAll\(\)[\s\S]*if \(state\.detailMode\) \{[\s\S]*renderVenueProfile\(\)[\s\S]*if \(!mobile\) \{[\s\S]*renderLocationList\(\)[\s\S]*initMap\(\)/);
  assert.match(detailCss, /@media \(min-width: 900px\)[\s\S]*#tray-selected > #venue-detail/);
});

test('desktop full Profile has no Details/View venue transition while mobile compact preview keeps its explicit transition', () => {
  const compactActions = app.match(/function createActionRow\(venue, \{ details = true \} = \{\}\)[\s\S]*?function createDetailActionRow/)?.[0] || '';
  const fullActions = app.match(/function createDetailActionRow\(venue\)[\s\S]*?function createDetailContribution/)?.[0] || '';
  assert.match(compactActions, /detail\.textContent = 'View details'/);
  assert.match(fullActions, /row\.append\(intent, share\)/);
  assert.doesNotMatch(fullActions, /View details|View venue|details = true/);
  assert.match(app, /function renderSelectedCard\(\)[\s\S]*card\.append\(createActionRow\(venue\)\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*dom\.venueDetail\.append\(createDetailActionRow\(venue\)\)/);
});

test('direct route and sharing retain canonical game and Venue identity', () => {
  assert.match(app, /const venueSlug = params\.get\('venue'\)/);
  assert.match(app, /const requestedGame = params\.get\('game'\)/);
  assert.match(app, /resolveGameRouteParam\(state\.snapshot\.games, requestedGame\)/);
  assert.match(app, /buildVenueUrl\(venue\.slug, game, location\.href\)/);
  assert.match(runner, /Production TBD direct-route refresh harness/);
  assert.match(runner, /Production direct-route refresh harness/);
});

test('mobile Back returns to the focused map while desktop does not manufacture a Detail back transition', () => {
  assert.match(app, /function returnToMapFromDetail\(event\)[\s\S]*event\.preventDefault\(\)[\s\S]*if \(!isMobileLayout\(\)\) return;[\s\S]*state\.detailMode = false[\s\S]*setTrayState\('selected'\)[\s\S]*updateRouteForGame\(\)[\s\S]*renderAll\(\)[\s\S]*focusReturnedDetailVenue\(venue\)/);
  assert.match(app, /dom\.detailBack\.addEventListener\('click', returnToMapFromDetail\)/);
  assert.match(shellControls, /function leaveDetailForCommand\(\)[\s\S]*if \(!isMobileLayout\(\) \|\| !state\?\.detailMode\) return false/);
});

test('viewport class changes preserve Venue and game state without mutating the canonical URL', () => {
  const transition = app.match(/function handleViewportClassChange\(\)[\s\S]*?function wireEvents/)?.[0] || '';
  assert.match(transition, /const mobile = isMobileLayout\(\)/);
  assert.match(transition, /if \(!mobile && state\.selectedVenueId\) state\.detailMode = true/);
  assert.match(transition, /renderAll\(\)/);
  assert.doesNotMatch(transition, /updateRouteForGame|history\.|location\./);
  assert.match(app, /MOBILE_MEDIA\.addEventListener\?\.\('change', handleViewportClassChange\)/);
});

test('no-photo mobile Detail creates one noninteractive Venue-local MapLibre map from canonical coordinates', () => {
  assert.match(app, /venue\.photo_url \? '' : ' detail-hero--no-photo'/);
  assert.match(app, /function createDetailLocalMap\(venue\)[\s\S]*dataset\.latitude = String\(latitude\)[\s\S]*dataset\.longitude = String\(longitude\)[\s\S]*dataset\.zoom = '16'/);
  assert.match(detailRefinement, /const DETAIL_MAP_ZOOM = 16\.0/);
  assert.match(detailRefinement, /center: \[longitude, latitude\]/);
  assert.match(detailRefinement, /interactive: false/);
  assert.match(detailRefinement, /attributionControl: false/);
  assert.equal((detailRefinement.match(/new window\.maplibregl\.Marker/g) || []).length, 1);
  assert.match(app, /function disposeMapForDetail\(\)[\s\S]*state\.markers\.clear\(\)[\s\S]*state\.map\?\.remove\?\.\(\)[\s\S]*state\.map = null/);
  assert.doesNotMatch(detailRefinement, /NavigationControl|GeolocateControl|cluster:/);
  assert.match(detailCss, /detail-local-map[\s\S]*height: 138px/);
  assert.match(detailCss, /@media \(max-width: 359px\)[\s\S]*height: 124px/);
  assert.match(detailCss, /orientation: landscape[\s\S]*height: 120px/);
  assert.match(css, /detail-hero\.detail-hero--no-photo[\s\S]*min-height: 0/);
});

test('mobile Detail reserves only the fixed-action footprint above the global navigation', () => {
  assert.match(detailCss, /body\[data-view="detail"\] \.venue-detail \{[\s\S]*padding-bottom: 0 !important/);
  assert.match(detailCss, /@media \(max-width: 899px\)[\s\S]*\.detail-view \{[\s\S]*padding-bottom: 0 !important/);
  assert.match(detailCss, /@media \(max-width: 899px\)[\s\S]*body\[data-view="detail"\] \.venue-detail \{[^}]*padding-bottom: calc\(var\(--footer-height\) \+ 78px\) !important;/);
  assert.match(detailCss, /body\[data-view="detail"\] \.venue-detail > \.action-row\.detail-primary-actions \{[^}]*position: fixed !important;[^}]*bottom: var\(--footer-height\) !important;/);
  assert.match(detailCss, /\.action-row\.detail-primary-actions[\s\S]*padding:[^;]*env\(safe-area-inset-bottom, 0px\)/);
});

test('photo-present Profile uses the existing enhancement and tears down the local-map fallback', () => {
  assert.match(app, /venue\.photo_url \? '' : ' detail-hero--no-photo'/);
  assert.match(detailRefinement, /enhanceVenueProfile\(\{ state, documentObject: document, onPhotoError: scheduleUpgrade \}\)[\s\S]*syncDetailLocalMap\(hero, venue, state\)/);
  assert.match(detailRefinement, /function syncDetailLocalMap\(hero, venue, state\)[\s\S]*const container = hero\?\.querySelector\('\.detail-local-map'\)[\s\S]*if \(!container\) \{[\s\S]*destroyDetailLocalMap\(\)/);
  assert.match(detailCss, /#tray-selected > #venue-detail \.detail-photo__frame[\s\S]*aspect-ratio: 16 \/ 10/);
});

test('Profile identity uses one actionable location line and keeps website and description subordinate', () => {
  const profileSource = app.match(/function renderVenueProfile\(\)[\s\S]*?function emitRendered/)?.[0] || '';
  assert.match(profileSource, /const streetAddress = \[venue\.address_line_1, venue\.address_line_2\]\.filter\(Boolean\)\.join\(', '\)/);
  assert.match(profileSource, /const addressLabel = \(streetAddress[\s\S]*\[venue\.city, venue\.region\]\.filter\(Boolean\)\.join\(', '\)/);
  assert.match(profileSource, /directions\.href = directionsUrl\(venue\)/);
  assert.match(profileSource, /directions\.append\(createIcon\('directions'\), document\.createTextNode\(addressLabel\)\)[\s\S]*address\.append\(directions\)[\s\S]*hero\.append\(address\)/);
  assert.doesNotMatch(profileSource, /city\.className = 'detail-city'|city\.textContent/);
  assert.doesNotMatch(profileSource, /addressActions\.append\(directions\)/);
  assert.match(profileSource, /if \(venue\.website_url\)[\s\S]*website\.className = 'detail-website-inline'[\s\S]*hero\.append\(addressActions\)/);
  assert.match(detailCss, /#tray-selected > #venue-detail \.detail-address/);
});

test('FAN-ADDED has one provenance-only badge owner and is suppressed for Cal Bars', () => {
  assert.match(core, /else if \(venue\?\.verification_status === 'user_added'\) badges\.push\(\{ text: 'FAN-ADDED', kind: 'fan-added' \}\)/);
  assert.match(core, /if \(venue\?\.venue_type === 'cal_bar'\) badges\.push\(\{ text: 'CAL BAR', kind: 'cal' \}\)/);
  assert.doesNotMatch(core, /venue\?\.venue_type === 'community_location'[^\n]*FAN-ADDED/);
  assert.match(app, /function createBadges\(venue, party\)[\s\S]*venueBadgeDescriptors\(venue, party\)/);
  assert.match(app, /function renderSelectedCard\(\)[\s\S]*heading\.append\(createBadges\(venue, party\)\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*hero\.append\(createBadges\(venue, party\)\)/);
  assert.doesNotMatch(app, /createDetailBadges/);
  assert.doesNotMatch(`${app}\n${detailRefinement}\n${detailCss}`, /Fan-selected/i);
});

test('Watch Party identity coverage includes Cal Bar, fan-added non-Cal-Bar, and no-party states', () => {
  const parties = new Set(fixture.watchParties.map((party) => party.venue_id));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'cal_bar' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'community_location' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => !parties.has(venue.venue_id)));
  assert.match(harness, /Watch Party at a Community Location should remain distinct from a Cal Bar/);
});

test('Profile attendance separates the numeral from the singular/plural label', () => {
  assert.match(app, /className = 'bear-count__number'/);
  assert.match(app, /className = 'bear-count__label'/);
  assert.match(app, /number === 1 \? 'Bear watching here' : 'Bears watching here'/);
  assert.match(detailCss, /activity-card > strong[\s\S]*gap: 6px/);
});

test('Watch Party treatment and adapters remain attached to the shared Profile element', () => {
  assert.match(watchPartyDisplay, /if \(detail\) link\.append\(createIcon\('external'\), document\.createTextNode\('External event details'\)\)/);
  assert.match(watchPartyDisplay, /container\.querySelector\(':scope > \.detail-contribution, :scope > \.action-row'\)/);
  assert.match(detailCss, /#tray-selected > #venue-detail > \.party-module[\s\S]*background: linear-gradient\(135deg, var\(--cgb-gold-50\)/);
  assert.match(watchPartyDisplay, /party-module__report/);
});

test('persistent Profile action row resolves to Fan Intent and Share while Directions stays in identity', () => {
  const detailActionSource = app.match(/function createDetailActionRow\(venue\)[\s\S]*?function createDetailContribution/)?.[0] || '';
  assert.match(app, /row\.className = 'action-row detail-primary-actions'/);
  assert.match(app, /share\.className = 'secondary-button detail-share'/);
  assert.match(app, /row\.append\(intent, share\)/);
  assert.doesNotMatch(detailActionSource, /directions/i);
  assert.match(app, /share\.append\(createIcon\('share'\), document\.createTextNode\('Share'\)\)/);
  assert.match(detailCss, /#tray-selected > #venue-detail > \.action-row\.detail-primary-actions[\s\S]*position: sticky/);
});

test('Profile contributions retain existing URLs and are tertiary in the desktop rail', () => {
  assert.match(app, /heading\.textContent = 'Help improve this listing'/);
  assert.match(watchPartyForm, /link\.dataset\.watchPartyFormEntryPoint = 'true'/);
  assert.match(calBarNomination, /link\.dataset\.calBarNominationEntry = 'true'/);
  assert.match(listingUpdate, /link\.dataset\.listingUpdateEntry = 'true'/);
  [watchPartyForm, calBarNomination, listingUpdate].forEach((source) => {
    assert.match(source, /detail-contribution__actions/);
    assert.match(source, /actions\.append\(link\)/);
  });
  assert.match(detailCss, /#tray-selected > #venue-detail \.detail-contribution__actions[\s\S]*grid-template-columns: 1fr/);
  assert.match(detailCss, /#tray-selected > #venue-detail \.detail-contribution__action[\s\S]*background: transparent/);
});

test('desktop map visibility accounts for the Profile rail instead of letting the selected marker sit behind it', () => {
  assert.match(app, /function mapVisibilityMetrics\(\)[\s\S]*if \(!mobile && dom\.tray[\s\S]*insets\.right = Math\.max/);
  assert.match(app, /function scheduleSelectedVenueVisibility\(\)[\s\S]*state\.detailMode && isMobileLayout\(\)/);
});

test('edge fixtures and runner cover zero Bears, long content, portrait, short landscape, and desktop', () => {
  const counted = new Set(fixture.fanCounts.filter((row) => row.count > 0).map((row) => `${row.game_id}:${row.venue_id}`));
  assert.ok(fixture.venues.some((venue) => !counted.has(`game_2026_01:${venue.venue_id}`)));
  assert.ok(fixture.venues.some((venue) => venue.name.length > 50));
  assert.ok(fixture.venues.some((venue) => venue.address_line_1.length > 35));
  assert.match(runner, /windowSize = '390,844'/);
  assert.match(runner, /windowSize: '844,390'/);
  assert.match(runner, /windowSize: '1440,900'/);
  assert.match(harness, /Short landscape should not create horizontal document overflow/);
  assert.match(harness, /Desktop shell should not create horizontal document overflow/);
});
