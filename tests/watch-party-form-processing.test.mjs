import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const fanIntent = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');
const discovery = await readFile(new URL('../apps-script/WatchPartyDiscovery.gs', import.meta.url), 'utf8');

class RangeMock {
  constructor(sheet, row, column, rows, columns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rows = rows;
    this.columns = columns;
  }
  getValues() {
    return Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.columns }, (_, c) => this.sheet.values[this.row - 1 + r]?.[this.column - 1 + c] ?? '')
    );
  }
  getDisplayValues() { return this.getValues().map((row) => row.map(String)); }
  setValues(values) {
    values.forEach((sourceRow, r) => {
      const targetIndex = this.row - 1 + r;
      if (!this.sheet.values[targetIndex]) this.sheet.values[targetIndex] = [];
      sourceRow.forEach((value, c) => { this.sheet.values[targetIndex][this.column - 1 + c] = value; });
    });
    return this;
  }
  setNumberFormat() { return this; }
}

class SheetMock {
  constructor(name, headers, rows = []) {
    this.name = name;
    this.values = [headers.slice(), ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  }
  getName() { return this.name; }
  getDataRange() { return new RangeMock(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  getRange(row, column, rows = 1, columns = 1) { return new RangeMock(this, row, column, rows, columns); }
  getLastRow() { return this.values.length; }
  getLastColumn() { return Math.max(0, ...this.values.map((row) => row.length)); }
  setFrozenRows() {}
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.getName(), sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

function buildHarness({ rows = [] } = {}) {
  const now = '2026-07-27T12:00:00Z';
  const venue = {
    venue_id: 'ven_1', slug: 'one', name: 'One', address_line_1: '1 Main', city: 'Oakland', region: 'CA', postal_code: '94612', country_code: 'US', latitude: 37.8, longitude: -122.27, venue_type: 'community_location', verification_status: 'cgb_reviewed', alumni_owned: 'unknown', external_source: 'maptiler', external_place_id: 'poi.123', publication_status: 'published', created_at: now, updated_at: now
  };
  const games = [{ game_id: 'game_1', season: 2026, schedule_order: 1, opponent_name: 'Test', home_away: 'home', game_date: '2026-09-05', kickoff_at: '', kickoff_status: 'tbd', game_status: 'upcoming', updated_at: now }];
  const watchPartyRows = rows;
  const rawRows = [];
  const discoveryRows = [];
  const workbook = new WorkbookMock([
    new SheetMock('Venues', ['venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region', 'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type', 'verification_status', 'alumni_owned', 'external_source', 'external_place_id', 'short_description', 'photo_url', 'photo_credit', 'publication_status', 'source_submission_id', 'created_at', 'updated_at'], [venue]),
    new SheetMock('Games', ['game_id', 'season', 'schedule_order', 'opponent_name', 'opponent_short_name', 'home_away', 'game_date', 'kickoff_at', 'kickoff_status', 'game_status', 'updated_at'], games),
    new SheetMock('Watch_Parties', ['watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type', 'official_event_url', 'source_type', 'event_start_at', 'age_policy', 'sound_status', 'restrictions_note', 'game_day_note', 'event_status', 'publication_status', 'source_submission_id', 'discovery_id', 'publication_key', 'created_at', 'updated_at'], watchPartyRows),
    new SheetMock('Watch_Party_Discovery', ['discovery_id', 'idempotency_key', 'source_kind', 'source_record_id', 'source_url', 'source_label', 'raw_submission_id', 'venue_id_candidate', 'venue_name_candidate', 'address_candidate', 'trusted_place_source', 'trusted_place_id', 'resolved_venue_id', 'game_ids_candidate', 'organizer_name_candidate', 'organizer_type_candidate', 'official_event_url_candidate', 'event_start_candidate', 'age_policy_candidate', 'sound_status_candidate', 'restrictions_note_candidate', 'game_day_note_candidate', 'candidate_status', 'validation_errors', 'research_note', 'created_watch_party_ids', 'created_venue_id', 'last_error', 'attempt_count', 'created_at', 'updated_at', 'published_at'], discoveryRows),
    new SheetMock('Watch_Party_Submissions_Raw', ['response_timestamp', 'submission_id', 'venue_id', 'venue_name_submitted', 'address_submitted', 'game_ids_submitted', 'organizer_name', 'organizer_type', 'official_event_url', 'event_start_information', 'age_policy', 'sound_status', 'restrictions_note', 'game_day_note', 'submitter_role', 'submitter_name', 'submitter_email', 'processing_status', 'created_watch_party_ids', 'created_venue_id', 'processing_error', 'processed_at', 'discovery_id'], rawRows)
  ]);
  const cache = new Map();
  let uuid = 0;
  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Array,
    String,
    Set,
    Map,
    RegExp,
    Error,
    Utilities: { getUuid: () => `uuid-${++uuid}` },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: (key) => cache.get(key) || null, put: (key, value) => cache.set(key, value), remove: (key) => cache.delete(key) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'private', setProperty() {} }) },
    SpreadsheetApp: { openById: () => workbook },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
    __workbook: workbook
  });
  vm.runInContext(`${code}\n${fanIntent}\n${discovery}\ngetWorkbook_ = function(){ return __workbook; };\nglobalThis.__api = { processWatchPartyFormSubmission_: processWatchPartyFormSubmission_ };`, context);
  return { workbook, api: context.__api, cache };
}

function formEvent(overrides = {}) {
  return {
    range: { getSheet: () => ({ getName: () => 'Watch_Party_Submissions_Raw' }), getRow: () => 2 },
    namedValues: {
      Timestamp: ['2026-07-27T12:00:00Z'],
      'Submitter Role': ['fan'],
      'Organizer Name': ['Cal Alumni Club'],
      'Game(s)': ['game_1'],
      'Venue ID (existing)': ['ven_1'],
      'Venue Name': ['Test Venue'],
      'Venue Address': ['1 Main Street Oakland CA 94612'],
      'Official Event URL': ['https://events.example/watch-party'],
      'Submitter Email': ['fan@example.com']
    },
    ...overrides
  };
}

function rawRows(workbook) {
  const sheet = workbook.getSheetByName('Watch_Party_Submissions_Raw');
  return sheet.values.slice(1).map((row) => Object.fromEntries(['response_timestamp', 'submission_id', 'venue_id', 'venue_name_submitted', 'address_submitted', 'game_ids_submitted', 'organizer_name', 'organizer_type', 'official_event_url', 'event_start_information', 'age_policy', 'sound_status', 'restrictions_note', 'game_day_note', 'submitter_role', 'submitter_name', 'submitter_email', 'processing_status', 'created_watch_party_ids', 'created_venue_id', 'processing_error', 'processed_at', 'discovery_id'].map((header, index) => [header, row[index] ?? ''])));
}

function discoveryRows(workbook) {
  const sheet = workbook.getSheetByName('Watch_Party_Discovery');
  return sheet.values.slice(1).map((row) => Object.fromEntries(['discovery_id', 'idempotency_key', 'source_kind', 'source_record_id', 'source_url', 'source_label', 'raw_submission_id', 'venue_id_candidate', 'venue_name_candidate', 'address_candidate', 'trusted_place_source', 'trusted_place_id', 'resolved_venue_id', 'game_ids_candidate', 'organizer_name_candidate', 'organizer_type_candidate', 'official_event_url_candidate', 'event_start_candidate', 'age_policy_candidate', 'sound_status_candidate', 'restrictions_note_candidate', 'game_day_note_candidate', 'candidate_status', 'validation_errors', 'research_note', 'created_watch_party_ids', 'created_venue_id', 'last_error', 'attempt_count', 'created_at', 'updated_at', 'published_at'].map((header, index) => [header, row[index] ?? ''])));
}

function canonicalRows(workbook) {
  const sheet = workbook.getSheetByName('Watch_Parties');
  return sheet.values.slice(1).map((row) => Object.fromEntries(['watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type', 'official_event_url', 'source_type', 'event_start_at', 'age_policy', 'sound_status', 'restrictions_note', 'game_day_note', 'event_status', 'publication_status', 'source_submission_id', 'discovery_id', 'publication_key', 'created_at', 'updated_at'].map((header, index) => [header, row[index] ?? ''])));
}

test('form parsing maps explicit headers centrally and rejects malformed or wrong-tab events', () => {
  const { api } = buildHarness();
  assert.doesNotThrow(() => api.processWatchPartyFormSubmission_(formEvent()));
  assert.throws(() => api.processWatchPartyFormSubmission_(formEvent({ range: { getSheet: () => ({ getName: () => 'Other_Tab' }), getRow: () => 2 } })), /invalid_form_event/);
  assert.throws(() => api.processWatchPartyFormSubmission_(formEvent({ namedValues: { Timestamp: ['2026'], 'Organizer Name': ['Cal'] } })), /missing_form_headers/);
});

test('complete submissions create a discovery row and one published canonical row without exposing partial rows', () => {
  const { api, workbook, cache } = buildHarness();
  const result = api.processWatchPartyFormSubmission_(formEvent());
  assert.equal(result.ok, true);
  assert.equal(result.processing_status, 'processed');
  assert.equal(result.discovery_id.startsWith('wpd_'), true);
  assert.equal(rawRows(workbook).length, 1);
  assert.equal(rawRows(workbook)[0].processing_status, 'processed');
  assert.equal(canonicalRows(workbook).length, 1);
  assert.equal(canonicalRows(workbook)[0].publication_status, 'published');
  assert.equal(cache.has('cgb_v2_public_snapshot'), true);
});

test('incomplete submissions remain private and do not clear the public snapshot cache', () => {
  const { api, workbook, cache } = buildHarness();
  const result = api.processWatchPartyFormSubmission_(formEvent({ namedValues: { Timestamp: ['2026-07-27T12:00:00Z'], 'Submitter Role': ['fan'], 'Organizer Name': ['Cal Alumni Club'], 'Game(s)': [''] } }));
  assert.equal(result.ok, true);
  assert.equal(result.processing_status, 'needs_research');
  assert.equal(canonicalRows(workbook).length, 0);
  assert.equal(discoveryRows(workbook).length, 1);
  assert.equal(cache.has('cgb_v2_public_snapshot'), false);
});

test('duplicate trigger delivery reuses the existing discovery id and raw row', () => {
  const { api, workbook } = buildHarness();
  const first = api.processWatchPartyFormSubmission_(formEvent());
  const second = api.processWatchPartyFormSubmission_(formEvent());
  assert.equal(first.discovery_id, second.discovery_id);
  assert.equal(rawRows(workbook).length, 1);
  assert.equal(discoveryRows(workbook).length, 1);
});
