import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeSnapshotIds,
  canonicalizeStoredSelections,
  resolveSnapshotId,
  rewriteLegacyGameQuery
} from '../js/id-alias-core.mjs';

const snapshot = {
  schemaVersion: '2.0',
  venues: [{ venue_id: 'ven_1360954160984546' }],
  games: [{ game_id: 'game_2026_01' }],
  watchParties: [{
    watch_party_id: 'wp_bde7440739a143b1a1eee89c',
    venue_id: 'ven_1360954160984546',
    game_id: 'game_2026_01'
  }],
  fanCounts: [{ venue_id: 'ven_1360954160984546', game_id: 'game_2026_01', count: 1 }],
  venueHistoryCounts: [{ venue_id: 'ven_1360954160984546', past_game_count: 1 }],
  idAliases: {
    venues: { ven_1360954160984546: 'venue_7cbf6f0f2c33a2462d3da467' },
    games: { game_2026_01: 'game_9e8f4860c6a256c0fae6007d' }
  }
};

test('snapshot aliases resolve directly and preserve unknown canonical candidates', () => {
  assert.equal(
    resolveSnapshotId(snapshot, 'venue', 'ven_1360954160984546'),
    'venue_7cbf6f0f2c33a2462d3da467'
  );
  assert.equal(
    resolveSnapshotId(snapshot, 'game', 'game_9e8f4860c6a256c0fae6007d'),
    'game_9e8f4860c6a256c0fae6007d'
  );
});

test('snapshot canonicalization updates primary and foreign keys without mutating input', () => {
  const canonical = canonicalizeSnapshotIds(snapshot);
  assert.equal(snapshot.venues[0].venue_id, 'ven_1360954160984546');
  assert.equal(canonical.venues[0].venue_id, 'venue_7cbf6f0f2c33a2462d3da467');
  assert.equal(canonical.games[0].game_id, 'game_9e8f4860c6a256c0fae6007d');
  assert.equal(canonical.watchParties[0].venue_id, canonical.venues[0].venue_id);
  assert.equal(canonical.watchParties[0].game_id, canonical.games[0].game_id);
  assert.equal(canonical.fanCounts[0].venue_id, canonical.venues[0].venue_id);
  assert.equal(canonical.venueHistoryCounts[0].venue_id, canonical.venues[0].venue_id);
});

test('browser selections are migrated to canonical game and venue IDs', () => {
  assert.deepEqual(
    canonicalizeStoredSelections(snapshot, {
      game_2026_01: 'ven_1360954160984546'
    }),
    {
      game_9e8f4860c6a256c0fae6007d: 'venue_7cbf6f0f2c33a2462d3da467'
    }
  );
});

test('legacy game query is rewritten before route selection', () => {
  const calls = [];
  const locationLike = { href: 'https://example.test/?game=game_2026_01&venue=example' };
  const historyLike = {
    state: { test: true },
    replaceState(state, title, url) { calls.push({ state, title, url: String(url) }); }
  };

  assert.equal(rewriteLegacyGameQuery(snapshot, locationLike, historyLike), true);
  assert.equal(calls.length, 1);
  assert.equal(
    new URL(calls[0].url).searchParams.get('game'),
    'game_9e8f4860c6a256c0fae6007d'
  );
  assert.equal(new URL(calls[0].url).searchParams.get('venue'), 'example');
});
