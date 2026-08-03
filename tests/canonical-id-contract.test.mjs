import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  CANONICAL_ID_PATTERNS,
  canonicalizeSnapshot,
  deterministicCanonicalId,
  validateAliasManifest,
  validateCanonicalSnapshotIds
} from '../scripts/canonical-id-contract.mjs';

const aliasManifest = JSON.parse(await readFile(
  new URL('../data/id-aliases.json', import.meta.url),
  'utf8'
));

test('approved canonical ID grammar is entity-prefixed lowercase 24-hex', () => {
  assert.match('venue_7cbf6f0f2c33a2462d3da467', CANONICAL_ID_PATTERNS.venue);
  assert.match('game_9e8f4860c6a256c0fae6007d', CANONICAL_ID_PATTERNS.game);
  assert.match('wp_bde7440739a143b1a1eee89c', CANONICAL_ID_PATTERNS.watchParty);
  assert.match('fi_0123456789abcdef01234567', CANONICAL_ID_PATTERNS.fanIntent);
  assert.doesNotMatch('ven_1360954160984546', CANONICAL_ID_PATTERNS.venue);
  assert.doesNotMatch('game_2026_01', CANONICAL_ID_PATTERNS.game);
  assert.doesNotMatch('venue_8309cdb6-63da-48e0-97de-368631f62b11', CANONICAL_ID_PATTERNS.venue);
});

test('sha256-v1 mappings are deterministic and match the approved migration', () => {
  assert.equal(
    deterministicCanonicalId('venue', 'ven_1360954160984546'),
    'venue_7cbf6f0f2c33a2462d3da467'
  );
  assert.equal(
    deterministicCanonicalId('game', 'game_2026_01'),
    'game_9e8f4860c6a256c0fae6007d'
  );
  assert.deepEqual(validateAliasManifest(aliasManifest), []);
  assert.equal(Object.keys(aliasManifest.venues).length, 35);
  assert.equal(Object.keys(aliasManifest.games).length, 12);
});

test('snapshot canonicalization updates primary keys and every public foreign key', () => {
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
    generatedAt: '2026-08-03T00:00:00Z'
  };

  const result = canonicalizeSnapshot(snapshot, aliasManifest);
  assert.equal(result.venues[0].venue_id, 'venue_7cbf6f0f2c33a2462d3da467');
  assert.equal(result.games[0].game_id, 'game_9e8f4860c6a256c0fae6007d');
  assert.equal(result.watchParties[0].venue_id, result.venues[0].venue_id);
  assert.equal(result.watchParties[0].game_id, result.games[0].game_id);
  assert.equal(result.fanCounts[0].venue_id, result.venues[0].venue_id);
  assert.equal(result.fanCounts[0].game_id, result.games[0].game_id);
  assert.equal(result.venueHistoryCounts[0].venue_id, result.venues[0].venue_id);
  assert.deepEqual(validateCanonicalSnapshotIds(result), []);
});

test('alias validation rejects duplicate, malformed, or non-deterministic targets', () => {
  const malformed = structuredClone(aliasManifest);
  malformed.venues.legacy_example = 'venue_not_hex';
  const errors = validateAliasManifest(malformed);
  assert.ok(errors.some((error) => error.includes('invalid canonical target')));
  assert.ok(errors.some((error) => error.includes('does not match deterministic')));
});
