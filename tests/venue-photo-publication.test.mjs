import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

const VENUE_ID = 'venue_5977e35a58d8b18f22a51f1e';
const VENUE_HEADERS = [
  'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
  'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
  'verification_status', 'alumni_owned', 'external_source', 'external_place_id',
  'short_description', 'photo_url', 'photo_credit', 'publication_status',
  'source_submission_id', 'created_at', 'updated_at'
];
const PHOTO_HEADERS = [
  'venue_id', 'photo_url', 'photo_caption', 'photo_credit', 'photo_credit_url',
  'publication_status', 'updated_at'
];
const TEST_PHOTO_HEADERS = [
  ...PHOTO_HEADERS,
  'file_reference', 'respondent_email', 'permission_confirmed', 'reviewer_note',
  'raw_submission_contents'
];

class RangeMock {
  constructor(values) { this.values = values; }
  getValues() { return this.values.map((row) => row.slice()); }
}

class SheetMock {
  constructor(name, headers, rows = []) {
    this.name = name;
    this.values = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  }
  getLastRow() { return this.values.length; }
  getDataRange() { return new RangeMock(this.values); }
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.name, sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

function buildSnapshot(photoRows = []) {
  const workbook = new WorkbookMock([
    new SheetMock('Venues', VENUE_HEADERS, [{
      venue_id: VENUE_ID,
      slug: 'molly-o-s-san-carlos',
      name: "Molly O's",
      address_line_1: '1163 San Carlos Avenue',
      city: 'San Carlos',
      region: 'CA',
      country_code: 'US',
      latitude: 37.5065766,
      longitude: -122.2606365,
      venue_type: 'cal_bar',
      verification_status: 'cgb_reviewed',
      alumni_owned: 'yes',
      photo_url: 'https://legacy.example/ignored.webp',
      photo_credit: 'Ignored legacy credit',
      publication_status: 'published',
      updated_at: '2026-08-12T12:00:00Z'
    }]),
    new SheetMock('Venue_Photos', TEST_PHOTO_HEADERS, photoRows),
    new SheetMock('Games', ['game_id'], []),
    new SheetMock('Watch_Parties', ['watch_party_id'], []),
    new SheetMock('Fan_Intent', ['fan_intent_id'], [])
  ]);
  const context = vm.createContext({
    console: { log() {}, error() {}, warn() {} },
    Date,
    JSON,
    Number,
    Object,
    Array,
    String,
    Set,
    RegExp,
    Error,
    __workbook: workbook
  });
  vm.runInContext(
    `${code}\n` +
    `getWorkbook_ = function(){ return __workbook; };\n` +
    `archiveCompletedFanIntent_ = function(){};\n` +
    `globalThis.__snapshot = buildPublicSnapshot_();`,
    context
  );
  return JSON.parse(JSON.stringify(context.__snapshot));
}

function publishedPhoto(overrides = {}) {
  return {
    venue_id: VENUE_ID,
    photo_url: 'https://calgoldenbars.com/assets/venues/molly-o-s-san-carlos.webp',
    photo_caption: "Cal fans at Molly O's for the 2025 Louisville game.",
    photo_credit: 'Oski’s Drinking Straw',
    photo_credit_url: 'https://x.com/Oskisstraw',
    publication_status: 'published',
    updated_at: '2026-08-12T12:00:00Z',
    ...overrides
  };
}

test('published Venue_Photos metadata joins into the matching public Venue', () => {
  const venue = buildSnapshot([publishedPhoto()]).venues[0];
  assert.equal(venue.photo_url, 'https://calgoldenbars.com/assets/venues/molly-o-s-san-carlos.webp');
  assert.equal(venue.photo_caption, "Cal fans at Molly O's for the 2025 Louisville game.");
  assert.equal(venue.photo_credit, 'Oski’s Drinking Straw');
  assert.equal(venue.photo_credit_url, 'https://x.com/Oskisstraw');
});

test('draft and archived Venue_Photos rows do not publish or fall back to legacy Venue values', () => {
  for (const publication_status of ['draft', 'archived']) {
    const venue = buildSnapshot([publishedPhoto({ publication_status })]).venues[0];
    assert.deepEqual(
      [venue.photo_url, venue.photo_caption, venue.photo_credit, venue.photo_credit_url],
      ['', '', '', '']
    );
  }
});

test('invalid and unknown photo rows do not interrupt Venue publication', () => {
  const cases = [
    publishedPhoto({ photo_url: 'javascript:alert(1)' }),
    publishedPhoto({ photo_credit_url: 'file:///private/credit' }),
    publishedPhoto({ venue_id: 'venue_aaaaaaaaaaaaaaaaaaaaaaaa' })
  ];
  for (const row of cases) {
    const snapshot = buildSnapshot([row]);
    assert.equal(snapshot.venues.length, 1);
    assert.equal(snapshot.venues[0].venue_id, VENUE_ID);
    assert.equal(snapshot.venues[0].photo_url, '');
  }
});

test('duplicate published rows deterministically omit the Venue photo', () => {
  const venue = buildSnapshot([
    publishedPhoto(),
    publishedPhoto({ photo_url: 'https://calgoldenbars.com/assets/venues/replacement.webp' })
  ]).venues[0];
  assert.deepEqual(
    [venue.photo_url, venue.photo_caption, venue.photo_credit, venue.photo_credit_url],
    ['', '', '', '']
  );
});

test('private photo intake fields never enter public data and all four public photo properties remain present', () => {
  const snapshot = buildSnapshot([{
    ...publishedPhoto(),
    file_reference: 'private-drive-id',
    respondent_email: 'private@example.com',
    permission_confirmed: 'yes',
    reviewer_note: 'private note',
    raw_submission_contents: 'private response'
  }]);
  const venue = snapshot.venues[0];
  assert.deepEqual(
    ['photo_url', 'photo_caption', 'photo_credit', 'photo_credit_url'].filter((field) => field in venue),
    ['photo_url', 'photo_caption', 'photo_credit', 'photo_credit_url']
  );
  for (const privateValue of ['private-drive-id', 'private@example.com', 'private note', 'private response']) {
    assert.equal(JSON.stringify(snapshot).includes(privateValue), false);
  }
  assert.equal('photos' in snapshot, false);
  assert.equal('idAliases' in snapshot, false);
});
