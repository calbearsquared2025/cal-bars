import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidVenueCoordinates, validateSnapshotShape } from '../js/core.mjs';

function snapshotWith(venues) {
  return {
    venues,
    games: [],
    watchParties: [],
    fanCounts: [],
    venueHistoryCounts: []
  };
}

test('coordinate validation accepts numbers and numeric strings', () => {
  assert.equal(hasValidVenueCoordinates({ latitude: 37.87, longitude: -122.27 }), true);
  assert.equal(hasValidVenueCoordinates({ latitude: '37.87', longitude: '-122.27' }), true);
});

test('coordinate validation rejects blank, nonnumeric, and out-of-range values', () => {
  assert.equal(hasValidVenueCoordinates({ latitude: '', longitude: -122.27 }), false);
  assert.equal(hasValidVenueCoordinates({ latitude: 'north', longitude: -122.27 }), false);
  assert.equal(hasValidVenueCoordinates({ latitude: 91, longitude: -122.27 }), false);
  assert.equal(hasValidVenueCoordinates({ latitude: 37.87, longitude: -181 }), false);
});

test('a malformed snapshot is rejected before map initialization', () => {
  const valid = snapshotWith([{ venue_id: 'ven_1', latitude: 37.87, longitude: -122.27 }]);
  const invalid = snapshotWith([{ venue_id: 'ven_1', latitude: '', longitude: -122.27 }]);
  assert.equal(validateSnapshotShape(valid), true);
  assert.equal(validateSnapshotShape(invalid), false);
});
