import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const canonicalIds = await readFile(new URL('../apps-script/CanonicalIds.gs', import.meta.url), 'utf8');
const fanIntent = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');
const externalVenue = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');

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
    if (this.sheet.failNextWrite) {
      this.sheet.failNextWrite = false;
      throw new Error(`${this.sheet.name}_write_failed`);
    }
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
    this.failNextWrite = false;
  }
  getName() { return this.name; }
  getDataRange() { return new RangeMock(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  getRange(row, column, rows = 1, columns = 1) { return new RangeMock(this, row, column, rows, columns); }
  getLastRow() { return this.values.length; }
  getLastColumn() { return Math.max(0, ...this.values.map((row) => row.length)); }
  getMaxRows() { return Math.max(1000, this.values.length); }
  setFrozenRows() {}
  deleteRow(rowNumber) { this.values.splice(rowNumber - 1, 1); }
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.getName(), sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

const now = '2026-07-29T05:00:00.000Z';
const browserId = `browser_${randomUUID()}`;

function baseVenue(overrides = {}) {
  return {
    venue_id: 'ven_existing',
    slug: 'existing-location',
    name: 'Existing Location',
    address_line_1: '1 Main St',
    address_line_2: '',
    city: 'Oakland',
    region: 'CA',
    postal_code: '94612',
    country_code: 'US',
    latitude: 37.8,
    longitude: -122.27,
    website_url: '',
    venue_type: 'cal_bar',
    verification_status: 'cgb_reviewed',
    alumni_owned: 'unknown',
    external_source: '',
    external_place_id: '',
    short_description: '',
    photo_url: '',
    photo_credit: '',
    publication_status: 'published',
    source_submission_id: '',
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

function externalPlace(overrides = {}) {
  return {
    source: 'maptiler',
    placeId: 'poi.98765',
    name: "McNally's Irish Pub",
    address: '5352 College Ave, Oakland, CA 94618, United States',
    addressLine1: '5352 College Ave',
    addressLine2: '',
    city: 'Oakland',
    region: 'CA',
    postalCode: '94618',
    countryCode: 'US',
    latitude: 37.839,
    longitude: -122.252,
    ...overrides
  };
}

function buildHarness({ venues = [baseVenue()], fanRows = [], gameStatus = 'upcoming' } = {}) {
  const games = [{
    game_id: 'game_1', season: 2026, schedule_order: 1, opponent_name: 'Test',
    opponent_short_name: 'Test', home_away: 'home', game_date: '2026-09-05',
    kickoff_at: '', kickoff_status: 'tbd', game_status: gameStatus, updated_at: now
  }];
  const venueSheet = new SheetMock('Venues', VENUE_HEADERS, venues);
  const fanSheet = new SheetMock('Fan_Intent', FAN_HEADERS, fanRows);
  const workbook = new WorkbookMock([
    venueSheet,
    new SheetMock('Games', GAME_HEADERS, games),
    new SheetMock('Watch_Parties', ['watch_party_id'], []),
    fanSheet
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
  vm.runInContext(
    `${code}\n${canonicalIds}\n${externalVenue}\n${fanIntent}\n` +
    `getWorkbook_ = function(){ return __workbook; };\n` +
    `globalThis.__api = { doPost, processJoinExternalVenueRequest_, parseJoinExternalVenuePayload_ };`,
    context
  );
  return { workbook, venueSheet, fanSheet, api: context.__api };
}

function post(api, payload) {
  return JSON.parse(api.doPost({ postData: { contents: JSON.stringify(payload) } }).text);
}

function joinExternal(api, place = externalPlace()) {
  return post(api, { action: 'joinExternalVenue', browserId, gameId: 'game_1', externalPlace: place });
}

function sheetObjects(sheet, headers) {
  return sheet.values.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function activeFanRows(fanSheet) {
  return sheetObjects(fanSheet, FAN_HEADERS).filter((row) => row.status === 'attending');
}

test('new external place creates one persistent Community Location and Fan Intent together', () => {
  const { api, venueSheet, fanSheet } = buildHarness();
  const response = joinExternal(api);
  const venues = sheetObjects(venueSheet, VENUE_HEADERS);
  const created = venues.find((venue) => venue.external_place_id === 'poi.98765');

  assert.equal(response.ok, true);
  assert.equal(response.action, 'joinExternalVenue');
  assert.equal(response.venue.venue_id, created.venue_id);
  assert.equal(response.selection.venue_id, created.venue_id);
  assert.equal(created.venue_type, 'community_location');
  assert.equal(created.verification_status, 'user_added');
  assert.equal(created.publication_status, 'published');
  assert.equal(created.external_source, 'maptiler');
  assert.match(created.venue_id, /^venue_[a-f0-9]{24}$/);
  assert.equal(created.slug, 'mcnally-s-irish-pub-oakland');
  assert.equal(activeFanRows(fanSheet).length, 1);
  assert.equal(activeFanRows(fanSheet)[0].venue_id, created.venue_id);
  assert.match(activeFanRows(fanSheet)[0].fan_intent_id, /^fi_[a-f0-9]{24}$/);
  assert.deepEqual(response.fanCounts, [{ game_id: 'game_1', venue_id: created.venue_id, count: 1 }]);
});

test('external place ID matching reuses the canonical Venue', () => {
  const matched = baseVenue({
    venue_id: 'ven_maptiler',
    slug: 'canonical-maptiler-place',
    name: 'Canonical MapTiler Place',
    external_source: 'maptiler',
    external_place_id: 'poi.98765'
  });
  const { api, venueSheet } = buildHarness({ venues: [baseVenue(), matched] });
  const response = joinExternal(api, externalPlace({ addressLine1: 'Different upstream address' }));
  assert.equal(response.venue.venue_id, 'ven_maptiler');
  assert.equal(sheetObjects(venueSheet, VENUE_HEADERS).length, 2);
});

test('normalized-address matching reuses a Venue when external IDs differ', () => {
  const addressMatch = baseVenue({
    venue_id: 'ven_address',
    slug: 'address-match',
    name: 'Address Match',
    address_line_1: '5352 College Avenue',
    city: 'Oakland',
    region: 'CA',
    postal_code: '94618',
    external_source: 'maptiler',
    external_place_id: 'poi.old-id'
  });
  const { api, venueSheet } = buildHarness({ venues: [baseVenue(), addressMatch] });
  const response = joinExternal(api);
  assert.equal(response.venue.venue_id, 'ven_address');
  assert.equal(sheetObjects(venueSheet, VENUE_HEADERS).length, 2);
});

test('ordinary repeated requests remain one Venue and one active Fan Intent', () => {
  const { api, venueSheet, fanSheet } = buildHarness();
  const first = joinExternal(api);
  const second = joinExternal(api);
  assert.equal(first.venue.venue_id, second.venue.venue_id);
  assert.equal(sheetObjects(venueSheet, VENUE_HEADERS).filter((row) => row.external_place_id === 'poi.98765').length, 1);
  assert.equal(activeFanRows(fanSheet).length, 1);
  assert.equal(second.fanCounts.find((row) => row.venue_id === second.venue.venue_id).count, 1);
});

test('slug generation is stable and adds the smallest unique suffix', () => {
  const collision = baseVenue({ venue_id: 'ven_collision', slug: 'mcnally-s-irish-pub-oakland' });
  const { api, venueSheet } = buildHarness({ venues: [collision] });
  const response = joinExternal(api);
  assert.equal(response.venue.slug, 'mcnally-s-irish-pub-oakland-2');
  assert.equal(sheetObjects(venueSheet, VENUE_HEADERS).find((row) => row.venue_id === response.venue.venue_id).slug, response.venue.slug);
});

test('joining an external Venue moves an existing selection without duplicate active rows', () => {
  const { api, fanSheet } = buildHarness();
  const joined = post(api, { action: 'join', browserId, gameId: 'game_1', venueId: 'ven_existing' });
  assert.equal(joined.selection.venue_id, 'ven_existing');
  const moved = joinExternal(api);
  assert.equal(activeFanRows(fanSheet).length, 1);
  assert.equal(activeFanRows(fanSheet)[0].venue_id, moved.venue.venue_id);
  assert.deepEqual(moved.fanCounts, [{ game_id: 'game_1', venue_id: moved.venue.venue_id, count: 1 }]);
});

test('moving from one external Venue to another keeps one active selection', () => {
  const { api, venueSheet, fanSheet } = buildHarness();
  const first = joinExternal(api);
  const second = joinExternal(api, externalPlace({
    placeId: 'poi.22222',
    name: 'Second External Pub',
    address: '900 Second St, Berkeley, CA 94710, United States',
    addressLine1: '900 Second St',
    city: 'Berkeley',
    postalCode: '94710',
    latitude: 37.87,
    longitude: -122.3
  }));
  assert.notEqual(first.venue.venue_id, second.venue.venue_id);
  assert.equal(sheetObjects(venueSheet, VENUE_HEADERS).filter((row) => row.external_source === 'maptiler').length, 2);
  assert.equal(activeFanRows(fanSheet).length, 1);
  assert.equal(activeFanRows(fanSheet)[0].venue_id, second.venue.venue_id);
});

test('failed Fan Intent append removes the just-created Venue', () => {
  const harness = buildHarness();
  harness.fanSheet.failNextWrite = true;
  const response = joinExternal(harness.api);
  assert.equal(response.ok, false);
  assert.equal(response.error, 'write_failed');
  assert.equal(sheetObjects(harness.venueSheet, VENUE_HEADERS).length, 1);
  assert.equal(sheetObjects(harness.fanSheet, FAN_HEADERS).length, 0);
});

test('invalid provider, identifiers, address, coordinates, and closed games are rejected', () => {
  const invalid = buildHarness();
  assert.equal(joinExternal(invalid.api, externalPlace({ source: 'google' })).error, 'unsupported_external_source');
  assert.equal(joinExternal(invalid.api, externalPlace({ placeId: '' })).error, 'invalid_external_place_id');
  assert.equal(joinExternal(invalid.api, externalPlace({ addressLine1: '' })).error, 'invalid_external_address');
  assert.equal(joinExternal(invalid.api, externalPlace({ latitude: 999 })).error, 'invalid_external_coordinates');
  const closed = buildHarness({ gameStatus: 'completed' });
  assert.equal(joinExternal(closed.api).error, 'game_not_open');
});

test('public write response excludes private external and Fan Intent fields', () => {
  const { api } = buildHarness();
  const serialized = JSON.stringify(joinExternal(api));
  assert.doesNotMatch(serialized, /browser_id|browserId|fan_intent_id|external_source|external_place_id|publication_status|workbook/i);
  assert.match(serialized, /community_location/);
});
