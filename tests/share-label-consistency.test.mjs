import test from 'node:test';
import assert from 'node:assert/strict';
import { detailShareLabel } from '../js/venue-profile-enhancement.mjs';

test('Venue Profile share label matches selected-profile Watch Party wording', () => {
  const snapshot = {
    watchParties: [
      {
        watch_party_id: 'wp-1',
        venue_id: 'venue-1',
        game_id: 'game-1',
        event_status: 'active'
      }
    ]
  };

  assert.equal(detailShareLabel({ snapshot, gameId: 'game-1', venueId: 'venue-1' }), 'Share Watch Party');
  assert.equal(detailShareLabel({ snapshot, gameId: 'game-1', venueId: 'venue-2' }), 'Share');
  assert.equal(detailShareLabel({ snapshot, gameId: 'game-2', venueId: 'venue-1' }), 'Share');
});
