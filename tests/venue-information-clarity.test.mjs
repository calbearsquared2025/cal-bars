import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [
  html,
  app,
  mobile,
  css,
  detailCss,
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
  read('../js/map-mobile-refinement.mjs'),
  read('../css/design-board-4.css'),
  read('../css/venue-detail.css'),
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

test('Detail retains the global game selector while removing opening stats and the duplicate in-page game module', () => {
  assert.match(html, /id="game-button"/);
  assert.match(app, /dom\.headerGameLabel\.textContent = gameTitle\(game\)/);
  assert.match(app, /dom\.headerKickoff\.textContent = formatKickoff\(game\)/);
  assert.match(app, /function selectGame\(gameId\)[\s\S]*updateRouteForGame\(\)[\s\S]*renderAll\(\)/);
  assert.match(detailCss, /body\[data-view="detail"\] \.site-header[\s\S]*display: grid !important/);
  assert.match(detailCss, /body\[data-view="detail"\] \.opening-stat,[\s\S]*display: none !important/);
  assert.doesNotMatch(app, /className = 'detail-game-context'/);
  assert.doesNotMatch(detailCss, /detail-game-context::after/);
});

test('Detail route and presentation are established before asynchronous application rendering', () => {
  const detailStyles = html.indexOf('href="css/venue-detail.css"');
  const applicationModule = html.indexOf('src="js/app.js"');
  assert.ok(detailStyles > -1 && detailStyles < applicationModule);
  assert.match(html, /new URLSearchParams\(window\.location\.search\)\.has\('venue'\)[\s\S]*document\.body\.dataset\.view = 'detail'/);
  assert.match(detailCss, /body\[data-view="detail"\] #map-view[\s\S]*display: none !important/);
  assert.match(detailCss, /body\[data-view="detail"\] #detail-view\[hidden\][\s\S]*display: block !important/);
  assert.doesNotMatch(detailRefinement, /installDesktopDetailHierarchy|cgb-desktop-detail-hierarchy|createElement\('style'\)/);
  assert.match(shellControls, /pendingDirectDetail[\s\S]*aria-busy[\s\S]*has\('venue'\)[\s\S]*detailVisible = !dom\.detailView\?\.hidden \|\| pendingDirectDetail/);
});

test('initial Detail render waits for contribution adapters to register', () => {
  const applicationModule = html.indexOf('src="js/app.js"');
  const contributionModule = html.indexOf('src="js/watch-party-form.js"');
  assert.ok(applicationModule > -1 && contributionModule > applicationModule);
  assert.match(app, /document\.addEventListener\('DOMContentLoaded', boot, \{ once: true \}\)/);
  assert.match(watchPartyForm, /app\.subscribe\('rendered', render\)[\s\S]*initializeCalBarNominationEntry[\s\S]*initializeListingUpdateEntry/);
  assert.match(detailHarness, /verifyImmediateSingleOwnerRerender[\s\S]*verifyContribution\(\)/);
});

test('app.js is the single structural owner for Venue Detail on every render', () => {
  assert.match(app, /function renderDetailView\(\)[\s\S]*createDetailLocalMap\(venue\)[\s\S]*createDetailBadges\(venue, party\)/);
  assert.match(app, /function renderDetailView\(\)[\s\S]*createDetailContribution\(\)[\s\S]*createDetailActionRow\(venue\)/);
  assert.doesNotMatch(detailRefinement, /function refineVenueDetail|function refineDetailIdentity|function refineDetailAttendance|function refineDetailContribution|function refineDetailPrimaryActions/);
  assert.doesNotMatch(fanIntent, /function renderDetailActivity/);
  assert.match(detailRefinement, /syncDetailLocalMap\(hero, venue, state\)/);
  assert.match(detailHarness, /function verifyImmediateSingleOwnerRerender\(venue, hasParty\)[\s\S]*window\.CGBApp\?\.render\?\.\(\)[\s\S]*Base rerender should not recreate the superseded selected-game module/);
});

test('direct route and refresh coverage retains game and Venue identity for known and TBD kickoff states', () => {
  assert.match(app, /const venueSlug = params\.get\('venue'\)/);
  assert.match(app, /const requestedGame = params\.get\('game'\)/);
  assert.match(app, /buildVenueUrl\(venue\.slug, state\.gameId, location\.href\)/);
  assert.match(runner, /Production TBD direct-route refresh harness/);
  assert.match(runner, /Production direct-route refresh harness/);
});

test('no-photo Detail creates one noninteractive Venue-local MapLibre map from canonical coordinates', () => {
  assert.match(app, /venue\.photo_url \? '' : ' detail-hero--no-photo'/);
  assert.match(app, /function createDetailLocalMap\(venue\)[\s\S]*dataset\.latitude = String\(latitude\)[\s\S]*dataset\.longitude = String\(longitude\)[\s\S]*dataset\.zoom = '16\.75'/);
  assert.match(detailRefinement, /const DETAIL_MAP_ZOOM = 16\.75/);
  assert.match(detailRefinement, /const latitude = Number\(venue\.latitude\)/);
  assert.match(detailRefinement, /const longitude = Number\(venue\.longitude\)/);
  assert.match(detailRefinement, /center: \[longitude, latitude\]/);
  assert.match(detailRefinement, /zoom: DETAIL_MAP_ZOOM/);
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

test('mobile Detail reserves no duplicate space below the safe-area-aware sticky row', () => {
  assert.match(detailCss, /body\[data-view="detail"\] \.venue-detail \{[\s\S]*padding-bottom: 0 !important/);
  assert.match(detailCss, /@media \(max-width: 899px\)[\s\S]*\.detail-view \{[\s\S]*padding-bottom: 0 !important/);
  assert.match(detailCss, /orientation: portrait[\s\S]*display: flex !important[\s\S]*flex-direction: column[\s\S]*margin-top: auto !important/);
  assert.match(detailCss, /\.action-row\.detail-primary-actions[\s\S]*padding:[^;]*env\(safe-area-inset-bottom, 0px\)/);
});

test('photo-present Detail remains on the existing hero path and no photo workflow is invented', () => {
  assert.match(app, /venue\.photo_url \? '' : ' detail-hero--no-photo'/);
  assert.match(detailRefinement, /venue\.photo_url[\s\S]*destroyDetailLocalMap/);
  assert.doesNotMatch(`${html}\n${detailRefinement}`, /photo-submission|photo submission|add a photo/i);
});

test('Detail identity moves Directions and short description into the address hierarchy', () => {
  assert.match(app, /addressActions\.className = 'detail-address-actions'/);
  assert.match(app, /directions\.className = 'detail-directions-inline'/);
  assert.match(app, /hero\.append\(addressActions\)[\s\S]*description\.className = 'detail-description'[\s\S]*hero\.append\(description\)/);
  assert.match(detailCss, /detail-description[\s\S]*color: var\(--cgb-ink-700\)/);
});

test('FAN-ADDED is provenance-only and suppressed for Cal Bars', () => {
  assert.match(app, /venue\.venue_type !== 'cal_bar' && venue\.verification_status === 'user_added'/);
  assert.match(app, /badge\.textContent = 'FAN-ADDED'/);
  assert.match(app, /function createDetailBadges\(venue, party\)[\s\S]*createBadges\(venue, party\)/);
  assert.doesNotMatch(`${app}\n${detailRefinement}\n${detailCss}`, /Fan-selected/i);
});

test('Watch Party identity coverage includes Cal Bar, fan-added non-Cal-Bar, and no-party states', () => {
  const parties = new Set(fixture.watchParties.map((party) => party.venue_id));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'cal_bar' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'community_location' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => !parties.has(venue.venue_id)));
  assert.match(harness, /Watch Party at a Community Location should remain distinct from a Cal Bar/);
});

test('Detail attendance separates the numeral from the singular/plural label', () => {
  assert.match(app, /className = 'bear-count__number'/);
  assert.match(app, /className = 'bear-count__label'/);
  assert.match(app, /number === 1 \? 'Bear watching here' : 'Bears watching here'/);
  assert.match(detailCss, /activity-card > strong[\s\S]*gap: 6px/);
});

test('Detail Watch Party treatment reuses gold language, page scrolling, and scopes exact external copy to Detail', () => {
  assert.match(watchPartyDisplay, /if \(detail\) link\.append\(createIcon\('external'\), document\.createTextNode\('External event details'\)\)/);
  assert.match(watchPartyDisplay, /else link\.textContent = 'Open event information'/);
  assert.match(watchPartyDisplay, /container\.querySelector\(':scope > \.detail-contribution, :scope > \.action-row'\)/);
  assert.match(detailCss, /venue-detail > \.party-module[\s\S]*background: linear-gradient\(135deg, var\(--cgb-gold-50\)/);
  assert.match(detailCss, /max-height: none !important/);
  assert.match(detailCss, /overflow: visible !important/);
  assert.match(detailCss, /party-module__report[\s\S]*justify-self: end[\s\S]*font-size: \.65rem !important/);
  assert.match(watchPartyDisplay, /party-module__report/);
});

test('Detail sticky row resolves to Fan Intent and Share while Directions moves out of it', () => {
  const detailActionSource = app.match(/function createDetailActionRow\(venue\)[\s\S]*?function createDetailContribution/)?.[0] || '';
  assert.match(app, /row\.className = 'action-row detail-primary-actions'/);
  assert.match(app, /share\.className = 'secondary-button detail-share'/);
  assert.match(app, /row\.append\(intent, share\)/);
  assert.doesNotMatch(detailActionSource, /directions/i);
  assert.match(detailCss, /grid-template-columns: minmax\(0, 1fr\) minmax\(96px, \.42fr\)/);
  assert.match(app, /share\.append\(createIcon\('share'\), document\.createTextNode\('Share'\)\)/);
});

test('Detail contributions consolidate existing configured actions without changing their URLs or eligibility owners', () => {
  assert.match(app, /heading\.textContent = 'Help improve this listing'/);
  assert.match(watchPartyForm, /link\.dataset\.watchPartyFormEntryPoint = 'true'/);
  assert.match(calBarNomination, /link\.dataset\.calBarNominationEntry = 'true'/);
  assert.match(listingUpdate, /link\.dataset\.listingUpdateEntry = 'true'/);
  [watchPartyForm, calBarNomination, listingUpdate].forEach((source) => {
    assert.match(source, /detail-contribution__actions/);
    assert.match(source, /actions\.append\(link\)/);
  });
  assert.match(listingUpdate, /Report a problem with this listing'/);
  assert.doesNotMatch(listingUpdate, /Report a problem with this listing\./);
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
