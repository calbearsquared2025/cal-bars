import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/ContributionAutomation.gs', import.meta.url), 'utf8');

const VENUE_ID = 'venue_aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_VENUE_ID = 'venue_bbbbbbbbbbbbbbbbbbbbbbbb';
const GAME_ID = 'game_cccccccccccccccccccccccc';
const WP_ID = 'wp_dddddddddddddddddddddddd';
const OTHER_WP_ID = 'wp_eeeeeeeeeeeeeeeeeeeeeeee';

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
  setDataValidation() { return this; }
}

class SheetMock {
  constructor(name, headers, rows = []) {
    this.name = name;
    this.values = [headers.slice(), ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  }
  getName() { return this.name; }
  getLastRow() { return this.values.length; }
  getLastColumn() { return Math.max(0, ...this.values.map((row) => row.length)); }
  getMaxRows() { return Math.max(100, this.values.length); }
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

function namedValues(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, [value]]));
}

function harness({ rawSheetName = 'Venue Details', rawRow = null, agePolicy = 'unknown', soundStatus = 'unknown' } = {}) {
  const venueHeaders = ['venue_id', 'name', 'publication_status', 'venue_tags', 'updated_at'];
  const venues = new SheetMock('Venues', venueHeaders, [
    { venue_id: VENUE_ID, name: 'Test Venue', publication_status: 'published', venue_tags: '', updated_at: '2026-08-01T00:00:00Z' },
    { venue_id: OTHER_VENUE_ID, name: 'Other Venue', publication_status: 'published', venue_tags: '', updated_at: '2026-08-01T00:00:00Z' }
  ]);
  const games = new SheetMock('Games', ['game_id', 'game_date'], [
    { game_id: GAME_ID, game_date: '2026-09-05' }
  ]);
  const partyHeaders = [
    'watch_party_id', 'venue_id', 'game_id', 'organizer_name', 'official_event_url',
    'event_start_at', 'age_policy', 'sound_status', 'feature_tags', 'event_status',
    'publication_status', 'updated_at'
  ];
  const parties = new SheetMock('Watch_Parties', partyHeaders, [
    {
      watch_party_id: WP_ID, venue_id: VENUE_ID, game_id: GAME_ID,
      organizer_name: 'Original Organizer', official_event_url: 'https://example.com/original',
      event_start_at: '', age_policy: agePolicy, sound_status: soundStatus, feature_tags: '',
      event_status: 'active', publication_status: 'published', updated_at: '2026-08-01T00:00:00Z'
    },
    {
      watch_party_id: OTHER_WP_ID, venue_id: OTHER_VENUE_ID, game_id: GAME_ID,
      organizer_name: 'Other Organizer', official_event_url: '', event_start_at: '',
      age_policy: 'unknown', sound_status: 'unknown', feature_tags: '', event_status: 'active',
      publication_status: 'published', updated_at: '2026-08-01T00:00:00Z'
    }
  ]);

  const defaultRow = rawRow || {
    'Venue ID': VENUE_ID,
    'Which of these describe this location?': 'FOOD AVAILABLE',
    'Anything else we should know about this venue?': 'Private freeform context',
    'Your email (optional, kept private)': 'private@example.com'
  };
  const raw = new SheetMock(rawSheetName, Object.keys(defaultRow), [defaultRow]);
  const workbook = new WorkbookMock([venues, games, parties, raw]);
  const cacheClears = [];

  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    Date, JSON, Math, Number, Object, Array, String, Set, Map, RegExp, Error, Intl,
    CGB_MINIMAL_WATCH_PARTY_RAW_TAB: 'Watch_Party_Submissions_Raw',
    processMinimalWatchPartyFormSubmission_: () => ({ ok: true, created_watch_party_ids: [WP_ID] }),
    getWorkbook_: () => workbook,
    clearPublicSnapshotCache_: () => cacheClears.push('clear'),
    normalizeCellValue_: (value) => value,
    isCanonicalEntityId_: (type, value) => {
      const patterns = {
        venue: /^venue_[a-f0-9]{24}$/,
        watch_party: /^wp_[a-f0-9]{24}$/,
        game: /^game_[a-f0-9]{24}$/
      };
      return Boolean(patterns[type]?.test(String(value || '')));
    }
  });
  vm.runInContext(`${source}\nglobalThis.__api = { onContributionFormSubmit, processVenueStructuredContribution_, processWatchPartyStructuredUpdate_, mergeVenueContributionTags_, normalizeContributionEventStart_, parseContributionStructuredTags_ };`, context);

  const event = {
    range: { getSheet: () => raw, getRow: () => 2 },
    namedValues: namedValues(defaultRow)
  };
  return { api: context.__api, event, workbook, raw, venues, parties, cacheClears };
}

test('one structured venue tag seeds the persistent Venue and keeps freeform/contact private', () => {
  const { api, event, venues, raw } = harness();
  const result = api.processVenueStructuredContribution_(event, 'venue_details');
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(result.added_venue_tags), ['food']);
  const venue = objectsFromSheet(venues)[0];
  assert.equal(venue.venue_tags, 'food');
  assert.equal('submitter_email' in venue, false);
  assert.equal('freeform' in venue, false);
  const privateRow = objectsFromSheet(raw)[0];
  assert.equal(privateRow['Your email (optional, kept private)'], 'private@example.com');
  assert.equal(privateRow['Anything else we should know about this venue?'], 'Private freeform context');
});

test('multiple venue tags merge deterministically and unchecked options mean no change', () => {
  const { api, workbook, venues } = harness();
  api.mergeVenueContributionTags_(workbook, VENUE_ID, ['cal_memorabilia', 'audio_on', 'food']);
  api.mergeVenueContributionTags_(workbook, VENUE_ID, ['food', '21_plus']);
  assert.equal(objectsFromSheet(venues)[0].venue_tags, '21_plus|audio_on|food|cal_memorabilia');
  const unchanged = api.mergeVenueContributionTags_(workbook, VENUE_ID, []);
  assert.equal(unchanged.changed, false);
});

test('destructive venue correction remains private and does not alter venue identity', () => {
  const rawRow = {
    'Venue ID': VENUE_ID,
    'What are you sharing?': 'Location closed or moved',
    'Which of these describe this location?': '',
    'Anything else we should add or change?': 'Move this venue to a different address',
    'Name (optional)': 'Private Person',
    'Email (optional)': 'private@example.com'
  };
  const { api, event, venues } = harness({ rawSheetName: 'Venue Problem Submission', rawRow });
  const before = objectsFromSheet(venues)[0];
  const result = api.processVenueStructuredContribution_(event, 'venue_update');
  const after = objectsFromSheet(venues)[0];
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(after.name, before.name);
  assert.equal(after.publication_status, 'published');
  assert.equal(after.venue_tags, '');
});

test('Watch Party update targets the exact ID, seeds Venue tags, keeps event-only tags on the event, and maps zoned start time', () => {
  const rawRow = {
    'Venue name': 'Test Venue',
    Game: 'Sep 5 — Cal vs. UCLA',
    'Watch Party ID': WP_ID,
    'What are you sharing?': 'Add missing information',
    'Which of these details apply?': "AUDIO ON — game sound is expected/on, FOOD AVAILABLE, RSVP REQUESTED, CAL SPECIALS — special food, drink, or pricing for the Cal group",
    'Event start or suggested arrival time': '4:30 PM PT',
    'Anything else we should add or change?': 'Private note',
    'Name (optional)': 'Private Person',
    'Email (optional)': 'private@example.com'
  };
  const { api, event, venues, parties } = harness({ rawSheetName: 'Watch Party Problem Submission', rawRow });
  const result = api.processWatchPartyStructuredUpdate_(event);
  assert.equal(result.ok, true);
  const [party, otherParty] = objectsFromSheet(parties);
  assert.equal(party.sound_status, 'confirmed_on');
  assert.equal(party.feature_tags, 'rsvp_requested|cal_specials');
  assert.equal(party.event_start_at, '2026-09-05T23:30:00.000Z');
  assert.equal(otherParty.feature_tags, '');
  assert.equal(objectsFromSheet(venues)[0].venue_tags, 'audio_on|food');
});

test('Watch Party cancellation, organizer, and link corrections are never auto-applied', () => {
  const rawRow = {
    'Watch Party ID': WP_ID,
    'What are you sharing?': 'Event canceled or moved',
    'Which of these details apply?': '',
    'Anything else we should add or change?': 'Cancel it and replace the organizer/link',
    'Organizer or host name': 'Unreviewed Replacement',
    'Official event or RSVP link': 'https://example.com/replacement'
  };
  const { api, event, parties } = harness({ rawSheetName: 'Watch Party Problem Submission', rawRow });
  const result = api.processWatchPartyStructuredUpdate_(event);
  const party = objectsFromSheet(parties)[0];
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(party.event_status, 'active');
  assert.equal(party.organizer_name, 'Original Organizer');
  assert.equal(party.official_event_url, 'https://example.com/original');
});

test('conflicting positive age/audio updates stay manual instead of overwriting existing event facts', () => {
  const rawRow = {
    'Watch Party ID': WP_ID,
    'What are you sharing?': 'Correct existing information',
    'Which of these details apply?': '21+, AUDIO ON — game sound is expected/on'
  };
  const { api, event, venues, parties } = harness({
    rawSheetName: 'Watch Party Problem Submission',
    rawRow,
    agePolicy: 'all_ages',
    soundStatus: 'confirmed_off'
  });
  const result = api.processWatchPartyStructuredUpdate_(event);
  assert.equal(objectsFromSheet(parties)[0].age_policy, 'all_ages');
  assert.equal(objectsFromSheet(parties)[0].sound_status, 'confirmed_off');
  assert.equal(objectsFromSheet(venues)[0].venue_tags, '');
  assert.deepEqual(Array.from(result.manual_review_reasons), ['age_policy_conflict', 'sound_status_conflict']);
});

test('raw trigger redelivery is idempotent', () => {
  const { api, event, venues, raw } = harness();
  const first = api.processVenueStructuredContribution_(event, 'venue_details');
  const second = api.processVenueStructuredContribution_(event, 'venue_details');
  assert.equal(first.ok, true);
  assert.equal(second.redelivery, true);
  assert.equal(objectsFromSheet(venues)[0].venue_tags, 'food');
  assert.equal(objectsFromSheet(raw)[0].processing_status, 'processed');
});

test('current live Watch Party checkbox title is recognized by the generic trigger', () => {
  const rawRow = {
    'Venue ID (existing)': VENUE_ID,
    'What should Bears know about this Watch Party?': 'FOOD AVAILABLE, RSVP REQUESTED',
    'Start or arrival time': ''
  };
  const { api, event, venues, parties } = harness({ rawSheetName: 'Watch_Party_Submissions_Raw', rawRow });
  const result = api.onContributionFormSubmit(event);
  assert.equal(result.ok, true);
  assert.equal(objectsFromSheet(venues)[0].venue_tags, 'food');
  assert.equal(objectsFromSheet(parties)[0].feature_tags, 'rsvp_requested');
});

test('event start auto-publication requires an unambiguous time zone', () => {
  const { api } = harness();
  assert.equal(api.normalizeContributionEventStart_('4:30 PM', '2026-09-05'), '');
  assert.equal(api.normalizeContributionEventStart_('4:30 PM PT', '2026-09-05'), '2026-09-05T23:30:00.000Z');
  assert.equal(api.normalizeContributionEventStart_('7:00 PM ET', '2026-09-05'), '2026-09-05T23:00:00.000Z');
});
