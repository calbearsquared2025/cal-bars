import {
  appState,
  markApplicationReady,
  setCanonicalSnapshot
} from '../../js/app-state.mjs';

const result = document.querySelector('#harness-result');
const searchInput = document.querySelector('#location-query');
const suggestions = document.querySelector('#search-suggestions');
const dialog = document.querySelector('#external-venue-dialog');
const confirmButton = document.querySelector('#external-venue-confirm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, message, timeout = 3000) {
  const startedAt = performance.now();
  while (!predicate()) {
    if (performance.now() - startedAt > timeout) throw new Error(message);
    await wait(25);
  }
}

const existingVenue = {
  venue_id: 'ven_existing',
  slug: 'existing-cgb-pub',
  name: 'Existing CGB Pub',
  address_line_1: '1 Main St',
  address_line_2: '',
  city: 'Oakland',
  region: 'CA',
  postal_code: '94612',
  country_code: 'US',
  latitude: 37.8,
  longitude: -122.27,
  website_url: '',
  venue_type: 'cal_bar',
  verification_status: 'cgb_reviewed',
  alumni_owned: 'unknown',
  short_description: '',
  photo_url: '',
  photo_credit: '',
  updated_at: '2026-07-29T05:00:00.000Z'
};

const canonicalExternalVenue = {
  venue_id: 'venue_created_1',
  slug: 'mcnally-s-irish-pub-oakland',
  name: "McNally's Irish Pub",
  address_line_1: '5352 College Ave',
  address_line_2: '',
  city: 'Oakland',
  region: 'California',
  postal_code: '94618',
  country_code: 'US',
  latitude: 37.839,
  longitude: -122.252,
  website_url: '',
  venue_type: 'community_location',
  verification_status: 'user_added',
  alumni_owned: 'unknown',
  short_description: '',
  photo_url: '',
  photo_credit: '',
  updated_at: '2026-07-29T05:01:00.000Z'
};

setCanonicalSnapshot({
  schemaVersion: '2.0',
  venues: [existingVenue],
  games: [{ game_id: 'game_1', game_status: 'upcoming' }],
  watchParties: [],
  fanCounts: [],
  venueHistoryCounts: [],
  generatedAt: '2026-07-29T05:00:00.000Z'
}, 'harness');
appState.gameId = 'game_1';
appState.fanIntent.browserId = 'browser_1234567890abcdef';
appState.map = {
  getStyle() {
    return {
      sources: {
        base: {
          url: 'https://api.maptiler.com/maps/test/style.json?key=existing-browser-key'
        }
      }
    };
  },
  easeTo() {}
};

let renderCount = 0;
let backendCallCount = 0;
let receivedWrite = null;
window.CGBApp = Object.freeze({
  render() { renderCount += 1; },
  showStatus() {}
});
window.matchMedia = window.matchMedia || (() => ({ matches: false }));

window.fetch = async (url, options = {}) => {
  const parsed = new URL(String(url));
  if (parsed.hostname === 'api.maptiler.com') {
    return new Response(JSON.stringify({
      features: [{
        id: 'poi.98765',
        type: 'Feature',
        place_type: ['poi'],
        text: "McNally's Irish Pub",
        place_name: "McNally's Irish Pub, 5352 College Ave, Oakland, California 94618, United States",
        center: [-122.252, 37.839],
        context: [
          { id: 'place.oakland', text: 'Oakland' },
          { id: 'region.california', text: 'California', short_code: 'US-CA' },
          { id: 'postcode.94618', text: '94618' },
          { id: 'country.us', text: 'United States', short_code: 'us' }
        ]
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (parsed.hostname === 'mock.cgb.invalid') {
    backendCallCount += 1;
    receivedWrite = JSON.parse(options.body);
    return new Response(JSON.stringify({
      ok: true,
      action: 'joinExternalVenue',
      schemaVersion: '2.0',
      venue: canonicalExternalVenue,
      selection: {
        game_id: 'game_1',
        venue_id: canonicalExternalVenue.venue_id,
        status: 'attending'
      },
      fanCounts: [{
        game_id: 'game_1',
        venue_id: canonicalExternalVenue.venue_id,
        count: 1
      }],
      venueHistoryCounts: [{
        venue_id: canonicalExternalVenue.venue_id,
        past_game_count: 0
      }],
      generatedAt: '2026-07-29T05:01:00.000Z'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  throw new Error(`Unexpected harness request: ${url}`);
};

try {
  markApplicationReady();
  await import('../../js/external-venue-search.js');

  searchInput.value = 'McNally Oakland';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));

  await waitFor(
    () => suggestions.querySelector('.external-place-result'),
    'External result did not render'
  );

  assert(suggestions.querySelector('.search-result-group--existing'), 'Existing CGB group missing');
  assert(suggestions.querySelector('.search-result-group--external'), 'External MapTiler group missing');
  assert(appState.snapshot.venues.length === 1, 'Search created a Venue before confirmation');
  assert(backendCallCount === 0, 'Search called the write backend');

  suggestions.querySelector('.external-place-result').click();
  assert(dialog.open, 'External confirmation dialog did not open');
  assert(appState.snapshot.venues.length === 1, 'Selecting an external result created a Venue');
  assert(document.querySelector('#external-venue-name').textContent === "McNally's Irish Pub", 'Venue verification name missing');
  assert(document.querySelector('#external-venue-address').textContent.includes('5352 College Ave'), 'Venue verification address missing');

  confirmButton.click();
  await waitFor(
    () => appState.snapshot.venues.some((venue) => venue.venue_id === canonicalExternalVenue.venue_id),
    'Canonical Venue was not added after successful write'
  );

  assert(backendCallCount === 1, 'Combined write was not sent exactly once');
  assert(receivedWrite.action === 'joinExternalVenue', 'Wrong write action');
  assert(receivedWrite.gameId === 'game_1', 'Selected game was not preserved');
  assert(receivedWrite.externalPlace.placeId === 'poi.98765', 'Provider place ID was not preserved');
  assert(appState.selectedVenueId === canonicalExternalVenue.venue_id, 'Canonical Venue was not selected');
  assert(appState.fanIntent.selections.game_1 === canonicalExternalVenue.venue_id, 'Fan Intent selection was not persisted');
  assert(appState.snapshot.fanCounts[0].count === 1, 'Authoritative count was not applied');
  assert(renderCount > 0, 'Shared render path was not invoked');
  assert(!dialog.open, 'Confirmation dialog remained open after success');

  document.documentElement.dataset.harness = 'pass';
  result.textContent = 'M4B_BROWSER_HARNESS_PASS';
} catch (error) {
  document.documentElement.dataset.harness = 'fail';
  result.textContent = `M4B_BROWSER_HARNESS_FAIL: ${error.message}`;
  console.error(error);
}
