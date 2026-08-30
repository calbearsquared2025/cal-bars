const result = document.querySelector('#cgb-smoke-result');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function element(selector) {
  return document.querySelector(selector);
}

function state() {
  return window.CGBApp?.getState?.() || null;
}

function sleep(ms = 25) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, label, timeout = 4000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    try {
      if (predicate()) return true;
    } catch (_) {}
    await sleep();
  }
  failures.push(`Timed out waiting for ${label}`);
  return false;
}

function finish() {
  if (!result) return;
  if (failures.length) {
    const external = state()?.externalSearch;
    failures.push(
      `diagnostic: requests=${mapTilerRequests().length}, mode=${state()?.searchMode || 'none'}, ` +
      `query=${JSON.stringify(external?.query || '')}, error=${JSON.stringify(external?.error || '')}, ` +
      `key=${Boolean(window.CGBApp?.mapTilerKey)}`
    );
  }
  result.textContent = failures.length
    ? `CGB_EXTERNAL_SEARCH_EFFICIENCY_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : 'CGB_EXTERNAL_SEARCH_EFFICIENCY_PASS';
}

function installGeolocation(getCurrentPosition) {
  try {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition }
    });
    return true;
  } catch (_) {
    try {
      navigator.geolocation.getCurrentPosition = getCurrentPosition;
      return true;
    } catch (_) {
      return false;
    }
  }
}

function mapTilerRequests() {
  return Array.isArray(window.__cgbMapTilerRequests) ? window.__cgbMapTilerRequests : [];
}

function scheduleQuery(value, options) {
  const input = element('#location-query');
  input.value = value;
  window.CGBExternalVenueSearch.searchCurrentQuery(options);
}

function externalStatusText() {
  return (element('.search-result-group--external .external-search-status')?.textContent || '').trim();
}

async function ready() {
  await waitFor(() =>
    document.readyState === 'complete' &&
    element('#app')?.getAttribute('aria-busy') === 'false' &&
    Boolean(state()?.snapshot) &&
    Boolean(window.CGBExternalVenueSearch) &&
    Boolean(element('#manual-venue-name')),
  'application and external venue search');
}

await ready();

const current = state();
const form = element('#location-search');
check(Boolean(current) && Boolean(form), 'Search state and form should exist');
if (current && form) {
  current.searchMode = 'add-location';
  current.nearbyOrigin = null;
  current.origin = null;
  document.body.dataset.searchMode = 'add-location';

  let geolocationSuccess = null;
  check(installGeolocation((success) => { geolocationSuccess = success; }), 'Geolocation spy should install');

  scheduleQuery('Dis');
  await sleep(750);
  check(mapTilerRequests().length === 0, 'Queries shorter than four characters should not call MapTiler');

  scheduleQuery('Dist');
  await sleep(100);
  scheduleQuery('District');
  await sleep(100);
  scheduleQuery('District 4');
  await sleep(100);
  scheduleQuery('District 4 Pizza');
  await waitFor(() => mapTilerRequests().length === 1, 'one paused autocomplete request');
  await waitFor(() => state()?.externalSearch?.results?.[0]?.name === 'District 4 Pizza', 'strong autocomplete completion');
  check(mapTilerRequests().length === 1, 'A normal paused autocomplete search should make one MapTiler request');
  check(mapTilerRequests()[0]?.autocomplete === 'true', 'Paused external search should use autocomplete');

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await sleep(250);
  check(mapTilerRequests().length === 1, 'Submitting an exact query with a strong autocomplete result should not make another request');

  const beforeWeakAutocomplete = mapTilerRequests().length;
  scheduleQuery('Weak Venue Long Beach');
  await waitFor(() => mapTilerRequests().length === beforeWeakAutocomplete + 1, 'weak autocomplete request');
  await waitFor(() => state()?.externalSearch?.results?.[0]?.name === 'Pizza Hut', 'weak autocomplete completion');
  const beforeFinalized = mapTilerRequests().length;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => mapTilerRequests().length === beforeFinalized + 1, 'one finalized request');
  await waitFor(() => externalStatusText() === 'No concrete external places found.', 'finalized weak-result completion');
  const afterFinalized = mapTilerRequests().length;
  check(afterFinalized - beforeFinalized === 1, 'A submit that needs finalized search should make exactly one request');
  const finalizedRequest = mapTilerRequests()[afterFinalized - 1];
  check(finalizedRequest?.query === 'Weak Venue Long Beach', 'Finalized search should use the complete submitted query');
  check(finalizedRequest?.autocomplete === 'false', 'Finalized search should disable autocomplete');

  const beforeCachePrime = mapTilerRequests().length;
  scheduleQuery('Cache Test Venue');
  await waitFor(() => mapTilerRequests().length === beforeCachePrime + 1, 'cache-prime autocomplete request');
  await waitFor(() => state()?.externalSearch?.results?.[0]?.name === 'Cache Test Venue', 'cache-prime completion');
  const beforeCacheReuse = mapTilerRequests().length;
  scheduleQuery('  CACHE   TEST VENUE  ');
  await waitFor(() => state()?.externalSearch?.results?.[0]?.name === 'Cache Test Venue', 'cached result reuse');
  await sleep(100);
  check(mapTilerRequests().length === beforeCacheReuse, 'Normalized repeated searches should reuse the in-memory session cache');

  const beforeGeoSearch = mapTilerRequests().length;
  scheduleQuery('Geo Strong Venue');
  await waitFor(() => mapTilerRequests().length === beforeGeoSearch + 1, 'strong pre-geolocation request');
  await waitFor(() => state()?.externalSearch?.results?.[0]?.name === 'Geo Strong Venue', 'strong result completion');
  const beforeGeolocation = mapTilerRequests().length;
  check(typeof geolocationSuccess === 'function', 'External search should request geolocation once for proximity');
  geolocationSuccess?.({ coords: { latitude: 33.7765, longitude: -118.1258 } });
  await sleep(300);
  check(mapTilerRequests().length === beforeGeolocation, 'Geolocation arrival should not rerun an already-strong completed search');
}

finish();
