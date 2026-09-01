const result = document.querySelector('#cgb-smoke-result');
const failures = [];
const mode = new URLSearchParams(location.search).get('__cgb_smoke') || 'manual-mobile-address';

function check(condition, message) {
  if (!condition) failures.push(message);
}

function element(selector) {
  return document.querySelector(selector);
}

function state() {
  return window.CGBApp?.getState?.() || null;
}

function visible(target) {
  const node = typeof target === 'string' ? element(target) : target;
  if (!node || node.hidden) return false;
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
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

async function waitUntil(predicate, timeout = 1200) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    try {
      if (predicate()) return true;
    } catch (_) {}
    await sleep();
  }
  return false;
}

function finish(marker) {
  if (!result) return;
  result.textContent = failures.length
    ? `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : `${marker}_PASS`;
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

function fallbackButton() {
  const button = element('.search-result-group--external .missing-location-link');
  return visible(button) && button.textContent.trim() === 'Can’t find it? Add this place' ? button : null;
}

async function openManualFallback() {
  const input = element('#location-query');
  const current = state();
  check(Boolean(input) && Boolean(current), 'Search input and app state should exist');
  if (!input || !current) return false;

  if (window.matchMedia('(max-width: 899px)').matches) {
    element('#mobile-search-button')?.click();
    await waitFor(() => visible('#search-surface'), 'mobile search surface');
  }

  current.searchMode = 'add-location';
  current.nearbyOrigin = { lat: 33.7765, lon: -118.1258, label: 'your location' };
  current.origin = null;
  document.body.dataset.searchMode = 'add-location';
  input.value = 'District 4 Pizza';
  window.CGBExternalVenueSearch.searchCurrentQuery({ immediate: true, finalized: true });

  let foundFallback = await waitUntil(() => Boolean(fallbackButton()));
  if (!foundFallback) {
    current.searchMode = 'add-location';
    document.body.dataset.searchMode = 'add-location';
    window.CGBExternalVenueSearch.searchCurrentQuery({ immediate: true, finalized: true });
    foundFallback = await waitUntil(() => Boolean(fallbackButton()), 1800);
  }
  if (!foundFallback) failures.push('Timed out waiting for in-app Add this place fallback');

  const fallback = fallbackButton();
  check(Boolean(fallback), 'Missing external venue should expose Add this place');
  fallback?.click();
  await waitFor(() => element('#external-venue-dialog')?.open && visible('.external-venue-manual'), 'manual add-place dialog');

  check((element('#manual-venue-name')?.value || '').trim() === 'District 4 Pizza', 'Manual flow should preserve the searched venue name');
  check(visible('#manual-venue-name'), 'Venue name should remain editable');
  check(visible('.external-venue-manual .primary-button'), 'I’m here now should be visible');
  check([...document.querySelectorAll('.external-venue-manual .secondary-button')].some((button) => button.textContent.trim() === 'Enter address'), 'Enter address should be visible');
  return true;
}

async function confirmResolvedAddress() {
  await waitFor(() => !visible('.external-venue-manual') && visible('#external-venue-name'), 'resolved place confirmation');
  check((element('#external-venue-name')?.textContent || '').trim() === 'District 4 Pizza', 'Resolved confirmation should keep the user-entered venue name');
  check((element('#external-venue-address')?.textContent || '').includes('2123 N Bellflower Blvd'), 'Resolved confirmation should show the MapTiler address');
  check((element('#external-venue-confirm')?.textContent || '').trim() === 'I’ll be here', 'Resolved confirmation should use the existing I’ll be here action');
}

function verticalGap(upper, lower) {
  if (!upper || !lower) return Number.NEGATIVE_INFINITY;
  return lower.getBoundingClientRect().top - upper.getBoundingClientRect().bottom;
}

function checkManualAddressLayout() {
  const name = element('#manual-venue-name');
  const choices = element('.external-venue-manual > .external-venue-actions');
  const address = element('#manual-venue-address');
  const addressForm = address?.closest('form');
  const submit = addressForm?.querySelector('button[type="submit"]');
  const cancel = [...document.querySelectorAll('.external-venue-manual > .secondary-button')]
    .find((button) => button.textContent.trim() === 'Cancel');

  check(visible(name) && visible(choices) && visible(address) && visible(submit) && visible(cancel), 'Manual address layout controls should all be visible');
  check(verticalGap(name, choices) >= 6, 'Mode selector should follow venue name without overlap');
  check(verticalGap(choices, address) >= 6, 'Street address should follow mode selector without overlap');
  check(verticalGap(address, submit) >= 6, 'Use this address should follow the street-address field without overlap');
  check(verticalGap(submit, cancel) >= 6, 'Cancel should follow the address CTA without overlap');
  if (address && submit && addressForm) {
    const formWidth = addressForm.getBoundingClientRect().width;
    check(Math.abs(address.getBoundingClientRect().width - formWidth) <= 2, 'Street address should use the full manual form width');
    check(Math.abs(submit.getBoundingClientRect().width - formWidth) <= 2, 'Use this address should use the full manual form width');
  }
}

async function runKnownLocation() {
  await openManualFallback();
  let geolocationCalls = 0;
  const installed = installGeolocation(() => { geolocationCalls += 1; });
  check(installed, 'Browser harness should be able to install a geolocation spy');

  element('.external-venue-manual .primary-button')?.click();
  await confirmResolvedAddress();
  check(geolocationCalls === 0, 'I’m here now should reuse an already-known user location without requesting geolocation again');

  element('#external-venue-confirm')?.click();
  await waitFor(() => state()?.selectedVenueId === 'venue_manual_browser_test', 'manual Community Location creation');
  const venue = state()?.snapshot?.venues?.find((item) => item.venue_id === 'venue_manual_browser_test');
  check(venue?.name === 'District 4 Pizza', 'Canonical Community Location should retain the user-entered venue name');
  check(state()?.fanIntent?.selections?.[state()?.gameId] === 'venue_manual_browser_test', 'I’ll be here should persist Fan Intent for the created location');
}

async function runAddressEntry({ desktop = false } = {}) {
  await openManualFallback();
  [...document.querySelectorAll('.external-venue-manual .secondary-button')]
    .find((button) => button.textContent.trim() === 'Enter address')?.click();
  await waitFor(() => visible('#manual-venue-address'), 'manual address entry');
  checkManualAddressLayout();
  element('#manual-venue-address').value = '2123 N Bellflower Blvd, Long Beach, CA 90815';
  element('#manual-venue-address').closest('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await confirmResolvedAddress();

  const dialog = element('#external-venue-dialog');
  if (desktop && dialog) {
    const rect = dialog.getBoundingClientRect();
    check(rect.width <= 562, 'Desktop confirmation dialog should retain the compact centered width');
    check(rect.top > 0 && rect.bottom < innerHeight + 1, 'Desktop confirmation dialog should remain within the viewport');
  }
}

async function runDeniedAndInvalid() {
  await openManualFallback();
  state().nearbyOrigin = null;
  state().origin = null;
  const installed = installGeolocation((_success, failure) => failure?.({ code: 1, message: 'permission denied' }));
  check(installed, 'Browser harness should be able to simulate denied geolocation');

  element('.external-venue-manual .primary-button')?.click();
  await waitFor(() => visible('#manual-venue-address') && visible('.external-venue-manual .external-venue-error'), 'permission-denied address fallback');
  check((element('.external-venue-manual .external-venue-error')?.textContent || '').includes('Location access was denied'), 'Permission denial should explain that address entry remains available');

  element('#manual-venue-address').value = 'No Such Address';
  element('#manual-venue-address').closest('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => (element('.external-venue-manual .external-venue-error')?.textContent || '').includes('Couldn’t resolve that address'), 'invalid address error');
  check(visible('#manual-venue-address'), 'Invalid address should keep the address field available for correction');
}

await ready();

if (mode === 'manual-mobile-here') {
  await runKnownLocation();
  finish('CGB_MANUAL_MOBILE_HERE');
} else if (mode === 'manual-mobile-denied') {
  await runDeniedAndInvalid();
  finish('CGB_MANUAL_MOBILE_DENIED');
} else if (mode === 'manual-desktop-address') {
  await runAddressEntry({ desktop: true });
  finish('CGB_MANUAL_DESKTOP_ADDRESS');
} else {
  await runAddressEntry();
  const dialog = element('#external-venue-dialog');
  if (dialog) {
    const rect = dialog.getBoundingClientRect();
    check(Math.abs(rect.bottom - innerHeight) <= 2, 'Mobile confirmation should remain a bottom sheet');
  }
  finish('CGB_MANUAL_MOBILE_ADDRESS');
}
