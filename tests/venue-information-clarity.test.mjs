import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [app, mobile, css, harness, runner, fixtureText] = await Promise.all([
  read('../js/app.js'),
  read('../js/map-mobile-refinement.mjs'),
  read('../css/design-board-4.css'),
  read('./browser/production-runtime-harness.mjs'),
  read('../scripts/run-browser-harness.mjs'),
  read('./fixtures/public-snapshot.synthetic.json')
]);
const fixture = JSON.parse(fixtureText);

test('selected mini and full profiles share the compact useful-address formatter', () => {
  assert.match(app, /locationLine\.textContent = \[compactVenueLocation\(venue\), formatDistance\(distance\)\]/);
  assert.match(mobile, /\[context, type, compactVenueLocation\(venue\), formatDistance\(distance\)\]/);
});

test('Venue Detail uses canonical opponent and kickoff formatters for direct-route game context', () => {
  assert.match(app, /gameHeading\.textContent = `Cal \$\{gameTitle\(game\)\}`/);
  assert.match(app, /kickoff\.textContent = formatKickoff\(game\)/);
  assert.match(harness, /identify Cal and the selected opponent/);
  assert.match(harness, /preserve known or TBD kickoff context/);
  assert.match(runner, /Production TBD direct-route refresh harness/);
});

test('Watch Party identity coverage includes Cal Bar, Community Location, and no-party states', () => {
  const parties = new Set(fixture.watchParties.map((party) => party.venue_id));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'cal_bar' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => venue.venue_type === 'community_location' && parties.has(venue.venue_id)));
  assert.ok(fixture.venues.some((venue) => !parties.has(venue.venue_id)));
  assert.match(harness, /Watch Party at a Community Location should remain distinct from a Cal Bar/);
});

test('edge fixtures cover zero Bears plus long Venue name and address', () => {
  const counted = new Set(fixture.fanCounts.filter((row) => row.count > 0).map((row) => `${row.game_id}:${row.venue_id}`));
  assert.ok(fixture.venues.some((venue) => !counted.has(`game_2026_01:${venue.venue_id}`)));
  assert.ok(fixture.venues.some((venue) => venue.name.length > 50));
  assert.ok(fixture.venues.some((venue) => venue.address_line_1.length > 35));
});

test('no-photo is explicit while existing photo data remains eligible for the existing hero path', () => {
  assert.match(app, /venue\.photo_url \? '' : ' detail-hero--no-photo'/);
  assert.match(css, /detail-hero\.detail-hero--no-photo[\s\S]*min-height: 0/);
  assert.match(harness, /No-photo detail should not reserve most of the initial viewport/);
});

test('browser coverage retains direct refresh, portrait, short landscape, and desktop invariants', () => {
  assert.match(runner, /windowSize = '390,844'/);
  assert.match(runner, /windowSize: '844,390'/);
  assert.match(runner, /windowSize: '1440,900'/);
  assert.match(runner, /Production direct-route refresh harness/);
  assert.match(harness, /Short landscape should not create horizontal document overflow/);
  assert.match(harness, /Desktop shell should not create horizontal document overflow/);
});
