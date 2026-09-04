import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMapTilerAddressSearchUrl,
  buildMapTilerReverseGeocodeUrl,
  manualPlaceName,
  resolvedManualPlace
} from '../js/manual-place-core.mjs';

function addressPayload({ houseNumber = '2123', street = 'N Bellflower Blvd' } = {}) {
  return {
    features: [{
      id: 'address.12345',
      place_type: ['address'],
      center: [-118.1258, 33.7765],
      address: houseNumber,
      text: street,
      place_name: `${houseNumber} ${street}, Long Beach, California 90815, United States`,
      context: [
        { id: 'municipality.1', place_type: ['municipality'], text: 'Long Beach', place_designation: 'city' },
        { id: 'region.1', place_type: ['region'], text: 'California' },
        { id: 'postal_code.1', place_type: ['postal_code'], text: '90815' },
        { id: 'country.1', place_type: ['country'], text: 'United States', short_code: 'us' }
      ]
    }]
  };
}

test('manual address search restricts MapTiler to exact address geocoding while preserving optional proximity support', () => {
  const url = new URL(buildMapTilerAddressSearchUrl(
    '2123 N Bellflower Blvd, Long Beach, CA 90815',
    'test-key',
    { proximity: { lat: 33.77, lon: -118.12 } }
  ));

  assert.match(url.pathname, /geocoding\/2123%20N%20Bellflower%20Blvd%2C%20Long%20Beach%2C%20CA%2090815\.json$/);
  assert.equal(url.searchParams.get('types'), 'address');
  assert.equal(url.searchParams.get('autocomplete'), 'false');
  assert.equal(url.searchParams.get('fuzzyMatch'), 'false');
  assert.equal(url.searchParams.get('country'), 'us');
  assert.equal(url.searchParams.get('proximity'), '-118.12,33.77');
});

test('manual here-now reverse geocode uses coordinates and address-only results', () => {
  const url = new URL(buildMapTilerReverseGeocodeUrl({ lat: 33.7765, lon: -118.1258 }, 'test-key'));

  assert.match(url.pathname, /geocoding\/-118\.1258%2C33\.7765\.json$/);
  assert.equal(url.searchParams.get('types'), 'address');
  assert.equal(url.searchParams.get('country'), 'us');
});

test('resolved manual place keeps the user-entered venue name instead of the MapTiler address label', () => {
  const place = resolvedManualPlace(addressPayload(), 'District 4 Pizza');

  assert.ok(place);
  assert.equal(place.name, 'District 4 Pizza');
  assert.equal(place.placeId, 'address.12345');
  assert.equal(place.addressLine1, '2123 N Bellflower Blvd');
  assert.equal(place.city, 'Long Beach');
  assert.equal(place.region, 'CA');
  assert.equal(place.placeType, 'address');
});

test('typed manual address remains authoritative when MapTiler returns another house number on the same street', () => {
  const place = resolvedManualPlace(
    addressPayload({ houseNumber: '451', street: 'Example Drive' }),
    'Example Venue',
    '410 Example Drive, Long Beach, CA 90815'
  );

  assert.ok(place);
  assert.equal(place.addressLine1, '410 Example Drive');
  assert.equal(place.address, '410 Example Drive, Long Beach, CA 90815, US');
  assert.equal(place.submittedAddress, '410 Example Drive, Long Beach, CA 90815');
  assert.equal(place.latitude, 33.7765);
  assert.equal(place.longitude, -118.1258);
});

test('typed manual address rejects a geocode on a different street', () => {
  const place = resolvedManualPlace(
    addressPayload({ houseNumber: '451', street: 'Different Road' }),
    'Example Venue',
    '410 Example Drive, Long Beach, CA 90815'
  );
  assert.equal(place, null);
});

test('manual venue names are trimmed, normalized, and bounded', () => {
  assert.equal(manualPlaceName('  District   4 Pizza  '), 'District 4 Pizza');
  assert.equal(manualPlaceName('   '), '');
  assert.equal(manualPlaceName('x'.repeat(240)).length, 180);
});
