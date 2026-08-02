import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCommittedExternalVenueWatchPartyUrl,
  observeExternalVenueCommit,
  resolveCommittedExternalVenueContext
} from '../js/external-watch-party-cta-core.mjs';

const snapshot = {
  venues: [
    { venue_id: 'venue_new', name: 'New Community Pub' },
    { venue_id: 'venue_existing', name: 'Existing Community Pub' }
  ],
  games: [
    {
      game_id: 'game_1',
      game_status: 'upcoming',
      game_date: '2026-09-05',
      opponent_name: 'Utah',
      home_away: 'home'
    },
    {
      game_id: 'game_done',
      game_status: 'completed',
      game_date: '2026-08-01',
      opponent_name: 'Stanford',
      home_away: 'away'
    }
  ]
};

const config = {
  formUrl: 'https://docs.google.com/forms/d/e/test/viewform',
  venueIdEntry: 'entry.1',
  venueNameEntry: 'entry.2',
  gameIdEntry: 'entry.3'
};

function pendingState(overrides = {}) {
  return {
    gameId: 'game_1',
    selectedVenueId: null,
    externalSearch: {
      pending: true,
      selected: { gameId: 'game_1', placeId: 'maptiler.1' },
      retry: null
    },
    fanIntent: { pending: { action: 'joinExternalVenue' } },
    ...overrides
  };
}

test('canonical committed Venue and selected Game produce the accepted Form prefill', () => {
  const context = resolveCommittedExternalVenueContext({ snapshot, gameId: 'game_1', venueId: 'venue_new' });
  assert.deepEqual(context, {
    venueId: 'venue_new',
    venueName: 'New Community Pub',
    gameId: 'game_1',
    gameLabel: 'Sep 5 — Cal vs. Utah'
  });

  const url = new URL(buildCommittedExternalVenueWatchPartyUrl({ config, snapshot, gameId: 'game_1', venueId: 'venue_new' }));
  assert.equal(url.searchParams.get('entry.1'), 'venue_new');
  assert.equal(url.searchParams.get('entry.2'), 'New Community Pub');
  assert.equal(url.searchParams.get('entry.3'), 'Sep 5 — Cal vs. Utah');
});

test('no CTA context exists before canonical creation or without a selected Game', () => {
  assert.equal(resolveCommittedExternalVenueContext({ snapshot, gameId: 'game_1', venueId: 'external-result' }), null);
  assert.equal(resolveCommittedExternalVenueContext({ snapshot, gameId: '', venueId: 'venue_new' }), null);
  assert.equal(resolveCommittedExternalVenueContext({ snapshot, gameId: 'game_done', venueId: 'venue_new' }), null);
});

test('successful external creation resolves the returned canonical Venue once', () => {
  const pending = observeExternalVenueCommit(null, pendingState());
  assert.deepEqual(pending.pending, { gameId: 'game_1', externalPlaceId: 'maptiler.1' });
  assert.equal(pending.committed, null);

  const committed = observeExternalVenueCommit(pending.pending, {
    gameId: 'game_1',
    selectedVenueId: 'venue_new',
    externalSearch: { pending: false, selected: null, retry: null },
    fanIntent: { pending: null }
  });
  assert.deepEqual(committed.committed, { venueId: 'venue_new', gameId: 'game_1' });
  assert.equal(committed.pending, null);

  const repeat = observeExternalVenueCommit(committed.pending, {
    gameId: 'game_1',
    selectedVenueId: 'venue_new',
    externalSearch: { pending: false, selected: null, retry: null },
    fanIntent: { pending: null }
  });
  assert.equal(repeat.committed, null);
});

test('existing canonical Venue match uses the same successful completion path', () => {
  const pending = observeExternalVenueCommit(null, pendingState());
  const committed = observeExternalVenueCommit(pending.pending, {
    gameId: 'game_1',
    selectedVenueId: 'venue_existing',
    externalSearch: { pending: false, selected: null, retry: null },
    fanIntent: { pending: null }
  });
  assert.deepEqual(committed.committed, { venueId: 'venue_existing', gameId: 'game_1' });
});

test('failed creation and selected-Game changes do not expose the CTA', () => {
  const pending = observeExternalVenueCommit(null, pendingState());
  const failed = observeExternalVenueCommit(pending.pending, {
    gameId: 'game_1',
    selectedVenueId: null,
    externalSearch: {
      pending: false,
      selected: { gameId: 'game_1', placeId: 'maptiler.1' },
      retry: { gameId: 'game_1', placeId: 'maptiler.1' }
    },
    fanIntent: { pending: null }
  });
  assert.equal(failed.committed, null);
  assert.equal(failed.pending, null);

  const changedGame = observeExternalVenueCommit(pending.pending, {
    gameId: 'game_2',
    selectedVenueId: 'venue_new',
    externalSearch: { pending: false, selected: null, retry: null },
    fanIntent: { pending: null }
  });
  assert.equal(changedGame.committed, null);
});
