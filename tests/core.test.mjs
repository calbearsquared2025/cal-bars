import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  bearCountCopy,
  buildVenueUrl,
  calculateMinimalPan,
  findExactVenueMatch,
  formatKickoff,
  gameTitle,
  getFanCount,
  getHistoryCount,
  markerKind,
  NEARBY_RADIUS_MILES,
  rankNearbyVenues,
  rankVenues,
  resolveTrayState,
  selectDefaultGame,
  shareOrCopy,
  venueBadgeDescriptors
} from '../js/core.mjs';

const snapshot = JSON.parse(await readFile(new URL('../data/fallback-v2.json', import.meta.url), 'utf8'));

test('next upcoming game is the default', () => {
  assert.equal(selectDefaultGame(snapshot.games, new Date('2026-07-26T12:00:00Z')).game_id, 'game_2026_01');
});

test('game titles use the single canonical opponent name', () => {
  assert.equal(gameTitle({ opponent_name: 'North Carolina State', home_away: 'away' }), 'at North Carolina State');
});

test('TBD kickoff is displayed without a timestamp', () => {
  const game = snapshot.games.find((item) => item.kickoff_status === 'tbd');
  assert.ok(game);
  assert.match(formatKickoff(game, 'en-US'), /Time TBD/);
});

test('selected-game watch party determines marker treatment', () => {
  const venue = snapshot.venues.find((item) => item.venue_id === 'ven_000001');
  assert.equal(markerKind(snapshot, 'game_2026_01', venue), 'watch-party');
  assert.equal(markerKind(snapshot, 'game_2026_02', venue), 'cal-bar');
});

test('rank order is Watch Party, Cal Bar, then Community Location', () => {
  const ranked = rankVenues(snapshot, 'game_2026_01');
  assert.equal(ranked[0].category, 0);
  assert.ok(ranked.findIndex((item) => item.category === 1) < ranked.findIndex((item) => item.category === 2));
});

test('public aggregate counts are resolved by game and venue', () => {
  assert.equal(getFanCount(snapshot, 'game_2026_01', 'ven_000001'), 3);
  assert.equal(getHistoryCount(snapshot, 'ven_000001'), 5);
});

test('Bear count copy is explicit for zero, singular, and plural counts', () => {
  assert.equal(bearCountCopy(0), 'No Bears are watching here yet. Be the first.');
  assert.equal(bearCountCopy(1), '1 Bear watching here');
  assert.equal(bearCountCopy(3), '3 Bears watching here');
});

test('Watch Party and permanent venue badges are independent', () => {
  const calBar = { venue_type: 'cal_bar' };
  const communityLocation = { venue_type: 'community_location' };
  const party = { watch_party_id: 'wp_test' };

  assert.deepEqual(venueBadgeDescriptors(calBar, party), [
    { text: 'WATCH PARTY', kind: 'party' },
    { text: 'CAL BAR', kind: 'cal' }
  ]);
  assert.deepEqual(venueBadgeDescriptors(communityLocation, party), [
    { text: 'WATCH PARTY', kind: 'party' },
    { text: 'COMMUNITY LOCATION', kind: 'community' }
  ]);
  assert.deepEqual(venueBadgeDescriptors(calBar, null), [
    { text: 'CAL BAR', kind: 'cal' }
  ]);
});

test('exact venue matching does not treat city or ZIP searches as a venue selection', () => {
  assert.equal(findExactVenueMatch(snapshot.venues, 'Golden Bear Test Pub')?.venue_id, 'ven_000001');
  assert.equal(findExactVenueMatch(snapshot.venues, 'golden bear test pub')?.venue_id, 'ven_000001');
  assert.equal(findExactVenueMatch(snapshot.venues, 'Berkeley'), null);
  assert.equal(findExactVenueMatch(snapshot.venues, '94704'), null);
  assert.equal(rankVenues(snapshot, 'game_2026_01', null, 'Berkeley').length, 1);
  assert.equal(rankVenues(snapshot, 'game_2026_01', null, 'CA').length, 4);
});

test('nearby results use the approved 25-mile boundary', () => {
  assert.equal(NEARBY_RADIUS_MILES, 25);
  const radiusSnapshot = {
    ...snapshot,
    venues: snapshot.venues.map((venue, index) => index === 0
      ? { ...venue, latitude: 37.8717, longitude: -122.2728 }
      : { ...venue, latitude: 34.0522 + index / 100, longitude: -118.2437 })
  };
  const nearby = rankNearbyVenues(radiusSnapshot, 'game_2026_01', { lat: 37.8717, lon: -122.2728 });
  assert.deepEqual(nearby.map(({ venue }) => venue.venue_id), ['ven_000001']);
  assert.ok(nearby.every(({ distance }) => distance <= NEARBY_RADIUS_MILES));
  assert.equal(rankNearbyVenues(radiusSnapshot, 'game_2026_01', { lat: 40.7128, lon: -74.0060 }).length, 0);
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

test('minimal pan does not move a visible selected marker', () => {
  assert.deepEqual(calculateMinimalPan({
    point: { x: 180, y: 280 },
    viewport: { width: 390, height: 700 },
    insets: { top: 130, right: 16, bottom: 300, left: 16 }
  }), { x: 0, y: 0 });
});

test('minimal pan moves a marker only above the actual tray boundary', () => {
  const shorterTray = calculateMinimalPan({
    point: { x: 180, y: 600 },
    viewport: { width: 390, height: 700 },
    insets: { top: 130, right: 16, bottom: 200, left: 16 }
  });
  const tallerTray = calculateMinimalPan({
    point: { x: 180, y: 600 },
    viewport: { width: 390, height: 700 },
    insets: { top: 130, right: 16, bottom: 350, left: 16 }
  });

  assert.deepEqual(shorterTray, { x: 0, y: -112 });
  assert.deepEqual(tallerTray, { x: 0, y: -262 });
});

test('minimal pan brings an offscreen marker into the horizontal safe area', () => {
  assert.deepEqual(calculateMinimalPan({
    point: { x: -20, y: 250 },
    viewport: { width: 390, height: 700 },
    insets: { top: 120, right: 16, bottom: 250, left: 16 }
  }), { x: 67, y: 0 });
});

test('native share success remains the first sharing path', async () => {
  let clipboardCalled = false;
  const result = await shareOrCopy({
    payload: { url: 'https://example.com' },
    url: 'https://example.com',
    share: async () => {},
    writeClipboard: async (url) => { clipboardCalled = true; }
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
    url: 'https://example.com/?venue=test&game=game_1',
    legacyCopy: async () => true
  });
  assert.deepEqual(result, { method: 'legacy-copy' });
});

test('Clipboard API copies when native sharing is unavailable', async () => {
  let copied = '';
  const result = await shareOrCopy({
    url: 'https://example.com/?venue=test&game=game_1',
    writeClipboard: async (url) => { copied = url; }
  });
  assert.deepEqual(result, { method: 'clipboard' });
  assert.equal(copied, 'https://example.com/?venue=test&game=game_1');
});

test('Clipboard rejection uses the non-Clipboard copy fallback', async () => {
  const result = await shareOrCopy({
    url: 'https://example.com/?venue=test&game=game_1',
    writeClipboard: async () => { throw new Error('denied'); },
    legacyCopy: async () => true
  });
  assert.deepEqual(result, { method: 'legacy-copy' });
});

test('failed automatic copy preserves the complete URL for manual copying', async () => {
  const url = 'https://example.com/?venue=test&game=game_1';
  const result = await shareOrCopy({
    url,
    writeClipboard: async () => { throw new Error('denied'); },
    legacyCopy: async () => false
  });
  assert.deepEqual(result, { method: 'manual', url });
});

test('venue share URL preserves venue and game context', () => {
  const url = new URL(buildVenueUrl('golden-bear-test-pub-berkeley', 'game_2026_01', 'https://example.com/index.html?old=1'));
  assert.equal(url.searchParams.get('venue'), 'golden-bear-test-pub-berkeley');
  assert.equal(url.searchParams.get('game'), 'game_2026_01');
  assert.equal(url.searchParams.has('old'), false);
});
