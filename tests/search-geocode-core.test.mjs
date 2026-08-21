import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildUsAreaSearchUrl,
  normalizeUsAreaOrigin
} from '../js/search-geocode-core.mjs';

test('area geocoding requests are explicitly US-scoped and submit-oriented', () => {
  const url = new URL(buildUsAreaSearchUrl('Oakland, CA', 'public-key'));
  assert.equal(url.hostname, 'api.maptiler.com');
  assert.equal(url.searchParams.get('country'), 'us');
  assert.equal(url.searchParams.get('autocomplete'), 'false');
  assert.equal(url.searchParams.get('language'), 'en');
  assert.equal(url.searchParams.get('key'), 'public-key');
});

test('normalizes a valid US result and rejects explicitly non-US results', () => {
  assert.deepEqual(normalizeUsAreaOrigin({
    features: [{
      center: [-122.2711, 37.8044],
      place_name: 'Oakland, California, United States',
      properties: { country_code: 'US' }
    }]
  }, 'Oakland'), {
    lon: -122.2711,
    lat: 37.8044,
    label: 'Oakland, California, United States'
  });

  assert.equal(normalizeUsAreaOrigin({
    features: [{
      center: [19.945, 50.0647],
      place_name: 'Kraków, Poland',
      properties: { country_code: 'PL' }
    }]
  }, 'Krakow'), null);
});

test('accepts a country-scoped MapTiler result when redundant country metadata is absent', () => {
  assert.deepEqual(normalizeUsAreaOrigin({
    features: [{
      geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] },
      text: 'San Francisco'
    }]
  }, 'San Francisco'), {
    lon: -122.4194,
    lat: 37.7749,
    label: 'San Francisco'
  });
});

test('rejects malformed coordinates and missing configuration', () => {
  assert.equal(normalizeUsAreaOrigin({
    features: [{ center: [999, 999], properties: { country_code: 'US' } }]
  }, 'Bad'), null);
  assert.throws(() => buildUsAreaSearchUrl('', 'public-key'), /maptiler_not_configured/);
  assert.throws(() => buildUsAreaSearchUrl('Oakland', ''), /maptiler_not_configured/);
});
