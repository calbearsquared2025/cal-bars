import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMapTilerFinalSearchQueries,
  buildMapTilerSearchUrl,
  externalCreationFailureCopy,
  externalSearchFailureCopy,
  hasStrongMapTilerVenueMatch,
  normalizeMapTilerFeature,
  normalizeMapTilerResults,
  normalizeUserLocationProximity,
  rankMapTilerResults,
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

function poiFeature({ id, name, address, city, postalCode, center, relevance }) {
  return {
    id,
    type: 'Feature',
    place_type: ['poi'],
    text: name,
    place_name: `${name}, ${address}, ${city}, California ${postalCode}, United States`,
    center,
    relevance,
    properties: { country_code: 'us' },
    context: [
      { id: `municipality.${id}`, place_type: ['municipality'], text: city, place_designation: 'city' },
      { id: `region.${id}`, place_type: ['region'], text: 'California', country_code: 'us' },
      { id: `postal_code.${id}`, place_type: ['postal_code'], text: postalCode },
      { id: `country.${id}`, place_type: ['country'], text: 'United States', short_code: 'us' }
    ]
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

test('only browser geolocation is accepted as user proximity', () => {
  assert.deepEqual(
    normalizeUserLocationProximity({ lat: 37.8044, lon: -122.2712, label: 'your location' }),
    { lat: 37.8044, lon: -122.2712 }
  );
  assert.equal(
    normalizeUserLocationProximity({ lat: 33.7701, lon: -118.1937, label: 'Long Beach, CA' }),
    null
  );
});

test('MapTiler external-place request uses concrete result types, autocomplete, fuzzy matching, US scope, and bounded results', () => {
  const url = new URL(buildMapTilerSearchUrl('McNally Oakland', 'existing-public-key', { limit: 99 }));
  assert.equal(url.hostname, 'api.maptiler.com');
  assert.equal(url.pathname, '/geocoding/McNally%20Oakland.json');
  assert.equal(url.searchParams.get('key'), 'existing-public-key');
  assert.equal(url.searchParams.get('types'), 'poi,address');
  assert.equal(url.searchParams.get('autocomplete'), 'true');
  assert.equal(url.searchParams.get('fuzzyMatch'), 'true');
  assert.equal(url.searchParams.get('country'), 'us');
  assert.equal(url.searchParams.get('limit'), '10');
  assert.equal(url.searchParams.has('proximity'), false);
});

test('MapTiler proximity biases results without applying a bounding box', () => {
  const url = new URL(buildMapTilerSearchUrl('District 4 Pizza', 'existing-public-key', {
    proximity: { lon: -118.1937, lat: 33.7701 }
  }));
  assert.equal(url.searchParams.get('proximity'), '-118.1937,33.7701');
  assert.equal(url.searchParams.has('bbox'), false);
});

test('invalid proximity is ignored rather than corrupting the search request', () => {
  const url = new URL(buildMapTilerSearchUrl('District 4 Pizza', 'existing-public-key', {
    proximity: { lon: 999, lat: 33.7701 }
  }));
  assert.equal(url.searchParams.has('proximity'), false);
});

test('finalized MapTiler requests disable autocomplete without disabling typo tolerance', () => {
  const url = new URL(buildMapTilerSearchUrl('District 4 Pizza long beach', 'existing-public-key', {
    autocomplete: false,
    fuzzyMatch: true
  }));
  assert.equal(url.searchParams.get('autocomplete'), 'false');
  assert.equal(url.searchParams.get('fuzzyMatch'), 'true');
});

test('finalized venue search progressively removes trailing location words for name-focused retries', () => {
  assert.deepEqual(buildMapTilerFinalSearchQueries('District 4 Pizza long beach'), [
    'District 4 Pizza long beach',
    'District 4 Pizza long',
    'District 4 Pizza',
    'District 4'
  ]);
});

test('venue-name ranking promotes District 4 Pizza in Long Beach and suppresses weak pizza matches', () => {
  const weakPayload = {
    features: [
      poiFeature({
        id: 'poi.pizza-hut',
        name: 'Pizza Hut',
        address: '1956 South University',
        city: 'Mobile',
        postalCode: '36609',
        center: [-88.15, 30.67],
        relevance: 0.7
      }),
      poiFeature({
        id: 'poi.donatos',
        name: 'Donatos Pizza',
        address: '2048 North High Street',
        city: 'Columbus',
        postalCode: '43201',
        center: [-83.01, 40.00],
        relevance: 0.68
      })
    ]
  };
  const focusedPayload = {
    features: [
      poiFeature({
        id: 'poi.district-4',
        name: 'District 4 Pizza',
        address: '2123 N Bellflower Blvd',
        city: 'Long Beach',
        postalCode: '90815',
        center: [-118.125, 33.795],
        relevance: 0.46
      })
    ]
  };

  const results = rankMapTilerResults(
    [weakPayload, focusedPayload],
    'District 4 Pizza long beach',
    { maximum: 6, filterWeak: true }
  );

  assert.equal(results[0].name, 'District 4 Pizza');
  assert.equal(results[0].city, 'Long Beach');
  assert.equal(hasStrongMapTilerVenueMatch(results, 'District 4 Pizza long beach'), true);
  assert.equal(results.some((place) => place.name === 'Pizza Hut'), false);
  assert.equal(results.some((place) => place.name === 'Donatos Pizza'), false);
});

test('explicit city text outranks a stronger provider relevance signal from another city', () => {
  const payload = {
    features: [
      poiFeature({
        id: 'poi.district-4-oakland',
        name: 'District 4 Pizza',
        address: '100 Broadway',
        city: 'Oakland',
        postalCode: '94607',
        center: [-122.27, 37.80],
        relevance: 1
      }),
      poiFeature({
        id: 'poi.district-4-long-beach',
        name: 'District 4 Pizza',
        address: '2123 N Bellflower Blvd',
        city: 'Long Beach',
        postalCode: '90815',
        center: [-118.125, 33.795],
        relevance: 0.1
      })
    ]
  };

  const results = rankMapTilerResults(payload, 'District 4 Pizza long beach', { maximum: 2 });
  assert.equal(results[0].city, 'Long Beach');
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
