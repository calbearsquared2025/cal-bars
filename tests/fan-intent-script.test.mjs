import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const canonicalIds = await readFile(new URL('../apps-script/CanonicalIds.gs', import.meta.url), 'utf8');
const fanIntent = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');

const VENUE_HEADERS = [
  'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
  'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
  'verification_status', 'alumni_owned', 'external_source', 'external_place_id',
  'short_description', 'photo_url', 'photo_credit', 'publication_status',
  'source_submission_id', 'created_at', 'updated_at'
];
const GAME_HEADERS = [
  'game_id', 'season', 'schedule_order', 'opponent_name', 'opponent_short_name',
  'home_away', 'game_date', 'kickoff_at', 'kickoff_status', 'game_status', 'updated_at'
];
const FAN_HEADERS = [
  'fan_intent_id', 'browser_id', 'game_id', 'venue_id', 'status',
  'created_at', 'updated_at', 'archived_at'
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
    this.values = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  }
  getName() { return this.name; }
  getDataRange() { return new RangeMock(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  getRange(row, column, rows = 1, columns = 1) { return new RangeMock(this, row, column, rows, columns); }
  getLastRow() { return this.values.length; }
  getLastColumn() { return Math.max(0, ...this.values.map((row) => row.length)); }
  getMaxRows() { return Math.max(1000, this.values.length); }
  setFrozenRows() {}
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.getName(), sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

function buildHarness({ fanRows = [], completed = false } = {}) {
  const now = '2026-07-27T12:00:00Z';
  const venues = [
    {
      venue_id: 'ven_1', slug: 'one', name: 'One', address_line_1: '1 Main', city: 'Berkeley', region: 'CA',
      country_code: 'US', latitude: 37.87, longitude: -122.27, venue_type: 'cal_bar',
      verification_status: 'cgb_reviewed', alumni_owned: 'unknown', publication_status: 'published', updated_at: now
    },
    {
      venue_id: 'ven_2', slug: 'two', name: 'Two', address_line_1: '2 Main', city: 'Oakland', region: 'CA',
      country_code: 'US', latitude: 37.8, longitude: -122.27, venue_type: 'community_location',
      verification_status: 'user_added', alumni_owned: 'unknown', publication_status: 'published', updated_at: now
    }
  ];
  const games = [{
    game_id: 'game_1', season: 2026, schedule_order: 1, opponent_name: 'Test', home_away: 'home',
    game_date: '2026-09-05', kickoff_at: '', kickoff_status: 'tbd', game_status: completed ? 'completed' : 'upcoming', updated_at: now
  }];
  const workbook = new WorkbookMock([
    new SheetMock('Venues', VENUE_HEADERS, venues),
    new SheetMock('Games', GAME_HEADERS, games),
    new SheetMock('Watch_Parties', ['watch_party_id'], []),
    new SheetMock('Fan_Intent', FAN_HEADERS, fanRows)
  ]);
  let uuid = 0;
  const cache = new Map();
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
    __workbook: workbook,
    Utilities: { getUuid: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}` },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({
      get: (key) => cache.get(key) || null,
      put: (key, value) => cache.set(key, value),
      remove: (key) => cache.delete(key)
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'private', setProperty() {} }) },
    SpreadsheetApp: { openById: () => workbook },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } })
    }
  });
  vm.runInContext(`${code}\n${canonicalIds}\n${fanIntent}\ngetWorkbook_ = function(){ return __workbook; };\nglobalThis.__api = { doPost, buildPublicSnapshot_, archiveCompletedFanIntentRowsUnlocked_ };`, context);
  return { workbook, api: context.__api };
}

function post(api, payload) {
  return JSON.parse(api.doPost({ postData: { contents: JSON.stringify(payload) } }).text);
}

function fanObjects(workbook) {
  const sheet = workbook.getSheetByName('Fan_Intent');
  return sheet.values.slice(1).map((row) => Object.fromEntries(FAN_HEADERS.map((header, index) => [header, row[index]])));
}

const browserId = `browser_${randomUUID()}`;

test('join creates one attending row and returns only aggregate-safe fields', () => {
  const { api, workbook } = buildHarness();
  const response = post(api, { action: 'join', browserId, gameId: 'game_1', venueId: 'ven_1' });
  assert.equal(response.ok, true);
  assert.deepEqual(response.selection, { game_id: 'game_1', venue_id: 'ven_1', status: 'attending' });
  assert.equal(response.fanCounts[0].count, 1);
  assert.equal(JSON.stringify(response).includes(browserId), false);
  assert.equal(JSON.stringify(response).includes('fan_intent_id'), false);
  assert.equal(fanObjects(workbook).filter((row) => row.status === 'attending').length, 1);
  assert.match(fanObjects(workbook)[0].fan_intent_id, /^fi_[a-f0-9]{24}$/);
});

test('ordinary duplicate joins remain one active selection', () => {
  const { api, workbook } = buildHarness();
  post(api, { action: 'join', browserId, gameId: 'game_1', venueId: 'ven_1' });
  const response = post(api, { action: 'join', browserId, gameId: 'game_1', venueId: 'ven_1' });
  assert.equal(response.fanCounts[0].count, 1);
  assert.equal(fanObjects(workbook).filter((row) => row.status === 'attending').length, 1);
});

test('move changes the same browser/game selection without increasing total active rows', () => {
  const { api, workbook } = buildHarness();
  post(api, { action: 'join', browserId, gameId: 'game_1', venueId: 'ven_1' });
  const response = post(api, { action: 'move', browserId, gameId: 'game_1', venueId: 'ven_2' });
  assert.equal(response.selection.venue_id, 'ven_2');
  assert.deepEqual(response.fanCounts, [{ game_id: 'game_1', venue_id: 'ven_2', count: 1 }]);
  const active = fanObjects(workbook).filter((row) => row.status === 'attending');
  assert.equal(active.length, 1);
  assert.equal(active[0].venue_id, 'ven_2');
});

test('withdraw is idempotent and removes the current count', () => {
  const { api, workbook } = buildHarness();
  post(api, { action: 'join', browserId, gameId: 'game_1', venueId: 'ven_1' });
  const first = post(api, { action: 'withdraw', browserId, gameId: 'game_1', venueId: 'ven_1' });
  const second = post(api, { action: 'withdraw', browserId, gameId: 'game_1', venueId: 'ven_1' });
  assert.equal(first.selection, null);
  assert.deepEqual(first.fanCounts, []);
  assert.equal(second.ok, true);
  assert.equal(fanObjects(workbook).filter((row) => row.status === 'attending').length, 0);
});

test('completed-game attending rows become archived historical activity', () => {
  const existing = [{
    fan_intent_id: 'fi_existing', browser_id: browserId, game_id: 'game_1', venue_id: 'ven_1', status: 'attending',
    created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z', archived_at: ''
  }];
  const { api, workbook } = buildHarness({ fanRows: existing, completed: true });
  const snapshot = api.buildPublicSnapshot_();
  const row = fanObjects(workbook)[0];
  assert.equal(row.status, 'archived');
  assert.ok(row.archived_at);
  assert.deepEqual(snapshot.fanCounts, []);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.venueHistoryCounts.find((item) => item.venue_id === 'ven_1'))), {
    venue_id: 'ven_1', past_game_count: 1
  });
});

test('malformed identifiers and closed games return generic public errors', () => {
  const invalid = buildHarness();
  assert.equal(post(invalid.api, { action: 'join', browserId: 'bad', gameId: 'game_1', venueId: 'ven_1' }).error, 'invalid_browser_id');
  const closed = buildHarness({ completed: true });
  assert.equal(post(closed.api, { action: 'join', browserId, gameId: 'game_1', venueId: 'ven_1' }).error, 'game_not_open');
});
