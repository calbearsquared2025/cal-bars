import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

import {
  configuredDataEndpoint,
  DATA_ENDPOINT_OVERRIDE_KEY,
  metaContentFromHtml,
  readFormConfig,
  readRuntimeConfig,
  suspendConfiguredDataEndpoint
} from '../js/config.mjs';

function documentWith(values = {}, canonical = '') {
  const nodes = new Map(Object.entries(values).map(([name, content]) => [name, { content }]));
  return {
    querySelector(selector) {
      const metaName = selector.match(/^meta\[name="([^"]+)"\]$/)?.[1];
      if (metaName) return nodes.get(metaName) || null;
      if (selector === 'link[rel="canonical"]' && canonical) return { href: canonical };
      return null;
    }
  };
}

function windowWith(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    localStorage: {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key)
    },
    values
  };
}

test('configured endpoint prefers the supported local-storage override', () => {
  const documentObject = documentWith({ 'cgb-data-endpoint': 'https://example.test/live' });
  const windowObject = windowWith({ [DATA_ENDPOINT_OVERRIDE_KEY]: ' https://localhost.test/mock ' });
  assert.equal(configuredDataEndpoint({ documentObject, windowObject }), 'https://localhost.test/mock');
});

test('configured endpoint falls back to current meta configuration', () => {
  const documentObject = documentWith({ 'cgb-data-endpoint': ' https://example.test/live ' });
  assert.equal(configuredDataEndpoint({ documentObject, windowObject: windowWith() }), 'https://example.test/live');
});

test('Google Form configuration uses meta values and canonical defaults', () => {
  const watchParty = readFormConfig('watchParty', documentWith({
    'cgb-watch-party-form-url': ' https://forms.test/watch ',
    'cgb-watch-party-venue-id-entry': ' entry.1 ',
    'cgb-watch-party-venue-name-entry': ' entry.2 ',
    'cgb-watch-party-game-id-entry': ' entry.3 '
  }));
  assert.deepEqual(watchParty, {
    formUrl: 'https://forms.test/watch',
    venueIdEntry: 'entry.1',
    venueNameEntry: 'entry.2',
    gameIdEntry: 'entry.3'
  });
  assert.match(readFormConfig('photo', documentWith()).formUrl, /docs\.google\.com\/forms/);
  assert.match(readFormConfig('fanExperience', documentWith()).venueIdEntry, /^entry\./);
});

test('runtime configuration exposes service, site, and home geography values once', () => {
  const config = readRuntimeConfig({
    documentObject: documentWith({}, 'https://school.example/'),
    windowObject: windowWith()
  });
  assert.equal(config.canonicalSiteUrl, 'https://school.example/');
  assert.match(config.mapTiler.apiKey, /\S/);
  assert.match(config.analytics.measurementId, /^G-/);
  assert.deepEqual(config.homeGeography, { longitude: -98.5795, latitude: 39.8283, zoom: 3.2 });
});

test('endpoint suspension preserves the existing fallback bootstrap behavior', () => {
  const documentObject = documentWith({ 'cgb-data-endpoint': 'https://example.test/live' });
  const windowObject = windowWith({ [DATA_ENDPOINT_OVERRIDE_KEY]: 'https://localhost.test/mock' });
  const control = suspendConfiguredDataEndpoint({ documentObject, windowObject });
  assert.equal(control.endpoint, 'https://localhost.test/mock');
  assert.equal(configuredDataEndpoint({ documentObject, windowObject }), '');
  control.restore();
  assert.equal(configuredDataEndpoint({ documentObject, windowObject }), 'https://localhost.test/mock');
});

test('build tooling shares meta endpoint discovery with browser configuration', () => {
  const html = '<meta name="cgb-data-endpoint" content=" https://example.test/live ">';
  assert.equal(metaContentFromHtml(html, 'cgb-data-endpoint'), 'https://example.test/live');
  assert.equal(metaContentFromHtml(html, 'missing'), '');
});

test('application modules have one runtime configuration lookup path', async () => {
  const jsDirectory = new URL('../js/', import.meta.url);
  const files = (await readdir(jsDirectory)).filter((name) => /\.(?:js|mjs)$/.test(name) && name !== 'config.mjs');
  const sources = await Promise.all(files.map(async (name) => [name, await readFile(new URL(name, jsDirectory), 'utf8')]));
  sources.forEach(([name, source]) => {
    assert.doesNotMatch(source, /meta\[name=["']cgb-data-endpoint/, `${name} reads the endpoint outside config.mjs`);
    assert.doesNotMatch(source, /querySelector\([^\n]*cgb-[a-z-]+-form/, `${name} reads Form configuration outside config.mjs`);
  });
});
