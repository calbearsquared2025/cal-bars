import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildCalBarNominationPrefillUrl } from '../js/cal-bar-nomination-core.mjs';
import { buildListingUpdatePrefillUrl } from '../js/listing-update-core.mjs';
import { buildWatchPartyPrefillUrl, buildWatchPartyFormGameLabel } from '../js/watch-party-form-core.mjs';
import { buildWatchPartyIssueUrl } from '../js/watch-party-issue-core.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const listingSource = await readFile(new URL('../js/listing-update.js', import.meta.url), 'utf8');
const newLocationSource = await readFile(new URL('../js/new-location-contribution-prompt.mjs', import.meta.url), 'utf8');

function meta(name) {
  const pattern = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i');
  return html.match(pattern)?.[1] || '';
}

const venue = { venueId: 'venue_aaaaaaaaaaaaaaaaaaaaaaaa', venueName: 'Test Venue', venueType: 'community_location' };
const game = {
  game_id: 'game_bbbbbbbbbbbbbbbbbbbbbbbb',
  game_date: '2026-09-05',
  opponent_name: 'UCLA',
  home_away: 'home',
  game_status: 'upcoming'
};

test('Venue Profile contribution actions route to distinct Venue Forms with Venue context', () => {
  const tellUrl = buildCalBarNominationPrefillUrl({
    formUrl: meta('cgb-cal-bar-nomination-form-url'),
    venueNameEntry: meta('cgb-cal-bar-nomination-venue-name-entry'),
    venueIdEntry: meta('cgb-cal-bar-nomination-venue-id-entry')
  }, venue);
  const updateUrl = buildListingUpdatePrefillUrl({
    formUrl: meta('cgb-listing-update-form-url'),
    venueNameEntry: meta('cgb-listing-update-venue-name-entry'),
    venueIdEntry: meta('cgb-listing-update-venue-id-entry')
  }, venue);

  assert.notEqual(new URL(tellUrl).pathname, new URL(updateUrl).pathname);
  assert.equal(new URL(tellUrl).searchParams.get('entry.2017964730'), 'Test Venue');
  assert.equal(new URL(tellUrl).searchParams.get('entry.272269917'), venue.venueId);
  assert.equal(new URL(updateUrl).searchParams.get('entry.1985686020'), 'Test Venue');
  assert.equal(new URL(updateUrl).searchParams.get('entry.1316297830'), venue.venueId);
  assert.match(listingSource, /Add or update location details/);
});

test('Watch Party creation routes to the submission Form with Venue and selected Game context', () => {
  const gameLabel = buildWatchPartyFormGameLabel(game);
  const url = buildWatchPartyPrefillUrl({
    formUrl: meta('cgb-watch-party-form-url'),
    venueNameEntry: meta('cgb-watch-party-venue-name-entry'),
    venueIdEntry: meta('cgb-watch-party-venue-id-entry'),
    gameIdEntry: meta('cgb-watch-party-game-id-entry')
  }, { ...venue, gameId: game.game_id, gameLabel });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('entry.307282250'), 'Test Venue');
  assert.equal(parsed.searchParams.get('entry.1451856849'), venue.venueId);
  assert.equal(parsed.searchParams.get('entry.1519015315'), gameLabel);
});

test('Watch Party maintenance routes to the separate update Form with stable Watch Party ID', () => {
  const gameLabel = buildWatchPartyFormGameLabel(game);
  const url = buildWatchPartyIssueUrl({
    formUrl: meta('cgb-watch-party-issue-form-url'),
    venueNameEntry: meta('cgb-watch-party-issue-venue-name-entry'),
    gameEntry: meta('cgb-watch-party-issue-game-entry'),
    watchPartyIdEntry: meta('cgb-watch-party-issue-id-entry')
  }, {
    venueName: venue.venueName,
    gameLabel,
    watchPartyId: 'wp_cccccccccccccccccccccccc'
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('entry.541323117'), 'Test Venue');
  assert.equal(parsed.searchParams.get('entry.456782239'), gameLabel);
  assert.equal(parsed.searchParams.get('entry.703629381'), 'wp_cccccccccccccccccccccccc');
  assert.notEqual(meta('cgb-watch-party-issue-form-url'), meta('cgb-listing-update-form-url'));
});

test('new Community Location follow-up continues to reuse Tell us about this location', () => {
  assert.match(newLocationSource, /buildCalBarNominationPrefillUrl/);
  assert.match(newLocationSource, /Tell us about this location/);
});
