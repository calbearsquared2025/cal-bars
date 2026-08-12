import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_ID_PATTERNS,
  deterministicCanonicalId,
  isCanonicalId,
  validateCanonicalSnapshotIds
} from '../scripts/canonical-id-contract.mjs';

test('approved canonical ID grammar is entity-prefixed lowercase 24-hex', () => {
  assert.match('venue_7cbf6f0f2c33a2462d3da467', CANONICAL_ID_PATTERNS.venue);
  assert.match('game_9e8f4860c6a256c0fae6007d', CANONICAL_ID_PATTERNS.game);
  assert.match('wp_bde7440739a143b1a1eee89c', CANONICAL_ID_PATTERNS.watchParty);
  assert.match('fi_0123456789abcdef01234567', CANONICAL_ID_PATTERNS.fanIntent);
  assert.doesNotMatch('ven_1360954160984546', CANONICAL_ID_PATTERNS.venue);
  assert.doesNotMatch('game_2026_01', CANONICAL_ID_PATTERNS.game);
  assert.doesNotMatch('venue_8309cdb6-63da-48e0-97de-368631f62b11', CANONICAL_ID_PATTERNS.venue);
});

test('canonical ID helpers recognize current IDs and retain deterministic migration output', () => {
  assert.equal(isCanonicalId('venue', 'venue_7cbf6f0f2c33a2462d3da467'), true);
  assert.equal(isCanonicalId('game', 'game_9e8f4860c6a256c0fae6007d'), true);
  assert.equal(isCanonicalId('venue', 'ven_1360954160984546'), false);
  assert.equal(
    deterministicCanonicalId('venue', 'ven_1360954160984546'),
    'venue_7cbf6f0f2c33a2462d3da467'
  );
  assert.equal(
    deterministicCanonicalId('game', 'game_2026_01'),
    'game_9e8f4860c6a256c0fae6007d'
  );
});

test('canonical snapshot validation requires canonical primary and foreign keys', () => {
  const snapshot = {
    schemaVersion: '2.0',
    venues: [{ venue_id: 'venue_7cbf6f0f2c33a2462d3da467' }],
    games: [{ game_id: 'game_9e8f4860c6a256c0fae6007d' }],
    watchParties: [{
      watch_party_id: 'wp_bde7440739a143b1a1eee89c',
      venue_id: 'venue_7cbf6f0f2c33a2462d3da467',
      game_id: 'game_9e8f4860c6a256c0fae6007d'
    }],
    fanCounts: [{
      venue_id: 'venue_7cbf6f0f2c33a2462d3da467',
      game_id: 'game_9e8f4860c6a256c0fae6007d',
      count: 1
    }],
    venueHistoryCounts: [{
      venue_id: 'venue_7cbf6f0f2c33a2462d3da467',
      past_game_count: 1
    }]
  };

  assert.deepEqual(validateCanonicalSnapshotIds(snapshot), []);

  const invalid = structuredClone(snapshot);
  invalid.watchParties[0].venue_id = 'ven_1360954160984546';
  assert.ok(validateCanonicalSnapshotIds(invalid).some((error) => error.includes('unresolved')));
});
