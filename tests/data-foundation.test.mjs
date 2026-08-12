import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { validateReleaseFallback, validateSnapshot } from '../scripts/validate-v2-data.mjs';

const rawFixture = JSON.parse(
  await readFile(new URL('./fixtures/public-snapshot.synthetic.json', import.meta.url), 'utf8')
);
const releaseFallback = JSON.parse(
  await readFile(new URL('../data/fallback-v2.json', import.meta.url), 'utf8')
);

function fixtureId(prefix, value) {
  const token = createHash('sha256').update(`cgb:test:${prefix}:${value}`).digest('hex').slice(0, 24);
  return `${prefix}_${token}`;
}

function canonicalizeFixture(snapshot) {
  const copy = structuredClone(snapshot);
  const venueMap = Object.fromEntries(copy.venues.map((venue) => [venue.venue_id, fixtureId('venue', venue.venue_id)]));
  const gameMap = Object.fromEntries(copy.games.map((game) => [game.game_id, fixtureId('game', game.game_id)]));
  copy.venues.forEach((venue) => { venue.venue_id = venueMap[venue.venue_id]; });
  copy.games.forEach((game) => { game.game_id = gameMap[game.game_id]; });
  copy.watchParties.forEach((party) => {
    party.watch_party_id = fixtureId('wp', party.watch_party_id);
    party.venue_id = venueMap[party.venue_id];
    party.game_id = gameMap[party.game_id];
  });
  copy.fanCounts.forEach((row) => {
    row.venue_id = venueMap[row.venue_id];
    row.game_id = gameMap[row.game_id];
  });
  copy.venueHistoryCounts.forEach((row) => { row.venue_id = venueMap[row.venue_id]; });
  return copy;
}

const fixture = canonicalizeFixture(rawFixture);

test('synthetic test fixture satisfies the public contract', () => {
  assert.deepEqual(validateSnapshot(fixture), []);
});

test('release fallback satisfies the public contract and release checks', () => {
  assert.deepEqual(validateReleaseFallback(releaseFallback), []);
});

test('release validation rejects known synthetic fixture markers', () => {
  const errors = validateReleaseFallback(fixture);
  assert.ok(errors.some((error) => error.includes('synthetic fixture marker')));
});

test('deprecated opponent short names are rejected recursively', () => {
  const invalid = structuredClone(fixture);
  invalid.games[0].opponent_short_name = 'UCLA';
  const errors = validateSnapshot(invalid);
  assert.ok(errors.some((error) => error.includes('opponent_short_name is forbidden')));
});

test('legacy ID aliases are rejected from public snapshots', () => {
  const invalid = structuredClone(fixture);
  invalid.idAliases = { venues: {}, games: {} };
  const errors = validateSnapshot(invalid);
  assert.ok(errors.some((error) => error.includes('idAliases is forbidden')));
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
  invalid.watchParties[0].venue_id = 'venue_ffffffffffffffffffffffff';
  invalid.watchParties[0].game_id = 'game_ffffffffffffffffffffffff';
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
