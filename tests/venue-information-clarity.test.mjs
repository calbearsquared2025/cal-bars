import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [
  html,
  app,
  mobile,
  css,
  detailRefinement,
  watchPartyDisplay,
  listingUpdate,
  harness,
  runner,
  fixtureText
] = await Promise.all([
  read('../index.html'),
  read('../js/app.js'),
  read('../js/map-mobile-refinement.mjs'),
  read('../css/design-board-4.css'),
  read('../js/icon-upgrade.mjs'),
  read('../js/watch-party-display.js'),
  read('../js/listing-update.js'),
  read('./browser/production-runtime-harness.mjs'),
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
  assert.match(detailRefinement, /body\[data-view="detail"\] \.site-header[\s\S]*display: grid !important/);
  assert.match(detailRefinement, /body\[data-view="detail"\] \.opening-stat,[\s\S]*display: none !important/);
  assert.match(detailRefinement, /detail\.querySelector\(':scope > \.detail-game-context'\)\?\.remove\(\)/);
  assert.doesNotMatch(detailRefinement, /detail-game-context::after/);
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
  assert.match(detailRefinement, /const DETAIL_MAP_ZOOM = 17/);
  assert.match(detailRefinement, /const latitude = Number\(venue\.latitude\)/);
  assert.match(detailRefinement, /const longitude = Number\(venue\.longitude\)/);
  assert.match(detailRefinement, /center: \[longitude, latitude\]/);
  assert.match(detailRefinement, /zoom: DETAIL_MAP_ZOOM/);
  assert.match(detailRefinement, /interactive: false/);
  assert.match(detailRefinement, /attributionControl: false/);
  assert.equal((detailRefinement.match(/new window\.maplibregl\.Marker/g) || []).length, 1);
  assert.doesNotMatch(detailRefinement, /NavigationControl|GeolocateControl|cluster:/);
  assert.match(detailRefinement, /detail-local-map[\s\S]*height: 138px/);
  assert.match(detailRefinement, /@media \(max-width: 359px\)[\s\S]*height: 124px/);
  assert.match(detailRefinement, /orientation: landscape[\s\S]*height: 120px/);
  assert.match(css, /detail-hero\.detail-hero--no-photo[\s\S]*min-height: 0/);
});

test('photo-present Detail remains on the existing hero path and no photo workflow is invented', () => {
  assert.match(app, /venue\.photo_url \? '' : ' detail-hero--no-photo'/);
  assert.match(detailRefinement, /venue\.photo_url[\s\S]*destroyDetailLocalMap/);
  assert.doesNotMatch(`${html}\n${detailRefinement}`, /photo-submission|photo submission|add a photo/i);
});

test('Detail identity moves Directions and short description into the address hierarchy', () => {
  assert.match(detailRefinement, /address\.insertAdjacentElement\('afterend', addressActions\)/);
  assert.match(detailRefinement, /directions\.replaceChildren\(createIcon\('directions'\), document\.createTextNode\('Directions'\)\)/);
  assert.match(detailRefinement, /description\.hidden = false/);
  assert.match(detailRefinement, /addressActions\.insertAdjacentElement\('afterend', description\)/);
  assert.match(detailRefinement, /detail-description[\s\S]*color: var\(--cgb-ink-700\)/);
});

test('FAN-ADDED is provenance-only and suppressed for Cal Bars', () => {
  assert.match(detailRefinement, /venue\.venue_type !== 'cal_bar' && venue\.verification_status === 'user_added'/);
  assert.match(detailRefinement, /badge\.textContent = 'FAN-ADDED'/);
  assert.match(detailRefinement, /community location[\s\S]*badge\.remove\(\)/i);
  assert.doesNotMatch(detailRefinement, /Fan-selected/i);
});

test('Watch Party identity coverage includes Cal Bar, fan-added non-Cal-Bar, and no-party states', () => {
  const parties = new Set(fixture.watchParties.map((party) => party.venue_id));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'cal_bar' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'community_location' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => !parties.has(venue.venue_id)));
  assert.match(harness, /Watch Party at a Community Location should remain distinct from a Cal Bar/);
});

test('Detail attendance separates the numeral from the singular/plural label', () => {
  assert.match(detailRefinement, /className = 'bear-count__number'/);
  assert.match(detailRefinement, /className = 'bear-count__label'/);
  assert.match(detailRefinement, /number === 1 \? 'Bear watching here' : 'Bears watching here'/);
  assert.match(detailRefinement, /activity-card > strong[\s\S]*gap: 6px/);
});

test('Detail Watch Party treatment reuses gold language, page scrolling, and exact external copy', () => {
  assert.match(watchPartyDisplay, /link\.textContent = 'External event details'/);
  assert.doesNotMatch(watchPartyDisplay, /Open event information/);
  assert.match(detailRefinement, /venue-detail > \.party-module[\s\S]*background: linear-gradient\(135deg, var\(--cgb-gold-50\)/);
  assert.match(detailRefinement, /max-height: none !important/);
  assert.match(detailRefinement, /overflow: visible !important/);
  assert.match(watchPartyDisplay, /party-module__report/);
});

test('Detail sticky row resolves to Fan Intent and Share while Directions moves out of it', () => {
  assert.match(detailRefinement, /row\.classList\.add\('detail-primary-actions'\)/);
  assert.match(detailRefinement, /share\.replaceChildren\(createIcon\('share'\), document\.createTextNode\('Share'\)\)/);
  assert.match(detailRefinement, /detail\.append\(actionRow\)/);
  assert.match(detailRefinement, /grid-template-columns: minmax\(0, 1fr\) minmax\(96px, \.42fr\)/);
});

test('Detail contributions consolidate existing configured actions without changing their URLs or eligibility owners', () => {
  assert.match(detailRefinement, /heading\.textContent = 'Help improve this listing'/);
  assert.match(detailRefinement, /data-watch-party-form-entry-point/);
  assert.match(detailRefinement, /data-cal-bar-nomination-entry/);
  assert.match(detailRefinement, /data-listing-update-entry/);
  assert.match(detailRefinement, /const link = source\.querySelector\('a\[href\]'\)/);
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
