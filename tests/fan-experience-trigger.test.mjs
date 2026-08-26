import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/FanExperienceAutomation.gs', import.meta.url), 'utf8');

function sheet(name) {
  return { getName: () => name };
}

function eventFor(name, row = 2, namedValues = {}) {
  const targetSheet = sheet(name);
  return {
    range: {
      getSheet: () => targetSheet,
      getRow: () => row
    },
    namedValues
  };
}

function buildHarness() {
  const context = vm.createContext({ console });
  vm.runInContext(`${source}\ngetWorkbook_ = function(){ return { marker: 'workbook' }; };\nglobalThis.__api = { onFanExperienceFormSubmit, parseFanExperienceFormEvent_ };`, context);
  return context.__api;
}

test('Fan Experience trigger ignores spreadsheet form submissions from other response tabs', () => {
  const api = buildHarness();
  const result = api.onFanExperienceFormSubmit(eventFor('Watch_Party_Submissions_Raw'));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: true,
    ignored: true,
    reason: 'unrelated_sheet'
  });
});

test('Fan Experience trigger still rejects a form-bound event with no spreadsheet range', () => {
  const api = buildHarness();
  assert.throws(
    () => api.onFanExperienceFormSubmit({ response: {} }),
    /invalid_fan_experience_form_event/
  );
});

test('Fan Experience parser still accepts the intended response tab', () => {
  const api = buildHarness();
  const namedValues = { 'Venue ID': ['venue_0123456789abcdef01234567'] };
  const context = api.parseFanExperienceFormEvent_(eventFor('Fan_Experiences_Raw', 3, namedValues));
  assert.equal(context.sheet.getName(), 'Fan_Experiences_Raw');
  assert.equal(context.rowNumber, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(context.namedValues)), namedValues);
  assert.equal(context.workbook.marker, 'workbook');
});
