import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  CONFIG_META_NAMES,
  DATA_ENDPOINT_OVERRIDE_STORAGE_KEY,
  readBuildConfigFromHtml,
  readRuntimeConfig
} from '../js/config.mjs';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

function metaValuesFromHtml(html) {
  return new Map(Array.from(String(html).matchAll(/<meta\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi), ([tag, name]) => [
    name,
    tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || ''
  ]));
}

function documentStub(metaValues = metaValuesFromHtml(index), canonicalUrl = 'https://calgoldenbars.com/') {
  return {
    defaultView: null,
    querySelector(selector) {
      const metaName = selector.match(/^meta\[name="([^"]+)"\]$/)?.[1];
      if (metaName) return metaValues.has(metaName) ? { content: metaValues.get(metaName) } : null;
      if (selector === 'link[rel="canonical"]') return { href: canonicalUrl };
      return null;
    }
  };
}

test('runtime configuration reads the endpoint and every public Google Form contract through one interface', () => {
  const config = readRuntimeConfig({
    documentObject: documentStub(),
    windowObject: { localStorage: { getItem: () => null } }
  });

  assert.equal(config.dataEndpoint, metaValuesFromHtml(index).get(CONFIG_META_NAMES.dataEndpoint));
  assert.deepEqual(config.forms.watchParty, {
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdPF2mVRnIaZtyIwgFB2j9LvrHnl6jENkX6u9_dj1Zew5TTiQ/viewform',
    venueIdEntry: 'entry.1451856849',
    venueNameEntry: 'entry.307282250',
    gameIdEntry: 'entry.1519015315'
  });
  assert.equal(config.forms.calBarNomination.venueIdEntry, 'entry.272269917');
  assert.equal(config.forms.listingUpdate.venueNameEntry, 'entry.1985686020');
  assert.equal(config.forms.watchPartyIssue.watchPartyIdEntry, 'entry.703629381');
  assert.match(config.forms.fanExperience.formUrl, /docs\.google\.com\/forms\//);
  assert.match(config.forms.photo.formUrl, /docs\.google\.com\/forms\//);
});

test('supported endpoint storage overrides retain precedence and blocked storage preserves the meta fallback', () => {
  const documentObject = documentStub();
  const override = 'http://127.0.0.1:8765/__cgb_mock_api__';
  const overridden = readRuntimeConfig({
    documentObject,
    windowObject: { localStorage: { getItem: (key) => key === DATA_ENDPOINT_OVERRIDE_STORAGE_KEY ? override : null } }
  });
  assert.equal(overridden.dataEndpoint, override);

  const fallback = readRuntimeConfig({
    documentObject,
    windowObject: { localStorage: { getItem() { throw new Error('blocked'); } } }
  });
  assert.equal(fallback.dataEndpoint, metaValuesFromHtml(index).get(CONFIG_META_NAMES.dataEndpoint));
});

test('MapTiler, analytics, canonical URL, and initial geography have canonical defaults', () => {
  const config = readRuntimeConfig({ documentObject: documentStub(new Map()), windowObject: {} });
  assert.equal(config.analyticsMeasurementId, 'G-CZV3JSBNJK');
  assert.equal(config.canonicalSiteUrl, 'https://calgoldenbars.com/');
  assert.equal(config.mapTiler.apiKey, 'jNqIsIVa4dP9qv7vQ8fy');
  assert.match(config.mapTiler.styleUrl, /styles\/dataviz-with-cgb-states\.json$/);
  assert.deepEqual(config.defaultGeography, { center: [-98.5795, 39.8283], zoom: 3.2 });
});

test('build-time social tooling reads canonical site and endpoint configuration through the shared parser', () => {
  assert.deepEqual(readBuildConfigFromHtml(index), {
    dataEndpoint: metaValuesFromHtml(index).get(CONFIG_META_NAMES.dataEndpoint),
    canonicalSiteUrl: 'https://calgoldenbars.com/'
  });
});
