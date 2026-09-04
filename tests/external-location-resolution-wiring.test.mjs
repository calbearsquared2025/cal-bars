import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const searchSource = await readFile(new URL('../js/external-venue-search.js', import.meta.url), 'utf8');
const contributionSource = await readFile(new URL('../js/external-venue-contribution.js', import.meta.url), 'utf8');
const mapRefinementSource = await readFile(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');

test('typed manual address is passed through both external venue write paths', () => {
  assert.match(searchSource, /if \(selected\.submittedAddress\) payload\.submittedAddress = selected\.submittedAddress/);
  assert.match(contributionSource, /if \(selected\.submittedAddress\) payload\.submittedAddress = selected\.submittedAddress/);
});

test('typed manual address geocoding does not use the browser home-location proximity bias', () => {
  assert.match(
    searchSource,
    /const url = buildMapTilerAddressSearchUrl\(address, configuredMapTilerKey\(\)\);[\s\S]*?resolvedManualPlace\(payload, name, address\)/
  );
  assert.doesNotMatch(
    searchSource,
    /buildMapTilerAddressSearchUrl\(address, configuredMapTilerKey\(\),\s*\{\s*proximity: currentUserProximity\(\)/
  );
});

test('area searches frame the search origin with only venues inside the nearby radius while leaving other markers available', () => {
  assert.match(
    mapRefinementSource,
    /rankNearbyVenues\(state\.snapshot, state\.gameId, origin, NEARBY_RADIUS_MILES\)/
  );
  assert.match(
    mapRefinementSource,
    /const points = \[[\s\S]*?\[origin\.lon, origin\.lat\][\s\S]*?\.\.\.nearby\.map/
  );
  assert.match(mapRefinementSource, /map\.fitBounds\(/);
  assert.match(mapRefinementSource, /maxZoom: 11/);
  assert.doesNotMatch(
    mapRefinementSource,
    /function syncAreaSearchCamera[\s\S]*?state\.snapshot\.venues\.map/
  );
});
