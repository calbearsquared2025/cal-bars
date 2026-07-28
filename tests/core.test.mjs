import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildVenueUrl,
  formatKickoff,
  getFanCount,
  getHistoryCount,
  markerKind,
  rankVenues,
  selectDefaultGame
} from '../js/core.mjs';

const snapshot = JSON.parse(await readFile(new URL('../data/fallback-v2.json', import.meta.url), 'utf8'));

test('next upcoming game is the default', () => {
  assert.equal(selectDefaultGame(snapshot.games, new Date('2026-07-26T12:00:00Z')).game_id, 'game_2026_01');
});

test('TBD kickoff is displayed without a timestamp', () => {
  const game = snapshot.games.find((item) => item.game_id === 'game_2026_02');
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

test('venue share URL preserves venue and game context', () => {
  const url = new URL(buildVenueUrl('golden-bear-test-pub-berkeley', 'game_2026_01', 'https://example.com/index.html?old=1'));
  assert.equal(url.searchParams.get('venue'), 'golden-bear-test-pub-berkeley');
  assert.equal(url.searchParams.get('game'), 'game_2026_01');
  assert.equal(url.searchParams.has('old'), false);
});
