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

async function waitFor(predicate, label, timeout = 3000) {
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

function dispatchInput(value) {
  const input = element('#location-query');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
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

  dispatchInput('Dis');
  await sleep(700);
  check(mapTilerRequests().length === 0, 'Queries shorter than four characters should not call MapTiler');

  dispatchInput('Dist');
  await sleep(100);
  dispatchInput('District');
  await sleep(100);
  dispatchInput('District 4');
  await sleep(100);
  dispatchInput('District 4 Pizza');
  await sleep(700);
  check(mapTilerRequests().length === 1, 'A normal paused autocomplete search should make one MapTiler request');
  check(mapTilerRequests()[0]?.autocomplete === 'true', 'Paused external search should use autocomplete');

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await sleep(100);
  check(mapTilerRequests().length === 1, 'Submitting an exact query with a strong autocomplete result should not make another request');

  dispatchInput('Weak Venue Long Beach');
  await sleep(700);
  const beforeFinalized = mapTilerRequests().length;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await sleep(100);
  const afterFinalized = mapTilerRequests().length;
  check(afterFinalized - beforeFinalized === 1, 'A submit that needs finalized search should make exactly one request');
  const finalizedRequest = mapTilerRequests()[afterFinalized - 1];
  check(finalizedRequest?.query === 'Weak Venue Long Beach', 'Finalized search should use the complete submitted query');
  check(finalizedRequest?.autocomplete === 'false', 'Finalized search should disable autocomplete');

  dispatchInput('Cache Test Venue');
  await sleep(700);
  const beforeCacheReuse = mapTilerRequests().length;
  dispatchInput('  CACHE   TEST VENUE  ');
  await sleep(700);
  check(mapTilerRequests().length === beforeCacheReuse, 'Normalized repeated searches should reuse the in-memory session cache');

  dispatchInput('Geo Strong Venue');
  await sleep(700);
  const beforeGeolocation = mapTilerRequests().length;
  check(typeof geolocationSuccess === 'function', 'External search should request geolocation once for proximity');
  geolocationSuccess?.({ coords: { latitude: 33.7765, longitude: -118.1258 } });
  await sleep(150);
  check(mapTilerRequests().length === beforeGeolocation, 'Geolocation arrival should not rerun an already-strong completed search');
}

finish();
