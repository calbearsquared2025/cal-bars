import test from 'node:test';
import assert from 'node:assert/strict';

import { GA_MEASUREMENT_ID, initializeGoogleAnalytics } from '../js/analytics.mjs';

test('Google Analytics migration preserves the existing GA4 property and initializes once', () => {
  const appended = [];
  const elementsById = new Map();
  const documentObject = {
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
  };
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
