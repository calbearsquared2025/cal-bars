import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/WatchPartyFormConfig.gs', import.meta.url), 'utf8');

class ItemMock {
  constructor(title, type, choices = []) {
    this.title = title;
    this.type = type;
    this.choices = choices;
  }
  getTitle() { return this.title; }
  getType() { return this.type; }
  asTextItem() { return this; }
  asCheckboxItem() { return this; }
  getChoices() { return this.choices.map((value) => ({ getValue: () => value })); }
  createResponse(value) { return { title: this.title, value }; }
}

function buildHarness({ omitTitle = '' } = {}) {
  const type = { TEXT: 'TEXT', CHECKBOX: 'CHECKBOX' };
  const items = [
    new ItemMock('Venue Name', type.TEXT),
    new ItemMock('Which game or games will have a Watch Party here?', type.CHECKBOX, [
      'Sep 5 — Cal vs. UCLA',
      'Sep 12 — Cal at Syracuse'
    ]),
    new ItemMock('Venue ID (existing)', type.TEXT)
  ].filter((item) => item.title !== omitTitle);

  const entryIds = new Map([
    ['Venue Name', 'entry.101'],
    ['Which game or games will have a Watch Party here?', 'entry.202'],
    ['Venue ID (existing)', 'entry.303']
  ]);

  const form = {
    getItems: () => items,
    createResponse() {
      const responses = [];
      return {
        withItemResponse(response) {
          responses.push(response);
          return this;
        },
        toPrefilledUrl() {
          const url = new URL('https://docs.google.com/forms/d/e/test-form/viewform?usp=pp_url');
          responses.forEach((response) => {
            const value = Array.isArray(response.value) ? response.value[0] : response.value;
            url.searchParams.append(entryIds.get(response.title), value);
          });
          return url.toString();
        }
      };
    }
  };

  const responseSheet = { getFormUrl: () => 'https://docs.google.com/forms/d/test-form/edit' };
  const workbook = { getSheetByName: (name) => name === 'Watch_Party_Submissions_Raw' ? responseSheet : null };
  const logs = [];
  const context = vm.createContext({
    URL,
    JSON,
    String,
    Array,
    Object,
    RegExp,
    Error,
    decodeURIComponent,
    console: { log: (value) => logs.push(value) },
    CGB_MINIMAL_WATCH_PARTY_RAW_TAB: 'Watch_Party_Submissions_Raw',
    getWorkbook_: () => workbook,
    FormApp: {
      ItemType: type,
      openByUrl: () => form
    }
  });

  vm.runInContext(`${source}\nglobalThis.__api = { inspect: inspectWatchPartyFormPrefillConfiguration };`, context);
  return { api: context.__api, logs };
}

test('inspector returns the linked Form URL and all three entry IDs', () => {
  const { api, logs } = buildHarness();
  const result = api.inspect();

  assert.equal(result.formUrl, 'https://docs.google.com/forms/d/e/test-form/viewform');
  assert.equal(result.venueNameEntry, 'entry.101');
  assert.equal(result.gameIdEntry, 'entry.202');
  assert.equal(result.venueIdEntry, 'entry.303');
  assert.equal(result.sampleGameLabel, 'Sep 5 — Cal vs. UCLA');
  assert.match(result.prefilledUrl, /entry\.202=Sep\+5/);
  assert.equal(logs.length, 1);
});

test('inspector fails when a required finalized question title is missing', () => {
  const { api } = buildHarness({ omitTitle: 'Venue Name' });
  assert.throws(() => api.inspect(), /Expected exactly one Watch Party Form question titled: Venue Name/);
});
