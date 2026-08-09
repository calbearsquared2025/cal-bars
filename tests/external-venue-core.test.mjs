import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMapTilerPostalSearchUrl,
  buildMapTilerSearchUrl,
  externalCreationFailureCopy,
  externalSearchFailureCopy,
  mappedLocationFieldMatches,
  normalizeMapTilerFeature,
  normalizeMapTilerPostalOrigin,
  normalizeMapTilerResults,
  upsertCanonicalVenue,
  validateJoinExternalVenueResponse
} from '../js/external-venue-core.mjs';

const feature = {
  id: 'poi.98765',
  type: 'Feature',
  place_type: ['poi'],
  text: "McNally's Irish Pub",
  place_name: "McNally's Irish Pub, 5352 College Ave, Oakland, California 94618, United States",
  center: [-122.252, 37.839],
  context: [
    { id: 'place.oakland', text: 'Oakland' },
    { id: 'region.california', text: 'California', country_code: 'us' },
    { id: 'postcode.94618', text: '94618' },
    { id: 'country.us', text: 'United States', short_code: 'us' }
  ]
};

const publicVenue = {
  venue_id: 'venue_uuid-1',
  slug: 'mcnallys-irish-pub-oakland',
  name: "McNally's Irish Pub",
  address_line_1: '5352 College Ave',
  address_line_2: '',
  city: 'Oakland',
  region: 'CA',
  postal_code: '94618',
  country_code: 'US',
  latitude: 37.839,
  longitude: -122.252,
  website_url: '',
  venue_type: 'community_location',
  verification_status: 'user_added',
  alumni_owned: 'unknown',
  short_description: '',
  photo_url: '',
  photo_credit: '',
  updated_at: '2026-07-29T05:00:00.000Z'
};

function response(overrides = {}) {
  return {
    ok: true,
    action: 'joinExternalVenue',
    schemaVersion: '2.0',
    venue: publicVenue,
    selection: { game_id: 'game_2026_01', venue_id: publicVenue.venue_id, status: 'attending' },
    fanCounts: [{ game_id: 'game_2026_01', venue_id: publicVenue.venue_id, count: 1 }],
    venueHistoryCounts: [{ venue_id: publicVenue.venue_id, past_game_count: 0 }],
    generatedAt: '2026-07-29T05:00:00.000Z',
    ...overrides
  };
}

test('MapTiler POI results normalize into the narrow external-place shape', () => {
  assert.deepEqual(normalizeMapTilerFeature(feature), {
    source: 'maptiler',
    placeId: 'poi.98765',
    name: "McNally's Irish Pub",
    address: '5352 College Ave, Oakland, CA 94618, United States',
    addressLine1: '5352 College Ave',
    addressLine2: '',
    city: 'Oakland',
    region: 'CA',
    postalCode: '94618',
    countryCode: 'US',
    latitude: 37.839,
    longitude: -122.252,
    locationContext: 'Oakland, CA, United States',
    placeType: 'poi'
  });
});

test('US region country_code is not treated as a state abbreviation', () => {
  const normalized = normalizeMapTilerFeature(feature);
  assert.equal(normalized.region, 'CA');
  assert.notEqual(normalized.region, 'US');
});

test('real Santa Monica Pier and Albany Bulb hierarchies normalize California as CA', () => {
  const realFeatures = [
    {
      id: 'poi.55158442',
      place_type: ['poi'],
      text: 'Santa Monica Pier',
      place_name: 'Santa Monica Pier, Downtown Santa Monica, Santa Monica, United States',
      center: [-118.49739992191428, 34.008896169545125],
      properties: { country_code: 'us' },
      context: [
        { id: 'address.22424228', text: 'Santa Monica Pier', country_code: 'us', kind: 'street' },
        { id: 'postal_code.4480556', text: '90405', country_code: 'us' },
        { id: 'place.5009837', text: 'Downtown Santa Monica', country_code: 'us', place_designation: 'quarter' },
        { id: 'municipality.269116', text: 'Santa Monica', country_code: 'us', place_designation: 'city' },
        { id: 'county.22068', text: 'Los Angeles', country_code: 'us' },
        { id: 'region.2166', text: 'California', country_code: 'us' },
        { id: 'country.213', text: 'United States', country_code: 'us' }
      ]
    },
    {
      id: 'poi.55162381',
      place_type: ['poi'],
      text: 'Albany Bulb',
      place_name: 'Albany Bulb, Albany, United States',
      center: [-122.32539285428419, 37.88996423602199],
      properties: { country_code: 'us' },
      context: [
        { id: 'municipality.268335', text: 'Albany', country_code: 'us', place_designation: 'town' },
        { id: 'county.22205', text: 'Alameda', country_code: 'us' },
        { id: 'region.2166', text: 'California', country_code: 'us' },
        { id: 'country.213', text: 'United States', country_code: 'us' }
      ]
    }
  ];

  for (const realFeature of realFeatures) {
    const normalized = normalizeMapTilerFeature(realFeature);
    assert.equal(normalized.region, 'CA');
    assert.notEqual(normalized.region, 'US');
  }
});

test('US administrative hierarchy prefers municipality and state over neighborhood and county', () => {
  const twoPitchers = {
    id: 'poi.64751681',
    type: 'Feature',
    place_type: ['poi'],
    text: 'Two Pitchers Brewing Company',
    place_name: 'Two Pitchers Brewing Company, 2344 Webster Street, Northlake, Oakland, Alameda, California 94612, United States',
    center: [-122.2648491, 37.81296092],
    context: [
      { id: 'place.northlake', text: 'Northlake', place_designation: 'neighbourhood' },
      { id: 'municipality.oakland', text: 'Oakland', place_designation: 'city' },
      { id: 'county.alameda', text: 'Alameda' },
      { id: 'region.california', text: 'California', country_code: 'us' },
      { id: 'postal_code.94612', text: '94612' },
      { id: 'country.us', text: 'United States', short_code: 'us' }
    ]
  };

  const normalized = normalizeMapTilerFeature(twoPitchers);
  assert.equal(normalized.city, 'Oakland');
  assert.equal(normalized.region, 'CA');
  assert.equal(normalized.address, '2344 Webster Street, Oakland, CA 94612, United States');
  assert.equal(normalized.locationContext, 'Oakland, CA, United States');
});

test('normalization requires a concrete POI or address with canonical address context', () => {
  assert.equal(normalizeMapTilerFeature({ ...feature, place_type: ['place'] }), null);
  assert.equal(normalizeMapTilerFeature({ ...feature, context: [] }), null);
  assert.deepEqual(normalizeMapTilerResults({ features: [feature, feature] }).map((item) => item.placeId), ['poi.98765']);
});

test('MapTiler request uses the explicit public key, concrete result types, autocomplete, and bounded results', () => {
  const url = new URL(buildMapTilerSearchUrl('McNally Oakland', 'existing-public-key', { limit: 99 }));
  assert.equal(url.hostname, 'api.maptiler.com');
  assert.equal(url.pathname, '/geocoding/McNally%20Oakland.json');
  assert.equal(url.searchParams.get('key'), 'existing-public-key');
  assert.equal(url.searchParams.get('types'), 'poi,address');
  assert.equal(url.searchParams.get('autocomplete'), 'true');
  assert.equal(url.searchParams.get('limit'), '10');
});

test('submitted US ZIP geocoding is restricted to an exact US postal-code result', () => {
  const url = new URL(buildMapTilerPostalSearchUrl('94612', 'existing-public-key'));
  assert.equal(url.searchParams.get('country'), 'us');
  assert.equal(url.searchParams.get('types'), 'postal_code');
  assert.equal(url.searchParams.get('autocomplete'), 'false');

  const origin = normalizeMapTilerPostalOrigin({
    features: [
      {
        id: 'postal_code.94612',
        place_type: ['postal_code'],
        text: '94612',
        place_name: '94612, Oakland, California, United States',
        center: [-122.271, 37.805],
        context: [{ id: 'country.us', text: 'United States', short_code: 'us' }]
      }
    ]
  }, '94612');
  assert.deepEqual(origin, { lat: 37.805, lon: -122.271, label: '94612, Oakland, California, United States' });
  assert.equal(normalizeMapTilerPostalOrigin({ features: [{
    id: 'postal_code.94613',
    place_type: ['postal_code'],
    text: '94613',
    center: [-122.2, 37.8],
    context: [{ id: 'country.us', text: 'United States', short_code: 'us' }]
  }] }, '94612'), null);
});

test('exact mapped city and ZIP matches are resolved before area geocoding', () => {
  const snapshot = {
    venues: [
      { venue_id: 'one', city: 'Oakland', region: 'CA', postal_code: '94612' },
      { venue_id: 'two', city: 'Oakland', region: 'CA', postal_code: '94612' },
      { venue_id: 'three', city: 'Berkeley', region: 'CA', postal_code: '94704' }
    ]
  };
  assert.deepEqual(mappedLocationFieldMatches(snapshot, '94612').map((venue) => venue.venue_id), ['one', 'two']);
  assert.deepEqual(mappedLocationFieldMatches(snapshot, 'Oakland').map((venue) => venue.venue_id), ['one', 'two']);
  assert.deepEqual(mappedLocationFieldMatches(snapshot, 'Oakland, CA').map((venue) => venue.venue_id), ['one', 'two']);
  assert.deepEqual(mappedLocationFieldMatches(snapshot, 'Two Pitchers').map((venue) => venue.venue_id), []);
});

test('joinExternalVenue responses accept only the public Venue whitelist', () => {
  assert.equal(validateJoinExternalVenueResponse(response()), true);
  assert.equal(validateJoinExternalVenueResponse(response({
    venue: { ...publicVenue, external_place_id: 'poi.private' }
  })), false);
  assert.equal(validateJoinExternalVenueResponse(response({
    browser_id: 'browser_private'
  })), false);
});

test('canonical Venue upsert uses stable venue_id and does not create a parallel snapshot', () => {
  const snapshot = { venues: [] };
  const first = upsertCanonicalVenue(snapshot, publicVenue);
  const second = upsertCanonicalVenue(snapshot, { ...publicVenue, name: 'Updated canonical name' });
  assert.equal(first.venue_id, publicVenue.venue_id);
  assert.equal(second.venue_id, publicVenue.venue_id);
  assert.equal(snapshot.venues.length, 1);
  assert.equal(snapshot.venues[0].name, 'Updated canonical name');
});

test('external search and creation failures use distinct retry copy', () => {
  assert.match(externalSearchFailureCopy(new Error('HTTP 503')), /External place search/);
  assert.match(externalCreationFailureCopy(new Error('write_failed')), /Nothing was created/);
  assert.notEqual(externalSearchFailureCopy(new Error('HTTP 503')), externalCreationFailureCopy(new Error('write_failed')));
});
