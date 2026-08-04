import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const canonicalIds = await readFile(new URL('../apps-script/CanonicalIds.gs', import.meta.url), 'utf8');
const automation = await readFile(new URL('../apps-script/WatchPartyAutomation.gs', import.meta.url), 'utf8');

const RAW_HEADERS = [
  'Timestamp',
  'Venue Name',
  'Which game or games will have a Watch Party here?',
  'Organizer or host name',
  'Who is organizing or hosting this Watch Party?',
  'Official event or RSVP link',
  'What is your relationship to this Watch Party?',
  'Are there age restrictions?',
  'Will the game audio be on?',
  'Anything else fans should know?',
  'Contact Email',
  'Venue ID (existing)',
  'submission_id',
  'processing_status',
  'created_watch_party_ids',
  'created_venue_id',
  'processing_error',
  'processed_at'
];

const WATCH_PARTY_HEADERS = [
  'watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type',
  'official_event_url', 'source_type', 'event_start_at', 'age_policy', 'sound_status',
  'restrictions_note', 'game_day_note', 'event_status', 'publication_status',
  'source_submission_id', 'created_at', 'updated_at'
];

const GAME_ONE = 'game_2026_01';
const GAME_TWO = 'game_2026_02';
const LABEL_ONE = 'Sep 5 — Cal vs. UCLA';
const LABEL_TWO = 'Sep 12 — Cal at Syracuse';
const CGB_ADMIN_HEADERS = new Set([
  'submission_id', 'processing_status', 'created_watch_party_ids',
  'created_venue_id', 'processing_error', 'processed_at'
]);

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
    if (this.sheet.failSetValues?.({ range: this, values })) {
      throw new Error('injected_sheet_write_failure');
    }
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
    this.failSetValues = null;
  }

  getName() { return this.name; }
  getLastRow() { return this.values.length; }
  getLastColumn() { return Math.max(0, ...this.values.map((row) => row.length)); }
  getRange(row, column, rows = 1, columns = 1) { return new RangeMock(this, row, column, rows, columns); }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
  setFrozenRows() {}
}

class WorkbookMock {
  constructor(sheets) {
    this.sheets = new Map(sheets.map((sheet) => [sheet.getName(), sheet]));
  }

  getSheetByName(name) { return this.sheets.get(name) || null; }
}

function objectsFromSheet(sheet) {
  const [headers, ...rows] = sheet.values;
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function makeRawRow({
  gameSelections = [LABEL_ONE],
  submissionId = '',
  processingStatus = ''
} = {}) {
  return {
    Timestamp: '2026-08-03T12:00:00Z',
    'Venue Name': 'Test Venue',
    'Which game or games will have a Watch Party here?': gameSelections.join(', '),
    'Organizer or host name': 'Cal Alumni Club',
    'Who is organizing or hosting this Watch Party?': 'Alumni group',
    'Official event or RSVP link': 'events.example/watch-party',
    'What is your relationship to this Watch Party?': 'I represent the alumni group or organization hosting it',
    'Are there age restrictions?': 'All ages',
    'Will the game audio be on?': 'Yes',
    'Anything else fans should know?': 'Wear blue and gold.',
    'Contact Email': 'private@example.com',
    'Venue ID (existing)': 'ven_1',
    submission_id: submissionId,
    processing_status: processingStatus,
    created_watch_party_ids: '',
    created_venue_id: '',
    processing_error: '',
    processed_at: ''
  };
}

function existingParty({ id, gameId, submissionId }) {
  return {
    watch_party_id: id,
    venue_id: 'ven_1',
    game_id: gameId,
    organizer_name: 'Cal Alumni Club',
    organizer_type: 'alumni_group',
    official_event_url: 'https://events.example/watch-party',
    source_type: 'alumni_group_submitted',
    event_start_at: '',
    age_policy: 'all_ages',
    sound_status: 'confirmed_on',
    restrictions_note: '',
    game_day_note: 'Wear blue and gold.',
    event_status: 'active',
    publication_status: 'published',
    source_submission_id: submissionId,
    created_at: '2026-08-03T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z'
  };
}

function buildHarness({
  gameSelections = [LABEL_ONE],
  submissionId = '',
  processingStatus = '',
  existingParties = [],
  lockResult = true,
  failProcessedStatusOnce = false
} = {}) {
  const rawRow = makeRawRow({ gameSelections, submissionId, processingStatus });
  const rawSheet = new SheetMock('Watch_Party_Submissions_Raw', RAW_HEADERS, [rawRow]);
  const venueSheet = new SheetMock('Venues', [
    'venue_id', 'slug', 'name', 'address_line_1', 'city', 'region', 'postal_code',
    'country_code', 'latitude', 'longitude', 'publication_status'
  ], [{
    venue_id: 'ven_1', slug: 'test-venue', name: 'Test Venue', address_line_1: '1 Main',
    city: 'Oakland', region: 'CA', postal_code: '94612', country_code: 'US',
    latitude: 37.8, longitude: -122.27, publication_status: 'published'
  }]);
  const gameSheet = new SheetMock('Games', [
    'game_id', 'season', 'schedule_order', 'opponent_name', 'home_away',
    'game_date', 'kickoff_at', 'kickoff_status', 'game_status', 'updated_at'
  ], [
    {
      game_id: GAME_ONE, season: 2026, schedule_order: 1, opponent_name: 'UCLA',
      home_away: 'home', game_date: '2026-09-05', kickoff_status: 'confirmed',
      game_status: 'upcoming', updated_at: '2026-08-03T00:00:00Z'
    },
    {
      game_id: GAME_TWO, season: 2026, schedule_order: 2, opponent_name: 'Syracuse',
      home_away: 'away', game_date: '2026-09-12', kickoff_status: 'confirmed',
      game_status: 'upcoming', updated_at: '2026-08-03T00:00:00Z'
    }
  ]);
  const watchPartySheet = new SheetMock('Watch_Parties', WATCH_PARTY_HEADERS, existingParties);
  const workbook = new WorkbookMock([rawSheet, venueSheet, gameSheet, watchPartySheet]);

  let failPending = failProcessedStatusOnce;
  rawSheet.failSetValues = ({ values }) => {
    if (!failPending || values?.[0]?.[0] !== 'processed') return false;
    failPending = false;
    return true;
  };

  const cacheClears = [];
  const lockStats = { tries: [], releases: 0 };
  let uuid = 0;
  const scriptLock = {
    tryLock(timeout) {
      lockStats.tries.push(timeout);
      return lockResult;
    },
    releaseLock() { lockStats.releases += 1; }
  };

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
    CGB_TABS: { Watch_Parties: WATCH_PARTY_HEADERS },
    Utilities: {
      getUuid: () => `${String(++uuid).padStart(8, '0')}-0000-4000-8000-000000000000`
    },
    LockService: { getScriptLock: () => scriptLock },
    getWorkbook_: () => workbook,
    normalizeCellValue_: (value) => value,
    readSheetObjects_: (book, tabName) => {
      const sheet = book.getSheetByName(tabName);
      return sheet ? objectsFromSheet(sheet) : [];
    },
    hasValidVenueCoordinates_: (row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)),
    clearPublicSnapshotCache_: () => cacheClears.push('cgb_v2_public_snapshot')
  });

  vm.runInContext(
    `${canonicalIds}\n${automation}\nglobalThis.__api = { process: processMinimalWatchPartyFormSubmission_ };`,
    context
  );
  const event = {
    range: { getSheet: () => rawSheet, getRow: () => 2 },
    namedValues: Object.fromEntries(
      Object.entries(rawRow)
        .filter(([key]) => !CGB_ADMIN_HEADERS.has(key))
        .map(([key, value]) => [key, [value]])
    )
  };
  return { api: context.__api, event, rawSheet, watchPartySheet, cacheClears, lockStats };
}

test('redelivery reuses one submission ID and one Watch Party per game', () => {
  const harness = buildHarness();
  const first = harness.api.process(harness.event);
  const second = harness.api.process(harness.event);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.submission_id, first.submission_id);
  assert.deepEqual(Array.from(second.created_watch_party_ids), Array.from(first.created_watch_party_ids));
  assert.equal(second.newly_created_watch_party_ids.length, 0);
  assert.equal(objectsFromSheet(harness.watchPartySheet).length, 1);
  assert.deepEqual(harness.cacheClears, ['cgb_v2_public_snapshot']);
  assert.deepEqual(harness.lockStats.tries, [30000, 30000]);
  assert.equal(harness.lockStats.releases, 2);
});

test('a partially published multi-game submission creates only missing games', () => {
  const submissionId = 'wps_aaaaaaaaaaaaaaaaaaaaaaaa';
  const existingId = 'wp_bbbbbbbbbbbbbbbbbbbbbbbb';
  const harness = buildHarness({
    gameSelections: [LABEL_ONE, LABEL_TWO],
    submissionId,
    processingStatus: 'error',
    existingParties: [existingParty({ id: existingId, gameId: GAME_ONE, submissionId })]
  });

  const result = harness.api.process(harness.event);
  const parties = objectsFromSheet(harness.watchPartySheet);

  assert.equal(result.ok, true);
  assert.equal(parties.length, 2);
  assert.deepEqual(parties.map((row) => row.game_id), [GAME_ONE, GAME_TWO]);
  assert.equal(result.created_watch_party_ids[0], existingId);
  assert.equal(result.newly_created_watch_party_ids.length, 1);
  assert.deepEqual(harness.cacheClears, ['cgb_v2_public_snapshot']);
});

test('retry repairs a failure after canonical write without publishing a duplicate', () => {
  const harness = buildHarness({ failProcessedStatusOnce: true });

  const first = harness.api.process(harness.event);
  assert.equal(first.ok, false);
  assert.equal(first.error, 'watch_party_processing_failed');
  assert.equal(objectsFromSheet(harness.watchPartySheet).length, 1);
  assert.equal(objectsFromSheet(harness.rawSheet)[0].processing_status, 'error');
  assert.equal(harness.cacheClears.length, 0);

  const second = harness.api.process(harness.event);
  assert.equal(second.ok, true);
  assert.equal(second.newly_created_watch_party_ids.length, 0);
  assert.equal(objectsFromSheet(harness.watchPartySheet).length, 1);
  assert.equal(objectsFromSheet(harness.rawSheet)[0].processing_status, 'processed');
  assert.deepEqual(harness.cacheClears, ['cgb_v2_public_snapshot']);
});

test('lock timeout makes no canonical or raw processing-state change', () => {
  const harness = buildHarness({ lockResult: false });
  const beforeRaw = JSON.stringify(harness.rawSheet.values);

  const result = harness.api.process(harness.event);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'watch_party_processing_busy');
  assert.equal(objectsFromSheet(harness.watchPartySheet).length, 0);
  assert.equal(JSON.stringify(harness.rawSheet.values), beforeRaw);
  assert.deepEqual(harness.lockStats.tries, [30000]);
  assert.equal(harness.lockStats.releases, 0);
});
