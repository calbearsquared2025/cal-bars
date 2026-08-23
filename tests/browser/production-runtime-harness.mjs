const result = document.querySelector('#cgb-production-runtime-result');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function progress(label) {
  if (result) result.textContent = `CGB_PRODUCTION_RUNTIME_PROGRESS:${label}`;
}

function element(selector) {
  return document.querySelector(selector);
}

function state() {
  return window.CGBApp?.getState?.() || null;
}

function sleep(ms = 10) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitFor(predicate, label, timeout = 10000) {
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

function activeCommand() {
  return document.body.dataset.commandSurface || '';
}

function trayState() {
  return element('#venue-tray')?.dataset?.state || '';
}

function selectedVenueId() {
  return state()?.selectedVenueId || '';
}

function badgeTexts(selectorOrElement) {
  const target = typeof selectorOrElement === 'string' ? element(selectorOrElement) : selectorOrElement;
  return [...(target?.querySelectorAll('.venue-badge') || [])]
    .map((badge) => badge.textContent?.trim())
    .filter(Boolean);
}

function firstVenue(predicate = () => true) {
  return state()?.snapshot?.venues?.find(predicate) || null;
}

function currentPartyVenueIds() {
  const current = state();
  if (!current?.snapshot || !current.gameId) return new Set();
  return new Set(current.snapshot.watchParties
    .filter((party) => party.game_id === current.gameId && party.event_status === 'active')
    .map((party) => party.venue_id));
}

function attendanceNumber(surface = '#tray-selected') {
  const numeral = element(`${surface} .bear-count__number`);
  if (numeral) return Number(numeral.textContent || 0);
  const source = element(`${surface} .bear-count`)?.textContent || '';
  const match = source.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function selectedShareLabel(surface = '#tray-selected') {
  const share = element(`${surface} .selected-card__share`) || element(`${surface} .detail-share`);
  return share?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function locationToggleIsStable() {
  const toggle = element('#list-location-toggle');
  return toggle?.children[0]?.id === 'list-location-nearby' &&
    toggle?.children[1]?.id === 'list-location-all' &&
    [...toggle.children].map((button) => button.textContent?.trim()).join('|') === 'Near me|All locations';
}

function locationModeSelected(mode) {
  const selector = mode === 'nearby' ? '#list-location-nearby' : '#list-location-all';
  return element(selector)?.getAttribute('aria-pressed') === 'true';
}

async function waitForApplicationReady({ desktop = false, label = 'application ready' } = {}) {
  return waitFor(() =>
    document.readyState === 'complete' &&
    element('#app')?.getAttribute('aria-busy') === 'false' &&
    Boolean(state()?.snapshot) &&
    state()?.dataSource === 'live' &&
    window.matchMedia('(max-width: 899px)').matches === !desktop &&
    document.querySelectorAll('.mobile-command[data-command]').length === 5 &&
    Boolean(element('#cgb-mobile-tab-location-refinement')) &&
    Boolean(element('#cgb-map-profile-final-pass')),
  label, 15000);
}

async function ensureListSurface(label = 'Locations surface') {
  if (activeCommand() !== 'list' || trayState() !== 'full') click('#mobile-list-button');
  return waitFor(() => activeCommand() === 'list' && trayState() === 'full' && isVisible('#tray-list'), label);
}

async function waitForIntentSettled(surface = '#tray-selected', label = 'Fan Intent transaction') {
  return waitFor(() => {
    const button = element(`${surface} .intent-button`);
    return !state()?.fanIntent?.pending && Boolean(button) && button.disabled === false;
  }, label);
}

async function selectVenueFromList(venue, label) {
  if (!venue) return false;
  await ensureListSurface(`Locations before ${label}`);
  const card = element(`#location-list .location-card[data-venue-id="${venue.venue_id}"]`);
  check(Boolean(card), `${label} should render in Locations`);
  card?.click();
  return waitFor(() => selectedVenueId() === venue.venue_id && trayState() === 'selected', label);
}

function finish(marker) {
  if (!result) return;
  result.textContent = failures.length
    ? `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : `${marker}_PASS`;
}

async function runMainChecks() {
  progress('ready');
  await waitForApplicationReady();

  progress('navigation-roundtrips');
  check(activeCommand() === 'map', 'Initial mobile command surface should be Map');
  check(trayState() === 'peek', 'Initial mobile tray should be the no-selection peek state');
  click('#mobile-search-button');
  await waitFor(() => activeCommand() === 'search' && isVisible('#search-surface'), 'Map → Search');
  click('#search-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map', 'Search → Map');
  click('#mobile-add-button');
  await waitFor(() => activeCommand() === 'add' && isVisible('#add-surface'), 'Map → Add');
  click('#add-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map', 'Add → Map');
  await ensureListSurface('Map → List');
  click('#mobile-map-button');
  await waitFor(() => activeCommand() === 'map' && trayState() !== 'full', 'List → Map');

  const partyVenueIds = currentPartyVenueIds();
  const noPartyVenue = firstVenue((venue) => venue.venue_type === 'community_location' && !partyVenueIds.has(venue.venue_id));
  const partyVenue = firstVenue((venue) => partyVenueIds.has(venue.venue_id));
  const calBarVenue = firstVenue((venue) => venue.venue_type === 'cal_bar');
  const communityPartyVenue = firstVenue((venue) => venue.venue_type === 'community_location' && partyVenueIds.has(venue.venue_id));
  check(Boolean(noPartyVenue), 'Fixture should contain a Community Location without a Watch Party');
  check(Boolean(partyVenue), 'Fixture should contain a Watch Party venue');
  check(Boolean(calBarVenue), 'Fixture should contain a Cal Bar');
  check(Boolean(communityPartyVenue), 'Fixture should contain a Watch Party at a Community Location');

  await ensureListSurface('Locations for identity checks');
  const noPartyBadges = badgeTexts(`#location-list .location-card[data-venue-id="${noPartyVenue?.venue_id}"]`);
  const partyBadges = badgeTexts(`#location-list .location-card[data-venue-id="${partyVenue?.venue_id}"]`);
  const calBarBadges = badgeTexts(`#location-list .location-card[data-venue-id="${calBarVenue?.venue_id}"]`);
  const communityPartyBadges = badgeTexts(`#location-list .location-card[data-venue-id="${communityPartyVenue?.venue_id}"]`);
  check(!noPartyBadges.includes('COMMUNITY LOCATION'), 'Mobile List should omit the Community Location badge');
  check(partyBadges.includes('WATCH PARTY'), 'Mobile List should preserve the Watch Party badge');
  check(calBarBadges.includes('CAL BAR'), 'Mobile List should preserve the Cal Bar badge');
  check(communityPartyBadges.includes('WATCH PARTY') && !communityPartyBadges.includes('CAL BAR'), 'Watch Party at a Community Location should remain distinct from a Cal Bar');

  progress('selected-attendance');
  await selectVenueFromList(noPartyVenue, 'no-Watch-Party venue selection');
  await waitFor(() => activeCommand() === 'map' && isVisible('#tray-selected .intent-button'), 'selected profile actions');
  check(attendanceNumber() === 0, 'Mocked selected venue should begin at zero attendance');
  check(selectedShareLabel() === 'Share', 'Unselected Venue should use the normal Share action');

  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'RSVP 0 → 1');
  await waitForIntentSettled('#tray-selected', 'RSVP 0 → 1 transaction completion');
  await waitFor(() => selectedShareLabel() === 'Invite Others', 'attendance-derived Invite Others action');
  check(!element('#tray-selected .post-join-invitation'), 'Confirmed attendance should not create a second invitation panel');

  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 0 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'false', 'RSVP 1 → 0');
  await waitForIntentSettled('#tray-selected', 'RSVP 1 → 0 transaction completion');
  await waitFor(() => selectedShareLabel() === 'Share', 'Share action after Undo');

  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'RSVP rejoin success');
  await waitForIntentSettled('#tray-selected', 'RSVP rejoin transaction completion');
  await waitFor(() => selectedShareLabel() === 'Invite Others', 'Invite Others after rejoin');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 0, 'Undo before retry scenario');
  await waitForIntentSettled('#tray-selected', 'Undo before retry transaction completion');

  progress('rsvp-retry');
  window.CGBProductionHarness?.failNextJoin?.();
  click('#tray-selected .intent-button');
  await waitFor(() => Boolean(element('#tray-selected .intent-retry')), 'failed join retry control');
  check(selectedShareLabel() === 'Share', 'Failed optimistic join should restore Share');
  click('#tray-selected .intent-retry');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'retry join success');
  await waitForIntentSettled('#tray-selected', 'retry-success transaction completion');
  await waitFor(() => selectedShareLabel() === 'Invite Others', 'Invite Others after retry');

  progress('selected-add');
  click('#mobile-add-button');
  await waitFor(() => activeCommand() === 'add', 'selected venue → Add');
  check(selectedVenueId() === noPartyVenue?.venue_id, 'Selected venue ID must be preserved when entering Add');
  check(element('#add-context-name')?.textContent?.trim() === noPartyVenue?.name, 'Add context should preserve the selected venue name');
  window.CGBApp?.render?.();
  await waitFor(() => activeCommand() === 'add' && element('#add-context-name')?.textContent?.trim() === noPartyVenue?.name, 'selected Add after rerender');
  click('#add-surface [data-command-close]');
  await waitFor(() => activeCommand() === 'map' && trayState() === 'selected', 'selected Add → Map');

  progress('watch-party-selection');
  await selectVenueFromList(partyVenue, 'Watch Party venue selection');
  await waitFor(() => isVisible('#tray-selected .party-module'), 'Watch Party selected profile');
  const selectedPartyBadges = badgeTexts('#tray-selected .selected-card');
  check(selectedPartyBadges.includes('WATCH PARTY'), 'Mobile selected card should preserve the Watch Party badge');
  check(selectedPartyBadges.includes('CAL BAR') === (partyVenue?.venue_type === 'cal_bar'), 'Selected Watch Party should preserve its independent Cal Bar identity');

  await selectVenueFromList(communityPartyVenue, 'Community Location Watch Party selection');
  const selectedCommunityPartyBadges = badgeTexts('#tray-selected .selected-card');
  check(selectedCommunityPartyBadges.includes('WATCH PARTY') && !selectedCommunityPartyBadges.includes('CAL BAR'), 'Watch Party at a Community Location should remain distinct from a Cal Bar');
  const beforeMove = attendanceNumber();
  click('#tray-selected .intent-button');
  await waitFor(() => element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true' && attendanceNumber() >= Math.max(1, beforeMove), 'RSVP move to Watch Party venue');
  await waitForIntentSettled('#tray-selected', 'RSVP move transaction completion');
  await waitFor(() => selectedShareLabel() === 'Invite Others', 'Invite Others after move');

  progress('nearby');
  let geolocationCalls = 0;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition(success) {
        geolocationCalls += 1;
        success({ coords: { latitude: 37.8715, longitude: -122.2730 } });
      }
    }
  });
  await ensureListSurface('List for Nearby / All locations');
  check(locationToggleIsStable(), 'Mobile location toggle should keep Near me left and All locations right');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin) && locationModeSelected('nearby'), 'Near me state');
  click('#list-location-all');
  await waitFor(() => !state()?.origin && locationModeSelected('all'), 'All locations state');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin) && locationModeSelected('nearby'), 'saved Near me state');
  check(geolocationCalls === 1, 'Mobile Near me should reuse remembered coordinates');
  click('#mobile-map-button');
  await waitFor(() => activeCommand() === 'map' && trayState() !== 'full', 'List → Map after Nearby');

  finish('CGB_PRODUCTION_RUNTIME_HARNESS');
}

async function runDesktopChecks() {
  progress('desktop-ready');
  await waitForApplicationReady({ desktop: true, label: 'desktop application ready' });
  check(isVisible('#map-view'), 'Desktop Map view should be visible');
  check(trayState() === 'full' && isVisible('#tray-list'), 'Desktop should open with Locations');
  check(isVisible('.mobile-command-bar'), 'Desktop should expose the shared Selected / Locations controls');
  check(element('#mobile-map-button span:last-child')?.textContent?.trim() === 'Selected', 'Desktop first panel control should be Selected');
  check(element('#mobile-list-button span:last-child')?.textContent?.trim() === 'Locations', 'Desktop second panel control should be Locations');
  check(!isVisible('#mobile-search-button') && !isVisible('#mobile-add-button') && !isVisible('#mobile-about-button'), 'Desktop shared panel controls should not expose mobile-only commands');
  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'Desktop shell should not create horizontal document overflow');

  const partyVenueIds = currentPartyVenueIds();
  const noPartyVenue = firstVenue((venue) => venue.venue_type === 'community_location' && !partyVenueIds.has(venue.venue_id));
  const partyVenue = firstVenue((venue) => partyVenueIds.has(venue.venue_id));
  const calBarVenue = firstVenue((venue) => venue.venue_type === 'cal_bar');
  check(Boolean(noPartyVenue), 'Desktop fixture should contain a Community Location without a Watch Party');
  check(Boolean(partyVenue), 'Desktop fixture should contain a Watch Party venue');
  check(Boolean(calBarVenue), 'Desktop fixture should contain a Cal Bar');
  check(badgeTexts(`#location-list .location-card[data-venue-id="${partyVenue?.venue_id}"]`).includes('WATCH PARTY'), 'Desktop Locations should preserve the Watch Party badge');
  check(badgeTexts(`#location-list .location-card[data-venue-id="${calBarVenue?.venue_id}"]`).includes('CAL BAR'), 'Desktop Locations should preserve the Cal Bar badge');

  progress('desktop-selected');
  await selectVenueFromList(noPartyVenue, 'desktop Locations selection');
  await waitFor(() => state()?.detailMode === true && element('#venue-detail')?.parentElement?.id === 'tray-selected', 'desktop canonical Venue Profile');
  check(!element('#tray-selected .selected-card'), 'Desktop Selected should not leak the obsolete compact selected card');
  check(isVisible('#venue-detail .detail-primary-actions .intent-button'), 'Desktop Venue Profile should preserve Fan Intent');
  check(isVisible('#venue-detail .detail-primary-actions .detail-share'), 'Desktop Venue Profile should preserve Share');
  check(element('#detail-view')?.hidden === true, 'Desktop should not open the standalone mobile Detail surface');

  progress('desktop-roundtrip');
  click('#mobile-list-button');
  await waitFor(() => trayState() === 'full' && state()?.detailMode === false && isVisible('#tray-list'), 'desktop Selected → Locations');
  check(selectedVenueId() === noPartyVenue?.venue_id, 'Desktop Locations should preserve selected Venue identity');
  click('#mobile-map-button');
  await waitFor(() => trayState() === 'selected' && state()?.detailMode === true && element('#venue-detail')?.parentElement?.id === 'tray-selected', 'desktop Locations → Selected');
  check(!element('#tray-selected .selected-card'), 'Desktop Locations → Selected should restore the canonical Venue Profile rather than the compact card');

  progress('desktop-watch-party');
  await selectVenueFromList(partyVenue, 'desktop Watch Party selection');
  await waitFor(() => Boolean(element('#venue-detail > .party-module')), 'desktop Watch Party module');
  document.querySelectorAll('#venue-detail > .party-module').forEach((party) => {
    const style = getComputedStyle(party);
    check(style.overflowY !== 'auto' && style.overflowY !== 'scroll', 'Desktop full Profile Watch Party should not create an internal scrollbar');
    check(style.maxHeight === 'none' || !style.maxHeight, 'Desktop full Profile Watch Party should not impose a compact-card max-height');
  });

  finish('CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS');
}

async function runShortLandscapeChecks() {
  progress('short-landscape-ready');
  await waitForApplicationReady({ label: 'short landscape application ready' });
  check(window.innerWidth > window.innerHeight, 'Short landscape harness should run in landscape orientation');
  const partyVenueIds = currentPartyVenueIds();
  const longVenue = firstVenue((venue) => venue.name.length > 50 && venue.address_line_1.length > 35 && !partyVenueIds.has(venue.venue_id));
  check(Boolean(longVenue), 'Short landscape fixture should include long Venue name and address content');
  await selectVenueFromList(longVenue, 'short landscape long Venue selection');
  check(isVisible('#tray-selected .selected-card'), 'Short landscape should keep the selected profile visible');
  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'Short landscape should not create horizontal document overflow');
  check((element('#venue-tray')?.getBoundingClientRect().top || -1) >= (element('.site-header')?.getBoundingClientRect().bottom || 0), 'Short landscape selected tray should remain below the header');
  finish('CGB_SHORT_LANDSCAPE_RUNTIME_HARNESS');
}

async function runNearbyMobileChecks() {
  progress('nearby-mobile-ready');
  await waitForApplicationReady({ label: 'focused mobile Nearby application ready' });
  let geolocationCalls = 0;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition(success) { geolocationCalls += 1; success({ coords: { latitude: 37.8715, longitude: -122.2730 } }); } }
  });
  await ensureListSurface('focused mobile Locations');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin && state()?.nearbyOrigin) && locationModeSelected('nearby'), 'focused mobile Near me');
  click('#list-location-all');
  await waitFor(() => !state()?.origin && locationModeSelected('all'), 'focused mobile All locations');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin) && locationModeSelected('nearby'), 'focused mobile saved Near me');
  check(geolocationCalls === 1, 'Focused mobile Near me should reuse coordinates');
  finish('CGB_NEARBY_MOBILE_RUNTIME_HARNESS');
}

async function runNearbyDesktopChecks() {
  progress('nearby-desktop-ready');
  await waitForApplicationReady({ desktop: true, label: 'focused desktop Nearby application ready' });
  const venue = firstVenue();
  await selectVenueFromList(venue, 'focused desktop selected Venue');
  const retainedVenueId = selectedVenueId();
  click('#mobile-list-button');
  await waitFor(() => trayState() === 'full' && state()?.detailMode === false, 'focused desktop Locations');
  let geolocationCalls = 0;
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition(success) { geolocationCalls += 1; success({ coords: { latitude: 37.8715, longitude: -122.2730 } }); } }
  });
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin && state()?.nearbyOrigin) && locationModeSelected('nearby'), 'focused desktop Near me');
  click('#list-location-all');
  await waitFor(() => !state()?.origin && locationModeSelected('all'), 'focused desktop All locations');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin) && locationModeSelected('nearby'), 'focused desktop saved Near me');
  check(geolocationCalls === 1, 'Focused desktop Near me should reuse coordinates');
  check(selectedVenueId() === retainedVenueId, 'Focused desktop Nearby changes should preserve selected Venue identity');
  finish('CGB_NEARBY_DESKTOP_RUNTIME_HARNESS');
}

async function runSearchModeChecks({ desktop = false } = {}) {
  progress(desktop ? 'search-desktop-ready' : 'search-mobile-ready');
  await waitForApplicationReady({ desktop, label: desktop ? 'focused desktop Search application ready' : 'focused mobile Search application ready' });
  if (!desktop) {
    click('#mobile-search-button');
    await waitFor(() => activeCommand() === 'search' && isVisible('#search-surface'), 'focused mobile Search surface');
  }
  const input = element('#location-query');
  input?.focus();
  if (input) input.value = 'toast';
  input?.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => isVisible('#search-add-location-button'), 'persistent Add Location Search footer');
  check(state()?.searchMode === 'existing', 'Normal Search should use canonical existing-only mode');
  check(window.CGBProductionHarness?.mapTilerSearchCalls?.() === 0, 'Normal Search typing should not request MapTiler external places');
  click('#search-add-location-button');
  await waitFor(() => state()?.searchMode === 'add-location', 'Add Location Search mode');
  check(element('#search-surface-title')?.textContent?.trim() === 'Add a location', 'Add Location mode should use the approved heading');
  check(input?.value === 'toast', 'Add Location mode should preserve the existing query');
  await waitFor(() => window.CGBProductionHarness?.mapTilerSearchCalls?.() === 1, 'one external place request');
  await waitFor(() => Boolean(element('.search-result-group--external button[data-external-place-id]')), 'external Add Location result');
  click('#search-surface [data-command-close]');
  await waitFor(() => state()?.searchMode === 'existing' && !element('.search-result-group--external'), 'return from Add Location Search mode');
  finish(desktop ? 'CGB_SEARCH_MODE_DESKTOP_RUNTIME_HARNESS' : 'CGB_SEARCH_MODE_MOBILE_RUNTIME_HARNESS');
}

const mode = new URLSearchParams(location.search).get('__cgb_harness');
(mode === 'nearby-mobile'
  ? runNearbyMobileChecks()
  : mode === 'nearby-desktop'
    ? runNearbyDesktopChecks()
    : mode === 'search-mobile'
      ? runSearchModeChecks()
      : mode === 'search-desktop'
        ? runSearchModeChecks({ desktop: true })
        : mode === 'landscape'
          ? runShortLandscapeChecks()
          : mode === 'desktop'
            ? runDesktopChecks()
            : runMainChecks()).catch((error) => {
  failures.push(error?.stack || String(error));
  finish(mode === 'nearby-mobile'
    ? 'CGB_NEARBY_MOBILE_RUNTIME_HARNESS'
    : mode === 'nearby-desktop'
      ? 'CGB_NEARBY_DESKTOP_RUNTIME_HARNESS'
      : mode === 'search-mobile'
        ? 'CGB_SEARCH_MODE_MOBILE_RUNTIME_HARNESS'
        : mode === 'search-desktop'
          ? 'CGB_SEARCH_MODE_DESKTOP_RUNTIME_HARNESS'
          : mode === 'landscape'
            ? 'CGB_SHORT_LANDSCAPE_RUNTIME_HARNESS'
            : mode === 'desktop'
              ? 'CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS'
              : 'CGB_PRODUCTION_RUNTIME_HARNESS');
});
