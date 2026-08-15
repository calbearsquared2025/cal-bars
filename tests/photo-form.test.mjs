import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPhotoFormPrefillUrl,
  normalizePhotoFormConfig,
  resolvePhotoFormVenue
} from '../js/photo-form-core.mjs';
import { PHOTO_FORM_CONFIG } from '../js/photo-form-config.mjs';

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

test('live photo Form prefill keeps the approved URL and Venue entry IDs', () => {
  assert.equal(
    PHOTO_FORM_CONFIG.formUrl,
    'https://docs.google.com/forms/d/e/1FAIpQLSecvY5Pm73oPNRe4viSATCWYeERxwyDGYHwGpvPZHzQ03BmDg/viewform'
  );
  assert.equal(PHOTO_FORM_CONFIG.venueNameEntry, 'entry.1077046729');
  assert.equal(PHOTO_FORM_CONFIG.venueIdEntry, 'entry.893543394');

  const url = new URL(buildPhotoFormPrefillUrl(PHOTO_FORM_CONFIG, {
    venueId: 'venue_5977e35a58d8b18f22a51f1e',
    venueName: "Molly O's"
  }));
  assert.equal(url.searchParams.get('entry.1077046729'), "Molly O's");
  assert.equal(url.searchParams.get('entry.893543394'), 'venue_5977e35a58d8b18f22a51f1e');
});

test('missing configuration or Venue context produces no photo CTA URL', () => {
  assert.equal(buildPhotoFormPrefillUrl({}, resolvePhotoFormVenue(snapshot, 'venue_123')), '');
  assert.equal(buildPhotoFormPrefillUrl(config, null), '');
  assert.equal(resolvePhotoFormVenue(snapshot, 'missing'), null);
});
