const result = document.querySelector('#cgb-production-runtime-result');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function progress(label) {
  if (result) result.textContent = `CGB_PRODUCTION_RUNTIME_PROGRESS:${label}`;
}

function yieldToBrowser() {
  return new Promise((resolve) => window.setTimeout(resolve, 1));
}

async function waitFor(predicate, label, maxAttempts = 2200) {
  const conditionMet = () => {
    try {
      return predicate();
    } catch (_) {
      return false;
    }
  };
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (conditionMet()) return true;
    await yieldToBrowser();
  }
  if (conditionMet()) return true;
  failures.push(`Timed out waiting for ${label}`);
  return false;
}

function state() {
  return window.CGBApp?.getState?.() || null;
}

function element(selector) {
  return document.querySelector(selector);
}

function isVisible(selectorOrElement) {
  const target = typeof selectorOrElement === 'string' ? element(selectorOrElement) : selectorOrElement;
  if (!target || target.hidden) return false;
  const style = getComputedStyle(target);
  const rect = target.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function click(selector) {
  const target = element(selector);
  check(Boolean(target), `Missing click target: ${selector}`);
  target?.click();
  return target;
}

async function waitForApplicationReady(label = 'application ready') {
  return waitFor(() =>
    document.readyState === 'complete' &&
    element('#app')?.getAttribute('aria-busy') === 'false' &&
    Boolean(state()?.snapshot) &&
    state()?.dataSource === 'live' &&
    window.matchMedia('(max-width: 899px)').matches &&
    document.querySelectorAll('.mobile-command[data-command]').length === 4 &&
    Boolean(element('#cgb-mobile-tab-location-refinement')) &&
    Boolean(element('#cgb-map-profile-final-pass')) &&
    Boolean(document.body.dataset.commandSurface), label, 7000);
}

async function waitForDesktopApplicationReady(label = 'desktop application ready') {
  return waitFor(() =>
    document.readyState === 'complete' &&
    element('#app')?.getAttribute('aria-busy') === 'false' &&
    Boolean(state()?.snapshot) &&
    state()?.dataSource === 'live' &&
    !window.matchMedia('(max-width: 899px)').matches &&
    document.querySelectorAll('.mobile-command[data-command]').length === 4 &&
    Boolean(element('#cgb-mobile-tab-location-refinement')) &&
    Boolean(element('#cgb-map-profile-final-pass')), label, 7000);
}

function activeCommand() {
  return document.body.dataset.commandSurface || '';
}

function trayState() {
  return element('#venue-tray')?.dataset?.state || '';
}

function trayDensity() {
  return element('#venue-tray')?.dataset?.selectedDensity || '';
}

function selectedVenueId() {
  return state()?.selectedVenueId || '';
}

function attendanceNumber() {
  const numeral = element('#tray-selected .bear-count__number');
  if (numeral) return Number(numeral.textContent || 0);
  const source = element('#tray-selected .bear-count')?.textContent || '';
  const match = source.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function setInputValue(selector, value) {
  const input = element(selector);
  check(Boolean(input), `Missing input: ${selector}`);
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function currentPartyVenueIds() {
  const current = state();
  if (!current?.snapshot || !current.gameId) return new Set();
  return new Set(current.snapshot.watchParties
    .filter((party) => party.game_id === current.gameId && party.event_status !== 'cancelled')
    .map((party) => party.venue_id));
}

function firstVenue(predicate = () => true) {
  return state()?.snapshot?.venues?.find(predicate) || null;
}

async function ensureListSurface(label) {
  if (activeCommand() !== 'list' || trayState() !== 'full') click('#mobile-list-button');
  return waitFor(() => activeCommand() === 'list' && trayState() === 'full', label);
}

async function waitForIntentSettled(label) {
  return waitFor(() => {
    const button = element('#tray-selected .intent-button');
    return !state()?.fanIntent?.pending && Boolean(button) && button.disabled === false;
  }, label, 4000);
}

async function verifyListLocationControl(expectedLabel, label) {
  click('#mobile-list-button');
  return waitFor(() => {
    const button = element('#clear-search-button');
    return activeCommand() === 'list' &&
      trayState() === 'full' &&
      button &&
      !button.hidden &&
      button.textContent?.trim() === expectedLabel;
  }, label, 4000);
}

function finish(marker) {
  if (!result) return;
  if (failures.length) {
    result.textContent = `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`;
  } else {
    result.textContent = `${marker}_PASS`;
  }
}

async function runDirectRouteCheck() {
  progress('direct-ready');
  await waitForApplicationReady('direct venue application ready');
  const params = new URLSearchParams(location.search);
  const requestedSlug = params.get('venue');
  const requestedGame = params.get('game');
  const venue = state()?.snapshot?.venues?.find((candidate) => candidate.slug === requestedSlug);

  check(Boolean(venue), 'Direct-route fixture venue should exist');
  check(state()?.detailMode === true, 'Direct venue URL should enter detail mode');
  check(state()?.gameId === requestedGame, 'Direct venue URL should preserve selected game');
  check(selectedVenueId() === venue?.venue_id, 'Direct venue URL should select the requested venue');
  check(element('#detail-view')?.hidden === false, 'Direct venue URL should render the venue detail view');
  check(element('#venue-detail')?.dataset?.venueId === venue?.venue_id, 'Direct venue detail should preserve venue identity');
  finish('CGB_PRODUCTION_DIRECT_ROUTE');
}

async function runDesktopDirectRouteCheck() {
  progress('desktop-direct-ready');
  await waitForDesktopApplicationReady('desktop direct venue application ready');
  const params = new URLSearchParams(location.search);
  const requestedSlug = params.get('venue');
  const requestedGame = params.get('game');
  const venue = state()?.snapshot?.venues?.find((candidate) => candidate.slug === requestedSlug);

  check(Boolean(venue), 'Desktop direct-route fixture venue should exist');
  check(state()?.detailMode === true, 'Desktop direct venue URL should enter detail mode');
  check(state()?.gameId === requestedGame, 'Desktop direct venue URL should preserve selected game');
  check(selectedVenueId() === venue?.venue_id, 'Desktop direct venue URL should select the requested venue');
  check(isVisible('#detail-view'), 'Desktop direct venue URL should visibly render the venue detail view');
  check(element('#venue-detail')?.dataset?.venueId === venue?.venue_id, 'Desktop direct venue detail should preserve venue identity');
  finish('CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE');
}

async function runDesktopChecks() {
  progress('desktop-ready');
  await waitForDesktopApplicationReady();

  progress('desktop-initial-map');
  check(activeCommand() === 'map', 'Initial desktop command surface should be Map');
  check(isVisible('#map-view'), 'Desktop Map view should be visible');
  check(isVisible('#location-search'), 'Desktop Search should be available from the initial Map');
  check(isVisible('#location-list'), 'Desktop location List should be visible');
  check(element('#location-list')?.children.length > 0, 'Desktop List should render shared location data');
  check(isVisible('.mobile-command-bar'), 'Desktop should expose the shared Map, Search, Add, and List navigation component');
  check(!selectedVenueId(), 'Initial desktop state should have no selected venue');

  const partyVenueIds = currentPartyVenueIds();
  const noPartyVenue = firstVenue((venue) => !partyVenueIds.has(venue.venue_id));
  const partyVenue = firstVenue((venue) => partyVenueIds.has(venue.venue_id));
  check(Boolean(noPartyVenue), 'Desktop fixture should contain a venue without a Watch Party');
  check(Boolean(partyVenue), 'Desktop fixture should contain a venue with a Watch Party');

  progress('desktop-add-without-selection');
  click('#mobile-add-button');
  await waitFor(() => activeCommand() === 'add' && element('#add-surface')?.hidden === false, 'desktop Map to Add without selection');
  check(isVisible('#add-surface'), 'Desktop Add should be visibly usable without a selected Venue');
  check(element('#add-surface .add-context:not(.add-game-context)')?.hidden === true, 'Desktop Add should omit selected-place context when no Venue is selected');
  check(isVisible('#add-game-context'), 'Desktop Add should preserve the shared selected-Game context');
  click('#add-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map' && element('#add-surface')?.hidden, 'desktop Add to Map without selection');

  progress('desktop-select-no-party');
  const noPartyCard = noPartyVenue && element(`#location-list .location-card[data-venue-id="${noPartyVenue.venue_id}"]`);
  check(Boolean(noPartyCard), 'Desktop no-Watch-Party venue should render in the shared List');
  noPartyCard?.click();
  await waitFor(() => selectedVenueId() === noPartyVenue?.venue_id && trayState() === 'selected', 'desktop Venue selection');
  await waitFor(() => Boolean(element('#tray-selected .bear-count__prompt')) && Boolean(element('#tray-selected .selected-card__plan-party')), 'desktop shared selected-card refinement');
  check(isVisible('#tray-selected .selected-card'), 'Desktop selected Venue should render a visible selected card');
  check(!element('#tray-selected .party-module'), 'Desktop no-Watch-Party Venue should not render a Watch Party module');
  check(Boolean(element('#tray-selected .bear-count__prompt')), 'Desktop selected card should use the shared zero-attendance component');
  check(Boolean(element('#tray-selected .selected-card__plan-party')), 'Desktop selected card should use the shared no-Watch-Party contribution component');

  progress('desktop-rsvp');
  check(attendanceNumber() === 0, 'Desktop mocked Venue should begin at zero attendance');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'desktop RSVP 0 to 1');
  check(trayState() === 'selected', 'Desktop RSVP 0 to 1 should preserve selected Venue state');
  await waitForIntentSettled('desktop RSVP 0 to 1 transaction completion');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 0 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'false', 'desktop RSVP 1 to 0');
  check(trayState() === 'selected', 'Desktop RSVP 1 to 0 should preserve selected Venue state');
  await waitForIntentSettled('desktop RSVP 1 to 0 transaction completion');

  progress('desktop-selected-add');
  click('#mobile-add-button');
  await waitFor(() => activeCommand() === 'add' && element('#add-surface')?.hidden === false, 'desktop selected Venue to Add');
  check(isVisible('#add-surface'), 'Desktop Add should be visibly usable with a selected Venue');
  check(selectedVenueId() === noPartyVenue?.venue_id, 'Desktop Add should preserve selected Venue identity');
  check(isVisible('#add-surface .add-context:not(.add-game-context)'), 'Desktop Add should visibly render selected-place context');
  check(element('#add-context-name')?.textContent?.trim() === noPartyVenue?.name, 'Desktop Add should preserve selected Venue content');
  check(isVisible('#add-game-context'), 'Desktop selected Add should visibly preserve selected-Game context');
  window.CGBApp?.render?.();
  await waitFor(() => activeCommand() === 'add' && selectedVenueId() === noPartyVenue?.venue_id, 'desktop selected Add after application rerender', 4000);
  check(isVisible('#add-surface .add-context:not(.add-game-context)'), 'Desktop selected-place Add context should survive a shared application rerender');
  click('#add-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map', 'desktop selected Add to Map');

  progress('desktop-search-result');
  click('#mobile-search-button');
  await waitFor(() => activeCommand() === 'search' && element('#search-surface')?.hidden === false, 'desktop Map to Search');
  check(isVisible('#search-surface'), 'Desktop Search surface should be visibly usable');
  check(element('#search-surface')?.contains(element('#location-search')), 'Desktop Search should reuse the shared Search form DOM');
  setInputValue('#location-query', partyVenue?.name || '');
  await waitFor(() => Boolean(partyVenue && element(`#search-suggestions button[data-venue-id="${partyVenue.venue_id}"]`)), 'desktop existing Search result');
  element(`#search-suggestions button[data-venue-id="${partyVenue?.venue_id}"]`)?.click();
  await waitFor(() => selectedVenueId() === partyVenue?.venue_id && activeCommand() === 'map' && trayState() === 'selected', 'desktop Search result to selected Map state');
  check(isVisible('#tray-selected .selected-card'), 'Desktop Search result should leave a visible selected card');
  check(Boolean(element('#tray-selected .party-module')), 'Desktop Watch Party Venue should render the shared Watch Party module');

  progress('desktop-nearby-all');
  try {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          success({ coords: { latitude: 37.8715, longitude: -122.2730 } });
        }
      }
    });
  } catch (error) {
    failures.push(`Could not install deterministic desktop geolocation mock: ${error.message}`);
  }
  click('#near-me-button');
  await waitFor(() => Boolean(state()?.origin), 'desktop Nearby location state');
  check(isVisible('#location-list'), 'Desktop Nearby should keep the shared List visible');
  check(!element('#clear-search-button')?.hidden, 'Desktop Nearby should expose All locations');
  check(element('#clear-search-button')?.textContent?.trim() === 'All locations', 'Desktop Nearby should label the reset action All locations');
  click('#clear-search-button');
  await waitFor(() => !state()?.origin, 'desktop All locations state');
  check(isVisible('#location-list'), 'Desktop All locations should keep the shared List visible');

  progress('desktop-game-dialog');
  click('#game-button');
  await waitFor(() => element('#game-dialog')?.open === true, 'desktop Game dialog');
  check(isVisible('#game-dialog'), 'Desktop Game dialog should be visibly usable');
  element('#game-dialog')?.close();

  finish('CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS');
}

async function runMainChecks() {
  progress('ready');
  await waitForApplicationReady();

  progress('initial-map');
  check(activeCommand() === 'map', 'Initial mobile command surface should be Map');
  check(element('#mobile-map-button')?.classList.contains('mobile-command--active'), 'Map command should be active initially');
  check(trayState() === 'peek', 'Initial tray should be the no-selection peek state');
  check(!selectedVenueId(), 'Initial state should have no selected venue');

  progress('search-roundtrip');
  click('#mobile-search-button');
  await waitFor(() => activeCommand() === 'search' && !element('#search-surface')?.hidden, 'Map → Search');
  click('#search-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map' && element('#search-surface')?.hidden, 'Search → Map');

  progress('add-roundtrip');
  click('#mobile-add-button');
  await waitFor(() => activeCommand() === 'add' && !element('#add-surface')?.hidden, 'Map → Add');
  click('#add-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map' && element('#add-surface')?.hidden, 'Add → Map');

  progress('list-roundtrip');
  click('#mobile-list-button');
  await waitFor(() => activeCommand() === 'list' && trayState() === 'full', 'Map → List');
  click('#mobile-map-button');
  await waitFor(() => activeCommand() === 'map' && trayState() !== 'full', 'List → Map');

  const partyVenueIds = currentPartyVenueIds();
  const noPartyVenue = firstVenue((venue) => !partyVenueIds.has(venue.venue_id));
  const partyVenue = firstVenue((venue) => partyVenueIds.has(venue.venue_id));
  check(Boolean(noPartyVenue), 'Fixture should contain a venue without a Watch Party for the selected game');
  check(Boolean(partyVenue), 'Fixture should contain a venue with a Watch Party for the selected game');

  progress('select-no-party');
  await ensureListSurface('List before selecting venue');
  const noPartyCard = noPartyVenue && element(`#location-list .location-card[data-venue-id="${noPartyVenue.venue_id}"]`);
  check(Boolean(noPartyCard), 'No-Watch-Party venue should render in List');
  noPartyCard?.click();
  await waitFor(() => selectedVenueId() === noPartyVenue?.venue_id && trayState() === 'selected', 'venue selection');
  await waitFor(() => activeCommand() === 'map', 'selected venue returning to Map');
  await waitFor(() => trayDensity() === 'compact', 'new selected venue compact density');
  check(Boolean(element('#tray-selected .selected-card')), 'Selected venue should render a selected card');
  check(!element('#tray-selected .party-module'), 'No-Watch-Party venue should not render a Watch Party module');

  progress('density-expand');
  click('#tray-handle');
  await waitFor(() => trayDensity() === 'expanded', 'manual selected-tray expansion');

  progress('rsvp-join-expanded');
  check(attendanceNumber() === 0, 'Mocked selected venue should begin at zero attendance');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'RSVP 0 → 1');
  check(trayState() === 'selected', 'RSVP 0 → 1 must retain selected tray state');
  check(trayDensity() === 'expanded', 'RSVP 0 → 1 must preserve expanded selected-tray density');
  await waitForIntentSettled('RSVP 0 → 1 transaction completion');

  progress('density-collapse');
  click('#tray-handle');
  await waitFor(() => trayDensity() === 'compact', 'manual selected-tray collapse');
  await waitForIntentSettled('intent control ready after selected-tray collapse');

  progress('rsvp-withdraw-compact');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 0 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'false', 'RSVP 1 → 0');
  check(trayState() === 'selected', 'RSVP 1 → 0 must retain selected tray state');
  check(trayDensity() === 'compact', 'RSVP 1 → 0 must preserve compact selected-tray density');
  await waitForIntentSettled('RSVP 1 → 0 transaction completion');

  progress('selected-add');
  click('#mobile-add-button');
  await waitFor(() => activeCommand() === 'add', 'selected venue → Add');
  check(selectedVenueId() === noPartyVenue?.venue_id, 'Selected venue ID must be preserved when entering Add');
  check(element('#add-surface .add-context:not(.add-game-context)')?.hidden === false, 'Selected-place Add context should be visible when entering Add');
  check(element('#add-context-name')?.textContent?.trim() === noPartyVenue?.name, 'Add context should preserve the selected venue name');

  progress('selected-add-rerender');
  check(typeof window.CGBApp?.render === 'function', 'CGB application render path should be available during selected Add');
  window.CGBApp?.render?.();
  await waitFor(() =>
    activeCommand() === 'add' &&
    selectedVenueId() === noPartyVenue?.venue_id &&
    element('#add-surface .add-context:not(.add-game-context)')?.hidden === false &&
    element('#add-context-name')?.textContent?.trim() === noPartyVenue?.name,
  'selected Add context after application rerender', 4000);
  check(activeCommand() === 'add', 'Add must remain the active surface after application rerender');
  check(selectedVenueId() === noPartyVenue?.venue_id, 'Selected venue ID must survive the application rerender while Add is open');
  check(element('#add-surface .add-context:not(.add-game-context)')?.hidden === false, 'Selected-place Add context must remain visible after application rerender');
  check(element('#add-context-name')?.textContent?.trim() === noPartyVenue?.name, 'Selected-place Add context must identify the same venue after application rerender');

  click('#add-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map', 'selected Add → Map');
  check(selectedVenueId() === noPartyVenue?.venue_id, 'Selected venue must remain selected after leaving Add');

  progress('search-result');
  if (partyVenue) {
    click('#mobile-search-button');
    await waitFor(() => activeCommand() === 'search', 'Map → Search for existing venue');
    setInputValue('#location-query', partyVenue.name);
    await waitFor(() => Boolean(element(`#search-suggestions button[data-venue-id="${partyVenue.venue_id}"]`)), 'existing Search result');
    element(`#search-suggestions button[data-venue-id="${partyVenue.venue_id}"]`)?.click();
    await waitFor(() => selectedVenueId() === partyVenue.venue_id && activeCommand() === 'map' && trayState() === 'selected', 'Search result → selected Map state');
    await waitFor(() => trayDensity() === 'compact', 'Search result selected tray compact density');
    check(Boolean(element('#tray-selected .party-module')), 'Watch Party venue should render a Watch Party module in the selected card');
  }

  progress('nearby-list');
  try {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          success({ coords: { latitude: 37.8715, longitude: -122.2730 } });
        }
      }
    });
  } catch (error) {
    failures.push(`Could not install deterministic geolocation mock: ${error.message}`);
  }

  await ensureListSurface('List for Nearby / All locations');
  await waitFor(() => {
    const button = element('#clear-search-button');
    return button && !button.hidden && button.textContent?.trim() === 'Near me';
  }, 'Near me List control');
  click('#clear-search-button');
  await waitFor(() => Boolean(state()?.origin), 'Nearby location state');

  await verifyListLocationControl('All locations', 'All locations List control');
  click('#clear-search-button');
  await waitFor(() => !state()?.origin, 'All locations state');

  await verifyListLocationControl('Near me', 'Near me control restored after All locations');

  progress('list-back-map');
  click('#mobile-map-button');
  await waitFor(() => activeCommand() === 'map' && trayState() !== 'full', 'List → Map after Nearby / All locations');

  finish('CGB_PRODUCTION_RUNTIME_HARNESS');
}

const mode = new URLSearchParams(location.search).get('__cgb_harness');
(mode === 'direct'
  ? runDirectRouteCheck()
  : mode === 'desktop'
    ? runDesktopChecks()
    : mode === 'desktop-direct'
      ? runDesktopDirectRouteCheck()
      : runMainChecks()).catch((error) => {
  failures.push(error?.stack || String(error));
  finish(mode === 'direct'
    ? 'CGB_PRODUCTION_DIRECT_ROUTE'
    : mode === 'desktop'
      ? 'CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS'
      : mode === 'desktop-direct'
        ? 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE'
        : 'CGB_PRODUCTION_RUNTIME_HARNESS');
});
