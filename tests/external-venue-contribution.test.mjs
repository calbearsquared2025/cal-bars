import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateAddExternalVenueResponse } from '../js/external-venue-contribution-core.mjs';

const appsScript = await readFile(new URL('../apps-script/ExternalVenueContribution.gs', import.meta.url), 'utf8');
const fanIntentScript = await readFile(new URL('../apps-script/FanIntent.gs', import.meta.url), 'utf8');
const frontend = await readFile(new URL('../js/external-venue-contribution.js', import.meta.url), 'utf8');

const venue = Object.freeze({
  venue_id: 'venue_123',
  slug: 'example-pub-oakland',
  name: 'Example Pub',
  address_line_1: '1 Main St',
  address_line_2: '',
  city: 'Oakland',
  region: 'CA',
  postal_code: '94612',
  country_code: 'US',
  latitude: 37.8,
  longitude: -122.27,
  website_url: '',
  venue_type: 'community_location',
  verification_status: 'user_added',
  alumni_owned: 'unknown',
  short_description: '',
  photo_url: '',
  photo_caption: '',
  photo_credit: '',
  photo_credit_url: '',
  updated_at: '2026-08-20T00:00:00.000Z'
});

test('accepts the public addExternalVenue response without a selection', () => {
  assert.equal(validateAddExternalVenueResponse({
    ok: true,
    action: 'addExternalVenue',
    schemaVersion: '2.0',
    venue,
    generatedAt: '2026-08-20T00:00:00.000Z'
  }), true);
});

test('rejects attendance or private identity leaking into addExternalVenue responses', () => {
  assert.equal(validateAddExternalVenueResponse({
    ok: true,
    action: 'addExternalVenue',
    venue,
    selection: { game_id: 'game_1', venue_id: venue.venue_id, status: 'attending' }
  }), false);
  assert.equal(validateAddExternalVenueResponse({
    ok: true,
    action: 'addExternalVenue',
    venue,
    browser_id: 'browser_secret'
  }), false);
});

test('frontend addExternalVenue request deliberately excludes browser identity', () => {
  assert.match(frontend, /action: 'addExternalVenue'/);
  const requestStart = frontend.indexOf("action: 'addExternalVenue'");
  const requestEnd = frontend.indexOf('});', requestStart);
  const requestSource = frontend.slice(requestStart, requestEnd);
  assert.doesNotMatch(requestSource, /browserId|browser_id|fanIntent|selection/);
});

test('Apps Script addExternalVenue creation path does not write Fan Intent', () => {
  assert.match(appsScript, /function processAddExternalVenueRequest_/);
  assert.match(appsScript, /buildExternalVenueRecord_/);
  assert.doesNotMatch(appsScript, /applyExternalFanIntent_|appendFanIntentRecord_|Fan_Intent|browserId|browser_id/);
  assert.match(appsScript, /action: 'addExternalVenue'/);
});

test('shared POST router recognizes addExternalVenue separately from attendance writes', () => {
  assert.match(fanIntentScript, /action === 'addExternalVenue'/);
  assert.match(fanIntentScript, /parseAddExternalVenueRequest_/);
  assert.match(fanIntentScript, /processAddExternalVenueRequest_/);
});
