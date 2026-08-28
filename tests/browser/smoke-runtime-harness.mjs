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

function rendered(target) {
  const node = typeof target === 'string' ? element(target) : target;
  if (!node) return false;
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

function validateMobileNavigationGeometry() {
  const commands = [...document.querySelectorAll('.mobile-command-bar .mobile-command')];
  check(commands.length === 5, 'Mobile navigation should expose five primary commands');
  check(commands.every((command) => visible(command)), 'All five mobile commands should remain visible');
  const widths = commands.map((command) => command.getBoundingClientRect().width);
  check(Math.max(...widths) - Math.min(...widths) <= 1.5, 'Mobile commands should occupy equal-width navigation columns');
}

async function validateLongGameLabel() {
  const label = element('#header-game-label');
  const gameButton = element('#game-button');
  if (!label || !gameButton) {
    failures.push('Game selector should be present for long-label validation');
    return;
  }
  const original = label.textContent;
  label.textContent = 'California Golden Bears vs. Northwestern Wildcats';
  await sleep();
  const style = getComputedStyle(label);
  const buttonRect = gameButton.getBoundingClientRect();
  check(style.whiteSpace === 'nowrap' && style.overflow === 'hidden', 'Long game labels should remain constrained to one clipped line');
  check(buttonRect.left >= -1 && buttonRect.right <= innerWidth + 1, 'Long game labels should not push the game selector outside the viewport');
  label.textContent = original;
}

async function openMobileSurface(buttonSelector, surfaceSelector, surfaceName) {
  element(buttonSelector)?.click();
  await waitFor(() => visible(surfaceSelector), `mobile ${surfaceName} surface`);
  check(visible('.mobile-command-bar'), `Mobile navigation should remain visible on ${surfaceName}`);
}

async function runMobile() {
  await ready(false);
  check(visible('#map-view') && visible('#map'), 'Mobile map surface should render');
  validateMobileNavigationGeometry();
  await validateLongGameLabel();

  await openMobileSurface('#mobile-search-button', '#search-surface', 'Search');
  await openMobileSurface('#mobile-add-button', '#add-surface', 'Add');

  element('#mobile-list-button')?.click();
  await waitFor(() => visible('#tray-list'), 'mobile location list');
  check(visible('.mobile-command-bar'), 'Mobile navigation should remain visible on List');
  element('#mobile-map-button')?.click();
  await waitFor(() =>
    document.body.dataset.commandSurface === 'map' &&
    state()?.trayState !== 'full' &&
    !visible('#tray-list'),
  'direct mobile list to map navigation');
  check(!visible('#tray-list'), 'Mobile Map navigation should not leave the location list visible');

  element('#mobile-list-button')?.click();
  await waitFor(() => visible('#tray-list'), 'mobile location list reopened');
  await selectFirstVenue();

  element('#mobile-map-button')?.click();
  await waitFor(() => document.body.dataset.commandSurface === 'map' && visible('#map-view'), 'mobile map navigation');
  check(visible('#map-view'), 'Mobile navigation should return to the map');
  finish('CGB_SMOKE_MOBILE');
}

async function validateDesktopSearchHelper() {
  const input = element('#location-query');
  const helper = element('#search-add-location-button');
  const form = element('#location-search');
  const header = element('#tray-list .tray-list__header');
  if (!input || !helper || !form || !header) {
    failures.push('Desktop search input and shared add-location action should render');
    return;
  }

  await waitFor(() => helper.parentElement === header && rendered(helper), 'desktop browse add-location action');
  check(helper.textContent.trim() === '+ Add location', 'Desktop browse should expose a concise Add location action');
  check(!form.contains(helper), 'Desktop search should not show its contextual helper before typing');

  input.focus();
  await sleep();
  check(helper.parentElement === header, 'Desktop Add location action should remain with browse controls on focus before typing');

  input.value = 'Synthetic';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => form.contains(helper) && rendered(helper), 'desktop add-location helper after typing');
  check(helper.textContent.includes('Search for another location.'), 'Desktop typed search should use the contextual add-location helper');

  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => helper.parentElement === header && rendered(helper), 'desktop browse add-location action after clearing search');
  input.blur();
}

async function validateDesktopAddLocationEntry() {
  window.CGBApp?.showLocations?.();
  await waitFor(() => visible('#tray-list'), 'desktop location list before Add location');
  const add = element('#search-add-location-button');
  const input = element('#location-query');
  check(Boolean(add) && rendered(add), 'Desktop Add location action should be available from the location browser');
  if (!add || !input) return;

  add.click();
  await waitFor(() => state()?.searchMode === 'add-location', 'desktop Add location search mode');
  check(rendered('#location-search'), 'Desktop Add location should keep the search field visible');
  check(element('#location-search')?.parentElement?.classList.contains('map-toolbar'), 'Desktop Add location should reuse the map toolbar search field');
  check(input.placeholder === 'Venue or address', 'Desktop Add location should use the existing add-location search mode');
}

async function runDesktop() {
  await ready(true);
  check(visible('#map-view') && visible('#map'), 'Desktop map surface should render');
  check(visible('#tray-list'), 'Desktop venue list should render');
  await validateDesktopSearchHelper();
  await selectFirstVenue();
  await validateDesktopAddLocationEntry();
  finish('CGB_SMOKE_DESKTOP');
}

try {
  if (mode === 'desktop') await runDesktop();
  else await runMobile();
} catch (error) {
  failures.push(error?.stack || error?.message || String(error));
  finish(mode === 'desktop' ? 'CGB_SMOKE_DESKTOP' : 'CGB_SMOKE_MOBILE');
}
