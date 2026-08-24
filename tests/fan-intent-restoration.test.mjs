import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compactListFanCountCopy,
  intentAction,
  parseStoredSelections
} from '../js/fan-intent-core.mjs';

const snapshot = JSON.parse(readFileSync(
  new URL('./fixtures/public-snapshot.synthetic.json', import.meta.url),
  'utf8'
));

test('stored Fan Intent resolves the selected fixture venue and aggregate count deterministically', () => {
  const game = snapshot.games.find((item) => item.opponent_name === 'UCLA');
  const venue = snapshot.venues.find((item) => item.slug === 'golden-bear-test-pub-berkeley');

  assert.ok(game);
  assert.ok(venue);

  const selections = parseStoredSelections(JSON.stringify({
    [game.game_id]: venue.venue_id
  }));

  assert.equal(selections[game.game_id], venue.venue_id);
  assert.equal(intentAction(selections[game.game_id], venue.venue_id), 'withdraw');

  const count = snapshot.fanCounts.find((row) =>
    row.game_id === game.game_id && row.venue_id === venue.venue_id
  )?.count;

  assert.equal(count, 3);
  assert.equal(compactListFanCountCopy(count), '3 BEARS');
});
