import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const automation = await readFile(new URL('../apps-script/WatchPartyAutomation.gs', import.meta.url), 'utf8');

const context = vm.createContext({
  console: { log() {}, warn() {}, error() {} },
  Date,
  JSON,
  Math,
  Number,
  Object,
  Array,
  String,
  Set,
  RegExp,
  Error
});

vm.runInContext(`${automation}\nglobalThis.__normalize = normalizeMinimalWatchPartySubmission_;`, context);
const normalize = context.__normalize;

function validNamedValues() {
  return {
    'Venue ID (existing)': ['ven_1'],
    'Game(s)': ['game_1'],
    'Organizer Name': ['Cal Alumni Club'],
    'Submitter Role': ['Alumni group'],
    'Organizer Type': ['Alumni group'],
    'Age Policy': ['All ages'],
    'Sound Status': ['On']
  };
}

test('missing required Form fields fail with specific private error codes', () => {
  const cases = [
    ['Venue ID (existing)', /missing_venue_id/],
    ['Game(s)', /missing_game_ids/],
    ['Organizer Name', /missing_organizer_name/],
    ['Submitter Role', /invalid_submitter_role/]
  ];

  cases.forEach(([field, expected]) => {
    const namedValues = validNamedValues();
    delete namedValues[field];
    assert.throws(() => normalize(namedValues), expected);
  });
});

test('blank optional controlled fields normalize to public unknown values', () => {
  const namedValues = validNamedValues();
  delete namedValues['Organizer Type'];
  delete namedValues['Age Policy'];
  delete namedValues['Sound Status'];

  const submission = normalize(namedValues);
  assert.equal(submission.organizer_type, 'unknown');
  assert.equal(submission.age_policy, 'unknown');
  assert.equal(submission.sound_status, 'unknown');
});
