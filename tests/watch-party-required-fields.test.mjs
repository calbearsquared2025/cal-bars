import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const canonicalIds = await readFile(new URL('../apps-script/CanonicalIds.gs', import.meta.url), 'utf8');
const automation = await readFile(new URL('../apps-script/WatchPartyAutomation.gs', import.meta.url), 'utf8');

const games = [{
  game_id: 'game_2026_01',
  season: 2026,
  schedule_order: 1,
  opponent_name: 'UCLA',
  home_away: 'home',
  game_date: '2026-09-05',
  kickoff_at: '2026-09-06T02:30:00Z',
  kickoff_status: 'confirmed',
  game_status: 'upcoming',
  updated_at: '2026-07-31T17:43:00Z'
}];
const workbook = { getSheetByName: () => null };

const context = vm.createContext({
  console: { log() {}, warn() {}, error() {} },
  Date,
  JSON,
  Math,
  Number,
  Object,
  Array,
  String,
  Map,
  Set,
  RegExp,
  Error,
  URL,
  normalizeCellValue_: (value) => value,
  readSheetObjects_: (_workbook, tabName) => tabName === 'Games' ? games : []
});

vm.runInContext(`${canonicalIds}\n${automation}\nglobalThis.__normalize = normalizeMinimalWatchPartySubmission_;`, context);
const normalize = (namedValues) => context.__normalize(namedValues, workbook);

function validNamedValues() {
  return {
    'Venue ID (existing)': ['ven_1'],
    'Which game or games will have a Watch Party here?': ['Sep 5 — Cal vs. UCLA'],
    'Organizer or host name': ['Cal Alumni Club'],
    'What is your relationship to this Watch Party?': [
      'I represent the alumni group or organization hosting it'
    ],
    'Who is organizing or hosting this Watch Party?': ['Alumni group'],
    'Are there age restrictions?': ['All ages'],
    'Will the game audio be on?': ['Yes']
  };
}

test('missing required finalized Form fields fail with specific private error codes', () => {
  const cases = [
    ['Venue ID (existing)', /missing_venue_id/],
    ['Which game or games will have a Watch Party here?', /missing_game_ids/],
    ['Organizer or host name', /missing_organizer_name/],
    ['Who is organizing or hosting this Watch Party?', /invalid_organizer_type/],
    ['What is your relationship to this Watch Party?', /invalid_submitter_role/]
  ];

  cases.forEach(([field, expected]) => {
    const namedValues = validNamedValues();
    delete namedValues[field];
    assert.throws(() => normalize(namedValues), expected);
  });
});

test('blank optional age and audio fields normalize to public unknown values', () => {
  const namedValues = validNamedValues();
  delete namedValues['Are there age restrictions?'];
  delete namedValues['Will the game audio be on?'];

  const submission = normalize(namedValues);
  assert.equal(submission.organizer_type, 'alumni_group');
  assert.equal(submission.age_policy, 'unknown');
  assert.equal(submission.sound_status, 'unknown');
});
