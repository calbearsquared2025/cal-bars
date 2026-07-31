import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const automation = await readFile(new URL('../apps-script/WatchPartyAutomation.gs', import.meta.url), 'utf8');

const WATCH_PARTY_HEADERS = [
  'watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type',
  'official_event_url', 'source_type', 'event_start_at', 'age_policy', 'sound_status',
  'restrictions_note', 'game_day_note', 'event_status', 'publication_status',
  'source_submission_id', 'created_at', 'updated_at'
];

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
      Array.from({ length: this.columns }, (_, c) =>
        this.sheet.values[this.row - 1 + r]?.[this.column - 1 + c] ?? ''
      )
    );
  }
  getDisplayValues() {
    return this.getValues().map((row) => row.map((value) => String(value)));
  }
  setValues(values) {
    values.forEach((sourceRow, r) => {
      const targetRow = this.row - 1 + r;
      if (!this.sheet.values[targetRow]) this.sheet.values[targetRow] = [];
      sourceRow.forEach((value, c) => {
        this.sheet.values[targetRow][this.column - 1 + c] = value;
      });
    });
    return this;
  }
}

class SheetMock {
  constructor(name, headers, rows = []) {
    this.name = name;
    this.values = [headers.slice(), ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  }
  getName() { return this.name; }
  getLastRow() { return this.values.length; }
  getLastColumn() { return Math.max(0, ...this.values.map((row) => row.length)); }
  getRange(row, column, rows = 1, columns = 1) { return new RangeMock(this, row, column, rows, columns); }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
  setFrozenRows() {}
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.getName(), sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

function objectsFromSheet(sheet) {
  const [headers, ...rows] = sheet.values;
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function buildHarness({ venuePublished = true, games = ['game_1'], legacyStartTime } = {}) {
  const rawHeaders = [
    'Timestamp', 'Venue ID (existing)', 'Game(s)', 'Organizer Name', 'Organizer Type',
    'Official Event URL', 'Age Policy', 'Sound Status',
    'Restrictions Note', 'Game Day Note', 'Submitter Role', 'Submitter Email'
  ];
  const rawRow = {
    Timestamp: '2026-07-30T12:00:00Z',
    'Venue ID (existing)': 'ven_1',
    'Game(s)': games.join(', '),
    'Organizer Name': 'Cal Alumni Club',
    'Organizer Type': 'Alumni group',
    'Official Event URL': 'https://events.example/watch-party',
    'Age Policy': 'All ages',
    'Sound Status': 'On',
    'Restrictions Note': 'Reservations recommended.',
    'Game Day Note': 'Wear blue and gold.',
    'Submitter Role': 'Alumni group',
    'Submitter Email': 'private@example.com'
  };
  if (legacyStartTime !== undefined) {
    rawHeaders.splice(6, 0, 'Start or arrival time');
    rawRow['Start or arrival time'] = legacyStartTime;
  }
  const rawSheet = new SheetMock('Watch_Party_Submissions_Raw', rawHeaders, [rawRow]);
  const venueSheet = new SheetMock('Venues', [
    'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
    'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
    'verification_status', 'alumni_owned', 'external_source', 'external_place_id',
    'short_description', 'photo_url', 'photo_credit', 'publication_status',
    'source_submission_id', 'created_at', 'updated_at'
  ], [{
    venue_id: 'ven_1', slug: 'test-venue', name: 'Test Venue', address_line_1: '1 Main',
    city: 'Oakland', region: 'CA', postal_code: '94612', country_code: 'US',
    latitude: 37.8, longitude: -122.27, venue_type: 'community_location',
    verification_status: 'user_added', alumni_owned: 'unknown',
    publication_status: venuePublished ? 'published' : 'draft',
    created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z'
  }]);
  const gameSheet = new SheetMock('Games', [
    'game_id', 'season', 'schedule_order', 'opponent_name', 'opponent_short_name',
    'home_away', 'game_date', 'kickoff_at', 'kickoff_status', 'game_status', 'updated_at'
  ], ['game_1', 'game_2'].map((gameId, index) => ({
    game_id: gameId, season: 2026, schedule_order: index + 1, opponent_name: `Opponent ${index + 1}`,
    home_away: 'home', game_date: `2026-09-${String(index + 5).padStart(2, '0')}`,
    kickoff_status: 'tbd', game_status: 'upcoming', updated_at: '2026-07-01T00:00:00Z'
  })));
  const watchPartySheet = new SheetMock('Watch_Parties', WATCH_PARTY_HEADERS, []);
  const workbook = new WorkbookMock([rawSheet, venueSheet, gameSheet, watchPartySheet]);
  const removedCacheKeys = [];
  let uuid = 0;

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
    Error,
    URL,
    CGB_TABS: { Watch_Parties: WATCH_PARTY_HEADERS },
    Utilities: { getUuid: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
    getWorkbook_: () => workbook,
    readSheetObjects_: (book, tabName) => {
      const sheet = book.getSheetByName(tabName);
      return sheet ? objectsFromSheet(sheet) : [];
    },
    hasValidVenueCoordinates_: (row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)),
    clearPublicSnapshotCache_: () => removedCacheKeys.push('cgb_v2_public_snapshot')
  });

  vm.runInContext(`${automation}\nglobalThis.__api = { process: processMinimalWatchPartyFormSubmission_, prepare: prepareMinimalWatchPartyAutomation };`, context);
  const event = {
    range: { getSheet: () => rawSheet, getRow: () => 2 },
    namedValues: Object.fromEntries(Object.entries(rawRow).map(([key, value]) => [key, [value]]))
  };
  return { api: context.__api, event, workbook, rawSheet, watchPartySheet, removedCacheKeys };
}

test('valid submission without a start-time field creates one published canonical Watch Party', () => {
  const { api, event, rawSheet, watchPartySheet, removedCacheKeys } = buildHarness();
  const result = api.process(event);
  assert.equal(result.ok, true);
  assert.equal(result.created_watch_party_ids.length, 1);

  const parties = objectsFromSheet(watchPartySheet);
  assert.equal(parties.length, 1);
  assert.equal(parties[0].venue_id, 'ven_1');
  assert.equal(parties[0].game_id, 'game_1');
  assert.equal(parties[0].organizer_type, 'alumni_group');
  assert.equal(parties[0].source_type, 'alumni_group_submitted');
  assert.equal(parties[0].event_start_at, '');
  assert.equal(parties[0].event_status, 'active');
  assert.equal(parties[0].publication_status, 'published');
  assert.equal('submitter_email' in parties[0], false);

  const raw = objectsFromSheet(rawSheet)[0];
  assert.equal(raw.processing_status, 'processed');
  assert.deepEqual(JSON.parse(raw.created_watch_party_ids), Array.from(result.created_watch_party_ids));
  assert.equal(raw.processing_error, '');
  assert.deepEqual(removedCacheKeys, ['cgb_v2_public_snapshot']);
});

test('legacy start-time value is ignored without changing the raw response columns', () => {
  const { api, event, rawSheet, watchPartySheet } = buildHarness({ legacyStartTime: '12:00 PM' });
  const originalHeaders = rawSheet.values[0].slice();
  const result = api.process(event);

  assert.equal(result.ok, true);
  assert.deepEqual(rawSheet.values[0].slice(0, originalHeaders.length), originalHeaders);
  assert.equal(objectsFromSheet(rawSheet)[0]['Start or arrival time'], '12:00 PM');
  assert.equal(objectsFromSheet(watchPartySheet)[0].event_start_at, '');
});

test('one submission with two game IDs creates one blank-start row per game', () => {
  const { api, event, watchPartySheet } = buildHarness({ games: ['game_1', 'game_2'] });
  const result = api.process(event);
  assert.equal(result.ok, true);
  assert.equal(result.created_watch_party_ids.length, 2);
  const parties = objectsFromSheet(watchPartySheet);
  assert.deepEqual(parties.map((row) => row.game_id), ['game_1', 'game_2']);
  assert.deepEqual(parties.map((row) => row.event_start_at), ['', '']);
});

test('invalid venue records an error and creates no canonical row', () => {
  const { api, event, rawSheet, watchPartySheet, removedCacheKeys } = buildHarness({ venuePublished: false });
  const result = api.process(event);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'venue_not_publishable');
  assert.equal(objectsFromSheet(watchPartySheet).length, 0);
  assert.equal(objectsFromSheet(rawSheet)[0].processing_status, 'error');
  assert.equal(objectsFromSheet(rawSheet)[0].processing_error, 'venue_not_publishable');
  assert.deepEqual(removedCacheKeys, []);
});

test('invalid public URL fails before publication', () => {
  const { api, event, rawSheet, watchPartySheet } = buildHarness();
  event.namedValues['Official Event URL'] = ['javascript:alert(1)'];
  const result = api.process(event);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'invalid_official_event_url');
  assert.equal(objectsFromSheet(watchPartySheet).length, 0);
  assert.equal(objectsFromSheet(rawSheet)[0].processing_error, 'invalid_official_event_url');
});

test('setup appends only private administrative headers', () => {
  const { api, rawSheet } = buildHarness();
  const result = api.prepare();
  assert.equal(result.ok, true);
  assert.deepEqual(rawSheet.values[0].slice(-6), [
    'submission_id', 'processing_status', 'created_watch_party_ids',
    'created_venue_id', 'processing_error', 'processed_at'
  ]);
});
