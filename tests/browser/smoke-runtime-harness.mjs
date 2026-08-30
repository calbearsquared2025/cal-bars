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
  check(!element('#add-missing-location-link'), 'Obsolete Missing Location Form link should not exist on mobile');

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

  helper.click();
  await waitFor(() => visible('#add-surface') && Boolean(element('#add-surface .desktop-add-search-slot #location-search')), 'desktop contextual add-location search inside Add modal');
  check(visible('#add-surface'), 'Desktop contextual add-location search should stay in the contribution modal');
  check((input.value || '').trim() === 'Synthetic', 'Desktop contextual add-location transition should preserve the typed query');
  check((input.placeholder || '').trim() === 'Venue or address', 'Desktop inline Add search should use venue-or-address copy');
  check(state()?.searchMode === 'add-location', 'Desktop inline Add search should use canonical add-location mode');

  element('#add-surface [data-command-close]')?.click();
  await waitFor(() => !visible('#add-surface'), 'desktop contextual add-location modal close');
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
  await waitFor(() =>
    visible('#add-surface') &&
    Boolean(element('#add-surface .desktop-add-search-slot #location-search')) &&
    (element('#add-surface > .command-surface__shell > .command-surface__intro')?.textContent || '').includes('select it on the map or in Locations first') &&
    (element('#add-somewhere-else-title')?.textContent || '').trim() === 'Place not listed yet?' &&
    (element('#add-surface .add-somewhere-else > .command-surface__intro')?.textContent || '').trim() === 'Search for the venue or address below.',
  'finalized desktop contribution surface without selection');
  check(!visible('#add-surface .add-context'), 'Desktop selected-place context should stay hidden without a selected venue');
  check(!visible('#add-watch-party-button'), 'Desktop Watch Party action should stay hidden until a listed venue is selected');
  check(!visible('#add-cal-bar-button'), 'Desktop Cal Bar action should stay hidden until a listed venue is selected');
  check(!visible('#add-report-button'), 'Desktop reporting action should stay hidden until a listed venue is selected');
  check(element('#add-watch-party-button')?.closest('.add-context') === element('#add-surface .add-context'), 'Desktop venue-specific actions should remain owned by selected-place context');
  check((element('#add-surface > .command-surface__shell > .command-surface__intro')?.textContent || '').includes('select it on the map or in Locations first'), 'Desktop contribution intro should explain how listed locations work');
  check((element('#add-surface > .command-surface__shell > .command-surface__intro')?.textContent || '').includes('search below to add it'), 'Desktop contribution intro should explain how unlisted locations work');
  check((element('#add-somewhere-else-title')?.textContent || '').trim() === 'Place not listed yet?', 'Desktop no-selection state should label the unlisted-place path clearly');
  check((element('#add-surface .add-somewhere-else > .command-surface__intro')?.textContent || '').trim() === 'Search for the venue or address below.', 'Desktop unlisted-place section should explain the inline search');
  check(visible('#add-surface .add-somewhere-else > .command-surface__intro'), 'Desktop inline search helper copy should be visible');
  check(Boolean(element('#add-surface .desktop-add-search-slot #location-search')), 'Desktop should move the shared search form into the Add modal');
  check(!visible('#add-new-location-button'), 'Desktop should remove the intermediate Search for another location card');
  check(!element('#add-missing-location-link'), 'Obsolete Missing Location Form link should not exist on desktop');
  check(state()?.searchMode === 'add-location', 'Desktop Add to CGB should enter canonical add-location search mode inside the modal');

  element('#add-surface [data-command-close]')?.click();
  await waitFor(() => !visible('#add-surface'), 'desktop contribution surface close');
}

async function validateDesktopMapDeselect() {
  const map = element('#map');
  check(Boolean(map), 'Desktop map should exist for deselection validation');
  if (!map) return;

  map.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await waitFor(() => !state()?.selectedVenueId && !state()?.detailMode && visible('#tray-list'), 'desktop map background deselection');
  check(!state()?.selectedVenueId, 'Desktop map background click should clear the selected venue');
  check(!state()?.detailMode, 'Desktop map background click should leave venue detail mode');
  check(visible('#tray-list'), 'Desktop map background click should return to the Locations list');
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
  const widths = [locationsRect.width, selectedRect.width, addRect.width];
  const centers = [
    locationsRect.left + locationsRect.width / 2,
    selectedRect.left + selectedRect.width / 2,
    addRect.left + addRect.width / 2
  ];
  check([locationsRect.height, selectedRect.height, addRect.height].every((height) => height >= 39), 'Desktop tray destinations should share the same primary navigation height');
  check(Math.max(...widths) - Math.min(...widths) <= 1.5, 'Desktop Locations, Selected, and Add to CGB should occupy equal-width columns');
  check(Math.abs((centers[1] - centers[0]) - (centers[2] - centers[1])) <= 1.5, 'Desktop tray destinations should be evenly centered across the tray');

  const selectedVenueId = state()?.selectedVenueId || '';
  const selectedVenueName = state()?.snapshot?.venues?.find((venue) => venue.venue_id === selectedVenueId)?.name || '';
  add.click();
  await waitFor(() =>
    visible('#add-surface') &&
    Boolean(element('#add-surface .desktop-add-search-slot #location-search')) &&
    (element('#add-surface > .command-surface__shell > .command-surface__intro')?.textContent || '').trim() === 'Choose an action for this location. To add a different place, search below.' &&
    (element('#add-somewhere-else-title')?.textContent || '').trim() === 'Different location?' &&
    (element('#add-surface .add-somewhere-else > .command-surface__intro')?.textContent || '').trim() === 'Search for a venue or address that isn’t listed in CGB yet.',
  'finalized desktop Add to CGB surface');
  check((element('#add-surface-title')?.textContent || '').trim() === 'Add to Cal Golden Bars', 'Desktop contribution surface should explain the global Add action');
  check((element('#add-surface > .command-surface__shell > .command-surface__intro')?.textContent || '').trim() === 'Choose an action for this location. To add a different place, search below.', 'Desktop selected-state intro should explain both contribution paths');
  check(visible('#add-surface .add-context'), 'Selected venue context should remain available when opening desktop Add');
  check(visible('#add-watch-party-button') && visible('#add-cal-bar-button') && visible('#add-report-button'), 'Desktop selected Venue should expose all venue-specific contribution actions');
  check(element('#add-watch-party-button')?.closest('.add-context') === element('#add-surface .add-context'), 'Desktop venue-specific actions should remain grouped with selected-place context');
  if (selectedVenueName) {
    check((element('#add-context-name')?.textContent || '').trim() === selectedVenueName, 'Desktop Add should preserve the selected venue context');
  }
  check(!(element('#add-context-copy')?.textContent || '').includes('Available actions'), 'Desktop selected-place context should avoid explanatory repetition');
  check((element('#add-somewhere-else-title')?.textContent || '').trim() === 'Different location?', 'Desktop selected-state search should read as an alternate path');
  check((element('#add-surface .add-somewhere-else > .command-surface__intro')?.textContent || '').trim() === 'Search for a venue or address that isn’t listed in CGB yet.', 'Desktop selected-state search should explain the different-location path');
  check(Boolean(element('#add-surface .desktop-add-search-slot #location-search')), 'Desktop selected-state should keep the shared search form in the modal');
  check(!visible('#add-new-location-button'), 'Desktop selected-state should not require an intermediate search card');
  check(!element('#add-missing-location-link'), 'Obsolete Missing Location Form link should remain absent with a selected venue');
  check(state()?.searchMode === 'add-location', 'Desktop selected-state should keep the inline search in canonical add-location mode');
}

async function runDesktop() {
  await ready(true);
  check(visible('#map-view') && visible('#map'), 'Desktop map surface should render');
  check(visible('#tray-list'), 'Desktop venue list should render');
  await validateDesktopSearchHelper();
  await validateDesktopContributionWithoutSelection();
  await selectFirstVenue();
  await validateDesktopContributionEntry();
  element('#add-surface [data-command-close]')?.click();
  await waitFor(() => !visible('#add-surface'), 'desktop contribution surface close after selected venue');
  await validateDesktopMapDeselect();
  finish('CGB_SMOKE_DESKTOP');
}

try {
  if (mode === 'desktop') await runDesktop();
  else await runMobile();
} catch (error) {
  failures.push(error?.stack || error?.message || String(error));
  finish(mode === 'desktop' ? 'CGB_SMOKE_DESKTOP' : 'CGB_SMOKE_MOBILE');
}
