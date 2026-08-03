import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const externalVenueSource = await readFile(
  new URL('../apps-script/ExternalVenue.gs', import.meta.url),
  'utf8'
);
const watchPartySource = await readFile(
  new URL('../apps-script/WatchPartyAutomation.gs', import.meta.url),
  'utf8'
);
const manifest = JSON.parse(
  await readFile(new URL('../apps-script/appsscript.json', import.meta.url), 'utf8')
);

function createExternalAppendHarness() {
  const context = vm.createContext({ console });
  vm.runInContext(
    `${externalVenueSource}\nglobalThis.__appendSheetObject = appendSheetObject_;`,
    context
  );
  const writes = [];
  const sheet = {
    getLastRow: () => 1,
    getRange: () => ({
      setValues(values) {
        writes.push(values);
        return this;
      }
    })
  };
  return { append: context.__appendSheetObject, sheet, writes };
}

function createWatchPartyAppendHarness(headers) {
  const context = vm.createContext({
    console,
    CGB_TABS: { Watch_Parties: headers }
  });
  vm.runInContext(
    `${watchPartySource}\nglobalThis.__appendWatchParties = appendMinimalWatchPartyRows_;`,
    context
  );
  const writes = [];
  const sheet = {
    getLastRow: () => 1,
    getLastColumn: () => headers.length,
    getRange(row) {
      if (row === 1) {
        return {
          getDisplayValues: () => [headers.slice()]
        };
      }
      return {
        setValues(values) {
          writes.push(values);
          return this;
        }
      };
    }
  };
  const workbook = {
    getSheetByName: (name) => name === 'Watch_Parties' ? sheet : null
  };
  return { append: context.__appendWatchParties, workbook, writes };
}

function plainRow(values) {
  return Array.from(values, (value) => value);
}

test('external Venue canonical writes literalize every formula-leading string', () => {
  const { append, sheet, writes } = createExternalAppendHarness();
  append(sheet, ['equals', 'plus', 'minus', 'at'], {
    equals: '=IMPORTXML("https://example.invalid", "//x")',
    plus: '+SUM(1,1)',
    minus: '-1+1',
    at: '@payload'
  });

  assert.deepEqual(plainRow(writes[0][0]), [
    "'=IMPORTXML(\"https://example.invalid\", \"//x\")",
    "'+SUM(1,1)",
    "'-1+1",
    "'@payload"
  ]);
});

test('external Venue canonical writes preserve non-formula value types', () => {
  const headers = [
    'name', 'website_url', 'venue_id', 'latitude', 'updated_at', 'published',
    'empty', 'null_value', 'undefined_value', 'missing_value'
  ];
  const { append, sheet, writes } = createExternalAppendHarness();
  append(sheet, headers, {
    name: 'Ordinary Venue',
    website_url: 'https://example.org/path?q=1',
    venue_id: 'venue_8309cdb6-63da-48e0-97de-368631f62b11',
    latitude: -37.8717,
    updated_at: '2026-08-03T15:00:00Z',
    published: true,
    empty: '',
    null_value: null,
    undefined_value: undefined
  });

  assert.deepEqual(plainRow(writes[0][0]), [
    'Ordinary Venue',
    'https://example.org/path?q=1',
    'venue_8309cdb6-63da-48e0-97de-368631f62b11',
    -37.8717,
    '2026-08-03T15:00:00Z',
    true,
    '',
    null,
    undefined,
    ''
  ]);
});

test('Watch Party canonical writes protect every prefix and preserve other values', () => {
  const headers = [
    'watch_party_id', 'organizer_name', 'restrictions_note', 'game_day_note',
    'source_type', 'official_event_url', 'numeric_value', 'created_at',
    'boolean_value', 'blank_value', 'null_value', 'undefined_value', 'missing_value'
  ];
  const { append, workbook, writes } = createWatchPartyAppendHarness(headers);
  append(workbook, [{
    watch_party_id: 'wp_000001',
    organizer_name: '=IMPORTDATA("https://example.invalid")',
    restrictions_note: '+SUM(1,1)',
    game_day_note: '-1+1',
    source_type: '@payload',
    official_event_url: 'https://example.org/event',
    numeric_value: -12,
    created_at: '2026-08-03T15:00:00Z',
    boolean_value: false,
    blank_value: '',
    null_value: null,
    undefined_value: undefined
  }]);

  assert.deepEqual(plainRow(writes[0][0]), [
    'wp_000001',
    "'=IMPORTDATA(\"https://example.invalid\")",
    "'+SUM(1,1)",
    "'-1+1",
    "'@payload",
    'https://example.org/event',
    -12,
    '2026-08-03T15:00:00Z',
    false,
    '',
    null,
    undefined,
    ''
  ]);
});

test('Apps Script manifest includes the minimum Google Forms scope used by FormApp tooling', () => {
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets'));
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/forms'));
});
