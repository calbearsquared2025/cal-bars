import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../data/fallback-v2.json', import.meta.url), 'utf8'));
const scheduleHelper = await readFile(new URL('../apps-script/Official2026Schedule.gs', import.meta.url), 'utf8');
const code = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

const expectedGames = [
  ['game_2026_01', 1, 'UCLA', 'home', '2026-09-05', '2026-09-06T02:30:00Z', 'confirmed'],
  ['game_2026_02', 2, 'Syracuse', 'away', '2026-09-12', '2026-09-12T19:30:00Z', 'confirmed'],
  ['game_2026_03', 3, 'Wagner', 'home', '2026-09-19', '2026-09-19T19:30:00Z', 'confirmed'],
  ['game_2026_04', 4, 'Clemson', 'home', '2026-09-25', '2026-09-26T02:30:00Z', 'confirmed'],
  ['game_2026_05', 5, 'UNLV', 'away', '2026-10-03', '2026-10-03T19:30:00Z', 'confirmed'],
  ['game_2026_06', 6, 'Virginia Tech', 'home', '2026-10-10', '', 'tbd'],
  ['game_2026_07', 7, 'Wake Forest', 'home', '2026-10-17', '', 'tbd'],
  ['game_2026_08', 8, 'SMU', 'away', '2026-10-24', '', 'tbd'],
  ['game_2026_09', 9, 'NC State', 'away', '2026-10-31', '', 'tbd'],
  ['game_2026_10', 10, 'Virginia', 'away', '2026-11-14', '', 'tbd'],
  ['game_2026_11', 11, 'Stanford', 'home', '2026-11-21', '', 'tbd'],
  ['game_2026_12', 12, 'Pittsburgh', 'home', '2026-11-28', '', 'tbd']
];

test('fallback contains the verified 12-game 2026 regular-season schedule with stable IDs', () => {
  assert.equal(snapshot.games.length, expectedGames.length);
  assert.deepEqual(
    snapshot.games.map((game) => [
      game.game_id,
      game.schedule_order,
      game.opponent_name,
      game.home_away,
      game.game_date,
      game.kickoff_at,
      game.kickoff_status
    ]),
    expectedGames
  );
});

test('confirmed kickoffs are absolute timestamps and all later kickoffs remain blank and TBD', () => {
  const confirmed = snapshot.games.filter((game) => game.kickoff_status === 'confirmed');
  const tbd = snapshot.games.filter((game) => game.kickoff_status === 'tbd');
  assert.equal(confirmed.length, 5);
  assert.equal(tbd.length, 7);
  confirmed.forEach((game) => assert.match(game.kickoff_at, /^2026-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/));
  tbd.forEach((game) => assert.equal(game.kickoff_at, ''));
});

test('existing Watch Party and Fan Intent fixtures still reference valid schedule IDs', () => {
  const gameIds = new Set(snapshot.games.map((game) => game.game_id));
  snapshot.watchParties.forEach((party) => assert.equal(gameIds.has(party.game_id), true));
  snapshot.fanCounts.forEach((count) => assert.equal(gameIds.has(count.game_id), true));
});

test('owner-only Apps Script helper upserts the same IDs and returns readable Form-choice references', () => {
  for (const [gameId, , opponent] of expectedGames) {
    assert.match(scheduleHelper, new RegExp(gameId));
    assert.match(scheduleHelper, new RegExp(opponent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(scheduleHelper, /function upsertOfficial2026Schedule\(\)/);
  assert.match(scheduleHelper, /function getOfficial2026GameFormChoices\(\)/);
  assert.match(scheduleHelper, /clearPublicSnapshotCache_\(\)/);
  assert.doesNotMatch(code, /upsertOfficial2026Schedule|getOfficial2026GameFormChoices/);
});
