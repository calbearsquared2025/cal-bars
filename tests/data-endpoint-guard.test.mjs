import test from 'node:test';
import assert from 'node:assert/strict';

import {
  allowsDataEndpointOverride,
  clearDisallowedDataEndpointOverride
} from '../js/snapshot-refresh.mjs';

const DATA_ENDPOINT_OVERRIDE_KEY = 'cgb_v2_public_data_url';

function storageWith(value) {
  const values = new Map();
  if (value !== undefined) values.set(DATA_ENDPOINT_OVERRIDE_KEY, value);
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    removeItem(key) { values.delete(key); },
    value() { return values.get(DATA_ENDPOINT_OVERRIDE_KEY); }
  };
}

test('endpoint overrides remain available on local and Codespaces preview hosts', () => {
  ['localhost', '127.0.0.1', '[::1]', 'example.app.github.dev', 'example.githubpreview.dev']
    .forEach((hostname) => assert.equal(allowsDataEndpointOverride(hostname), true));
});

test('public and unrelated hosts do not allow endpoint overrides', () => {
  ['calgoldenbars.com', 'www.calgoldenbars.com', 'example.com', 'app.github.dev.example.com']
    .forEach((hostname) => assert.equal(allowsDataEndpointOverride(hostname), false));
});

test('a stale public-host override is removed before application startup', () => {
  const storage = storageWith('https://example.invalid/data');
  assert.equal(clearDisallowedDataEndpointOverride({
    hostname: 'calgoldenbars.com',
    getStorage: () => storage
  }), true);
  assert.equal(storage.value(), undefined);
});

test('an allowed local override is preserved', () => {
  const storage = storageWith('http://localhost:3000/data.json');
  assert.equal(clearDisallowedDataEndpointOverride({
    hostname: 'localhost',
    getStorage: () => storage
  }), false);
  assert.equal(storage.value(), 'http://localhost:3000/data.json');
});

test('storage method failures do not block application startup', () => {
  const storage = { getItem() { throw new Error('blocked'); }, removeItem() {} };
  assert.doesNotThrow(() => clearDisallowedDataEndpointOverride({
    hostname: 'calgoldenbars.com',
    getStorage: () => storage
  }));
});

test('storage acquisition failures do not block application startup', () => {
  assert.doesNotThrow(() => clearDisallowedDataEndpointOverride({
    hostname: 'calgoldenbars.com',
    getStorage() { throw new Error('localStorage unavailable'); }
  }));
});
