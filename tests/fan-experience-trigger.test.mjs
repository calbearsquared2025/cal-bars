import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/FanExperienceAutomation.gs', import.meta.url), 'utf8');
const VENUE_ID = 'venue_0123456789abcdef01234567';

class RangeMock {
  constructor(sheet, row, column, rows, columns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rows = rows;
    this.columns = columns;
  }
  getSheet() { return this.sheet; }
  getRow() { return this.row; }
  getDisplayValues() {
    return Array.from({ length: this.rows }, (_, rowOffset) =>
      Array.from({ length: this.columns }, (_, columnOffset) =>
        String(this.sheet.values[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? '')
      )
    );
  }
  setValues(values) {
    values.forEach((sourceRow, rowOffset) => {
      const targetRow = this.row - 1 + rowOffset;
      if (!this.sheet.values[targetRow]) this.sheet.values[targetRow] = [];
      sourceRow.forEach((value, columnOffset) => {
        this.sheet.values[targetRow][this.column - 1 + columnOffset] = value;
      });
    });
    return this;
  }
  setValue(value) {
    return this.setValues([[value]]);
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
}

class WorkbookMock {
  constructor(sheets) { this.sheets = new Map(sheets.map((sheet) => [sheet.getName(), sheet])); }
  getSheetByName(name) { return this.sheets.get(name) || null; }
}

function objectsFromSheet(sheet) {
  const [headers, ...rows] = sheet.values;
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function readSheetObjects(workbook, name) {
  const sheet = workbook.getSheetByName(name);
  return sheet ? objectsFromSheet(sheet) : [];
}

function namedValues(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, [value]]));
}

function eventFor(sheet, row = 2, values = {}) {
  return {
    range: sheet.getRange(row, 1, 1, 1),
    namedValues: namedValues(values)
  };
}

function buildHarness({ venueDetailRows = [] } = {}) {
  const venues = new SheetMock('Venues', ['venue_id', 'name'], [
    { venue_id: VENUE_ID, name: 'Test Venue' }
  ]);
  const fanExperiences = new SheetMock('Fan_Experiences_Raw', [
    'Timestamp',
    'Venue name',
    'What should other Bears know about watching a Cal game here?',
    'Name to Display (Optional!)',
    'Venue ID'
  ]);
  const venueDetails = new SheetMock('Venue Details', venueDetailRows.length
    ? Object.keys(venueDetailRows[0])
    : ['Timestamp', 'Venue name', 'Anything else we should know about this venue?', 'Venue ID'], venueDetailRows);
  const unrelated = new SheetMock('Watch_Party_Submissions_Raw', ['Timestamp'], [{ Timestamp: '9/1/2026 12:00:00' }]);
  const workbook = new WorkbookMock([venues, fanExperiences, venueDetails, unrelated]);
  const cacheClears = [];

  const context = vm.createContext({ console, Date, JSON, Math, Number, Object, Array, String, Set, Map, RegExp, Error });
  context.getWorkbook_ = () => workbook;
  context.readSheetObjects_ = (book, name) => readSheetObjects(book, name);
  context.clearPublicSnapshotCache_ = () => cacheClears.push('clear');
  vm.runInContext(`${source}\nglobalThis.__api = { onFanExperienceFormSubmit, parseFanExperienceFormEvent_, processVenueDetailFanExperienceEvent_, backfillVenueDetailFanExperiences };`, context);
  return { api: context.__api, workbook, venues, fanExperiences, venueDetails, unrelated, cacheClears };
}

test('Fan Experience trigger ignores spreadsheet form submissions from unrelated response tabs', () => {
  const { api, unrelated } = buildHarness();
  const result = api.onFanExperienceFormSubmit(eventFor(unrelated, 2, { Timestamp: '9/1/2026 12:00:00' }));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: true,
    ignored: true,
    reason: 'unrelated_sheet'
  });
});

test('Fan Experience trigger still rejects a form-bound event with no spreadsheet range', () => {
  const { api } = buildHarness();
  assert.throws(
    () => api.onFanExperienceFormSubmit({ response: {} }),
    /invalid_fan_experience_form_event/
  );
});

test('Fan Experience parser still accepts the intended response tab', () => {
  const { api, fanExperiences } = buildHarness();
  const values = { 'Venue ID': VENUE_ID };
  const context = api.parseFanExperienceFormEvent_(eventFor(fanExperiences, 3, values));
  assert.equal(context.sheet.getName(), 'Fan_Experiences_Raw');
  assert.equal(context.rowNumber, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(context.namedValues)), namedValues(values));
  assert.ok(context.workbook);
});

test('venue-detail freeform comment becomes an anonymous Fan Experience for the canonical Venue', () => {
  const row = {
    Timestamp: '9/1/2026 12:00:00',
    'Venue name': 'Test Venue',
    'Anything else we should know about this venue?': 'Packed with Bears and a lively game-day atmosphere.',
    'Your email (optional, kept private)': 'private@example.com',
    'Venue ID': VENUE_ID
  };
  const { api, venueDetails, fanExperiences, cacheClears } = buildHarness({ venueDetailRows: [row] });
  const result = api.onFanExperienceFormSubmit(eventFor(venueDetails, 2, row));

  assert.equal(result.ok, true);
  assert.equal(result.created_fan_experience, true);
  assert.equal(result.moderation_status, 'published');
  assert.equal(cacheClears.length, 1);

  const [experience] = objectsFromSheet(fanExperiences);
  assert.equal(experience['Venue ID'], VENUE_ID);
  assert.equal(experience['Venue name'], 'Test Venue');
  assert.equal(experience['What should other Bears know about watching a Cal game here?'], row['Anything else we should know about this venue?']);
  assert.equal(experience.public_text, row['Anything else we should know about this venue?']);
  assert.equal(experience.public_display_name, '');
  assert.equal(experience.moderation_status, 'published');
  assert.match(experience.source_contribution_key, /^venue_details\|Venue Details\|2\|/);
  assert.equal('Your email (optional, kept private)' in experience, false);
});

test('venue-detail comment is held by the same Fan Experience moderation rules', () => {
  const row = {
    Timestamp: '9/1/2026 12:00:00',
    'Venue name': 'Test Venue',
    'Anything else we should know about this venue?': 'Contact me at fan@example.com for details.',
    'Venue ID': VENUE_ID
  };
  const { api, venueDetails, fanExperiences, cacheClears } = buildHarness({ venueDetailRows: [row] });
  const result = api.onFanExperienceFormSubmit(eventFor(venueDetails, 2, row));

  assert.equal(result.moderation_status, 'held');
  assert.equal(result.moderation_reason, 'personal_contact_information');
  assert.equal(objectsFromSheet(fanExperiences)[0].moderation_status, 'held');
  assert.equal(cacheClears.length, 0);
});

test('blank venue-detail freeform answer does not create a Fan Experience', () => {
  const row = {
    Timestamp: '9/1/2026 12:00:00',
    'Venue name': 'Test Venue',
    'Anything else we should know about this venue?': '   ',
    'Venue ID': VENUE_ID
  };
  const { api, venueDetails, fanExperiences } = buildHarness({ venueDetailRows: [row] });
  const result = api.onFanExperienceFormSubmit(eventFor(venueDetails, 2, row));

  assert.equal(result.ignored, true);
  assert.equal(result.reason, 'empty_experience');
  assert.equal(objectsFromSheet(fanExperiences).length, 0);
});

test('venue-detail trigger redelivery is idempotent', () => {
  const row = {
    Timestamp: '9/1/2026 12:00:00',
    'Venue name': 'Test Venue',
    'Anything else we should know about this venue?': 'Great Cal crowd for football Saturdays.',
    'Venue ID': VENUE_ID
  };
  const { api, venueDetails, fanExperiences } = buildHarness({ venueDetailRows: [row] });
  const event = eventFor(venueDetails, 2, row);
  const first = api.onFanExperienceFormSubmit(event);
  const second = api.onFanExperienceFormSubmit(event);

  assert.equal(first.created_fan_experience, true);
  assert.equal(second.redelivery, true);
  assert.equal(objectsFromSheet(fanExperiences).length, 1);
});

test('backfill copies historical venue-detail comments once and skips blanks', () => {
  const rows = [
    {
      Timestamp: '8/20/2026 12:00:00',
      'Venue name': 'Test Venue',
      'Anything else we should know about this venue?': 'Cal flags everywhere and a strong crowd.',
      'Venue ID': VENUE_ID
    },
    {
      Timestamp: '8/21/2026 12:00:00',
      'Venue name': 'Test Venue',
      'Anything else we should know about this venue?': '',
      'Venue ID': VENUE_ID
    }
  ];
  const { api, fanExperiences } = buildHarness({ venueDetailRows: rows });
  const first = api.backfillVenueDetailFanExperiences();
  const second = api.backfillVenueDetailFanExperiences();

  assert.equal(first.created, 1);
  assert.equal(first.published, 1);
  assert.equal(first.skipped, 1);
  assert.equal(second.created, 0);
  assert.equal(second.skipped, 2);
  assert.equal(objectsFromSheet(fanExperiences).length, 1);
});
