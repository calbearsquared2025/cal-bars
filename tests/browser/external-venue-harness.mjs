import {
  appState,
  markApplicationReady,
  setCanonicalSnapshot
} from '../../js/app-state.mjs';

const result = document.querySelector('#harness-result');
const searchForm = document.querySelector('#location-search');
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

function feature({
  id = 'poi.98765',
  name = "McNally's Irish Pub",
  address = '5352 College Ave',
  city = 'Oakland',
  region = 'California',
  postalCode = '94618',
  longitude = -122.252,
  latitude = 37.839
} = {}) {
  return {
    id,
    type: 'Feature',
    place_type: ['poi'],
    text: name,
    place_name: `${name}, ${address}, ${city}, ${region} ${postalCode}, United States`,
    center: [longitude, latitude],
    context: [
      { id: `place.${city.toLowerCase()}`, text: city },
      { id: `region.${region.toLowerCase()}`, text: region, country_code: 'us' },
      { id: `postcode.${postalCode}`, text: postalCode },
      { id: 'country.us', text: 'United States', short_code: 'us' }
    ]
  };
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

const secondExistingVenue = {
  ...existingVenue,
  venue_id: 'ven_existing_two',
  slug: 'second-existing-cgb-pub',
  name: 'Second Existing CGB Pub',
  address_line_1: '2 Broadway',
  latitude: 37.81,
  longitude: -122.26
};

const canonicalExternalVenue = {
  venue_id: 'venue_created_1',
  slug: 'mcnally-s-irish-pub-oakland',
  name: "McNally's Irish Pub",
  address_line_1: '5352 College Ave',
  address_line_2: '',
  city: 'Oakland',
  region: 'CA',
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

const canonicalSecondVenue = {
  ...canonicalExternalVenue,
  venue_id: 'venue_created_2',
  slug: 'second-external-pub-berkeley',
  name: 'Second External Pub',
  address_line_1: '900 Second St',
  city: 'Berkeley',
  postal_code: '94710',
  latitude: 37.87,
  longitude: -122.3,
  updated_at: '2026-07-29T05:02:00.000Z'
};

const canonicalThirdVenue = {
  ...canonicalExternalVenue,
  venue_id: 'venue_created_3',
  slug: 'third-external-pub-richmond',
  name: 'Third External Pub',
  address_line_1: '300 Third St',
  city: 'Richmond',
  postal_code: '94801',
  latitude: 37.9358,
  longitude: -122.3477,
  updated_at: '2026-07-29T05:03:00.000Z'
};

const canonicalFourthVenue = {
  ...canonicalExternalVenue,
  venue_id: 'venue_created_4',
  slug: 'fourth-external-pub-alameda',
  name: 'Fourth External Pub',
  address_line_1: '400 Fourth St',
  city: 'Alameda',
  postal_code: '94501',
  latitude: 37.7652,
  longitude: -122.2416,
  updated_at: '2026-07-29T05:04:00.000Z'
};

const initialVenueCount = 2;
setCanonicalSnapshot({
  schemaVersion: '2.0',
  venues: [existingVenue, secondExistingVenue],
  games: [{
    game_id: 'game_1',
    game_status: 'upcoming',
    game_date: '2026-09-05',
    opponent_name: 'UCLA',
    home_away: 'home'
  }],
  watchParties: [],
  fanCounts: [],
  venueHistoryCounts: [],
  generatedAt: '2026-07-29T05:00:00.000Z'
}, 'harness');
appState.gameId = 'game_1';
appState.fanIntent.browserId = 'browser_1234567890abcdef';

let throwPostSuccessRender = false;
appState.map = { easeTo() {} };

let renderCount = 0;
let backendCallCount = 0;
let mapTilerCallCount = 0;
let receivedWrite = null;
const receivedWrites = [];
let lastStatus = '';
let focusedLocation = null;
const appListeners = new Map();
window.CGBApp = Object.freeze({
  mapTilerKey: 'existing-browser-key',
  getState() { return appState; },
  subscribe(name, listener) {
    const listeners = appListeners.get(name) || new Set();
    listeners.add(listener);
    appListeners.set(name, listeners);
    return () => listeners.delete(listener);
  },
  render() {
    renderCount += 1;
    if (throwPostSuccessRender && backendCallCount >= 2) throw new Error('mock_post_success_render_failed');
    (appListeners.get('rendered') || []).forEach((listener) => listener());
  },
  focusLocation(origin) { focusedLocation = origin; },
  showStatus(message) { lastStatus = message; }
});
window.matchMedia = window.matchMedia || (() => ({ matches: false }));

const openedFormWindows = [];
window.open = () => {
  const opened = {
    opener: window,
    closed: false,
    document: { title: '', body: { textContent: '' } },
    location: { href: '' },
    close() { this.closed = true; }
  };
  openedFormWindows.push(opened);
  return opened;
};

let delayedSearchResolve = null;
window.fetch = async (url, options = {}) => {
  const parsed = new URL(String(url));
  if (parsed.hostname === 'api.maptiler.com') {
    mapTilerCallCount += 1;
    const query = decodeURIComponent(parsed.pathname);
    if (query.includes('Delayed Existing')) {
      return new Promise((resolve) => {
        delayedSearchResolve = () => resolve(new Response(JSON.stringify({
          features: [feature({ id: 'poi.delayed', name: 'Delayed External Pub' })]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      });
    }
    const selectedFeature = query.includes('Second Berkeley')
      ? feature({
          id: 'poi.22222',
          name: 'Second External Pub',
          address: '900 Second St',
          city: 'Berkeley',
          postalCode: '94710',
          longitude: -122.3,
          latitude: 37.87
        })
      : query.includes('Third Richmond')
        ? feature({
            id: 'poi.33333',
            name: 'Third External Pub',
            address: '300 Third St',
            city: 'Richmond',
            postalCode: '94801',
            longitude: -122.3477,
            latitude: 37.9358
          })
        : query.includes('Fourth Alameda')
          ? feature({
              id: 'poi.44444',
              name: 'Fourth External Pub',
              address: '400 Fourth St',
              city: 'Alameda',
              postalCode: '94501',
              longitude: -122.2416,
              latitude: 37.7652
            })
      : feature();
    return new Response(JSON.stringify({ features: [selectedFeature] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (parsed.hostname === 'mock.cgb.invalid') {
    backendCallCount += 1;
    receivedWrite = JSON.parse(options.body);
    receivedWrites.push(receivedWrite);
    const venuesByPlaceId = {
      'poi.22222': canonicalSecondVenue,
      'poi.33333': canonicalThirdVenue,
      'poi.44444': canonicalFourthVenue
    };
    const venue = venuesByPlaceId[receivedWrite.externalPlace.placeId] || canonicalExternalVenue;
    const payload = receivedWrite.action === 'addExternalVenue'
      ? {
          ok: true,
          action: 'addExternalVenue',
          schemaVersion: '2.0',
          venue,
          generatedAt: '2026-07-29T05:04:00.000Z'
        }
      : {
          ok: true,
          action: 'joinExternalVenue',
          schemaVersion: '2.0',
          venue,
          selection: {
            game_id: 'game_1',
            venue_id: venue.venue_id,
            status: 'attending'
          },
          fanCounts: [{
            game_id: 'game_1',
            venue_id: venue.venue_id,
            count: 1
          }],
          venueHistoryCounts: [{
            venue_id: venue.venue_id,
            past_game_count: 0
          }],
          generatedAt: '2026-07-29T05:04:00.000Z'
        };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  throw new Error(`Unexpected harness request: ${url}`);
};

try {
  markApplicationReady();
  await import('../../js/external-venue-search.js');
  await wait(0);
  await import('../../js/external-watch-party-cta.js');
  await wait(0);

  assert(
    [...document.querySelectorAll('#external-venue-dialog button')]
      .map((button) => button.textContent.trim())
      .join('|') === 'I’ll be here|Add location only|Add a Watch Party|Cancel',
    'External confirmation actions did not initialize in the required order'
  );

  searchInput.value = '94612';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(25);
  assert(appState.listQuery === '94612', 'Exact mapped ZIP did not become the canonical list query');
  assert(appState.origin === null, 'Exact mapped ZIP incorrectly used an external geocode origin');
  assert(appState.trayState === 'full', 'Exact mapped ZIP did not open the location list');
  assert(mapTilerCallCount === 0, 'Exact mapped ZIP unnecessarily called MapTiler');
  assert(/2 mapped locations match 94612/.test(lastStatus), 'Exact mapped ZIP did not report mapped matches');
  appState.listQuery = '';
  appState.searchMode = 'add-location';

  searchInput.value = 'Delayed Existing';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => delayedSearchResolve, 'Delayed external request did not start');
  appState.searchMode = 'existing';
  searchForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  delayedSearchResolve();
  await wait(50);
  assert(!suggestions.querySelector('.external-place-result'), 'Stale external results reopened after search submit');
  assert(!suggestions.querySelector('.search-result-group--external'), 'Stale external group remained after search submit');
  appState.searchMode = 'add-location';

  searchInput.value = 'McNally Oakland';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));

  await waitFor(
    () => suggestions.querySelector('.external-place-result'),
    'External result did not render'
  );

  assert(suggestions.querySelector('.search-result-group--existing'), 'Existing CGB group missing');
  assert(suggestions.querySelector('.search-result-group--external'), 'External MapTiler group missing');
  assert(appState.snapshot.venues.length === initialVenueCount, 'Search created a Venue before confirmation');
  assert(backendCallCount === 0, 'Search called the write backend');

  suggestions.querySelector('.external-place-result').click();
  assert(dialog.open, 'External confirmation dialog did not open');
  assert(appState.snapshot.venues.length === initialVenueCount, 'Selecting an external result created a Venue');
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
  assert(receivedWrite.externalPlace.source === 'maptiler', 'External provider source was not preserved');
  assert(receivedWrite.externalPlace.placeId === 'poi.98765', 'Provider place ID was not preserved');
  assert(Object.keys(receivedWrite.externalPlace).sort().join(',') === 'placeId,source', 'Browser sent non-authoritative venue metadata');
  assert(appState.selectedVenueId === canonicalExternalVenue.venue_id, 'Canonical Venue was not selected');
  assert(appState.fanIntent.selections.game_1 === canonicalExternalVenue.venue_id, 'Fan Intent selection was not persisted');
  assert(appState.snapshot.fanCounts[0].count === 1, 'Authoritative count was not applied');
  assert(renderCount > 0, 'Shared render path was not invoked');
  assert(!dialog.open, 'Confirmation dialog remained open after success');
  await waitFor(() => focusedLocation, 'Shared Locate me focus path was not invoked');
  assert(focusedLocation.lon === canonicalExternalVenue.longitude, 'Created Venue longitude was not focused');
  assert(focusedLocation.lat === canonicalExternalVenue.latitude, 'Created Venue latitude was not focused');

  throwPostSuccessRender = true;
  searchInput.value = 'Second Berkeley';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(
    () => suggestions.querySelector('[data-external-place-id="poi.22222"]'),
    'Second external result did not render'
  );
  suggestions.querySelector('[data-external-place-id="poi.22222"]').click();
  document.querySelector('#external-venue-add-only').click();
  await waitFor(
    () => appState.selectedVenueId === canonicalSecondVenue.venue_id,
    'Add location only did not commit the canonical Venue'
  );
  throwPostSuccessRender = false;
  assert(backendCallCount === 2, 'Add-only write was not sent exactly once');
  assert(receivedWrite.action === 'addExternalVenue', 'Add location only used the attendance write path');
  assert(!Object.hasOwn(receivedWrite, 'browserId'), 'Add location only sent browser identity');
  assert(appState.fanIntent.selections.game_1 === canonicalExternalVenue.venue_id, 'Add location only moved existing attendance');
  assert(!dialog.open, 'Confirmation remained open after add-only success');

  searchInput.value = 'Third Richmond';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(
    () => suggestions.querySelector('[data-external-place-id="poi.33333"]'),
    'Attending Watch Party external result did not render'
  );
  suggestions.querySelector('[data-external-place-id="poi.33333"]').click();
  document.querySelector('#external-venue-plan-watch-party').click();
  await waitFor(
    () => document.querySelector('[data-watch-party-attendance-choice="attend"]'),
    'Watch Party attendance choice did not open'
  );
  document.querySelector('[data-watch-party-attendance-choice="attend"]').click();
  await waitFor(
    () => openedFormWindows[0]?.location.href,
    'Attending Watch Party Form did not open after the write'
  );
  assert(receivedWrites[2].action === 'joinExternalVenue', 'Attending Watch Party used the no-attendance path');
  assert(appState.selectedVenueId === canonicalThirdVenue.venue_id, 'Attending Watch Party did not create/select its Venue');
  assert(appState.fanIntent.selections.game_1 === canonicalThirdVenue.venue_id, 'Attending Watch Party did not save attendance');
  assert(new URL(openedFormWindows[0].location.href).searchParams.get('entry.100') === canonicalThirdVenue.venue_id, 'Attending Watch Party Form omitted the canonical Venue');

  searchInput.value = 'Fourth Alameda';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(
    () => suggestions.querySelector('[data-external-place-id="poi.44444"]'),
    'Sharing Watch Party external result did not render'
  );
  suggestions.querySelector('[data-external-place-id="poi.44444"]').click();
  document.querySelector('#external-venue-plan-watch-party').click();
  await waitFor(
    () => document.querySelector('[data-watch-party-attendance-choice="share"]'),
    'Watch Party sharing choice did not open'
  );
  document.querySelector('[data-watch-party-attendance-choice="share"]').click();
  await waitFor(
    () => openedFormWindows[1]?.location.href,
    'Sharing Watch Party Form did not open after the write'
  );
  assert(receivedWrites[3].action === 'addExternalVenue', 'Sharing Watch Party used the attendance path');
  assert(!Object.hasOwn(receivedWrites[3], 'browserId'), 'Sharing Watch Party sent browser identity');
  assert(appState.selectedVenueId === canonicalFourthVenue.venue_id, 'Sharing Watch Party did not create/select its Venue');
  assert(appState.fanIntent.selections.game_1 === canonicalThirdVenue.venue_id, 'Sharing Watch Party moved attendance');
  assert(new URL(openedFormWindows[1].location.href).searchParams.get('entry.100') === canonicalFourthVenue.venue_id, 'Sharing Watch Party Form omitted the canonical Venue');

  document.documentElement.dataset.harness = 'pass';
  result.textContent = 'M4B_BROWSER_HARNESS_PASS';
} catch (error) {
  document.documentElement.dataset.harness = 'fail';
  result.textContent = `M4B_BROWSER_HARNESS_FAIL: ${error.message}`;
  console.error(error);
}
