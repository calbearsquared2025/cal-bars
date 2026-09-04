import test from 'node:test';
import assert from 'node:assert/strict';

import { rankMapTilerResults } from '../js/external-venue-core.mjs';

function poiFeature(name, relevance = 0.9) {
  return {
    id: `poi.${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'venue'}`,
    place_type: ['poi'],
    text: name,
    place_name: `${name}, 100 Main Street, Testville, California 90000, United States`,
    center: [-118.2, 34.0],
    relevance,
    properties: { country_code: 'us' },
    context: [
      { id: 'municipality.1', place_type: ['municipality'], text: 'Testville', place_designation: 'city' },
      { id: 'region.2', place_type: ['region'], text: 'California', country_code: 'us' },
      { id: 'postal_code.3', place_type: ['postal_code'], text: '90000' },
      { id: 'country.4', place_type: ['country'], text: 'United States', short_code: 'us' }
    ]
  };
}

test('finalized venue search rejects connector-only one-word matches for a multiword venue query', () => {
  const results = rankMapTilerResults(
    { features: [poiFeature('And')] },
    'Alpha And Omega',
    { filterWeak: true }
  );

  assert.deepEqual(results, []);
});

test('an exact one-word venue query remains eligible even when the name is a connector word', () => {
  const results = rankMapTilerResults(
    { features: [poiFeature('And')] },
    'And',
    { filterWeak: true }
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'And');
});
