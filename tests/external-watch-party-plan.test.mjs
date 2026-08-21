import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginExternalWatchPartyPlan,
  resolveExternalWatchPartyPlan,
  selectionsAfterExternalWatchPartyPlan
} from '../js/external-watch-party-plan-core.mjs';

test('Plan a Watch Party requires a selected external place and Game', () => {
  assert.equal(beginExternalWatchPartyPlan({}), null);
  assert.equal(beginExternalWatchPartyPlan({ selected: { placeId: 'maptiler.1' } }), null);
  assert.deepEqual(beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' }
  }), {
    placeId: 'maptiler.1',
    gameId: 'game_1',
    attending: false
  });
});

test('Plan a Watch Party preserves the explicit attendance choice', () => {
  assert.deepEqual(beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' },
    attending: true
  }), {
    placeId: 'maptiler.1',
    gameId: 'game_1',
    attending: true
  });
});

test('planning remains pending while canonical creation is in progress', () => {
  const plan = beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' },
    attending: true
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

test('successful canonical creation resolves the Venue, Game, and attendance choice', () => {
  const plan = beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' },
    attending: false
  });
  const result = resolveExternalWatchPartyPlan(plan, {
    gameId: 'game_1',
    selectedVenueId: 'venue_1',
    externalSearch: { pending: false, selected: null, retry: null, error: null }
  });
  assert.equal(result.pending, null);
  assert.deepEqual(result.committed, {
    venueId: 'venue_1',
    gameId: 'game_1',
    attending: false
  });
  assert.equal(result.failed, false);
});

test('attending external Watch Party flow preserves the new Venue as this browser selection', () => {
  const selections = selectionsAfterExternalWatchPartyPlan(
    { game_old: 'venue_old', game_1: 'venue_previous' },
    { gameId: 'game_1', venueId: 'venue_1', attending: true }
  );
  assert.deepEqual(selections, {
    game_old: 'venue_old',
    game_1: 'venue_1'
  });
});

test('sharing an external Watch Party does not manufacture attendance', () => {
  const original = { game_old: 'venue_old', game_1: 'venue_previous' };
  const selections = selectionsAfterExternalWatchPartyPlan(
    original,
    { gameId: 'game_1', venueId: 'venue_1', attending: false }
  );
  assert.deepEqual(selections, original);
  assert.notEqual(selections, original);
});

test('missing committed context does not alter stored selections', () => {
  const original = { game_1: 'venue_previous' };
  assert.deepEqual(selectionsAfterExternalWatchPartyPlan(original, null), original);
  assert.notEqual(selectionsAfterExternalWatchPartyPlan(original, null), original);
});

test('failed creation does not open the Watch Party Form', () => {
  const plan = beginExternalWatchPartyPlan({
    selected: { placeId: 'maptiler.1', gameId: 'game_1' },
    attending: false
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
    selected: { placeId: 'maptiler.1', gameId: 'game_1' },
    attending: true
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
