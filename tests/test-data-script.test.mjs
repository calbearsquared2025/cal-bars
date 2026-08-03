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

test('synthetic primary and foreign keys use the canonical entity grammar', () => {
  assert.match(source, /venue_[a-f0-9]{24}/);
  assert.match(source, /game_[a-f0-9]{24}/);
  assert.match(source, /wp_[a-f0-9]{24}/);
  assert.match(source, /fi_[a-f0-9]{24}/);
  assert.doesNotMatch(source, /['"]ven_\d+['"]/);
  assert.doesNotMatch(source, /['"]game_\d{4}_\d{2}['"]/);
  assert.doesNotMatch(source, /['"]wp_\d+['"]/);
  assert.doesNotMatch(source, /fi_test_/);
});

test('test browser identifiers satisfy the anonymous-browser grammar', () => {
  assert.match(source, /browser_test_/);
  assert.doesNotMatch(source, /browser_id: Utilities\.getUuid\(\)/);
});

test('test cleanup targets only explicit known synthetic identifiers', () => {
  assert.match(source, /CGB_TEST_FAN_INTENT_IDS/);
  assert.match(source, /CGB_TEST_VENUE_IDS/);
  assert.match(source, /CGB_TEST_GAME_IDS/);
  assert.match(source, /CGB_TEST_WATCH_PARTY_IDS/);
});
