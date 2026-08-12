import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPhotoFormPrefillUrl,
  normalizePhotoFormConfig,
  resolvePhotoFormVenue
} from '../js/photo-form-core.mjs';

const config = {
  formUrl: 'https://docs.google.com/forms/d/e/example/viewform',
  venueIdEntry: 'entry.101',
  venueNameEntry: 'entry.202'
};
const snapshot = { venues: [{ venue_id: 'venue_123', name: 'Example Pub' }] };

test('photo Form requires a safe prefillable Google Form and distinct entry IDs', () => {
  assert.ok(normalizePhotoFormConfig(config));
  assert.equal(normalizePhotoFormConfig({ ...config, formUrl: 'https://forms.gle/example' }), null);
  assert.equal(normalizePhotoFormConfig({ ...config, formUrl: 'javascript:alert(1)' }), null);
  assert.equal(normalizePhotoFormConfig({ ...config, venueNameEntry: 'entry.101' }), null);
});

test('photo Form prefills exactly Venue ID and name', () => {
  const venue = resolvePhotoFormVenue(snapshot, 'venue_123');
  const url = new URL(buildPhotoFormPrefillUrl(config, venue));
  assert.equal(url.searchParams.get('entry.101'), 'venue_123');
  assert.equal(url.searchParams.get('entry.202'), 'Example Pub');
  assert.equal([...url.searchParams.keys()].filter((key) => key.startsWith('entry.')).length, 2);
});

test('missing configuration or Venue context produces no photo CTA URL', () => {
  assert.equal(buildPhotoFormPrefillUrl({}, resolvePhotoFormVenue(snapshot, 'venue_123')), '');
  assert.equal(buildPhotoFormPrefillUrl(config, null), '');
  assert.equal(resolvePhotoFormVenue(snapshot, 'missing'), null);
});
