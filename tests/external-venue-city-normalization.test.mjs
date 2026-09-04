import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

import { normalizeMapTilerFeature } from '../js/external-venue-core.mjs';

const feature = {
  id: 'poi.424242',
  place_type: ['poi'],
  text: 'Example Venue',
  place_name: 'Example Venue, 100 Main Street, Harbor Quarter, Metroville, California 90000, United States',
  center: [-118.2, 34.0],
  properties: { country_code: 'us' },
  context: [
    { id: 'address.1', text: '100 Main Street', country_code: 'us', kind: 'street' },
    { id: 'postal_code.1', text: '90000', country_code: 'us' },
    { id: 'place.1', text: 'Harbor Quarter', country_code: 'us', place_designation: 'neighbourhood' },
    { id: 'locality.1', text: 'Metroville', country_code: 'us' },
    { id: 'county.1', text: 'Example County', country_code: 'us' },
    { id: 'region.1', text: 'California', country_code: 'us' },
    { id: 'country.1', text: 'United States', short_code: 'us' }
  ]
};

test('browser normalization skips neighborhood place labels when choosing canonical city', () => {
  const normalized = normalizeMapTilerFeature(feature);
  assert.equal(normalized.city, 'Metroville');
  assert.equal(normalized.region, 'CA');
  assert.equal(normalized.address, '100 Main Street, Metroville, CA 90000, United States');
  assert.equal(normalized.locationContext, 'Metroville, CA, United States');
});

test('browser normalization fails closed when only a neighborhood is available as locality context', () => {
  const neighborhoodOnly = {
    ...feature,
    context: feature.context.filter((item) => item.id !== 'locality.1')
  };
  assert.equal(normalizeMapTilerFeature(neighborhoodOnly), null);
});

test('Apps Script publication normalization uses the same city-level fallback rule', async () => {
  const code = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');
  const context = vm.createContext({ console, Object, Array, String, Number, RegExp, Error, Math, Set, Map });
  vm.runInContext(`${code}\nglobalThis.__normalize = normalizeMapTilerFeatureForPublication_;`, context);

  const normalized = context.__normalize(feature);
  assert.equal(normalized.city, 'Metroville');
  assert.equal(normalized.region, 'CA');
  assert.equal(normalized.address, '100 Main Street, Metroville, CA 90000, United States');

  const neighborhoodOnly = {
    ...feature,
    context: feature.context.filter((item) => item.id !== 'locality.1')
  };
  assert.equal(context.__normalize(neighborhoodOnly), null);
});
