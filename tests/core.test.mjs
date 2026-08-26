import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildGameUrl,
  buildVenueUrl,
  findExactVenueMatch,
  formatKickoff,
  getFanCount,
  getHistoryCount,
  markerKind,
  NEARBY_RADIUS_MILES,
  rankNearbyVenues,
  rankVenues,
  selectDefaultGame
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

test('game and venue URLs preserve readable selected-game context', () => {
  const gameUrl = new URL(buildGameUrl(uclaGame, 'https://example.com/index.html?old=1'));
  const venueUrl = new URL(buildVenueUrl('golden-bear-test-pub-berkeley', uclaGame, 'https://example.com/index.html?old=1'));
  assert.equal(gameUrl.searchParams.get('game'), 'ucla');
  assert.equal(venueUrl.searchParams.get('venue'), 'golden-bear-test-pub-berkeley');
  assert.equal(venueUrl.searchParams.get('game'), 'ucla');
});

test('TBD kickoff is displayed without a timestamp', () => {
  const game = snapshot.games.find((item) => item.kickoff_status === 'tbd');
  assert.ok(game);
  assert.match(formatKickoff(game, 'en-US'), /Time TBD/);
});

test('selected-game activity and venue type drive marker and result priority', () => {
  const calBar = snapshot.venues.find((item) => item.venue_id === 'ven_000001');
  const communityLocation = snapshot.venues.find((item) => item.venue_id === 'ven_000004');
  assert.equal(markerKind(snapshot, UCLA_GAME_ID, calBar), 'watch-party');
  assert.equal(markerKind(snapshot, SYRACUSE_GAME_ID, calBar), 'cal-bar');
  assert.equal(markerKind(snapshot, UCLA_GAME_ID, communityLocation), 'community-location');

  const ranked = rankVenues(snapshot, UCLA_GAME_ID);
  assert.equal(ranked[0].category, 0);
  assert.ok(ranked.findIndex((item) => item.category === 1) < ranked.findIndex((item) => item.category === 2));
});

test('public aggregate counts resolve by game and venue', () => {
  assert.equal(getFanCount(snapshot, UCLA_GAME_ID, 'ven_000001'), 3);
  assert.equal(getHistoryCount(snapshot, 'ven_000001'), 5);
});

test('venue search distinguishes exact venue selection from city or ZIP filtering', () => {
  assert.equal(findExactVenueMatch(snapshot.venues, 'golden bear test pub')?.venue_id, 'ven_000001');
  assert.equal(findExactVenueMatch(snapshot.venues, 'Berkeley'), null);
  assert.equal(findExactVenueMatch(snapshot.venues, '94704'), null);
  assert.equal(rankVenues(snapshot, UCLA_GAME_ID, null, 'Berkeley').length, 1);
});

test('nearby ranking excludes venues outside the product radius', () => {
  const radiusSnapshot = {
    ...snapshot,
    venues: snapshot.venues.map((venue, index) => index === 0
      ? { ...venue, latitude: 37.8717, longitude: -122.2728 }
      : { ...venue, latitude: 34.0522 + index / 100, longitude: -118.2437 })
  };
  const nearby = rankNearbyVenues(radiusSnapshot, UCLA_GAME_ID, { lat: 37.8717, lon: -122.2728 });
  assert.deepEqual(nearby.map(({ venue }) => venue.venue_id), ['ven_000001']);
  assert.ok(nearby.every(({ distance }) => distance <= NEARBY_RADIUS_MILES));
});
