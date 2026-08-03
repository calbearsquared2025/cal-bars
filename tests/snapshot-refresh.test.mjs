import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_REFRESH_INTERVAL_MS,
  FOCUS_REFRESH_STALE_MS,
  dataAvailabilityCopy,
  resolveDirectEntryVenueId,
  shouldRefreshSnapshot
} from '../js/snapshot-refresh.mjs';

test('refresh cadence is fifteen minutes while active and five minutes on return', () => {
  assert.equal(ACTIVE_REFRESH_INTERVAL_MS, 15 * 60 * 1000);
  assert.equal(FOCUS_REFRESH_STALE_MS, 5 * 60 * 1000);
});

test('hidden tabs do not request refreshes', () => {
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'hidden',
    now: 600000,
    lastAttemptAt: 0
  }), false);
});

test('visible tabs refresh immediately without a prior attempt', () => {
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'visible',
    now: 1,
    lastAttemptAt: 0
  }), true);
});

test('visible tabs refresh after the stale threshold but not before it', () => {
  const lastAttemptAt = 1000;
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'visible',
    now: lastAttemptAt + FOCUS_REFRESH_STALE_MS - 1,
    lastAttemptAt
  }), false);
  assert.equal(shouldRefreshSnapshot({
    visibilityState: 'visible',
    now: lastAttemptAt + FOCUS_REFRESH_STALE_MS,
    lastAttemptAt
  }), true);
});

test('empty schedule fallback is described as unavailable data, not zero locations', () => {
  const copy = dataAvailabilityCopy({ dataSource: 'fallback', venueCount: 0 });
  assert.equal(copy.unavailable, true);
  assert.equal(copy.locationStat, 'Location data unavailable');
  assert.match(copy.emptyHeading, /temporarily unavailable/i);
  assert.doesNotMatch(JSON.stringify(copy), /0 locations mapped|No mapped locations match/i);
});

test('saved snapshots disclose background refresh and failed refresh states', () => {
  assert.match(dataAvailabilityCopy({
    dataSource: 'last-known-good',
    venueCount: 3
  }).trayCopy, /latest update loads/i);
  assert.match(dataAvailabilityCopy({
    dataSource: 'last-known-good',
    venueCount: 3,
    refreshFailed: true
  }).trayCopy, /temporarily unavailable/i);
});

test('live data restores the normal tray description', () => {
  assert.equal(
    dataAvailabilityCopy({ dataSource: 'live', venueCount: 3 }).trayCopy,
    'Watch Parties first, then Cal Bars and Community Locations.'
  );
});

test('direct-entry venue is resolved after cached or fallback startup refreshes', () => {
  const snapshot = { venues: [
    { venue_id: 'venue_one', slug: 'first-place' },
    { venue_id: 'venue_two', slug: 'requested-place' }
  ] };
  assert.equal(resolveDirectEntryVenueId(snapshot, '?game=game_2026_01&venue=requested-place'), 'venue_two');
  assert.equal(resolveDirectEntryVenueId(snapshot, '?venue=missing-place'), '');
  assert.equal(resolveDirectEntryVenueId(snapshot, '?game=game_2026_01'), '');
});
