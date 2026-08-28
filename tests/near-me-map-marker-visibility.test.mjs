import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Nearby limits the list without removing distant locations from the map', async () => {
  const app = await read('js/app.js');

  assert.match(app, /function rankedVisibleVenues\([\s\S]*?if \(state\.origin\) return rankNearbyVenues\(/);
  assert.match(app, /function renderLocationList\([\s\S]*?const ranked = rankedVisibleVenues\(query\);/);
  assert.match(app, /function rankedMapVenues\([\s\S]*?return rankVenues\(state\.snapshot, state\.gameId, state\.origin, query\);/);
  assert.match(app, /function renderMarkers\(\)[\s\S]*?rankedMapVenues\(\)\.forEach/);
  assert.doesNotMatch(app, /function renderMarkers\(\)[\s\S]*?rankedVisibleVenues\(\)\.forEach/);
});
