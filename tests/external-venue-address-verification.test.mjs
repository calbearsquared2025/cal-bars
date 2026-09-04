import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const externalVenueCode = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');

function buildHarness() {
  const placeId = 'address.55555';
  const placeName = '410 Example Drive, Testville, California 90000, United States';
  const sparseFeature = {
    id: placeId,
    place_type: ['address'],
    address: '410',
    text: 'Example Drive',
    place_name: placeName,
    center: [-118.2, 34.0],
    properties: { country_code: 'us' }
  };
  const enrichedFeature = {
    ...sparseFeature,
    context: [
      { id: 'municipality.1', place_type: ['municipality'], text: 'Testville', place_designation: 'city' },
      { id: 'region.2', place_type: ['region'], text: 'California', country_code: 'us' },
      { id: 'postal_code.3', place_type: ['postal_code'], text: '90000' },
      { id: 'country.4', place_type: ['country'], text: 'United States', short_code: 'us' }
    ]
  };
  const requests = [];
  const featuresByQuery = new Map([
    [placeId, sparseFeature],
    [placeName, enrichedFeature]
  ]);

  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Array,
    String,
    Set,
    Map,
    RegExp,
    Error,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name) => name === 'CGB_MAPTILER_API_KEY' ? 'server-key' : ''
      })
    },
    UrlFetchApp: {
      fetch(url) {
        requests.push(String(url));
        const match = String(url).match(/\/geocoding\/(.+)\.json\?/);
        const query = match ? decodeURIComponent(match[1]) : '';
        const feature = featuresByQuery.get(query);
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ features: feature ? [feature] : [] })
        };
      }
    }
  });

  vm.runInContext(
    `${externalVenueCode}\nglobalThis.__verify = verifyExternalPlaceWithMapTiler_;`,
    context
  );
  return { verify: context.__verify, requests, placeId, placeName };
}

test('sparse address IDs are re-queried with their full provider address before publication', () => {
  const harness = buildHarness();
  const verified = harness.verify({
    source: 'maptiler',
    placeId: harness.placeId,
    name: 'Example Venue'
  });

  assert.equal(verified.placeId, harness.placeId);
  assert.equal(verified.addressLine1, '410 Example Drive');
  assert.equal(verified.city, 'Testville');
  assert.equal(verified.region, 'CA');
  assert.equal(verified.postalCode, '90000');
  assert.equal(harness.requests.length, 2);
  assert.match(harness.requests[0], /\/geocoding\/address\.55555\.json\?/);
  assert.match(harness.requests[1], /\/geocoding\/410%20Example%20Drive%2C%20Testville%2C%20California%2090000%2C%20United%20States\.json\?/);
  assert.match(harness.requests[1], /types=address/);
  assert.match(harness.requests[1], /autocomplete=false/);
});
