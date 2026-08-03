import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublicSnapshot,
  createVenueId,
  migrateRows
} from '../scripts/migrate-v1-venues.mjs';

const timestamp = '2026-07-26T00:00:00Z';

function sourceRow(overrides = {}) {
  return {
    source_row: 2,
    name: 'Fixture Venue',
    address: '100 Test Way',
    city: 'Berkeley',
    state: 'CA',
    zip: '94704',
    lat: '37.8717',
    lon: '-122.2728',
    url: '',
    promo: '',
    details: '',
    tvs: '',
    affiliation: '',
    submitted_as: 'Synthetic fixture',
    place_id: 'fixture_place_base',
    ...overrides
  };
}

test('active migration emits canonical Venue IDs while retaining the legacy seed helper for traceability', () => {
  const row = sourceRow();
  const legacySeed = createVenueId(row);
  assert.match(legacySeed, /^ven_\d+$/);

  const result = migrateRows([row], { migrationTimestamp: timestamp });
  assert.equal(result.accepted_venues.length, 1);
  assert.match(result.accepted_venues[0].venue_id, /^venue_[a-f0-9]{24}$/);
  assert.notEqual(result.accepted_venues[0].venue_id, legacySeed);
});

test('active migration output remains deterministic for unchanged source identity', () => {
  const first = migrateRows([sourceRow()], { migrationTimestamp: timestamp });
  const second = migrateRows([structuredClone(sourceRow())], { migrationTimestamp: timestamp });
  assert.deepEqual(first.accepted_venues, second.accepted_venues);
});

test('public snapshot wrapper canonicalizes known and unknown legacy base-schedule Game IDs', () => {
  const result = migrateRows([sourceRow()], { migrationTimestamp: timestamp });
  const snapshot = buildPublicSnapshot(result, {
    games: [
      { game_id: 'game_2026_01', opponent_name: 'UCLA' },
      { game_id: 'game_fixture', opponent_name: 'Fixture Opponent' }
    ]
  }, timestamp);

  assert.match(snapshot.venues[0].venue_id, /^venue_[a-f0-9]{24}$/);
  assert.equal(snapshot.games[0].game_id, 'game_9e8f4860c6a256c0fae6007d');
  assert.equal(snapshot.games[1].game_id, 'game_a6ff685b3e4f9d1f9b7545ed');
  assert.deepEqual(snapshot.venueHistoryCounts, [{
    venue_id: snapshot.venues[0].venue_id,
    past_game_count: 0
  }]);
});
