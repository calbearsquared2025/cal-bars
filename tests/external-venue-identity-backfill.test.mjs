import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const externalVenueCode = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');
const contributionCode = await readFile(new URL('../apps-script/ExternalVenueContribution.gs', import.meta.url), 'utf8');

const VENUE_HEADERS = [
  'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
  'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
  'verification_status', 'alumni_owned', 'external_source', 'external_place_id',
  'short_description', 'publication_status', 'source_submission_id', 'created_at',
  'updated_at'
];

class RangeMock {
  constructor(sheet, row, column, rows, columns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rows = rows;
    this.columns = columns;
  }

  setValues(values) {
    values.forEach((sourceRow, rowOffset) => {
      const rowIndex = this.row - 1 + rowOffset;
      if (!this.sheet.values[rowIndex]) this.sheet.values[rowIndex] = [];
      sourceRow.forEach((value, columnOffset) => {
        this.sheet.values[rowIndex][this.column - 1 + columnOffset] = value;
      });
    });
    return this;
  }
}

class SheetMock {
  constructor(name, headers, rows = []) {
    this.name = name;
    this.headers = headers;
    this.values = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  }

  getRange(row, column, rows = 1, columns = 1) {
    return new RangeMock(this, row, column, rows, columns);
  }

  getLastRow() {
    return this.values.length;
  }

  deleteRow(rowNumber) {
    this.values.splice(rowNumber - 1, 1);
  }
}

function baseVenue(overrides = {}) {
  return {
    venue_id: 'venue_manual',
    slug: 'tightwad-hill-berkeley',
    name: 'Tightwad Hill',
    address_line_1: 'Tightwad Hill',
    address_line_2: '',
    city: 'Berkeley',
    region: 'CA',
    postal_code: '94720',
    country_code: 'US',
    latitude: 37.87262,
    longitude: -122.25083,
    website_url: 'https://asfanradio.com/tightwad-hill/',
    venue_type: 'community_location',
    verification_status: 'cgb_reviewed',
    alumni_owned: 'unknown',
    external_source: '',
    external_place_id: '',
    short_description: 'Historic hillside overlooking California Memorial Stadium.',
    publication_status: 'published',
    source_submission_id: '',
    created_at: '2026-08-28T15:21:34Z',
    updated_at: '2026-08-28T15:21:34Z',
    ...overrides
  };
}

function verifiedPlace(overrides = {}) {
  return {
    source: 'maptiler',
    placeId: 'poi.424242',
    name: 'Tightwad Hill',
    address: 'Tightwad Hill, Berkeley, CA 94720, United States',
    addressLine1: 'Tightwad Hill',
    addressLine2: '',
    city: 'Berkeley',
    region: 'CA',
    postalCode: '94720',
    countryCode: 'US',
    latitude: 37.87262,
    longitude: -122.25083,
    normalizedAddress: 'tightwad hill berkeley ca 94720 us',
    ...overrides
  };
}

function buildHarness({ venue = baseVenue(), failCanonicalVenueRead = false } = {}) {
  const venueSheet = new SheetMock('Venues', VENUE_HEADERS, [venue]);
  const game = { game_id: 'game_1', game_status: 'upcoming' };
  const workbook = { Venues: venueSheet, Games: [game] };
  let verifyCalls = 0;
  let cacheClears = 0;
  let fanVenueId = null;
  let fanRollbackCalls = 0;

  function tableFor(sheet) {
    const headers = sheet.values[0].map(String);
    const rows = sheet.values.slice(1).map((values, index) => {
      const object = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
      return { rowNumber: index + 2, values: values.slice(), object };
    });
    return { headers, rows };
  }

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
    CGB_BROWSER_ID_PATTERN: /^browser_[A-Za-z0-9_-]{16,128}$/,
    CGB_SCHEMA_VERSION: '2.0',
    CGB_TABS: { Venues: VENUE_HEADERS },
    CGB_PUBLIC_FIELDS: { Venues: VENUE_HEADERS.filter((header) => ![
      'external_source', 'external_place_id', 'publication_status', 'source_submission_id', 'created_at'
    ].includes(header)) },
    getWorkbook_: () => workbook,
    getRequiredSheet_: (_workbook, name) => {
      if (name === 'Venues') return venueSheet;
      throw new Error(`Unexpected sheet ${name}`);
    },
    readSheetTable_: (sheet) => tableFor(sheet),
    readSheetObjects_: (_workbook, name) => {
      if (name === 'Games') return [game];
      if (name === 'Venues') {
        if (failCanonicalVenueRead) throw new Error('canonical_read_failed');
        return tableFor(venueSheet).rows.map((record) => record.object);
      }
      if (name === 'Fan_Intent') return [];
      throw new Error(`Unexpected object read ${name}`);
    },
    hasValidVenueCoordinates_: (row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)),
    clearPublicSnapshotCache_: () => { cacheClears += 1; },
    whitelist_: (row, fields) => Object.fromEntries(fields.filter((field) => field in row).map((field) => [field, row[field]])),
    fanIntentError_: (code) => Object.assign(new Error(code), { cgbCode: code }),
    isSafeCanonicalId_: (value) => /^[A-Za-z0-9_-]{3,80}$/.test(String(value || '')),
    archiveCompletedFanIntentRowsUnlocked_: () => 0,
    buildFanCounts_: () => [],
    buildVenueHistoryCounts_: () => [],
    createCanonicalEntityId_: () => 'venue_created',
    timestampValue_: () => 0,
    updateFanIntentRecord_: () => {}
  });

  vm.runInContext(`${externalVenueCode}\n${contributionCode}`, context);
  context.verifyExternalPlaceWithMapTiler_ = () => {
    verifyCalls += 1;
    return verifiedPlace();
  };
  context.applyExternalFanIntent_ = (_workbook, _request, venueId) => {
    fanVenueId = venueId;
    return { rollback: { test: true } };
  };
  context.rollbackExternalFanIntent_ = () => { fanRollbackCalls += 1; };

  return {
    context,
    venueSheet,
    get verifyCalls() { return verifyCalls; },
    get cacheClears() { return cacheClears; },
    get fanVenueId() { return fanVenueId; },
    get fanRollbackCalls() { return fanRollbackCalls; }
  };
}

function venueObject(sheet) {
  return Object.fromEntries(VENUE_HEADERS.map((header, index) => [header, sheet.values[1][index] ?? '']));
}

test('addExternalVenue adopts verified MapTiler identity on a normalized-address match and reuses it directly next time', () => {
  const harness = buildHarness();
  const request = { gameId: 'game_1', externalPlace: { source: 'maptiler', placeId: 'poi.424242' } };

  const first = harness.context.processAddExternalVenueRequest_(request);
  assert.equal(first.ok, true);
  assert.equal(first.venue.venue_id, 'venue_manual');
  assert.equal(Object.hasOwn(first.venue, 'external_source'), false);
  assert.equal(Object.hasOwn(first.venue, 'external_place_id'), false);
  assert.equal(venueObject(harness.venueSheet).external_source, 'maptiler');
  assert.equal(venueObject(harness.venueSheet).external_place_id, 'poi.424242');
  assert.equal(venueObject(harness.venueSheet).verification_status, 'cgb_reviewed');
  assert.notEqual(venueObject(harness.venueSheet).updated_at, '2026-08-28T15:21:34Z');
  assert.equal(harness.verifyCalls, 1);

  const second = harness.context.processAddExternalVenueRequest_(request);
  assert.equal(second.venue.venue_id, 'venue_manual');
  assert.equal(harness.verifyCalls, 1, 'repeat should match the adopted provider identity before verification');
});

test('joinExternalVenue adopts identity only after the Fan Intent write succeeds', () => {
  const harness = buildHarness();
  const response = harness.context.processJoinExternalVenueRequest_({
    browserId: 'browser_1234567890abcdef',
    gameId: 'game_1',
    externalPlace: { source: 'maptiler', placeId: 'poi.424242' }
  });

  assert.equal(response.ok, true);
  assert.equal(response.selection.venue_id, 'venue_manual');
  assert.equal(harness.fanVenueId, 'venue_manual');
  assert.equal(venueObject(harness.venueSheet).external_source, 'maptiler');
  assert.equal(venueObject(harness.venueSheet).external_place_id, 'poi.424242');
});

test('verified address match does not overwrite an existing conflicting provider identity', () => {
  const harness = buildHarness({
    venue: baseVenue({ external_source: 'maptiler', external_place_id: 'poi.999999' })
  });

  const response = harness.context.processAddExternalVenueRequest_({
    gameId: 'game_1',
    externalPlace: { source: 'maptiler', placeId: 'poi.424242' }
  });

  assert.equal(response.venue.venue_id, 'venue_manual');
  assert.equal(venueObject(harness.venueSheet).external_source, 'maptiler');
  assert.equal(venueObject(harness.venueSheet).external_place_id, 'poi.999999');
  assert.equal(venueObject(harness.venueSheet).updated_at, '2026-08-28T15:21:34Z');
});

test('verified address match does not fill a partial provider identity', () => {
  const harness = buildHarness({
    venue: baseVenue({ external_source: 'maptiler', external_place_id: '' })
  });

  const response = harness.context.processAddExternalVenueRequest_({
    gameId: 'game_1',
    externalPlace: { source: 'maptiler', placeId: 'poi.424242' }
  });

  assert.equal(response.venue.venue_id, 'venue_manual');
  assert.equal(venueObject(harness.venueSheet).external_source, 'maptiler');
  assert.equal(venueObject(harness.venueSheet).external_place_id, '');
  assert.equal(venueObject(harness.venueSheet).updated_at, '2026-08-28T15:21:34Z');
});

test('failed addExternalVenue response assembly rolls provider identity back', () => {
  const harness = buildHarness({ failCanonicalVenueRead: true });

  assert.throws(() => harness.context.processAddExternalVenueRequest_({
    gameId: 'game_1',
    externalPlace: { source: 'maptiler', placeId: 'poi.424242' }
  }), /canonical_read_failed/);

  assert.equal(venueObject(harness.venueSheet).external_source, '');
  assert.equal(venueObject(harness.venueSheet).external_place_id, '');
  assert.equal(venueObject(harness.venueSheet).updated_at, '2026-08-28T15:21:34Z');
});

test('failed joinExternalVenue response assembly rolls both provider identity and Fan Intent back', () => {
  const harness = buildHarness({ failCanonicalVenueRead: true });

  assert.throws(() => harness.context.processJoinExternalVenueRequest_({
    browserId: 'browser_1234567890abcdef',
    gameId: 'game_1',
    externalPlace: { source: 'maptiler', placeId: 'poi.424242' }
  }), /canonical_read_failed/);

  assert.equal(venueObject(harness.venueSheet).external_source, '');
  assert.equal(venueObject(harness.venueSheet).external_place_id, '');
  assert.equal(harness.fanRollbackCalls, 1);
});
