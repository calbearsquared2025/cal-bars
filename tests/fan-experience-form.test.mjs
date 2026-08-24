import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFanExperienceFormPrefillUrl,
  normalizeFanExperienceFormConfig,
  resolveFanExperienceVenue
} from '../js/fan-experience-form-core.mjs';
import { FAN_EXPERIENCE_FORM_CONFIG } from '../js/fan-experience-form-config.mjs';

const config = {
  formUrl: 'https://docs.google.com/forms/d/e/example/viewform',
  venueIdEntry: 'entry.101',
  venueNameEntry: 'entry.202'
};
const venueId = 'venue_5977e35a58d8b18f22a51f1e';
const snapshot = { venues: [{ venue_id: venueId, name: "Molly O's" }] };

test('Fan Experience Form requires a safe Google Form URL and distinct prefill IDs', () => {
  assert.ok(normalizeFanExperienceFormConfig(config));
  assert.equal(normalizeFanExperienceFormConfig({ ...config, formUrl: 'https://forms.gle/example' }), null);
  assert.equal(normalizeFanExperienceFormConfig({ ...config, formUrl: 'javascript:alert(1)' }), null);
  assert.equal(normalizeFanExperienceFormConfig({ ...config, venueNameEntry: 'entry.101' }), null);
});

test('Fan Experience Form prefills exactly Venue name and canonical Venue ID', () => {
  const venue = resolveFanExperienceVenue(snapshot, venueId);
  const url = new URL(buildFanExperienceFormPrefillUrl(config, venue));
  assert.equal(url.searchParams.get('entry.101'), venueId);
  assert.equal(url.searchParams.get('entry.202'), "Molly O's");
  assert.equal([...url.searchParams.keys()].filter((key) => key.startsWith('entry.')).length, 2);
});

test('production Fan Experience Form uses the verified live prefill configuration', () => {
  assert.deepEqual(FAN_EXPERIENCE_FORM_CONFIG, {
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScVyKUUXqR8sqEPQLIMeVV1TtxI9EiVmMDd3ib-CvLuBKRajg/viewform',
    venueIdEntry: 'entry.120767699',
    venueNameEntry: 'entry.202050515'
  });
  const url = new URL(buildFanExperienceFormPrefillUrl(FAN_EXPERIENCE_FORM_CONFIG, {
    venueId,
    venueName: "Molly O's"
  }));
  assert.equal(url.searchParams.get('entry.120767699'), venueId);
  assert.equal(url.searchParams.get('entry.202050515'), "Molly O's");
});
