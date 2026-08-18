import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appState,
  resetAppStateForTests,
  setCanonicalSnapshot
} from '../js/app-state.mjs';
import { upsertCanonicalVenue } from '../js/external-venue-core.mjs';

function snapshotWithVenue(venue) {
  return {
    schemaVersion: '2.0',
    venues: [venue],
    games: [],
    watchParties: [],
    fanCounts: [],
    venueHistoryCounts: [],
    venueSeasonCounts: [],
    generatedAt: '2026-08-18T20:00:00.000Z'
  };
}

test('verification status is removed at the client presentation boundary', () => {
  resetAppStateForTests();
  setCanonicalSnapshot(snapshotWithVenue({
    venue_id: 'venue_test',
    venue_type: 'community_location',
    verification_status: 'cgb_reviewed'
  }));

  assert.equal(appState.snapshot.venues[0].venue_type, 'community_location');
  assert.equal('verification_status' in appState.snapshot.venues[0], false);
});

test('new external Venue upserts also omit verification status from client state', () => {
  const snapshot = { venues: [] };
  const venue = upsertCanonicalVenue(snapshot, {
    venue_id: 'venue_external',
    slug: 'external-place',
    name: 'External Place',
    venue_type: 'community_location',
    verification_status: 'user_added'
  });

  assert.equal(venue.venue_type, 'community_location');
  assert.equal('verification_status' in venue, false);
  assert.equal('verification_status' in snapshot.venues[0], false);
});
