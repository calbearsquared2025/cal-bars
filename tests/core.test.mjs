import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  bearCountCopy,
  buildGameUrl,
  buildVenueUrl,
  calculateMinimalPan,
  compactVenueLocation,
  findExactVenueMatch,
  formatKickoff,
  gameRouteParam,
  gameTitle,
  getFanCount,
  getHistoryCount,
  markerKind,
  NEARBY_RADIUS_MILES,
  rankNearbyVenues,
  rankVenues,
  resolveGameRouteParam,
  resolveTrayState,
  selectDefaultGame,
  shareOrCopy,
  venueBadgeDescriptors,
  venueTypeLabel
} from '../js/core.mjs';

const snapshot = JSON.parse(
  await readFile(new URL('./fixtures/public-snapshot.synthetic.json', import.meta.url), 'utf8')
);
const uclaGame = snapshot.games.find((game) => game.opponent_name === 'UCLA');
const syracuseGame = snapshot.games.find((game) => game.opponent_name === 'Syracuse');
const UCLA_GAME_ID = uclaGame?.game_id;
const SYRACUSE_GAME_ID = syracuseGame?.game_id;

test('next upcoming game is the default', () => {
  assert.equal(selectDefaultGame(snapshot.games, new Date('2026-07-26T12:00:00Z')).game_id, UCLA_GAME_ID);
});

test('game titles use the single canonical opponent name', () => {
  assert.equal(gameTitle({ opponent_name: 'North Carolina State', home_away: 'away' }), 'at North Carolina State');
});

test('game routes use opponent-name slugs only', () => {
  assert.equal(gameRouteParam(uclaGame), 'ucla');
  assert.equal(gameRouteParam({ game_id: 'game_test', opponent_name: 'Boston College' }), 'boston-college');
  assert.equal(gameRouteParam({ game_id: 'game_test', opponent_name: "Saint Mary's" }), 'saint-marys');
  assert.equal(gameRouteParam({ game_id: 'game_test', opponent_name: '' }), '');
  assert.equal(resolveGameRouteParam(snapshot.games, 'ucla')?.game_id, UCLA_GAME_ID);
  assert.equal(resolveGameRouteParam(snapshot.games, 'UCLA')?.game_id, UCLA_GAME_ID);
  assert.equal(resolveGameRouteParam(snapshot.games, 'game_2026_01'), null);
  assert.equal(resolveGameRouteParam(snapshot.games, 'not-a-game'), null);
});

test('game and venue URLs expose the opponent slug instead of the canonical game ID', () => {
  const gameUrl = new URL(buildGameUrl(uclaGame, 'https://example.com/index.html?old=1'));
  const venueUrl = new URL(buildVenueUrl('golden-bear-test-pub-berkeley', uclaGame, 'https://example.com/index.html?old=1'));
  assert.equal(gameUrl.searchParams.get('game'), 'ucla');
  assert.equal(venueUrl.searchParams.get('venue'), 'golden-bear-test-pub-berkeley');
  assert.equal(venueUrl.searchParams.get('game'), 'ucla');
  assert.equal(venueUrl.searchParams.has('old'), false);
});

test('compact venue location uses street and locality without postal-address noise', () => {
  assert.equal(compactVenueLocation({
    address_line_1: '12345 A Very Long Boulevard Name',
    address_line_2: 'Suite 900',
    city: 'San Francisco',
    region: 'CA',
    postal_code: '94103'
  }), '12345 A Very Long Boulevard Name · San Francisco, CA');
});

test('TBD kickoff is displayed without a timestamp', () => {
  const game = snapshot.games.find((item) => item.kickoff_status === 'tbd');
  assert.ok(game);
  assert.match(formatKickoff(game, 'en-US'), /Time TBD/);
});

test('selected-game events and internal venue type determine marker treatment', () => {
  const calBar = snapshot.venues.find((item) => item.venue_id === 'ven_000001');
  const communityLocation = snapshot.venues.find((item) => item.venue_id === 'ven_000003');
  const communityLocationWithoutParty = snapshot.venues.find((item) => item.venue_id === 'ven_000004');
  assert.equal(markerKind(snapshot, UCLA_GAME_ID, calBar), 'watch-party');
  assert.equal(markerKind(snapshot, SYRACUSE_GAME_ID, calBar), 'cal-bar');
  assert.equal(markerKind(snapshot, UCLA_GAME_ID, communityLocation), 'watch-party');
  assert.equal(markerKind(snapshot, UCLA_GAME_ID, communityLocationWithoutParty), 'community-location');
});

test('rank order is Watch Party, Cal Bar, then Community Location', () => {
  const ranked = rankVenues(snapshot, UCLA_GAME_ID);
  assert.equal(ranked[0].category, 0);
  assert.ok(ranked.findIndex((item) => item.category === 1) < ranked.findIndex((item) => item.category === 2));
});

test('public aggregate counts are resolved by game and venue', () => {
  assert.equal(getFanCount(snapshot, UCLA_GAME_ID, 'ven_000001'), 3);
  assert.equal(getHistoryCount(snapshot, 'ven_000001'), 5);
});

test('Bear count copy is explicit for zero, singular, and plural counts', () => {
  assert.equal(bearCountCopy(0), 'No Bears have committed to watch here yet.');
  assert.equal(bearCountCopy(1), '1 Bear watching here');
  assert.equal(bearCountCopy(3), '3 Bears watching here');
});

test('Fan-Added presentation comes only from user-added provenance', () => {
  const calBar = { venue_type: 'cal_bar' };
  const userAddedCalBar = { venue_type: 'cal_bar', verification_status: 'user_added' };
  const communityLocation = { venue_type: 'community_location' };
  const userAddedCommunityLocation = { venue_type: 'community_location', verification_status: 'user_added' };
  const party = { watch_party_id: 'wp_test' };

  assert.equal(venueTypeLabel(calBar), 'CAL BAR');
  assert.equal(venueTypeLabel(communityLocation), 'COMMUNITY LOCATION');
  assert.deepEqual(venueBadgeDescriptors(calBar, party), [
    { text: 'WATCH PARTY', kind: 'party' },
    { text: 'CAL BAR', kind: 'cal' }
  ]);
  assert.deepEqual(venueBadgeDescriptors(communityLocation, party), [
    { text: 'WATCH PARTY', kind: 'party' }
  ]);
  assert.deepEqual(venueBadgeDescriptors(userAddedCommunityLocation, party), [
    { text: 'WATCH PARTY', kind: 'party' },
    { text: 'FAN-ADDED', kind: 'fan-added' }
  ]);
  assert.deepEqual(venueBadgeDescriptors(communityLocation, null), []);
  assert.deepEqual(venueBadgeDescriptors(userAddedCommunityLocation, null), [
    { text: 'FAN-ADDED', kind: 'fan-added' }
  ]);
  assert.deepEqual(venueBadgeDescriptors(userAddedCalBar, null), [
    { text: 'CAL BAR', kind: 'cal' }
  ]);
});

test('exact venue matching does not treat city or ZIP searches as a venue selection', () => {
  assert.equal(findExactVenueMatch(snapshot.venues, 'Golden Bear Test Pub')?.venue_id, 'ven_000001');
  assert.equal(findExactVenueMatch(snapshot.venues, 'golden bear test pub')?.venue_id, 'ven_000001');
  assert.equal(findExactVenueMatch(snapshot.venues, 'Berkeley'), null);
  assert.equal(findExactVenueMatch(snapshot.venues, '94704'), null);
  assert.equal(rankVenues(snapshot, UCLA_GAME_ID, null, 'Berkeley').length, 1);
  assert.equal(rankVenues(snapshot, UCLA_GAME_ID, null, 'CA').length, 4);
});

test('nearby results use the approved 25-mile boundary', () => {
  assert.equal(NEARBY_RADIUS_MILES, 25);
  const radiusSnapshot = {
    ...snapshot,
    venues: snapshot.venues.map((venue, index) => index === 0
      ? { ...venue, latitude: 37.8717, longitude: -122.2728 }
      : { ...venue, latitude: 34.0522 + index / 100, longitude: -118.2437 })
  };
  const nearby = rankNearbyVenues(radiusSnapshot, UCLA_GAME_ID, { lat: 37.8717, lon: -122.2728 });
  assert.deepEqual(nearby.map(({ venue }) => venue.venue_id), ['ven_000001']);
  assert.ok(nearby.every(({ distance }) => distance <= NEARBY_RADIUS_MILES));
  assert.equal(rankNearbyVenues(radiusSnapshot, UCLA_GAME_ID, { lat: 40.7128, lon: -74.0060 }).length, 0);
});

test('tray state transitions expose all states through up, down, and toggle actions', () => {
  assert.equal(resolveTrayState('peek', 'up', false), 'full');
  assert.equal(resolveTrayState('peek', 'up', true), 'selected');
  assert.equal(resolveTrayState('selected', 'up', true), 'full');
  assert.equal(resolveTrayState('full', 'down', true), 'selected');
  assert.equal(resolveTrayState('selected', 'down', true), 'peek');
  assert.equal(resolveTrayState('full', 'down', false), 'peek');
  assert.equal(resolveTrayState('peek', 'toggle', true), 'selected');
  assert.equal(resolveTrayState('selected', 'toggle', true), 'full');
  assert.equal(resolveTrayState('full', 'toggle', true), 'selected');
});

test('selected marker inside the comfort zone remains stable', () => {
  assert.deepEqual(calculateMinimalPan({
    point: { x: 180, y: 280 },
    viewport: { width: 390, height: 700 },
    insets: { top: 130, right: 16, bottom: 300, left: 16 }
  }), { x: 0, y: 0 });
});

test('mobile selected marker recenters within the exposed area above the tray', () => {
  const shorterTray = calculateMinimalPan({
    point: { x: 195, y: 430 },
    viewport: { width: 390, height: 700 },
    insets: { top: 100, right: 16, bottom: 220, left: 16 }
  });
  const tallerTray = calculateMinimalPan({
    point: { x: 195, y: 430 },
    viewport: { width: 390, height: 700 },
    insets: { top: 100, right: 16, bottom: 340, left: 16 }
  });

  assert.deepEqual(shorterTray, { x: 0, y: -116 });
  assert.deepEqual(tallerTray, { x: 0, y: -176 });
});

test('desktop selected marker near the profile rail recenters left into the usable map area', () => {
  assert.deepEqual(calculateMinimalPan({
    point: { x: 850, y: 424 },
    viewport: { width: 1400, height: 800 },
    insets: { top: 16, right: 440, bottom: 16, left: 16 }
  }), { x: -362, y: 0 });

  assert.deepEqual(calculateMinimalPan({
    point: { x: 700, y: 424 },
    viewport: { width: 1400, height: 800 },
    insets: { top: 16, right: 440, bottom: 16, left: 16 }
  }), { x: 0, y: 0 });
});

test('offscreen marker recenters instead of hugging the nearest safe-area edge', () => {
  assert.deepEqual(calculateMinimalPan({
    point: { x: -20, y: 250 },
    viewport: { width: 390, height: 700 },
    insets: { top: 120, right: 16, bottom: 250, left: 16 }
  }), { x: 215, y: 59 });
});

test('native share success remains the first sharing path', async () => {
  let clipboardCalled = false;
  const result = await shareOrCopy({
    payload: { url: 'https://example.com' },
    url: 'https://example.com',
    share: async () => {},
    writeClipboard: async () => { clipboardCalled = true; }
  });
  assert.deepEqual(result, { method: 'share' });
  assert.equal(clipboardCalled, false);
});

test('native share failure falls through to the Clipboard API', async () => {
  let copied = '';
  const result = await shareOrCopy({
    payload: { url: 'https://example.com' },
    url: 'https://example.com',
    share: async () => { throw new Error('share unavailable'); },
    writeClipboard: async (url) => { copied = url; }
  });
  assert.deepEqual(result, { method: 'clipboard' });
  assert.equal(copied, 'https://example.com');
});

test('missing Clipboard API uses the non-Clipboard copy fallback', async () => {
  const result = await shareOrCopy({
    url: 'https://example.com/?venue=test&game=ucla',
    legacyCopy: async () => true
  });
  assert.deepEqual(result, { method: 'legacy-copy' });
});

test('Clipboard API copies when native sharing is unavailable', async () => {
  let copied = '';
  const result = await shareOrCopy({
    url: 'https://example.com/?venue=test&game=ucla',
    writeClipboard: async (url) => { copied = url; }
  });
  assert.deepEqual(result, { method: 'clipboard' });
  assert.equal(copied, 'https://example.com/?venue=test&game=ucla');
});

test('Clipboard rejection uses the non-Clipboard copy fallback', async () => {
  const result = await shareOrCopy({
    url: 'https://example.com/?venue=test&game=ucla',
    writeClipboard: async () => { throw new Error('denied'); },
    legacyCopy: async () => true
  });
  assert.deepEqual(result, { method: 'legacy-copy' });
});

test('failed automatic copy preserves the complete URL for manual copying', async () => {
  const url = 'https://example.com/?venue=test&game=ucla';
  const result = await shareOrCopy({
    url,
    writeClipboard: async () => { throw new Error('denied'); },
    legacyCopy: async () => false
  });
  assert.deepEqual(result, { method: 'manual', url });
});

test('venue share URL preserves venue and readable game context', () => {
  const url = new URL(buildVenueUrl('golden-bear-test-pub-berkeley', uclaGame, 'https://example.com/index.html?old=1'));
  assert.equal(url.searchParams.get('venue'), 'golden-bear-test-pub-berkeley');
  assert.equal(url.searchParams.get('game'), 'ucla');
  assert.equal(url.searchParams.has('old'), false);
});