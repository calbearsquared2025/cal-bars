import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

import { venueTagsForVenue } from '../js/fan-experiences.mjs';
import { watchPartyTagLabels } from '../js/watch-party-renderer.mjs';
import { validateContributionTags } from '../scripts/validate-contribution-tags.mjs';

const codeSource = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

function codeHarness() {
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    Date, JSON, Math, Number, Object, Array, String, Set, Map, RegExp, Error
  });
  vm.runInContext(`${codeSource}\nglobalThis.__api = { normalizePublicControlledTags_, CGB_PUBLIC_FIELDS, CGB_TABS };`, context);
  return context.__api;
}

test('venue tags use the approved vocabulary and deterministic display order', () => {
  assert.deepEqual(
    venueTagsForVenue({ venue_tags: ['cal_memorabilia', 'food', 'all_ages', 'not_approved'] }),
    [
      { value: 'all_ages', label: 'ALL AGES' },
      { value: 'food', label: 'FOOD' },
      { value: 'cal_memorabilia', label: 'CAL MEMORABILIA' }
    ]
  );
  assert.deepEqual(venueTagsForVenue({}), []);
});

test('Watch Party renders event-only tags and does not duplicate persistent venue context', () => {
  assert.deepEqual(
    watchPartyTagLabels({
      age_policy: '21_plus',
      sound_status: 'confirmed_on',
      feature_tags: ['rsvp_requested', 'cal_specials']
    }, {
      venue_tags: ['21_plus', 'audio_on', 'food']
    }),
    ['RSVP REQUESTED', 'CAL SPECIALS']
  );

  assert.deepEqual(
    watchPartyTagLabels({
      age_policy: '21_plus',
      sound_status: 'confirmed_on',
      feature_tags: []
    }, { venue_tags: [] }),
    ['21+', 'AUDIO ON']
  );

  assert.deepEqual(
    watchPartyTagLabels({ age_policy: 'all_ages' }, { venue_tags: [] }),
    ['ALL AGES']
  );
  assert.deepEqual(
    watchPartyTagLabels({ age_policy: 'all_ages' }, { venue_tags: ['all_ages'] }),
    []
  );
});

test('negative audio values do not create positive tags', () => {
  assert.deepEqual(
    watchPartyTagLabels({ sound_status: 'confirmed_off' }, {}),
    []
  );
});

test('Apps Script public whitelist exposes intended structured fields while canonical tag columns remain additive', () => {
  const api = codeHarness();
  assert.ok(Array.from(api.CGB_PUBLIC_FIELDS.Venues).includes('venue_tags'));
  assert.ok(Array.from(api.CGB_PUBLIC_FIELDS.Watch_Parties).includes('feature_tags'));
  assert.equal(Array.from(api.CGB_TABS.Venues).includes('venue_tags'), false);
  assert.equal(Array.from(api.CGB_TABS.Watch_Parties).includes('feature_tags'), false);
  assert.deepEqual(
    Array.from(api.normalizePublicControlledTags_('food|malicious|all_ages|food', ['all_ages', 'food'])),
    ['all_ages', 'food']
  );
});

test('public-data tag validator rejects malformed, duplicate, unordered, and unapproved tags', () => {
  assert.deepEqual(validateContributionTags({ venues: [{}], watchParties: [{}] }), []);
  assert.equal(validateContributionTags({
    venues: [{ venue_tags: ['food', '21_plus'] }],
    watchParties: []
  }).some((error) => error.includes('canonical tag order')), true);
  assert.equal(validateContributionTags({
    venues: [{ venue_tags: ['food', 'alumni_owned'] }],
    watchParties: []
  }).some((error) => error.includes('unsupported tag')), true);
  assert.equal(validateContributionTags({
    venues: [],
    watchParties: [{ feature_tags: 'rsvp_requested' }]
  }).some((error) => error.includes('must be an array')), true);
});
