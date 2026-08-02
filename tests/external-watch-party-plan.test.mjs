import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginExternalWatchPartyPlan,
  resolveExternalWatchPartyPlan
} from '../js/external-watch-party-plan-core.mjs';

test('Plan a Watch Party requires a selected external place and Game', () => {
  assert.equal(beginExternalWatchPartyPlan({}), null);
  assert.equal(beginExternalWatchPartyPlan({ selected: { placeId: 'maptiler.1' } }), null);
  assert.deepEqual(beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' }
  }), {
    placeId: 'maptiler.1',
    gameId: 'game_1'
  });
});

test('planning remains pending while canonical creation is in progress', () => {
  const plan = beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' }
  });
  const result = resolveExternalWatchPartyPlan(plan, {
    gameId: 'game_1',
    selectedVenueId: null,
    externalSearch: { pending: true, selected: { placeId: 'maptiler.1' }, retry: null }
  });
  assert.equal(result.pending, plan);
  assert.equal(result.committed, null);
  assert.equal(result.failed, false);
});

test('successful canonical creation resolves the Venue and selected Game', () => {
  const plan = beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' }
  });
  const result = resolveExternalWatchPartyPlan(plan, {
    gameId: 'game_1',
    selectedVenueId: 'venue_1',
    externalSearch: { pending: false, selected: null, retry: null, error: null }
  });
  assert.equal(result.pending, null);
  assert.deepEqual(result.committed, { venueId: 'venue_1', gameId: 'game_1' });
  assert.equal(result.failed, false);
});

test('failed creation does not open the Watch Party Form', () => {
  const plan = beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' }
  });
  const result = resolveExternalWatchPartyPlan(plan, {
    gameId: 'game_1',
    selectedVenueId: null,
    externalSearch: {
      pending: false,
      selected: { placeId: 'maptiler.1' },
      retry: { placeId: 'maptiler.1' },
      error: 'Try again.'
    }
  });
  assert.equal(result.pending, null);
  assert.equal(result.committed, null);
  assert.equal(result.failed, true);
});

test('selected-Game change cancels a mismatched Form launch', () => {
  const plan = beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' }
  });
  const result = resolveExternalWatchPartyPlan(plan, {
    gameId: 'game_2',
    selectedVenueId: 'venue_1',
    externalSearch: { pending: false, selected: null, retry: null, error: null }
  });
  assert.equal(result.committed, null);
  assert.equal(result.pending, null);
  assert.equal(result.failed, true);
});
