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

function addressFeature({ houseNumber = '451', street = 'Example Drive' } = {}) {
  return {
    id: 'address.424243',
    place_type: ['address'],
    address: houseNumber,
    text: street,
    place_name: `${houseNumber} ${street}, Harbor Quarter, Metroville, California 90000, United States`,
    center: [-118.21, 34.01],
    properties: { country_code: 'us' },
    context: [
      { id: 'postal_code.2', text: '90000', country_code: 'us' },
      { id: 'place.2', text: 'Harbor Quarter', country_code: 'us', place_designation: 'neighbourhood' },
      { id: 'locality.2', text: 'Metroville', country_code: 'us' },
      { id: 'county.2', text: 'Example County', country_code: 'us' },
      { id: 'region.2', text: 'California', country_code: 'us' },
      { id: 'country.2', text: 'United States', short_code: 'us' }
    ]
  };
}

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

test('Apps Script re-geocodes a submitted address, preserves its street number, and uses canonical city context', async () => {
  const code = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');
  const providerFeature = addressFeature();
  const requestedUrls = [];
  const UrlFetchApp = {
    fetch(url) {
      requestedUrls.push(String(url));
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ features: [providerFeature] })
      };
    }
  };
  const context = vm.createContext({
    console, Object, Array, String, Number, RegExp, Error, Math, Set, Map, JSON, UrlFetchApp
  });
  vm.runInContext(`${code}\nglobalThis.__verifySubmitted = verifySubmittedAddressWithMapTiler_;`, context);

  const verified = context.__verifySubmitted({
    source: 'maptiler',
    placeId: 'address.424243',
    name: 'Example Venue',
    submittedAddress: '410 Example Drive, Metroville, CA 90000'
  }, 'test-key');

  assert.equal(verified.addressLine1, '410 Example Drive');
  assert.equal(verified.city, 'Metroville');
  assert.equal(verified.region, 'CA');
  assert.equal(verified.postalCode, '90000');
  assert.equal(verified.latitude, 34.01);
  assert.equal(verified.longitude, -118.21);
  assert.equal(verified.source, '');
  assert.equal(verified.placeId, '');
  assert.match(verified.normalizedAddress, /^410 example dr metroville ca 90000 us$/);
  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /fuzzyMatch=false/);
  assert.match(requestedUrls[0], /autocomplete=false/);
  assert.match(requestedUrls[0], /types=address/);
});

test('Apps Script rejects a submitted address when MapTiler resolves a different street', async () => {
  const code = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');
  const providerFeature = addressFeature({ street: 'Different Road' });
  const UrlFetchApp = {
    fetch() {
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ features: [providerFeature] })
      };
    }
  };
  const context = vm.createContext({
    console, Object, Array, String, Number, RegExp, Error, Math, Set, Map, JSON, UrlFetchApp
  });
  vm.runInContext(`${code}\nglobalThis.__verifySubmitted = verifySubmittedAddressWithMapTiler_;`, context);

  assert.throws(() => context.__verifySubmitted({
    source: 'maptiler',
    placeId: 'address.424243',
    name: 'Example Venue',
    submittedAddress: '410 Example Drive, Metroville, CA 90000'
  }, 'test-key'), /external_venue_unavailable/);
});
