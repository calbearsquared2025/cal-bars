import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const canonicalIds = await readFile(new URL('../apps-script/CanonicalIds.gs', import.meta.url), 'utf8');

const CGB_HEADERS = Object.freeze({
  Venues: [
    'venue_id', 'slug', 'name', 'address_line_1', 'address_line_2', 'city', 'region',
    'postal_code', 'country_code', 'latitude', 'longitude', 'website_url', 'venue_type',
    'verification_status', 'alumni_owned', 'external_source', 'external_place_id',
    'short_description', 'photo_url', 'photo_credit', 'publication_status',
    'source_submission_id', 'created_at', 'updated_at'
  ],
  Games: [
    'game_id', 'season', 'schedule_order', 'opponent_name', 'home_away',
    'game_date', 'kickoff_at', 'kickoff_status', 'game_status', 'updated_at'
  ],
  Watch_Parties: [
    'watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'organizer_type',
    'official_event_url', 'source_type', 'event_start_at', 'age_policy', 'sound_status',
    'restrictions_note', 'game_day_note', 'event_status', 'publication_status',
    'source_submission_id', 'created_at', 'updated_at'
  ],
  Fan_Intent: [
    'fan_intent_id', 'browser_id', 'game_id', 'venue_id', 'status',
    'created_at', 'updated_at', 'archived_at'
  ]
});

class RangeMock {
  constructor(sheet) { this.sheet = sheet; }
  getValues() { return this.sheet.values.map((row) => row.slice()); }
  getDisplayValues() { return this.getValues().map((row) => row.map(String)); }
}

class SheetMock {
  constructor(name, headers, rows = []) {
    this.name = name;
    this.values = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  }
  getName() { return this.name; }
  getLastRow() { return this.values.length; }
  getDataRange() { return new RangeMock(this); }
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.name, sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

const canonicalVenueId = 'venue_7cbf6f0f2c33a2462d3da467';
const canonicalGameId = 'game_9e8f4860c6a256c0fae6007d';
const canonicalPartyId = 'wp_bde7440739a143b1a1eee89c';

function buildHarness() {
  const workbook = new WorkbookMock([
    new SheetMock('Venues', CGB_HEADERS.Venues, [{
      venue_id: canonicalVenueId,
      slug: 'test-venue',
      name: 'Test Venue',
      address_line_1: '1 Main Street',
      city: 'Oakland',
      region: 'CA',
      country_code: 'US',
      latitude: 37.8,
      longitude: -122.27,
      venue_type: 'community_location',
      verification_status: 'user_added',
      alumni_owned: 'unknown',
      publication_status: 'published',
      created_at: '2026-08-03T20:04:00Z',
      updated_at: '2026-08-03T20:04:00Z'
    }]),
    new SheetMock('Games', CGB_HEADERS.Games, [{
      game_id: canonicalGameId,
      season: 2026,
      schedule_order: 1,
      opponent_name: 'UCLA',
      home_away: 'home',
      game_date: '2026-09-05',
      kickoff_at: '2026-09-06T02:30:00Z',
      kickoff_status: 'confirmed',
      game_status: 'upcoming',
      updated_at: '2026-08-03T20:04:00Z'
    }]),
    new SheetMock('Watch_Parties', CGB_HEADERS.Watch_Parties, [{
      watch_party_id: canonicalPartyId,
      venue_id: canonicalVenueId,
      game_id: canonicalGameId,
      organizer_name: 'Cal Alumni Club',
      organizer_type: 'alumni_group',
      source_type: 'alumni_group_submitted',
      age_policy: 'all_ages',
      sound_status: 'confirmed_on',
      event_status: 'active',
      publication_status: 'published',
      source_submission_id: 'wps_0123456789abcdef01234567',
      created_at: '2026-08-03T20:04:00Z',
      updated_at: '2026-08-03T20:04:00Z'
    }]),
    new SheetMock('Fan_Intent', CGB_HEADERS.Fan_Intent, [])
  ]);

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
    Utilities: {
      getUuid: () => `${String(++uuid).padStart(8, '0')}-0000-4000-8000-000000000000`
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => 'private' })
    },
    SpreadsheetApp: { openById: () => workbook },
    __workbook: workbook
  });

  vm.runInContext(
    `${code}\n${canonicalIds}\ngetWorkbook_ = function(){ return __workbook; };\n` +
    `globalThis.__api = { isCanonicalEntityId_, validateCanonicalIdWorkbook, createCanonicalEntityId_ };`,
    context
  );
  return { api: context.__api, workbook };
}

test('Apps Script accepts only exact canonical entity IDs', () => {
  const { api } = buildHarness();
  assert.equal(api.isCanonicalEntityId_('venue', canonicalVenueId), true);
  assert.equal(api.isCanonicalEntityId_('game', canonicalGameId), true);
  assert.equal(api.isCanonicalEntityId_('venue', 'ven_1360954160984546'), false);
  assert.equal(api.isCanonicalEntityId_('game', 'game_2026_01'), false);
});

test('owner-only workbook integrity check reconciles canonical relationships', () => {
  const { api } = buildHarness();
  assert.deepEqual(JSON.parse(JSON.stringify(api.validateCanonicalIdWorkbook())), {
    ok: true,
    venues: 1,
    games: 1,
    watchParties: 1,
    fanIntent: 0
  });
});

test('Apps Script generators emit unique exact entity-prefixed 24-hex IDs', () => {
  const { api } = buildHarness();
  const venueId = api.createCanonicalEntityId_('venue');
  const secondVenueId = api.createCanonicalEntityId_('venue');
  assert.match(venueId, /^venue_[a-f0-9]{24}$/);
  assert.match(secondVenueId, /^venue_[a-f0-9]{24}$/);
  assert.notEqual(venueId, secondVenueId);
  assert.match(api.createCanonicalEntityId_('game'), /^game_[a-f0-9]{24}$/);
  assert.match(api.createCanonicalEntityId_('watch_party'), /^wp_[a-f0-9]{24}$/);
  assert.match(api.createCanonicalEntityId_('fan_intent'), /^fi_[a-f0-9]{24}$/);
  assert.match(api.createCanonicalEntityId_('watch_party_submission'), /^wps_[a-f0-9]{24}$/);
});
