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

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function ensurePhotoFormMeta() {
  const fields = {
    'cgb-photo-form-url': 'https://docs.google.com/forms/d/e/cgb-photo-test/viewform',
    'cgb-photo-form-venue-id-entry': 'entry.101',
    'cgb-photo-form-venue-name-entry': 'entry.202'
  };
  for (const [name, content] of Object.entries(fields)) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.append(meta);
    }
    meta.content = content;
  }
}

function configureVenuePhotoFixture(venue) {
  if (!venue) return 'none';
  if (venue.slug === 'golden-bear-test-pub-berkeley') {
    venue.photo_url = `${location.origin}/tests/fixtures/venue-photo.synthetic.svg`;
    venue.photo_caption = 'Synthetic Cal gathering fixture for responsive Venue Detail testing.';
    venue.photo_credit = '@cgb-test-fixture';
    venue.photo_credit_url = 'https://example.com/cgb-test-fixture';
    ensurePhotoFormMeta();
    return 'photo';
  }
  if (venue.slug === 'california-test-grill-san-francisco') {
    venue.photo_url = `${location.origin}/tests/fixtures/missing-venue-photo.webp`;
    venue.photo_caption = 'Broken photo fixture.';
    venue.photo_credit = 'CGB test fixture';
    venue.photo_credit_url = 'javascript:alert(1)';
    return 'broken';
  }
  return 'none';
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

function verifyLocalMapOrPhoto(venue, fixtureMode) {
  const hero = element('#venue-detail .detail-hero');
  const photo = element('#venue-detail .detail-photo');
  const mapNode = element('#venue-detail .detail-local-map');

  if (fixtureMode === 'photo') {
    check(Boolean(photo), 'Photo-present Detail should render the approved photo figure');
    check(!mapNode, 'Photo-present Detail should replace the local map');
    check(hero?.firstElementChild === photo, 'Approved Venue photo should lead the cohesive Detail identity card');
    const image = photo?.querySelector('.detail-photo__image');
    check(image?.src === safeExternalUrl(venue.photo_url), 'Venue photo should use the approved photo URL');
    check(image?.alt === venue.photo_caption, 'Venue photo alt text should prefer the approved caption');
    check(photo?.querySelector('.detail-photo__caption')?.textContent?.trim() === venue.photo_caption, 'Photo caption should render directly under the image');
    const credit = photo?.querySelector('.detail-photo__credit');
    check(credit?.textContent?.replace(/\s+/g, ' ').trim() === `Credit: ${venue.photo_credit}`, 'Photo credit should render as understated attribution');
    const creditLink = credit?.querySelector('a');
    check(creditLink?.textContent?.trim() === venue.photo_credit, 'Only the photo credit identity should be linkable');
    check(creditLink?.href === safeExternalUrl(venue.photo_credit_url), 'Valid HTTP(S) photo credit URL should be used');
    check(creditLink?.target === '_blank' && creditLink?.rel.includes('noopener'), 'Photo credit links should open externally and safely');
    const activeMaps = (window.CGBMapLibreRuntimeMock?.maps || []).filter((candidate) => !candidate.removed);
    check(activeMaps.length === 0, 'Photo-present Detail should retain no active local-map instance');
    return;
  }

  check(!photo, fixtureMode === 'broken'
    ? 'Failed Venue photo should be removed rather than leaving broken-image UI'
    : 'No-photo Detail should not render a photo figure');
  check(Boolean(mapNode), fixtureMode === 'broken'
    ? 'Failed Venue photo should restore the local-map fallback'
    : 'No-photo Detail should render a local map');
  check(hero?.firstElementChild === mapNode, 'Venue local map should lead the cohesive Detail identity card');
  check(Number(mapNode?.dataset.latitude) === Number(venue.latitude), 'Detail local map should use canonical latitude');
  check(Number(mapNode?.dataset.longitude) === Number(venue.longitude), 'Detail local map should use canonical longitude');
  const zoom = Number(mapNode?.dataset.zoom);
  check(zoom === 16, 'Detail local map should use the approved wider local zoom');
  check(mapNode?.classList.contains('is-ready'), 'Detail local map should reveal only after MapLibre is ready');
  check(mapNode?.getAttribute('aria-busy') === 'false', 'Ready Detail local map should clear its busy state');
  check(getComputedStyle(mapNode).visibility === 'visible', 'Ready Detail local map should be visible');

  const maps = (window.CGBMapLibreRuntimeMock?.maps || []).filter((candidate) => !candidate.removed);
  const markers = (window.CGBMapLibreRuntimeMock?.markers || [])
    .filter((candidate) => !candidate.removed && !candidate.map?.removed);
  const map = maps.at(-1);
  check(maps.length === 1, 'Detail route should create only the Venue-local map');
  check(map?.options?.interactive === false, 'Detail local map should be noninteractive');
  check(map?.options?.attributionControl === false, 'Detail local map should add no map controls');
  check(Number(map?.options?.zoom) === 16, 'Detail local map runtime should use the approved wider local zoom');
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

function verifyBaseHierarchy(venue) {
  const hero = element('#venue-detail .detail-hero');
  const address = hero?.querySelector('.detail-address');
  const addressActions = hero?.querySelector('.detail-address-actions');
  const description = hero?.querySelector('.detail-description');
  check(address?.textContent?.includes(venue.address_line_1 || ''), 'Detail should preserve the useful street address');
  check(Boolean(hero?.querySelector('.detail-directions-inline')), 'Directions should appear inline in the identity/address area');
  if (description) {
    check(description.parentElement === hero, 'Base renderer should still emit eligible short_description in the hero before profile refinement');
    check(addressActions?.nextElementSibling === description, 'Base short_description should immediately follow the address action area');
  }
}

function verifyHierarchy(venue) {
  const hero = element('#venue-detail .detail-hero');
  const address = hero?.querySelector('.detail-address');
  const directions = hero?.querySelector('.detail-directions-inline');
  const editorial = element('#venue-detail > .detail-editorial');
  check(address?.textContent?.includes(venue.address_line_1 || ''), 'Detail should preserve the useful street address');
  check(Boolean(directions), 'Directions should appear inline in the identity/address area');
  check(!element('#venue-detail > .action-row > a[href*="google.com/maps"]'), 'Directions should not remain in the sticky action row');
  check(!hero?.querySelector('.detail-description'), 'Settled Venue Detail should not leave eligible editorial description inside the identity hero');
  if (editorial) {
    check(editorial.querySelector('h2')?.textContent?.trim() === 'CGB SAYS', 'Eligible Venue editorial section should use the CGB SAYS label');
    check(editorial.querySelector('.detail-editorial__copy')?.textContent?.trim() === venue.short_description?.trim(), 'CGB SAYS should reuse the canonical short_description without creating another field');
    const activity = element('#venue-detail > .activity-card');
    if (activity) check(activity.nextElementSibling === editorial, 'CGB SAYS should follow Bear activity');
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
    const report = party.querySelector('.party-module__report');
    if (report) {
      const reportStyle = getComputedStyle(report);
      check(reportStyle.justifySelf === 'end', 'Detail Report an Issue should align to the right edge');
      check(Number.parseFloat(reportStyle.fontSize) <= 11, 'Detail Report an Issue should remain a small utility action');
    }
  });
}

function verifyContribution(venue, fixtureMode) {
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
  const actionGrid = section?.querySelector('.detail-contribution__actions');
  const actionGridStyle = actionGrid ? getComputedStyle(actionGrid) : null;
  check(actionGridStyle?.display === 'grid', 'Contribution actions should use the finished grid treatment');
  if (window.innerWidth >= 360) {
    const columns = String(actionGridStyle?.gridTemplateColumns || '').split(' ').filter(Boolean);
    check(columns.length === 2, 'Contribution actions should use two columns at normal mobile widths');
  }

  const photoLink = section?.querySelector('[data-photo-form-entry]');
  if (fixtureMode === 'photo') {
    check(photoLink?.textContent?.trim() === 'Submit a Photo', 'Configured photo Form should add Submit a Photo to the contribution area');
    const url = photoLink ? new URL(photoLink.href) : null;
    check(url?.hostname === 'docs.google.com', 'Photo contribution should use the configured Google Form');
    check(url?.searchParams.get('entry.101') === venue.venue_id, 'Photo Form should prefill the canonical Venue ID');
    check(url?.searchParams.get('entry.202') === venue.name, 'Photo Form should prefill the Venue name');
  } else {
    check(!photoLink, 'Missing photo Form configuration should not expose a broken Submit a Photo link');
  }
}

function verifyStickyActions() {
  const row = element('#venue-detail > .action-row.detail-primary-actions');
  check(Boolean(row), 'Detail should retain the sticky primary action row');
  const labels = actionLabels(row);
  check((row?.children?.length || 0) === 2, 'Detail sticky action row should contain exactly two direct children');
  check(labels.length === 2, 'Detail sticky action row should contain exactly two primary actions');
  check(labels.some((label) => /I’ll be here|You’ll be here/.test(label)), 'Detail sticky row should retain Fan Intent');
  check(labels.includes('Share') || labels.includes('Invite more'), 'Detail sticky row should retain the contextual share action');
  check(!labels.includes('Directions') && !labels.some((label) => /Details/.test(label)), 'Detail sticky row should exclude Directions and Details');
}

async function verifyMobileBottomWhitespace() {
  if (!window.matchMedia('(max-width: 899px)').matches) return;
  const row = element('#venue-detail > .action-row.detail-primary-actions');
  const nav = element('.mobile-command-bar');
  if (!row || !nav) return;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await sleep(30);
  const rowRect = row.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  check(rowRect.bottom <= navRect.top + 1, 'Mobile Detail sticky actions should remain above the global bottom navigation');
  check(navRect.bottom <= window.innerHeight + 1, 'Mobile Detail navigation should remain anchored to the viewport bottom');
  window.scrollTo(0, 0);
  await sleep(30);
}

function verifyImmediateSingleOwnerRerender(venue, hasParty, fixtureMode) {
  const priorMapNode = element('#venue-detail .detail-local-map');
  const priorActiveMap = (window.CGBMapLibreRuntimeMock?.maps || [])
    .find((candidate) => !candidate.removed);
  window.CGBApp?.render?.();
  check(!element('#venue-detail .detail-game-context'), 'Base rerender should not recreate the superseded selected-game module');
  const renderedMapNode = element('#venue-detail .detail-local-map');
  if (fixtureMode === 'none') {
    check(renderedMapNode === priorMapNode, 'Snapshot rerender should retain the settled local-map container');
    check(renderedMapNode?.classList.contains('is-ready'), 'Retained local map should remain ready across snapshot rerender');
    check(renderedMapNode?.getAttribute('aria-busy') === 'false', 'Retained local map should remain settled across snapshot rerender');
    check(getComputedStyle(renderedMapNode).visibility === 'visible', 'Retained local map should remain visible across snapshot rerender');
    const activeMaps = (window.CGBMapLibreRuntimeMock?.maps || []).filter((candidate) => !candidate.removed);
    check(activeMaps.length === 1 && activeMaps[0] === priorActiveMap, 'Snapshot rerender should retain exactly one MapLibre instance');
  } else {
    check(Boolean(renderedMapNode) === !venue.photo_url, 'Base renderer should preserve photo-present local-map eligibility');
  }
  check(Boolean(element('#venue-detail .detail-share .ui-icon')), 'Base renderer should emit the Detail Share icon without a later upgrade');
  check(Boolean(element('#venue-detail .detail-directions-inline .ui-icon')), 'Base renderer should emit the Detail Directions icon without a later upgrade');
  verifyIdentity(venue, hasParty);
  verifyBaseHierarchy(venue);
  verifyAttendance();
  verifyWatchParty(hasParty);
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

  const fixtureMode = configureVenuePhotoFixture(venue);
  if (fixtureMode !== 'none') window.CGBApp?.render?.();

  await waitFor(() => document.body.dataset.view === 'detail' && !element('#venue-detail .detail-game-context'), 'resolved Detail refinement');
  await waitFor(() => Boolean(element('#venue-detail .detail-photo') || element('#venue-detail .detail-local-map')), 'Venue photo or local-map presentation');
  await waitFor(() => Boolean(element('#venue-detail > .detail-contribution')), 'compact contribution section');
  if (fixtureMode === 'photo') await waitFor(() => Boolean(element('#venue-detail [data-photo-form-entry]')), 'configured Submit a Photo contribution');

  const settledState = state();
  const game = settledState?.snapshot?.games?.find((candidate) => candidate.game_id === settledState.gameId);
  const selectedVenueId = settledState?.selectedVenueId;
  const hasParty = Boolean(partyFor(selectedVenueId, settledState?.gameId));
  const mobile = window.matchMedia('(max-width: 899px)').matches;

  if (fixtureMode === 'none') {
    await waitFor(() => element('#venue-detail .detail-local-map')?.classList.contains('is-ready'), 'initial ready Venue local map');
  }
  verifyImmediateSingleOwnerRerender(venue, hasParty, fixtureMode);
  await waitFor(() => Boolean(element('#venue-detail .detail-photo') || element('#venue-detail .detail-local-map')), 'post-rerender Venue media refinement');
  if (fixtureMode !== 'photo') {
    await waitFor(() => element('#venue-detail .detail-local-map')?.classList.contains('is-ready'), 'ready Venue local map');
  }
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
  check(visible('#detail-back'), 'Venue Detail should keep Back to map visible');
  if (mobile) {
    check(visible('.mobile-command-bar'), 'Mobile Detail should preserve the global Map / Search / Add / List navigation');
  } else {
    check(!visible('.mobile-command-bar'), 'Desktop Detail should not expose the mobile bottom navigation');
  }

  verifyLocalMapOrPhoto(venue, fixtureMode);
  verifyIdentity(venue, hasParty);
  verifyHierarchy(venue);
  verifyAttendance();
  verifyWatchParty(hasParty);
  verifyContribution(venue, fixtureMode);
  verifyStickyActions();
  await verifyMobileBottomWhitespace();

  if (params.get('__cgb_prejoined') === '1') {
    await waitFor(() => element('#venue-detail .intent-button')?.getAttribute('aria-pressed') === 'true', 'restored Fan Intent selection');
    check(element('#venue-detail .intent-button')?.getAttribute('aria-pressed') === 'true', 'Refresh should restore Fan Intent state');
    await waitFor(() => actionLabels(element('#venue-detail > .action-row.detail-primary-actions')).includes('Invite more'), 'contextual Invite more action');
    check(actionLabels(element('#venue-detail > .action-row.detail-primary-actions')).includes('Invite more'), 'Selected Detail should use Invite more for the contextual share action');
    check(Boolean(element('#venue-detail .detail-share .ui-icon')), 'Contextual Invite more action should retain the share icon');
    check(!element('#venue-detail .detail-post-join-invitation .post-join-share'), 'Detail should not duplicate the contextual share action inside a post-join message');
    verifyStickyActions();
  }

  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, 'Detail should not create horizontal document overflow');
  await verifyGameSelectorRoundTrip(requestedGame, selectedVenueId);

  if (mobile) {
    element('#mobile-list-button')?.click();
    await waitFor(() =>
      state()?.detailMode === false &&
      document.body.dataset.view === 'map' &&
      element('#venue-tray')?.dataset?.state === 'full',
    'Detail List navigation');
    check(state()?.selectedVenueId === selectedVenueId, 'Leaving Detail through bottom navigation should preserve the selected Venue');
  }

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
