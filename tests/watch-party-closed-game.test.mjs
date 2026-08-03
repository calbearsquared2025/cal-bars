import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const canonicalIds = await readFile(new URL('../apps-script/CanonicalIds.gs', import.meta.url), 'utf8');
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
  getRange(row, column, rows = 1, columns = 1) {
    return new RangeMock(this, row, column, rows, columns);
  }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
  setFrozenRows() {}
}

function objectsFromSheet(sheet) {
  const [headers, ...rows] = sheet.values;
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

test('completed games are rejected before canonical publication', () => {
  const rawHeaders = [
    'Timestamp', 'Venue Name', 'Which game or games will have a Watch Party here?',
    'Organizer or host name', 'Who is organizing or hosting this Watch Party?',
    'What is your relationship to this Watch Party?', 'Venue ID (existing)'
  ];
  const rawRow = {
    Timestamp: '2026-09-06T12:00:00Z',
    'Venue Name': 'Test Venue',
    'Which game or games will have a Watch Party here?': 'Sep 5 — Cal vs. UCLA',
    'Organizer or host name': 'Cal Fans',
    'Who is organizing or hosting this Watch Party?': 'Individual or group of fans',
    'What is your relationship to this Watch Party?': 'I am organizing it as an individual or group of fans',
    'Venue ID (existing)': 'ven_1'
  };

  const rawSheet = new SheetMock('Watch_Party_Submissions_Raw', rawHeaders, [rawRow]);
  const watchPartySheet = new SheetMock('Watch_Parties', WATCH_PARTY_HEADERS);
  const rows = {
    Venues: [{
      venue_id: 'ven_1', publication_status: 'published', latitude: 37.8, longitude: -122.27
    }],
    Games: [{
      game_id: 'game_2026_01', opponent_name: 'UCLA', home_away: 'home',
      game_date: '2026-09-05', game_status: 'completed'
    }]
  };
  const sheets = new Map([
    ['Watch_Party_Submissions_Raw', rawSheet],
    ['Watch_Parties', watchPartySheet]
  ]);
  const workbook = { getSheetByName: (name) => sheets.get(name) || null };
  let uuid = 0;
  let cacheClearCount = 0;

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
    Utilities: { getUuid: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
    getWorkbook_: () => workbook,
    normalizeCellValue_: (value) => value,
    readSheetObjects_: (_book, tabName) => rows[tabName] || [],
    hasValidVenueCoordinates_: (row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)),
    clearPublicSnapshotCache_: () => { cacheClearCount += 1; }
  });

  vm.runInContext(`${canonicalIds}\n${automation}\nglobalThis.__process = processMinimalWatchPartyFormSubmission_;`, context);
  const event = {
    range: { getSheet: () => rawSheet, getRow: () => 2 },
    namedValues: Object.fromEntries(Object.entries(rawRow).map(([key, value]) => [key, [value]]))
  };

  const result = context.__process(event);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'game_not_open');
  assert.equal(objectsFromSheet(watchPartySheet).length, 0);
  assert.equal(objectsFromSheet(rawSheet)[0].processing_status, 'error');
  assert.equal(objectsFromSheet(rawSheet)[0].processing_error, 'game_not_open');
  assert.equal(cacheClearCount, 0);
});
