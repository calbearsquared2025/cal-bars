import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { selectedAttendanceViewModel } from '../js/selected-profile-renderer.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/public-snapshot.synthetic.json', import.meta.url), 'utf8'));
const game = fixture.games[0];
const venue = fixture.venues[0];

function state(snapshot, selections = {}) {
  return {
    snapshot,
    gameId: game.game_id,
    fanIntent: { selections }
  };
}

test('selected attendance renders the public positive count directly', () => {
  const view = selectedAttendanceViewModel({ state: state(fixture), game, venue });
  assert.equal(view.kind, 'positive');
  assert.equal(view.number, 3);
  assert.equal(view.ariaLabel, '3 Bears watching here');
});

test('selected attendance renders the zero-count invitation directly', () => {
  const snapshot = structuredClone(fixture);
  snapshot.fanCounts = [];
  const zeroVenue = snapshot.venues.find((item) => item.venue_id === 'ven_000004');
  const view = selectedAttendanceViewModel({ state: state(snapshot), game, venue: zeroVenue });
  assert.equal(view.kind, 'empty');
  assert.equal(view.number, 0);
});

test('local active selection cannot visually regress to zero while the aggregate is stale', () => {
  const snapshot = structuredClone(fixture);
  snapshot.fanCounts = [];
  const selectedVenue = snapshot.venues.find((item) => item.venue_id === 'ven_000004');
  const view = selectedAttendanceViewModel({
    state: state(snapshot, { [game.game_id]: selectedVenue.venue_id }),
    game,
    venue: selectedVenue
  });
  assert.equal(view.kind, 'positive');
  assert.equal(view.number, 1);
  assert.equal(view.ariaLabel, '1 Bear watching here');
});

test('completed games retain historical season activity presentation', () => {
  const snapshot = structuredClone(fixture);
  const completedGame = { ...game, game_status: 'completed' };
  snapshot.games[0] = completedGame;
  snapshot.venueSeasonCounts = [{ season: 2026, venue_id: venue.venue_id, count: 5 }];
  const view = selectedAttendanceViewModel({ state: state(snapshot), game: completedGame, venue });
  assert.equal(view.kind, 'completed');
  assert.equal(view.primary, '5 Bears watched Cal games here this season.');
  assert.deepEqual(view.secondary, []);
});
