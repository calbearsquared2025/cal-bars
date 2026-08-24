import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [
  app,
  iconUpgrade,
  core,
  detailCss,
  profileCss,
  watchPartyFormCss,
  shellControls,
  watchPartyDisplay,
  watchPartyForm,
  calBarNomination,
  listingUpdate,
  fixtureText
] = await Promise.all([
  read('../js/app.js'),
  read('../js/icon-upgrade.mjs'),
  read('../js/core.mjs'),
  read('../css/venue-detail.css'),
  read('../css/venue-profile.css'),
  read('../css/watch-party-form.css'),
  read('../js/shell-controls.mjs'),
  read('../js/watch-party-display.js'),
  read('../js/watch-party-form.js'),
  read('../js/cal-bar-nomination.js'),
  read('../js/listing-update.js'),
  read('./fixtures/public-snapshot.synthetic.json')
]);
const fixture = JSON.parse(fixtureText);

test('one Venue Profile builder serves mobile Detail and the desktop rail', () => {
  assert.match(app, /function placeVenueProfile\(mobile\)[\s\S]*dom\.detailShell\.append\(dom\.venueDetail\)[\s\S]*dom\.traySelected\.replaceChildren\(dom\.venueDetail\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*placeVenueProfile\(mobile\)[\s\S]*createBadges\(venue, party\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*createDetailContribution\(\)[\s\S]*createDetailActionRow\(venue\)/);
  assert.doesNotMatch(app, /function renderDetailView\(/);
  assert.doesNotMatch(app, /function createDetailBadges\(/);
});

test('desktop Venue selection keeps the map active and opens the complete Profile', () => {
  assert.match(app, /function selectVenue\(venueId\)[\s\S]*if \(!isMobileLayout\(\)\) \{[\s\S]*state\.detailMode = true[\s\S]*updateRouteForGame\(\)[\s\S]*renderAll\(\)/);
  assert.match(app, /function renderVenueProfile\(\)[\s\S]*if \(mobile\) \{[\s\S]*dom\.mapView\.hidden = true[\s\S]*\} else \{[\s\S]*dom\.mapView\.hidden = false[\s\S]*setTrayState\('selected'\)/);
  assert.match(detailCss, /@media \(min-width: 900px\)[\s\S]*#tray-selected > #venue-detail/);
});

test('mobile Back returns to the focused map without manufacturing a desktop Detail transition', () => {
  assert.match(app, /function returnToMapFromDetail\(event\)[\s\S]*if \(!isMobileLayout\(\)\) return;[\s\S]*state\.detailMode = false[\s\S]*setTrayState\('selected'\)[\s\S]*renderAll\(\)[\s\S]*focusReturnedDetailVenue\(venue\)/);
  assert.match(shellControls, /function leaveDetailForCommand\(\)[\s\S]*if \(!isMobileLayout\(\) \|\| !state\?\.detailMode\) return false/);
});

test('direct route and sharing retain canonical game and Venue identity', () => {
  assert.match(app, /const venueSlug = params\.get\('venue'\)/);
  assert.match(app, /const requestedGame = params\.get\('game'\)/);
  assert.match(app, /resolveGameRouteParam\(state\.snapshot\.games, requestedGame\)/);
  assert.match(app, /buildVenueUrl\(venue\.slug, game, location\.href\)/);
});

test('FAN-ADDED remains provenance-only and distinct from CAL BAR', () => {
  assert.match(core, /else if \(venue\?\.verification_status === 'user_added'\) badges\.push\(\{ text: 'FAN-ADDED', kind: 'fan-added' \}\)/);
  assert.match(core, /if \(venue\?\.venue_type === 'cal_bar'\) badges\.push\(\{ text: 'CAL BAR', kind: 'cal' \}\)/);
  assert.match(app, /function createBadges\(venue, party\)[\s\S]*venueBadgeDescriptors\(venue, party\)/);
});

test('Watch Party fixture covers Cal Bar, fan-added, and no-party Venue states', () => {
  const parties = new Set(fixture.watchParties.map((party) => party.venue_id));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'cal_bar' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'community_location' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => !parties.has(venue.venue_id)));
});

test('Watch Party display keeps compact game identity on the shared Profile', () => {
  assert.match(watchPartyDisplay, /function watchPartyGameContext\(snapshot, party\)[\s\S]*gameTitle\(game\)[\s\S]*formatGameDate\(game\)/);
  assert.match(watchPartyDisplay, /appendText\(module, watchPartyGameContext\(snapshot, party\), 'party-game-context'\)/);
  assert.match(watchPartyDisplay, /party-module__report/);
});

test('persistent Profile actions are Fan Intent and text-only Share while Directions stays outside the action row', () => {
  const detailActionSource = app.match(/function createDetailActionRow\(venue\)[\s\S]*?function createDetailContribution/)?.[0] || '';
  assert.match(detailActionSource, /row\.append\(intent, share\)/);
  assert.match(detailActionSource, /detail-share/);
  assert.match(detailActionSource, /share\.textContent = 'Share'/);
  assert.doesNotMatch(detailActionSource, /createIcon\('share'/);
  assert.doesNotMatch(detailActionSource, /directions/i);
});

test('full Venue Profile local maps use zoom 15 at every breakpoint', () => {
  assert.match(app, /map\.dataset\.zoom = '15'/);
  assert.doesNotMatch(app, /map\.dataset\.zoom = isMobileLayout/);
  assert.match(iconUpgrade, /const DETAIL_MAP_ZOOM = 15/);
  assert.match(iconUpgrade, /const configuredZoom = Number\(container\.dataset\.zoom\)/);
});

test('shared Profile polish applies to inline desktop and mobile Detail presentations', () => {
  assert.match(profileCss, /\.venue-detail \.detail-editorial\s*\{/);
  assert.match(profileCss, /\.venue-detail \.detail-editorial h2,\s*\.venue-detail \.detail-fan-experiences h2/);
  assert.match(profileCss, /\.venue-detail \.detail-editorial__copy\s*\{/);
  assert.match(profileCss, /\.detail-fan-experiences__name\s*\{[\s\S]*font-weight: 650/);
  assert.match(profileCss, /\.activity-card:has\(\.bear-count__number\)[\s\S]*grid-template-columns: auto minmax\(0, 1fr\)/);
  assert.match(profileCss, /\.bear-count__number\s*\{[\s\S]*grid-row: 1 \/ span 2/);
  assert.match(watchPartyFormCss, /\.detail-watch-party-cta\s*\{[\s\S]*background: var\(--cgb-white\)[\s\S]*border-top: 1px solid var\(--cgb-neutral-200\)/);
  assert.doesNotMatch(watchPartyFormCss, /detail-watch-party-cta[\s\S]*border-left:\s*4px/);
  assert.match(detailCss, /\.venue-detail > \.party-module[\s\S]*border-left: 4px solid var\(--cgb-gold-400\)/);
});

test('Profile maintenance contributions retain the existing adapters', () => {
  assert.match(watchPartyForm, /Plan a Watch Party/);
  assert.match(watchPartyForm, /maintenance\.before\(section\)/);
  assert.match(calBarNomination, /dataset\.calBarNominationEntry = 'true'/);
  assert.match(listingUpdate, /dataset\.listingUpdateEntry = 'true'/);
});

test('synthetic Venue fixtures retain basic empty and long-content edge cases', () => {
  const counted = new Set(fixture.fanCounts.filter((row) => row.count > 0).map((row) => `${row.game_id}:${row.venue_id}`));
  assert.ok(fixture.venues.some((venue) => !counted.has(`game_2026_01:${venue.venue_id}`)));
  assert.ok(fixture.venues.some((venue) => venue.name.length > 50));
  assert.ok(fixture.venues.some((venue) => venue.address_line_1.length > 35));
});
