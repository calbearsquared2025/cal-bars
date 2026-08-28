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
  check((element('#mobile-add-button span:last-child')?.textContent || '').trim() === 'Add', 'Mobile contribution command should remain labeled Add');
  check((element('#add-surface-title')?.textContent || '').trim() === 'Add to the map', 'Mobile Add surface title should remain unchanged');
  check((element('#add-somewhere-else-title')?.textContent || '').trim() === 'Add somewhere else', 'Mobile new-location section copy should remain unchanged');
  check(element('#add-watch-party-button')?.closest('.add-context') === element('#add-surface .add-context'), 'Mobile contribution actions should remain nested in selected-place context');

  element('#mobile-list-button')?.click();
  await waitFor(() => visible('#tray-list'), 'mobile location list');
  check(visible('.mobile-command-bar'), 'Mobile navigation should remain visible on List');
  check(!element('#list-add-location-button'), 'List-specific Add location control should not exist');
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
  if (!input || !helper || !form) {
    failures.push('Desktop search input and shared add-location action should render');
    return;
  }

  await sleep();
  check(helper.hidden || !rendered(helper), 'Desktop Add location action should stay hidden before typing');
  check(form.contains(helper), 'Desktop shared Add location action should remain owned by the search form');

  input.focus();
  await sleep();
  check(helper.hidden || !rendered(helper), 'Focusing an empty desktop search should not reveal Add location');

  input.value = 'Synthetic';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => form.contains(helper) && rendered(helper), 'desktop add-location helper after typing');
  check(helper.textContent.includes('Search for another location.'), 'Desktop typed search should use the contextual add-location helper');

  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => helper.hidden || !rendered(helper), 'desktop add-location helper hidden after clearing search');
  input.blur();
}

async function validateDesktopContributionWithoutSelection() {
  const add = element('#mobile-add-button');
  check(Boolean(add), 'Desktop Add to CGB should exist before a venue is selected');
  if (!add) return;

  add.click();
  await waitFor(() => visible('#add-surface'), 'desktop contribution surface without selection');
  check(!visible('#add-surface .add-context'), 'Desktop selected-place context should stay hidden without a selected venue');
  check(visible('#add-watch-party-button'), 'Desktop should still expose Add a Watch Party without a selected venue');
  check(visible('#add-cal-bar-button'), 'Desktop should still expose location contribution without a selected venue');
  check(visible('#add-report-button'), 'Desktop should still expose reporting without a selected venue');
  check(!element('#add-watch-party-button')?.closest('.add-context'), 'Desktop contribution actions should sit outside selected-place context');
  check((element('#add-surface > .command-surface__shell > .command-surface__intro')?.textContent || '').trim() === 'Choose what you’d like to contribute.', 'Desktop contribution intro should be concise');
  check((element('#add-somewhere-else-title')?.textContent || '').trim() === 'New location', 'Desktop new-location section should use a concise label');
  check(!visible('#add-surface .add-somewhere-else > .command-surface__intro'), 'Desktop new-location section should not repeat explanatory copy above the action');
  check((element('#add-new-location-button strong')?.textContent || '').trim() === 'Add a new location', 'Desktop new-location action should use direct copy');

  element('#add-surface [data-command-close]')?.click();
  await waitFor(() => !visible('#add-surface'), 'desktop contribution surface close');
}

async function validateDesktopContributionEntry() {
  const add = element('#mobile-add-button');
  const locations = element('#mobile-list-button');
  const selected = element('#mobile-map-button');
  const toggle = element('#list-location-toggle');
  check(Boolean(add) && Boolean(locations) && Boolean(selected) && Boolean(toggle), 'Desktop rail controls and location-range toggle should exist');
  if (!add || !locations || !selected || !toggle) return;

  check(rendered(add), 'Desktop rail should expose Add to CGB');
  check(!element('#list-add-location-button'), 'Desktop list should not create a separate Add location control');
  check((add.querySelector('span:last-child')?.textContent || '').trim() === 'Add to CGB', 'Desktop contribution action should be labeled Add to CGB');
  check(add.getAttribute('aria-label') === 'Add to Cal Golden Bars', 'Desktop contribution action should have an explicit accessible label');

  const addRect = add.getBoundingClientRect();
  const selectedRect = selected.getBoundingClientRect();
  const locationsRect = locations.getBoundingClientRect();
  check(addRect.height <= 35, 'Desktop Add to CGB should remain subordinate to the main view toggle');
  check(locationsRect.height >= 39 && selectedRect.height >= 39, 'Locations and Selected should retain the larger joined-toggle treatment');
  check(addRect.left - selectedRect.right >= 8, 'Desktop Add to CGB should be visually separated from Locations and Selected');

  const selectedVenueId = state()?.selectedVenueId || '';
  const selectedVenueName = state()?.snapshot?.venues?.find((venue) => venue.venue_id === selectedVenueId)?.name || '';
  add.click();
  await waitFor(() => visible('#add-surface'), 'desktop Add to CGB surface');
  check((element('#add-surface-title')?.textContent || '').trim() === 'Add to Cal Golden Bars', 'Desktop contribution surface should explain the global Add action');
  check((element('#add-surface > .command-surface__shell > .command-surface__intro')?.textContent || '').trim() === 'Choose what you’d like to contribute.', 'Desktop contribution surface should use concise introductory copy');
  check(visible('#add-surface .add-context'), 'Selected venue context should remain available when opening desktop Add');
  check(visible('#add-watch-party-button') && visible('#add-cal-bar-button') && visible('#add-report-button'), 'Desktop contribution actions should remain visible with selected context');
  check(!element('#add-watch-party-button')?.closest('.add-context'), 'Selected-place context should not own or hide the desktop action list');
  if (selectedVenueName) {
    check((element('#add-context-name')?.textContent || '').trim() === selectedVenueName, 'Desktop Add should preserve the selected venue context');
  }
  check(!(element('#add-context-copy')?.textContent || '').includes('Available actions'), 'Desktop selected-place context should avoid explanatory repetition');
  check(state()?.searchMode === 'existing', 'Desktop Add to CGB should open the shared contribution surface rather than forcing Add-location search');
}

async function runDesktop() {
  await ready(true);
  check(visible('#map-view') && visible('#map'), 'Desktop map surface should render');
  check(visible('#tray-list'), 'Desktop venue list should render');
  await validateDesktopSearchHelper();
  await validateDesktopContributionWithoutSelection();
  await selectFirstVenue();
  await validateDesktopContributionEntry();
  finish('CGB_SMOKE_DESKTOP');
}

try {
  if (mode === 'desktop') await runDesktop();
  else await runMobile();
} catch (error) {
  failures.push(error?.stack || error?.message || String(error));
  finish(mode === 'desktop' ? 'CGB_SMOKE_DESKTOP' : 'CGB_SMOKE_MOBILE');
}
