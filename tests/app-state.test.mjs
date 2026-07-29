import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appState,
  resetAppStateForTests,
  restoreSelectedVenueFromFanIntent,
  setCanonicalSnapshot
} from '../js/app-state.mjs';
import { rankVenues } from '../js/core.mjs';

function snapshot(counts = []) {
  return {
    schemaVersion: '2.0',
    venues: [
      {
        venue_id: 'ven_1',
        name: 'One',
        venue_type: 'community_location',
        latitude: 1,
        longitude: 1
      },
      {
        venue_id: 'ven_2',
        name: 'Two',
        venue_type: 'community_location',
        latitude: 2,
        longitude: 2
      }
    ],
    games: [{ game_id: 'game_1' }, { game_id: 'game_2' }],
    watchParties: [],
    fanCounts: counts,
    venueHistoryCounts: [],
    generatedAt: 'one'
  };
}

test('one canonical snapshot object is retained while public arrays are refreshed', () => {
  resetAppStateForTests();
  const first = setCanonicalSnapshot(snapshot([
    { game_id: 'game_1', venue_id: 'ven_1', count: 1 }
  ]), 'fallback');
  const secondPayload = snapshot([
    { game_id: 'game_1', venue_id: 'ven_2', count: 5 }
  ]);
  secondPayload.generatedAt = 'two';

  const second = setCanonicalSnapshot(secondPayload, 'live');

  assert.strictEqual(second, first);
  assert.strictEqual(appState.snapshot, first);
  assert.deepEqual(appState.snapshot.fanCounts, secondPayload.fanCounts);
  assert.equal(appState.snapshot.generatedAt, 'two');
});

test('game switching restores the selection for the current canonical game', () => {
  resetAppStateForTests();
  setCanonicalSnapshot(snapshot());
  appState.fanIntent.selections = { game_1: 'ven_1', game_2: 'ven_2' };

  appState.gameId = 'game_1';
  restoreSelectedVenueFromFanIntent();
  assert.equal(appState.selectedVenueId, 'ven_1');

  appState.gameId = 'game_2';
  restoreSelectedVenueFromFanIntent();
  assert.equal(appState.selectedVenueId, 'ven_2');
});

test('venue ranking reflects updated canonical fan counts', () => {
  resetAppStateForTests();
  setCanonicalSnapshot(snapshot([
    { game_id: 'game_1', venue_id: 'ven_1', count: 1 },
    { game_id: 'game_1', venue_id: 'ven_2', count: 4 }
  ]));
  assert.deepEqual(
    rankVenues(appState.snapshot, 'game_1').map(({ venue }) => venue.venue_id),
    ['ven_2', 'ven_1']
  );

  appState.snapshot.fanCounts = [
    { game_id: 'game_1', venue_id: 'ven_1', count: 9 }
  ];
  assert.deepEqual(
    rankVenues(appState.snapshot, 'game_1').map(({ venue }) => venue.venue_id),
    ['ven_1', 'ven_2']
  );
});
