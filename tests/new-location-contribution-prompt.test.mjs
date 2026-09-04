import test from 'node:test';
import assert from 'node:assert/strict';

import { prepareNewLocationMapDestination } from '../js/new-location-contribution-prompt.mjs';

function fixture({ mobile = true, selectedVenueId = 'venue_1' } = {}) {
  const calls = [];
  const state = { selectedVenueId };
  const mapButton = { click: () => calls.push('map-click') };
  const documentObject = {
    querySelector(selector) {
      return selector === '#mobile-map-button' ? mapButton : null;
    }
  };
  const windowObject = {
    matchMedia: () => ({ matches: mobile }),
    CGBApp: {
      getState: () => state,
      showSelectedVenue: () => calls.push('show-selected'),
      render: () => calls.push('render'),
      focusLocation: (value) => calls.push(['focus', value])
    }
  };
  return { calls, documentObject, windowObject };
}

test('newly added mobile venue prepares the selected map profile before the contribution prompt', () => {
  const { calls, documentObject, windowObject } = fixture();
  const venue = {
    venue_id: 'venue_1',
    longitude: -157.84,
    latitude: 21.29
  };

  assert.equal(prepareNewLocationMapDestination(venue, { documentObject, windowObject }), true);
  assert.deepEqual(calls, [
    'map-click',
    'show-selected',
    'render',
    ['focus', { lon: -157.84, lat: 21.29, venueId: 'venue_1' }]
  ]);
});

test('post-add destination helper does not change desktop presentation', () => {
  const { calls, documentObject, windowObject } = fixture({ mobile: false });
  assert.equal(prepareNewLocationMapDestination({ venue_id: 'venue_1' }, { documentObject, windowObject }), false);
  assert.deepEqual(calls, []);
});

test('post-add destination helper does not move to an unrelated selected venue', () => {
  const { calls, documentObject, windowObject } = fixture({ selectedVenueId: 'venue_other' });
  assert.equal(prepareNewLocationMapDestination({ venue_id: 'venue_1' }, { documentObject, windowObject }), false);
  assert.deepEqual(calls, []);
});
