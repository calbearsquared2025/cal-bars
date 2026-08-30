import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const externalVenueCode = await readFile(new URL('../apps-script/ExternalVenue.gs', import.meta.url), 'utf8');

function buildContext() {
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
    CGB_BROWSER_ID_PATTERN: /^browser_[A-Za-z0-9_-]{16,128}$/,
    fanIntentError_: (code) => Object.assign(new Error(code), { cgbCode: code }),
    isSafeCanonicalId_: (value) => /^[A-Za-z0-9_-]{3,80}$/.test(String(value || '')),
    createCanonicalEntityId_: () => 'venue_created'
  });
  vm.runInContext(externalVenueCode, context);
  return context;
}

function verifiedAddress(overrides = {}) {
  return {
    source: 'maptiler',
    placeId: 'address.12345',
    name: '2123 N Bellflower Blvd',
    address: '2123 N Bellflower Blvd, Long Beach, CA 90815, United States',
    addressLine1: '2123 N Bellflower Blvd',
    addressLine2: '',
    city: 'Long Beach',
    region: 'CA',
    postalCode: '90815',
    countryCode: 'US',
    latitude: 33.7765,
    longitude: -118.1258,
    normalizedAddress: '2123 n bellflower blvd long beach ca 90815 us',
    ...overrides
  };
}

test('joinExternalVenue accepts an optional sanitized user-supplied venue name', () => {
  const context = buildContext();
  const request = context.parseJoinExternalVenuePayload_({
    browserId: 'browser_1234567890abcdef',
    gameId: 'game_1',
    externalPlace: {
      source: 'maptiler',
      placeId: 'address.12345',
      name: '  District   4 Pizza  '
    }
  });

  assert.equal(request.externalPlace.name, 'District 4 Pizza');
  assert.equal(request.externalPlace.placeId, 'address.12345');
});

test('address-resolved manual locations keep the requested venue name for new canonical creation', () => {
  const context = buildContext();
  const verified = verifiedAddress();
  const named = context.applyRequestedExternalVenueName_(verified, {
    placeId: verified.placeId,
    name: 'District 4 Pizza'
  });
  const venue = context.buildExternalVenueRecord_([], named, '2026-08-30T09:00:00Z');

  assert.equal(named.name, 'District 4 Pizza');
  assert.equal(verified.name, '2123 N Bellflower Blvd', 'server-verified source object remains unchanged');
  assert.equal(venue.name, 'District 4 Pizza');
  assert.equal(venue.address_line_1, '2123 N Bellflower Blvd');
  assert.equal(venue.external_place_id, 'address.12345');
});

test('ordinary MapTiler POI creation keeps the provider-verified venue name', () => {
  const context = buildContext();
  const verified = verifiedAddress({
    placeId: 'poi.777',
    name: 'Provider Venue Name'
  });
  const named = context.applyRequestedExternalVenueName_(verified, {
    placeId: verified.placeId,
    name: 'Client Override'
  });

  assert.equal(named.name, 'Provider Venue Name');
});

test('normalized-address matching remains independent of the user-supplied venue name', () => {
  const context = buildContext();
  const existing = {
    object: {
      external_source: '',
      external_place_id: '',
      address_line_1: '2123 N Bellflower Blvd',
      address_line_2: '',
      city: 'Long Beach',
      region: 'CA',
      postal_code: '90815',
      country_code: 'US'
    }
  };
  const match = context.findCanonicalExternalVenue_([existing], verifiedAddress({ name: 'District 4 Pizza' }));

  assert.equal(match, existing);
});
