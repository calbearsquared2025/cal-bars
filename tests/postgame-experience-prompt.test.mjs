import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureCompletedSelections,
  nextPostgameExperience,
  parsePostgameExperienceState,
  removePostgameExperience
} from '../js/postgame-experience-prompt.mjs';

const snapshot = {
  venues: [
    { venue_id: 'venue_1', name: 'Kingfish' },
    { venue_id: 'venue_2', name: 'Busby’s West' }
  ],
  games: [
    {
      game_id: 'game_1',
      schedule_order: 1,
      opponent_name: 'Louisville',
      game_status: 'completed'
    },
    {
      game_id: 'game_2',
      schedule_order: 2,
      opponent_name: 'Minnesota',
      game_status: 'upcoming'
    },
    {
      game_id: 'game_3',
      schedule_order: 3,
      opponent_name: 'Boston College',
      game_status: 'completed'
    },
    {
      game_id: 'game_4',
      schedule_order: 4,
      opponent_name: 'Virginia',
      game_status: 'cancelled'
    }
  ]
};

test('postgame state tolerates malformed storage', () => {
  assert.deepEqual(parsePostgameExperienceState('{bad'), { pending: {} });
  assert.deepEqual(
    parsePostgameExperienceState(JSON.stringify({ pending: { game_1: 'venue_1', empty: '' } })),
    { pending: { game_1: 'venue_1' } }
  );
});

test('completed attendance moves to feedback queue while upcoming attendance stays active', () => {
  const result = captureCompletedSelections(snapshot, {
    game_1: 'venue_1',
    game_2: 'venue_2',
    game_4: 'venue_1'
  });

  assert.deepEqual(result.selections, { game_2: 'venue_2' });
  assert.deepEqual(result.postgameState, { pending: { game_1: 'venue_1' } });
});

test('existing queued feedback is preserved without duplication or venue replacement', () => {
  const result = captureCompletedSelections(
    snapshot,
    { game_1: 'venue_2' },
    { pending: { game_1: 'venue_1' } }
  );

  assert.deepEqual(result.selections, {});
  assert.deepEqual(result.postgameState, { pending: { game_1: 'venue_1' } });
});

test('most recent completed attended game is prompted first', () => {
  const next = nextPostgameExperience(snapshot, {
    pending: { game_1: 'venue_1', game_3: 'venue_2' }
  });

  assert.deepEqual(next, {
    gameId: 'game_3',
    venueId: 'venue_2',
    venueName: 'Busby’s West',
    opponentName: 'Boston College',
    recency: 3
  });
});

test('completed prompt can be removed after share or skip', () => {
  assert.deepEqual(
    removePostgameExperience({ pending: { game_1: 'venue_1', game_3: 'venue_2' } }, 'game_3'),
    { pending: { game_1: 'venue_1' } }
  );
});
