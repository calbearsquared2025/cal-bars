const result = document.querySelector('#cgb-smoke-result');
const failures = [];
const mode = new URLSearchParams(location.search).get('__cgb_smoke') || 'mobile';

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

function sleep(ms = 20) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, label, timeout = 2500) {
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

function finish(marker) {
  if (!result) return;
  result.textContent = failures.length
    ? `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : `${marker}_PASS`;
}

async function ready(desktop) {
  await waitFor(() =>
    document.readyState === 'complete' &&
    element('#app')?.getAttribute('aria-busy') === 'false' &&
    Boolean(state()?.snapshot) &&
    (state()?.snapshot?.venues?.length || 0) > 0 &&
    window.matchMedia('(max-width: 899px)').matches === !desktop,
  desktop ? 'desktop app' : 'mobile app');
}

function firstVenueCard() {
  return element('#location-list .location-card[data-venue-id]');
}

async function selectFirstVenue() {
  const card = firstVenueCard();
  check(Boolean(card), 'At least one venue should render in the location list');
  if (!card) return;
  const venueId = card.dataset.venueId;
  card.click();
  await waitFor(() => state()?.selectedVenueId === venueId && visible('#tray-selected'), 'selected venue profile');
  check((element('#tray-selected')?.textContent || '').trim().length > 0, 'Selected venue profile should contain venue content');
}

async function runMobile() {
  await ready(false);
  check(visible('#map-view') && visible('#map'), 'Mobile map surface should render');

  element('#mobile-list-button')?.click();
  await waitFor(() => visible('#tray-list'), 'mobile location list');
  await selectFirstVenue();

  element('#mobile-map-button')?.click();
  await waitFor(() => document.body.dataset.commandSurface === 'map' && visible('#map-view'), 'mobile map navigation');
  check(visible('#map-view'), 'Mobile navigation should return to the map');
  finish('CGB_SMOKE_MOBILE');
}

async function runDesktop() {
  await ready(true);
  check(visible('#map-view') && visible('#map'), 'Desktop map surface should render');
  check(visible('#tray-list'), 'Desktop venue list should render');
  await selectFirstVenue();
  finish('CGB_SMOKE_DESKTOP');
}

try {
  if (mode === 'desktop') await runDesktop();
  else await runMobile();
} catch (error) {
  failures.push(error?.stack || error?.message || String(error));
  finish(mode === 'desktop' ? 'CGB_SMOKE_DESKTOP' : 'CGB_SMOKE_MOBILE');
}
