const result = document.querySelector('#cgb-production-runtime-result');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function element(selector) {
  return document.querySelector(selector);
}

function visible(selector) {
  const node = element(selector);
  if (!node || node.hidden) return false;
  const style = getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function state() {
  return window.CGBApp?.getState?.() || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, label, timeout = 6000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    try {
      if (predicate()) return true;
    } catch (_) {}
    await sleep(20);
  }
  failures.push(`Timed out waiting for ${label}`);
  return false;
}

function badgeTexts() {
  return Array.from(document.querySelectorAll('#venue-detail .venue-badge'))
    .map((badge) => badge.textContent?.trim() || '');
}

function actionLabels(row) {
  return Array.from(row?.children || [])
    .filter((node) => node.matches?.('a, button'))
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() || '');
}

function partyFor(venueId, gameId) {
  return state()?.snapshot?.watchParties?.find((party) =>
    party.venue_id === venueId && party.game_id === gameId && party.event_status === 'active') || null;
}

async function verifyGameSelectorRoundTrip(originalGameId, venueId) {
  const options = () => Array.from(document.querySelectorAll('#game-list .game-option'));
  element('#game-button')?.click();
  await waitFor(() => options().length > 1, 'global game selector options');
  const alternate = options().find((option) => option.dataset.gameId !== originalGameId);
  if (!alternate) {
    failures.push('Global game selector should expose an alternate game');
    return;
  }
  const alternateGameId = alternate.dataset.gameId;
  alternate.click();
  await waitFor(() => state()?.gameId === alternateGameId, 'Detail game change');
  check(state()?.selectedVenueId === venueId, 'Changing games from Detail should preserve Venue identity');
  check(new URLSearchParams(location.search).get('game') === alternateGameId, 'Changing games from Detail should update the route game');
  check(new URLSearchParams(location.search).get('venue'), 'Changing games from Detail should preserve the venue route');

  element('#game-button')?.click();
  await waitFor(() => options().some((option) => option.dataset.gameId === originalGameId), 'original game option');
  options().find((option) => option.dataset.gameId === originalGameId)?.click();
  await waitFor(() => state()?.gameId === originalGameId, 'Detail game restore');
  check(state()?.selectedVenueId === venueId, 'Restoring the game should preserve Venue identity');
}

function verifyLocalMap(venue) {
  if (venue.photo_url) {
    check(!element('#venue-detail .detail-local-map'), 'Photo-present Detail should not replace the existing hero with a local map');
    return;
  }

  const mapNode = element('#venue-detail .detail-local-map');
  check(Boolean(mapNode), 'No-photo Detail should render a local map');
  check(Number(mapNode?.dataset.latitude) === Number(venue.latitude), 'Detail local map should use canonical latitude');
  check(Number(mapNode?.dataset.longitude) === Number(venue.longitude), 'Detail local map should use canonical longitude');
  const zoom = Number(mapNode?.dataset.zoom);
  check(zoom >= 16.5 && zoom <= 17.5, 'Detail local map should use a tight few-block zoom');

  const maps = (window.CGBMapLibreRuntimeMock?.maps || []).filter((candidate) => !candidate.removed);
  const markers = (window.CGBMapLibreRuntimeMock?.markers || [])
    .filter((candidate) => !candidate.removed && !candidate.map?.removed);
  const map = maps.at(-1);
  check(maps.length === 1, 'Detail route should create only the Venue-local map');
  check(map?.options?.interactive === false, 'Detail local map should be noninteractive');
  check(map?.options?.attributionControl === false, 'Detail local map should add no map controls');
  check((map?.controls || []).length === 0, 'Detail local map should not add navigation or geolocation controls');
  check(Number(map?.options?.center?.[0]) === Number(venue.longitude) && Number(map?.options?.center?.[1]) === Number(venue.latitude), 'Detail local map should center on canonical Venue coordinates');
  check(markers.length === 1, 'Detail local map should create only one CGB marker');
  check(Number(markers[0]?.lngLat?.[0]) === Number(venue.longitude) && Number(markers[0]?.lngLat?.[1]) === Number(venue.latitude), 'Detail local marker should use canonical Venue coordinates');
}

function verifyIdentity(venue, hasParty) {
  const badges = badgeTexts();
  check(!badges.includes('COMMUNITY LOCATION'), 'Venue Detail should not expose COMMUNITY LOCATION');
  check(!badges.includes('Fan-selected'), 'Venue Detail should not use Fan-selected');
  check(badges.includes('WATCH PARTY') === hasParty, 'Venue Detail should preserve Watch Party identity');
  check(badges.includes('CAL BAR') === (venue.venue_type === 'cal_bar'), 'Venue Detail should preserve Cal Bar identity');
  const shouldShowFanAdded = venue.venue_type !== 'cal_bar' && venue.verification_status === 'user_added';
  check(badges.includes('FAN-ADDED') === shouldShowFanAdded, 'FAN-ADDED should reflect user_added provenance only for non-Cal-Bars');
}

function verifyHierarchy(venue) {
  const hero = element('#venue-detail .detail-hero');
  const address = hero?.querySelector('.detail-address');
  const addressActions = hero?.querySelector('.detail-address-actions');
  const directions = hero?.querySelector('.detail-directions-inline');
  const description = hero?.querySelector('.detail-description');
  check(address?.textContent?.includes(venue.address_line_1 || ''), 'Detail should preserve the useful street address');
  check(Boolean(directions), 'Directions should appear inline in the identity/address area');
  check(!element('#venue-detail > .action-row > a[href*="google.com/maps"]'), 'Directions should not remain in the sticky action row');
  if (venue.short_description) {
    check(Boolean(description), 'Venue short description should render when present');
    check(description?.parentElement === hero, 'Venue short description should live in the identity hierarchy');
    check(addressActions?.nextElementSibling === description, 'Venue short description should immediately follow the address action area');
  }
}

function verifyAttendance() {
  const primary = element('#venue-detail > .activity-card > strong');
  const number = primary?.querySelector('.bear-count__number');
  const label = primary?.querySelector('.bear-count__label');
  if (number?.textContent?.trim() === '1') {
    check(label?.textContent?.trim() === 'Bear watching here', 'Singular attendance should structurally separate 1 from Bear watching here');
  }
  check(!element('#venue-detail > .activity-card .detail-description'), 'Venue description should not be embedded in the activity card');
}

function verifyWatchParty(hasParty) {
  const parties = Array.from(document.querySelectorAll('#venue-detail > .party-module'));
  check((parties.length > 0) === hasParty, 'Detail should render Watch Party modules only when applicable');
  const contribution = element('#venue-detail > .detail-contribution');
  if (parties.length && contribution) {
    check(Boolean(parties.at(-1).compareDocumentPosition(contribution) & Node.DOCUMENT_POSITION_FOLLOWING), 'Detail Watch Parties should precede listing-improvement links');
  }
  parties.forEach((party) => {
    const style = getComputedStyle(party);
    check(style.overflowY !== 'auto' && style.overflowY !== 'scroll', 'Detail Watch Party should use page scroll instead of an internal scroll container');
    check(style.maxHeight === 'none' || !style.maxHeight, 'Detail Watch Party should not impose a max-height');
    const external = party.querySelector('a[target="_blank"]:not(.party-module__report)');
    if (external) check(external.textContent?.includes('External event details'), 'Watch Party external link should use the resolved copy');
  });
}

function verifyContribution() {
  const sections = document.querySelectorAll('#venue-detail > .detail-contribution');
  check(sections.length === 1, 'Detail should render one compact contribution section');
  const section = sections[0];
  check(section?.querySelector('h2')?.textContent?.trim() === 'Help improve this listing', 'Contribution section should use the resolved heading');
  check(!element('#venue-detail > [data-watch-party-form-entry-point]'), 'Watch Party contribution should be consolidated into the compact section');
  check(!element('#venue-detail > [data-cal-bar-nomination-entry]'), 'Cal Bar nomination should be consolidated into the compact section');
  check(!element('#venue-detail > [data-listing-update-entry]'), 'Listing report should be consolidated into the compact section');
  const labels = Array.from(section?.querySelectorAll('a') || []).map((link) => link.textContent?.trim() || '');
  check(labels.every((label) => !label.endsWith('.')), 'Contribution action labels should omit unnecessary terminal punctuation');
  check(labels.includes('Report a problem with this listing'), 'Listing report action should remain directly available');
}

function verifyStickyActions() {
  const row = element('#venue-detail > .action-row.detail-primary-actions');
  check(Boolean(row), 'Detail should retain the sticky primary action row');
  const labels = actionLabels(row);
  check((row?.children?.length || 0) === 2, 'Detail sticky action row should contain exactly two direct children');
  check(labels.length === 2, 'Detail sticky action row should contain exactly two primary actions');
  check(labels.some((label) => /I’ll be here|You’ll be here/.test(label)), 'Detail sticky row should retain Fan Intent');
  check(labels.includes('Share'), 'Detail sticky row should retain the updated Share action');
  check(!labels.includes('Directions') && !labels.some((label) => /Details/.test(label)), 'Detail sticky row should exclude Directions and Details');
}

function verifyImmediateSingleOwnerRerender(venue, hasParty) {
  window.CGBApp?.render?.();
  check(!element('#venue-detail .detail-game-context'), 'Base rerender should not recreate the superseded selected-game module');
  check(Boolean(element('#venue-detail .detail-local-map')) === !venue.photo_url, 'Base rerender should immediately retain the accepted no-photo map structure');
  check(Boolean(element('#venue-detail .detail-share .ui-icon')), 'Base renderer should emit the Detail Share icon without a later upgrade');
  check(Boolean(element('#venue-detail .detail-directions-inline .ui-icon')), 'Base renderer should emit the Detail Directions icon without a later upgrade');
  verifyIdentity(venue, hasParty);
  verifyHierarchy(venue);
  verifyAttendance();
  verifyWatchParty(hasParty);
  verifyContribution();
  verifyStickyActions();
}

async function main() {
  const params = new URLSearchParams(location.search);
  const requestedSlug = params.get('venue');
  const requestedGame = params.get('game');
  await waitFor(() =>
    document.querySelector('#app')?.getAttribute('aria-busy') === 'false' &&
    state()?.dataSource === 'live' &&
    state()?.snapshot?.venues?.some((candidate) => candidate.slug === requestedSlug),
  'live direct-route fixture');
  const currentState = state();
  const routeVenue = currentState?.snapshot?.venues?.find((candidate) => candidate.slug === requestedSlug);
  const selectedRouteVenue = currentState?.snapshot?.venues?.find((candidate) => candidate.venue_id === currentState.selectedVenueId);
  const venue = routeVenue || selectedRouteVenue || null;

  if (!venue) {
    failures.push(`Direct-route fixture Venue should exist for ${requestedSlug || '(missing slug)'}`);
    const marker = params.get('__cgb_harness') === 'desktop-direct'
      ? 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE'
      : 'CGB_PRODUCTION_DIRECT_ROUTE';
    result.textContent = `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`;
    return;
  }

  if (params.get('__cgb_prejoined') === '1' && sessionStorage.getItem('cgb_prejoined_reload') !== 'ready') {
    localStorage.setItem('cgb_v2_browser_id', 'browser_1234567890abcdef');
    localStorage.setItem('cgb_v2_fan_intent_selections', JSON.stringify({ [requestedGame]: venue.venue_id }));
    sessionStorage.setItem('cgb_prejoined_reload', 'ready');
    location.reload();
    return;
  }

  await waitFor(() => document.body.dataset.view === 'detail' && !element('#venue-detail .detail-game-context'), 'resolved Detail refinement');
  await waitFor(() => venue.photo_url || Boolean(element('#venue-detail .detail-local-map')), 'Venue-local map');
  await waitFor(() => Boolean(element('#venue-detail > .detail-contribution')), 'compact contribution section');

  const settledState = state();
  const game = settledState?.snapshot?.games?.find((candidate) => candidate.game_id === settledState.gameId);
  const selectedVenueId = settledState?.selectedVenueId;
  const hasParty = Boolean(partyFor(selectedVenueId, settledState?.gameId));

  verifyImmediateSingleOwnerRerender(venue, hasParty);
  await sleep(50);

  check(routeVenue?.venue_id === venue.venue_id, 'Direct Venue URL should resolve the requested Venue slug');
  check(settledState?.detailMode === true, 'Direct Venue URL should enter Detail mode');
  check(settledState?.gameId === requestedGame, 'Direct Venue URL should preserve the selected game');
  check(selectedVenueId === venue.venue_id, 'Direct Venue URL should preserve Venue identity');
  check(element('#venue-detail')?.dataset.venueId === venue.venue_id, 'Detail DOM should preserve Venue identity');
  check(visible('.site-header'), 'Global Cal Golden Bars header should remain visible on Detail');
  check(visible('#game-button'), 'Global game selector should remain visible and functional on Detail');
  check(!visible('.opening-stat'), 'Opening Watch Party/location stats should be absent on Detail');
  check(!element('#venue-detail .detail-game-context'), 'Duplicate in-page selected-game module should be absent');
  check(!element('#cgb-desktop-detail-hierarchy'), 'Detail presentation should not be injected as a runtime style correction');
  check(Array.from(document.styleSheets).some((sheet) => String(sheet.href || '').endsWith('/css/venue-detail.css')), 'Detail presentation should load from the static stylesheet chain');
  check(element('#header-game-label')?.textContent?.includes(game?.opponent_name || ''), 'Global game selector should identify the selected opponent');
  const kickoff = element('#header-kickoff')?.textContent?.trim() || '';
  check(game?.kickoff_status === 'tbd' ? kickoff.includes('Time TBD') : /\d/.test(kickoff), 'Global game selector should preserve known or TBD kickoff behavior');
  check(visible('#detail-back'), 'Back to map should remain accessible');
  check(!visible('.mobile-command-bar'), 'Mobile bottom command bar should remain hidden on Detail');

  verifyLocalMap(venue);
  verifyIdentity(venue, hasParty);
  verifyHierarchy(venue);
  verifyAttendance();
  verifyWatchParty(hasParty);
  verifyContribution();
  verifyStickyActions();

  if (params.get('__cgb_prejoined') === '1') {
    await waitFor(() => element('#venue-detail .intent-button')?.getAttribute('aria-pressed') === 'true', 'restored Fan Intent selection');
    check(element('#venue-detail .intent-button')?.getAttribute('aria-pressed') === 'true', 'Refresh should restore Fan Intent state');
    verifyStickyActions();
  }

  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, 'Detail should not create horizontal document overflow');
  await verifyGameSelectorRoundTrip(requestedGame, selectedVenueId);

  const marker = params.get('__cgb_harness') === 'desktop-direct'
    ? 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE'
    : 'CGB_PRODUCTION_DIRECT_ROUTE';
  result.textContent = failures.length
    ? `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : `${marker}_PASS`;
}

main().catch((error) => {
  result.textContent = `CGB_PRODUCTION_DIRECT_ROUTE_FAIL\n- ${error?.stack || error}`;
});
