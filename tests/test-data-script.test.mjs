import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../apps-script/TestData.gs', import.meta.url), 'utf8');

test('test-data helper is owner-run and not exposed through doGet', () => {
  assert.match(source, /function seedTestData\(\)/);
  assert.match(source, /function clearTestData\(\)/);
  assert.doesNotMatch(source, /function doGet\(/);
});

test('test-data helper refuses to mix with non-test canonical rows', () => {
  assert.match(source, /assertOnlyTestOrEmptyRows_/);
  assert.match(source, /contains non-test rows/);
});

test('test browser identifiers are generated at runtime', () => {
  assert.match(source, /browser_id: Utilities\.getUuid\(\)/);
  assert.doesNotMatch(source, /browser_id:\s*['"][^'"]+['"]/);
});

test('test cleanup targets only known test identifiers', () => {
  assert.match(source, /fi_test_/);
  assert.match(source, /CGB_TEST_VENUE_IDS/);
  assert.match(source, /CGB_TEST_GAME_IDS/);
  assert.match(source, /CGB_TEST_WATCH_PARTY_IDS/);
});

test('synthetic historical game ID follows game_YYYY_NN', () => {
  assert.match(source, /game_2025_99/);
  assert.doesNotMatch(source, /game_2025_test_00/);
});
