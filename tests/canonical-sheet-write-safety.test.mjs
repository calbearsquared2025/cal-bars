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

test('external Venue canonical writes literalize formula-leading strings', () => {
  const { append, sheet, writes } = createExternalAppendHarness();
  append(sheet, ['name', 'address', 'note', 'tag'], {
    name: '=IMPORTXML("https://example.invalid", "//x")',
    address: '+SUM(1,1)',
    note: '-1+1',
    tag: '@payload'
  });

  assert.deepEqual(plainRow(writes[0][0]), [
    "'=IMPORTXML(\"https://example.invalid\", \"//x\")",
    "'+SUM(1,1)",
    "'-1+1",
    "'@payload"
  ]);
});

test('external Venue canonical writes preserve ordinary strings, numbers, and blanks', () => {
  const { append, sheet, writes } = createExternalAppendHarness();
  append(sheet, ['name', 'latitude', 'website_url', 'empty'], {
    name: 'Ordinary Venue',
    latitude: 37.8717,
    website_url: 'https://example.org',
    empty: ''
  });

  assert.deepEqual(plainRow(writes[0][0]), [
    'Ordinary Venue',
    37.8717,
    'https://example.org',
    ''
  ]);
});

test('Watch Party canonical writes literalize formula-leading public text', () => {
  const headers = [
    'watch_party_id',
    'organizer_name',
    'official_event_url',
    'restrictions_note',
    'game_day_note'
  ];
  const { append, workbook, writes } = createWatchPartyAppendHarness(headers);
  append(workbook, [{
    watch_party_id: 'wp_000001',
    organizer_name: '=IMPORTDATA("https://example.invalid")',
    official_event_url: 'https://example.org/event',
    restrictions_note: '+SUM(1,1)',
    game_day_note: '@payload'
  }]);

  assert.deepEqual(plainRow(writes[0][0]), [
    'wp_000001',
    "'=IMPORTDATA(\"https://example.invalid\")",
    'https://example.org/event',
    "'+SUM(1,1)",
    "'@payload"
  ]);
});

test('Apps Script manifest includes the minimum Google Forms scope used by FormApp tooling', () => {
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets'));
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/forms'));
});
