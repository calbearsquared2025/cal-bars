import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMappableVenue,
  sanitizeSnapshotCoordinates
} from '../js/snapshot-coordinate-guard.mjs';

const snapshot = {
  schemaVersion: '2.0',
  venues: [
    { venue_id: 'ven_good', latitude: '37.8717', longitude: '-122.2728' },
    { venue_id: 'ven_blank', latitude: '', longitude: '-122.2712' },
    { venue_id: 'ven_nan', latitude: 'not-a-number', longitude: '-122.2416' }
  ],
  games: [],
  watchParties: [
    { watch_party_id: 'wp_good', venue_id: 'ven_good' },
    { watch_party_id: 'wp_bad', venue_id: 'ven_blank' }
  ],
  fanCounts: [
    { venue_id: 'ven_good', count: 1 },
    { venue_id: 'ven_nan', count: 2 }
  ],
  venueHistoryCounts: [
    { venue_id: 'ven_good', past_game_count: 1 },
    { venue_id: 'ven_blank', past_game_count: 3 }
  ]
};

test('numeric-string coordinates remain mappable', () => {
  assert.equal(isMappableVenue(snapshot.venues[0]), true);
});

test('blank, nonnumeric, and out-of-range coordinates are rejected', () => {
  assert.equal(isMappableVenue(snapshot.venues[1]), false);
  assert.equal(isMappableVenue(snapshot.venues[2]), false);
  assert.equal(isMappableVenue({ latitude: 91, longitude: 0 }), false);
  assert.equal(isMappableVenue({ latitude: 0, longitude: -181 }), false);
});

test('invalid venues and dependent public rows are omitted together', () => {
  const warnings = [];
  const sanitized = sanitizeSnapshotCoordinates(snapshot, {
    warn: (...args) => warnings.push(args)
  });

  assert.deepEqual(sanitized.venues.map((row) => row.venue_id), ['ven_good']);
  assert.deepEqual(sanitized.watchParties.map((row) => row.venue_id), ['ven_good']);
  assert.deepEqual(sanitized.fanCounts.map((row) => row.venue_id), ['ven_good']);
  assert.deepEqual(sanitized.venueHistoryCounts.map((row) => row.venue_id), ['ven_good']);
  assert.equal(warnings.length, 1);
});

test('non-snapshot JSON is returned unchanged', () => {
  const geocode = { features: [{ center: [-122.27, 37.87] }] };
  assert.equal(sanitizeSnapshotCoordinates(geocode), geocode);
});
