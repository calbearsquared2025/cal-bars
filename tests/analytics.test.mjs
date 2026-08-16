import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GA_MEASUREMENT_ID,
  initializeGoogleAnalytics,
  sanitizeEventParameters,
  trackCgbEvent
} from '../js/analytics.mjs';

function analyticsDocumentStub() {
  const appended = [];
  const elementsById = new Map();
  return {
    appended,
    documentObject: {
      createElement(tagName) {
        return { tagName };
      },
      getElementById(id) {
        return elementsById.get(id) || null;
      },
      head: {
        append(element) {
          appended.push(element);
          if (element.id) elementsById.set(element.id, element);
        }
      }
    }
  };
}

test('Google Analytics migration preserves the existing GA4 property and initializes once', () => {
  const { appended, documentObject } = analyticsDocumentStub();
  const windowObject = {};

  assert.equal(GA_MEASUREMENT_ID, 'G-CZV3JSBNJK');
  assert.equal(initializeGoogleAnalytics({ windowObject, documentObject }), true);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].id, 'cgb-google-analytics');
  assert.equal(appended[0].async, true);
  assert.equal(
    appended[0].src,
    'https://www.googletagmanager.com/gtag/js?id=G-CZV3JSBNJK'
  );

  const calls = windowObject.dataLayer.map((entry) => Array.from(entry));
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'js');
  assert.equal(calls[0][1] instanceof Date, true);
  assert.deepEqual(calls[1], ['config', 'G-CZV3JSBNJK']);

  assert.equal(initializeGoogleAnalytics({ windowObject, documentObject }), true);
  assert.equal(appended.length, 1);
  assert.equal(windowObject.dataLayer.length, 2);
});

test('event schema aliases legacy calls, adds game context, and drops private or high-risk parameters', () => {
  const { documentObject } = analyticsDocumentStub();
  const windowObject = {
    CGBApp: {
      getState() {
        return { gameId: '2026-ucla' };
      }
    }
  };
  initializeGoogleAnalytics({ windowObject, documentObject });

  windowObject.gtag('event', 'external_place_result_selected', {
    place_type: 'poi',
    browser_id: 'private-browser-id',
    latitude: 37.8,
    search_term: 'raw user search'
  });

  assert.deepEqual(windowObject.dataLayer.at(-1), [
    'event',
    'external_place_selected',
    {
      game_id: '2026-ucla',
      entry_surface: 'search',
      result_type: 'external',
      place_type: 'poi'
    }
  ]);
});

test('CGB event helper only sends approved flow parameters', () => {
  const sent = [];
  const windowObject = {
    gtag(...args) {
      sent.push(args);
    }
  };

  assert.deepEqual(sanitizeEventParameters({
    game_id: '2026-stanford',
    venue_type: 'cal_bar',
    action_surface: 'detail',
    browser_id: 'do-not-send',
    email: 'do-not-send@example.com',
    longitude: -122.2
  }), {
    game_id: '2026-stanford',
    venue_type: 'cal_bar',
    action_surface: 'detail'
  });

  assert.equal(trackCgbEvent('directions_clicked', {
    game_id: '2026-stanford',
    venue_type: 'cal_bar',
    action_surface: 'detail'
  }, windowObject), true);
  assert.deepEqual(sent, [[
    'event',
    'directions_clicked',
    {
      game_id: '2026-stanford',
      venue_type: 'cal_bar',
      action_surface: 'detail'
    }
  ]]);
});

test('CGB event helper is a no-op outside a browser instead of throwing', () => {
  assert.equal(trackCgbEvent('fan_intent_joined', { game_id: 'game_1' }), false);
});
