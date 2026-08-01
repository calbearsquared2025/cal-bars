import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { validateSnapshot } from '../scripts/validate-v2-data.mjs';

const fixture = JSON.parse(
  await readFile(new URL('../data/fallback-v2.json', import.meta.url), 'utf8')
);

test('synthetic fallback satisfies the public contract', () => {
  assert.deepEqual(validateSnapshot(fixture), []);
});

test('deprecated opponent short names are rejected recursively', () => {
  const invalid = structuredClone(fixture);
  invalid.games[0].opponent_short_name = 'UCLA';
  const errors = validateSnapshot(invalid);
  assert.ok(errors.some((error) => error.includes('opponent_short_name is forbidden')));
});

test('private browser identifiers are rejected recursively', () => {
  const invalid = structuredClone(fixture);
  invalid.fanCounts[0].browser_id = 'private-browser-id';
  const errors = validateSnapshot(invalid);
  assert.ok(errors.some((error) => error.includes('browser_id is forbidden')));
});

test('duplicate venue slugs are rejected', () => {
  const invalid = structuredClone(fixture);
  invalid.venues[1].slug = invalid.venues[0].slug;
  const errors = validateSnapshot(invalid);
  assert.ok(errors.some((error) => error.includes('.slug duplicates')));
});

test('watch parties must reference public venues and games', () => {
  const invalid = structuredClone(fixture);
  invalid.watchParties[0].venue_id = 'ven_999999';
  invalid.watchParties[0].game_id = 'game_2099_99';
  const errors = validateSnapshot(invalid);
  assert.ok(errors.some((error) => error.includes('venue_id does not reference')));
  assert.ok(errors.some((error) => error.includes('game_id does not reference')));
});

test('TBD kickoff cannot expose a timestamp', () => {
  const invalid = structuredClone(fixture);
  const tbdGame = invalid.games.find((game) => game.kickoff_status === 'tbd');
  assert.ok(tbdGame);
  tbdGame.kickoff_at = `${tbdGame.game_date}T20:00:00Z`;
  const errors = validateSnapshot(invalid);
  assert.ok(errors.some((error) => error.includes('must be empty when kickoff_status is tbd')));
});
