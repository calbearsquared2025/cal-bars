import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../js/external-venue-search.js', import.meta.url), 'utf8');

test('external venue search uses the reduced-call debounce and minimum query length', () => {
  assert.match(source, /const SEARCH_DEBOUNCE_MS = 600;/);
  assert.match(source, /const MINIMUM_QUERY_LENGTH = 4;/);
});

test('finalized external venue search uses one full query instead of progressive retries', () => {
  assert.doesNotMatch(source, /buildMapTilerFinalSearchQueries/);
  assert.match(source, /buildMapTilerSearchUrl\(query, key,/);
});

test('external venue search keeps an in-memory normalized query and proximity cache', () => {
  assert.match(source, /const externalSearchCache = new Map\(\);/);
  assert.match(source, /externalCacheKey\(query, proximity\)/);
  assert.match(source, /normalizedSearchQuery\(query\)/);
  assert.match(source, /proximityKey\(proximity\)/);
});

test('submit and geolocation reuse strong completed results instead of forcing duplicate searches', () => {
  assert.match(source, /currentCompletedSearchIsStrong\(query\)/);
  assert.match(source, /if \(currentCompletedSearchIsStrong\(query\)\) return;/);
  assert.match(source, /if \(currentCompletedSearchIsStrong\(query\)\) \{/);
});
