import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMapTilerSearchUrl,
  externalCreationFailureCopy,
  externalSearchFailureCopy,
  findExistingMapTilerKey,
  normalizeMapTilerFeature,
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
    { id: 'region.california', text: 'California', short_code: 'US-CA' },
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
  region: 'California',
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
    address: '5352 College Ave, Oakland, California 94618, United States',
    addressLine1: '5352 College Ave',
    addressLine2: '',
    city: 'Oakland',
    region: 'California',
    postalCode: '94618',
    countryCode: 'US',
    latitude: 37.839,
    longitude: -122.252,
    locationContext: 'Oakland, California, United States',
    placeType: 'poi'
  });
});

test('normalization requires a concrete POI or address with canonical address context', () => {
  assert.equal(normalizeMapTilerFeature({ ...feature, place_type: ['place'] }), null);
  assert.equal(normalizeMapTilerFeature({ ...feature, context: [] }), null);
  assert.deepEqual(normalizeMapTilerResults({ features: [feature, feature] }).map((item) => item.placeId), ['poi.98765']);
});

test('MapTiler request uses the existing public key, concrete result types, autocomplete, and bounded results', () => {
  const url = new URL(buildMapTilerSearchUrl('McNally Oakland', 'existing-public-key', { limit: 99 }));
  assert.equal(url.hostname, 'api.maptiler.com');
  assert.equal(url.pathname, '/geocoding/McNally%20Oakland.json');
  assert.equal(url.searchParams.get('key'), 'existing-public-key');
  assert.equal(url.searchParams.get('types'), 'poi,address');
  assert.equal(url.searchParams.get('autocomplete'), 'true');
  assert.equal(url.searchParams.get('limit'), '10');
});

test('frontend reuses the key already present in MapTiler resource requests', () => {
  assert.equal(findExistingMapTilerKey({
    resourceEntries: [{ name: 'https://api.maptiler.com/maps/test/style.json?key=already-loaded' }]
  }), 'already-loaded');
  assert.equal(findExistingMapTilerKey({
    style: { sources: { base: { url: 'https://api.maptiler.com/tiles/test/tiles.json?key=style-key' } } }
  }), 'style-key');
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
