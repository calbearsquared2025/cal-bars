import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../apps-script/ColumnFormats.gs', import.meta.url),
  'utf8'
);

test('normalizer covers postal codes and date-only game dates', () => {
  assert.match(source, /'Venues', 'postal_code'/);
  assert.match(source, /'Games', 'game_date'/);
});

test('normalizer applies plain-text formatting', () => {
  assert.match(source, /setNumberFormat\('@'\)/);
});

test('date cells are serialized in workbook timezone as YYYY-MM-DD', () => {
  assert.match(source, /Utilities\.formatDate\(value, timeZone, 'yyyy-MM-dd'\)/);
});

test('normalizer remains owner-only and is not exposed through doGet', () => {
  assert.doesNotMatch(source, /function\s+doGet\s*\(/);
});
