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

function isMobile() {
  return window.matchMedia('(max-width: 899px)').matches;
}

function activeMaps() {
  return (window.CGBMapLibreRuntimeMock?.maps || []).filter((candidate) => !candidate.removed);
}

function localMapRuntime() {
  return activeMaps().find((candidate) => candidate.options?.interactive === false) || null;
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
    venue.photo_caption = 'Synthetic Cal gathering fixture for responsive Venue Profile testing.';
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
  const originalRouteGame = new URLSearchParams(location.search).get('game');
  element('#game-button')?.click();
  await waitFor(() => options().length > 1, 'global game selector options');
  const alternate = options().find((option) => option.dataset.gameId !== originalGameId);
  if (!alternate) {
    failures.push('Global game selector should expose an alternate game');
    return;
  }
  const alternateGameId = alternate.dataset.gameId;
  alternate.click();
  await waitFor(() => state()?.gameId === alternateGameId, 'Profile game change');
  check(state()?.selectedVenueId === venueId, 'Changing games from the Profile should preserve Venue identity');
  check(Boolean(new URLSearchParams(location.search).get('game')), 'Changing games from the Profile should preserve canonical game context in the URL');
  check(new URLSearchParams(location.search).get('game') !== originalRouteGame, 'Changing games should change the canonical game route parameter');
  check(new URLSearchParams(location.search).get('venue'), 'Changing games from the Profile should preserve the venue route');

  element('#game-button')?.click();
  await waitFor(() => options().some((option) => option.dataset.gameId === originalGameId), 'original game option');
  options().find((option) => option.dataset.gameId === originalGameId)?.click();
  await waitFor(() => state()?.gameId === originalGameId, 'Profile game restore');
  check(state()?.selectedVenueId === venueId, 'Restoring the game should preserve Venue identity');
  check(Boolean(new URLSearchParams(location.search).get('game')), 'Restoring the game should preserve canonical game context in the URL');
}

function verifyLocalMapOrPhoto(venue, fixtureMode) {
  const mobile = isMobile();
  const hero = element('#venue-detail .detail-hero');
  const photo = element('#venue-detail .detail-photo');
  const mapNode = element('#venue-detail .detail-local-map');

  if (fixtureMode === 'photo') {
    check(Boolean(photo), 'Photo-present Profile should render the approved photo figure');
    check(!mapNode, 'Photo-present Profile should replace the local-map fallback');
    check(hero?.firstElementChild === photo, 'Approved Venue photo should lead the Profile identity');
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
    check(activeMaps().length === (mobile ? 0 : 1), 'Photo-present Profile should retain only the desktop main map when applicable');
    return;
  }

  check(!photo, fixtureMode === 'broken'
    ? 'Failed Venue photo should be removed rather than leaving broken-image UI'
    : 'No-photo Profile should not render a photo figure');
  check(Boolean(mapNode), fixtureMode === 'broken'
    ? 'Failed Venue photo should restore the local-map fallback'
    : 'No-photo Profile should render a local-map fallback');
  check(hero?.firstElementChild === mapNode, 'Venue local map should lead the Profile identity');
  check(Number(mapNode?.dataset.latitude) === Number(venue.latitude), 'Profile local map should use canonical latitude');
  check(Number(mapNode?.dataset.longitude) === Number(venue.longitude), 'Profile local map should use canonical longitude');
  check(Number(mapNode?.dataset.zoom) === 16, 'Profile local map should use the approved wider local zoom');
  check(mapNode?.classList.contains('is-ready'), 'Profile local map should reveal only after MapLibre is ready');
  check(mapNode?.getAttribute('aria-busy') === 'false', 'Ready Profile local map should clear its busy state');
  check(getComputedStyle(mapNode).visibility === 'visible', 'Ready Profile local map should be visible');

  const map = localMapRuntime();
  const markers = (window.CGBMapLibreRuntimeMock?.markers || [])
    .filter((candidate) => !candidate.removed && candidate.map === map);
  check(activeMaps().length === (mobile ? 1 : 2), 'No-photo Profile should retain the main desktop map plus one local map, or only the local map on mobile');
  check(Boolean(map), 'Profile should create exactly one noninteractive local-map runtime');
  check(map?.options?.interactive === false, 'Profile local map should be noninteractive');
  check(map?.options?.attributionControl === false, 'Profile local map should add no map controls');
  check(Number(map?.options?.zoom) === 16, 'Profile local-map runtime should use the approved wider local zoom');
  check((map?.controls || []).length === 0, 'Profile local map should not add navigation or geolocation controls');
  check(Number(map?.options?.center?.[0]) === Number(venue.longitude) && Number(map?.options?.center?.[1]) === Number(venue.latitude), 'Profile local map should center on canonical Venue coordinates');
  check(markers.length === 1, 'Profile local map should create only one CGB marker');
  check(Number(markers[0]?.lngLat?.[0]) === Number(venue.longitude) && Number(markers[0]?.lngLat?.[1]) === Number(venue.latitude), 'Profile local marker should use canonical Venue coordinates');
}

function verifyIdentity(venue, hasParty) {
  const badges = badgeTexts();
  check(!badges.includes('COMMUNITY LOCATION'), 'Venue Profile should not expose COMMUNITY LOCATION');
  check(!badges.includes('Fan-selected'), 'Venue Profile should not use Fan-selected');
  check(badges.includes('WATCH PARTY') === hasParty, 'Venue Profile should preserve Watch Party identity');
  check(badges.includes('CAL BAR') === (venue.venue_type === 'cal_bar'), 'Venue Profile should preserve Cal Bar identity');
  const shouldShowFanAdded = venue.venue_type !== 'cal_bar' && venue.verification_status === 'user_added';
  check(badges.includes('FAN-ADDED') === shouldShowFanAdded, 'FAN-ADDED should reflect user_added provenance only for non-Cal-Bars');
}

function verifyBaseHierarchy(venue) {
  const hero = element('#venue-detail .detail-hero');
  const address = hero?.querySelector('.detail-address');
  const addressActions = hero?.querySelector('.detail-address-actions');
  const description = hero?.querySelector('.detail-description');
  check(address?.textContent?.includes(venue.address_line_1 || ''), 'Profile should preserve the useful street address');
  check(Boolean(hero?.querySelector('.detail-directions-inline')), 'Directions should appear inline in the identity/address area');
  if (venue.website_url) check(Boolean(hero?.querySelector('.detail-website-inline')), 'Venue website should appear in the identity/address area when available');
  if (description) {
    check(description.parentElement === hero, 'Base renderer should emit eligible short_description in the hero before profile refinement');
    check(addressActions?.nextElementSibling === description, 'Base short_description should immediately follow the address action area');
  }
}

function verifyHierarchy(venue) {
  const hero = element('#venue-detail .detail-hero');
  const address = hero?.querySelector('.detail-address');
  const directions = hero?.querySelector('.detail-directions-inline');
  const editorial = element('#venue-detail > .detail-editorial');
  const gameContext = element('#venue-detail > .detail-game-context');
  check(address?.textContent?.includes(venue.address_line_1 || ''), 'Profile should preserve the useful street address');
  check(Boolean(directions), 'Directions should appear inline in the identity/address area');
  check(!element('#venue-detail > .action-row > a[href*="google.com/maps"]'), 'Directions should not remain in the sticky action row');
  check(Boolean(gameContext), 'Complete Venue Profile should identify the selected game in-page');
  check(gameContext?.querySelector('.eyebrow')?.textContent?.trim() === 'Selected game', 'Selected-game module should be explicitly labeled');
  check(!hero?.querySelector('.detail-description'), 'Settled Venue Profile should not leave eligible editorial description inside the identity hero');
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
  check((parties.length > 0) === hasParty, 'Profile should render Watch Party modules only when applicable');
  const contribution = element('#venue-detail > .detail-contribution');
  if (parties.length && contribution) {
    check(Boolean(parties.at(-1).compareDocumentPosition(contribution) & Node.DOCUMENT_POSITION_FOLLOWING), 'Profile Watch Parties should precede listing-improvement links');
  }
  parties.forEach((party) => {
    const style = getComputedStyle(party);
    check(style.overflowY !== 'auto' && style.overflowY !== 'scroll', 'Watch Party should not create its own internal scroll container');
    check(style.maxHeight === 'none' || !style.maxHeight, 'Watch Party should not impose a max-height');
    const external = party.querySelector('a[target="_blank"]:not(.party-module__report)');
    if (external) check(external.textContent?.includes('External event details'), 'Watch Party external link should use the resolved copy');
    const report = party.querySelector('.party-module__report');
    if (report && isMobile()) {
      const reportStyle = getComputedStyle(report);
      check(reportStyle.justifySelf === 'end', 'Mobile Report an Issue should align to the right edge');
      check(Number.parseFloat(reportStyle.fontSize) <= 11, 'Mobile Report an Issue should remain a small utility action');
    }
  });
}

function verifyContribution(venue, fixtureMode) {
  const sections = document.querySelectorAll('#venue-detail > .detail-contribution');
  check(sections.length === 1, 'Profile should render one compact contribution section');
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
  check(actionGridStyle?.display === 'grid', 'Contribution actions should use the finished grid/list treatment');
  const columns = String(actionGridStyle?.gridTemplateColumns || '').split(' ').filter(Boolean);
  if (isMobile() && window.innerWidth >= 360) {
    check(columns.length === 2, 'Contribution actions should use two columns at normal mobile widths');
  } else if (!isMobile()) {
    check(columns.length === 1, 'Desktop Profile contributions should remain a tertiary one-column list');
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
  check(Boolean(row), 'Profile should retain the primary action row');
  const labels = actionLabels(row);
  check((row?.children?.length || 0) === 2, 'Profile primary action row should contain exactly two direct children');
  check(labels.length === 2, 'Profile primary action row should contain exactly two primary actions');
  check(labels.some((label) => /I’ll be here|You’ll be here/.test(label)), 'Profile primary row should retain Fan Intent');
  check(labels.includes('Share') || labels.includes('Invite more'), 'Profile primary row should retain the contextual share action');
  check(!labels.includes('Directions') && !labels.some((label) => /Details|View venue/.test(label)), 'Profile primary row should exclude Directions and any deeper Details transition');
}

async function verifyMobileBottomWhitespace() {
  if (!isMobile()) return;
  const row = element('#venue-detail > .action-row.detail-primary-actions');
  const nav = element('.mobile-command-bar');
  if (!row || !nav) return;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await sleep(30);
  const rowRect = row.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  check(rowRect.bottom <= navRect.top + 1, 'Mobile Profile sticky actions should remain above the global bottom navigation');
  check(navRect.bottom <= window.innerHeight + 1, 'Mobile Profile navigation should remain anchored to the viewport bottom');
  window.scrollTo(0, 0);
  await sleep(30);
}

function verifyDesktopRail() {
  if (isMobile()) return;
  const selected = element('#tray-selected');
  const profile = element('#venue-detail');
  check(visible('#map-view'), 'Desktop direct Venue presentation should keep the map visible');
  check(!visible('#detail-view'), 'Desktop should not expose the standalone Detail surface');
  check(profile?.parentElement === selected, 'Desktop should mount the complete Venue Profile in the selected rail');
  check(element('#venue-tray')?.dataset.state === 'selected', 'Desktop direct Venue presentation should open the selected Profile rail');
  const overflow = getComputedStyle(selected).overflowY;
  check(overflow === 'auto' || overflow === 'scroll', 'Desktop Venue Profile rail should be independently scrollable when needed');
  const trayRect = element('#venue-tray')?.getBoundingClientRect();
  check(Boolean(trayRect) && trayRect.top >= 0 && trayRect.bottom <= window.innerHeight + 1, 'Desktop Profile rail should remain within the viewport');
  check(!visible('#detail-back'), 'Desktop Profile should not manufacture a Back to map control');
}

function verifyImmediateSingleOwnerRerender(venue, hasParty, fixtureMode) {
  const priorMapNode = element('#venue-detail .detail-local-map');
  const priorLocalMap = localMapRuntime();
  window.CGBApp?.render?.();
  check(Boolean(element('#venue-detail .detail-game-context')), 'Base rerender should retain selected-game context in the complete Profile');
  const renderedMapNode = element('#venue-detail .detail-local-map');
  if (fixtureMode === 'none') {
    check(renderedMapNode === priorMapNode, 'Snapshot rerender should retain the settled local-map container');
    check(renderedMapNode?.classList.contains('is-ready'), 'Retained local map should remain ready across snapshot rerender');
    check(renderedMapNode?.getAttribute('aria-busy') === 'false', 'Retained local map should remain settled across snapshot rerender');
    check(getComputedStyle(renderedMapNode).visibility === 'visible', 'Retained local map should remain visible across snapshot rerender');
    check(localMapRuntime() === priorLocalMap, 'Snapshot rerender should retain the existing local MapLibre instance');
  } else {
    check(Boolean(renderedMapNode) === !venue.photo_url, 'Base renderer should preserve photo-present local-map eligibility');
  }
  check(Boolean(element('#venue-detail .detail-share .ui-icon')), 'Base renderer should emit the Profile Share icon without a later upgrade');
  check(Boolean(element('#venue-detail .detail-directions-inline .ui-icon')), 'Base renderer should emit the Profile Directions icon without a later upgrade');
  verifyIdentity(venue, hasParty);
  verifyBaseHierarchy(venue);
  verifyAttendance();
  verifyWatchParty(hasParty);
  verifyStickyActions();
}

async function main() {
  const params = new URLSearchParams(location.search);
  const requestedSlug = params.get('venue');
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

  const requestedGameId = currentState?.gameId;
  if (params.get('__cgb_prejoined') === '1' && sessionStorage.getItem('cgb_prejoined_reload') !== 'ready') {
    localStorage.setItem('cgb_v2_browser_id', 'browser_1234567890abcdef');
    localStorage.setItem('cgb_v2_fan_intent_selections', JSON.stringify({ [requestedGameId]: venue.venue_id }));
    sessionStorage.setItem('cgb_prejoined_reload', 'ready');
    location.reload();
    return;
  }

  const fixtureMode = configureVenuePhotoFixture(venue);
  if (fixtureMode !== 'none') window.CGBApp?.render?.();

  const mobile = isMobile();
  await waitFor(() =>
    document.body.dataset.view === (mobile ? 'detail' : 'map') &&
    Boolean(element('#venue-detail .detail-game-context')),
  'responsive Venue Profile presentation');
  await waitFor(() => Boolean(element('#venue-detail .detail-photo') || element('#venue-detail .detail-local-map')), 'Venue photo or local-map presentation');
  await waitFor(() => Boolean(element('#venue-detail > .detail-contribution')), 'compact contribution section');
  if (mobile) {
    await waitFor(
      () => document.body.dataset.detailState === 'ready' &&
        element('#detail-view')?.getAttribute('aria-busy') === 'false',
      'settled mobile Profile first-paint gate'
    );
  } else {
    await waitFor(
      () => element('#venue-detail')?.parentElement?.id === 'tray-selected' && visible('#map-view'),
      'settled desktop map-side Profile'
    );
  }
  if (fixtureMode === 'photo') await waitFor(() => Boolean(element('#venue-detail [data-photo-form-entry]')), 'configured Submit a Photo contribution');

  const settledState = state();
  const game = settledState?.snapshot?.games?.find((candidate) => candidate.game_id === settledState.gameId);
  const selectedVenueId = settledState?.selectedVenueId;
  const hasParty = Boolean(partyFor(selectedVenueId, settledState?.gameId));

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
  check(settledState?.detailMode === true, 'Direct Venue URL should activate the complete Profile state');
  check(settledState?.gameId === requestedGameId, 'Direct Venue URL should preserve the selected game');
  check(selectedVenueId === venue.venue_id, 'Direct Venue URL should preserve Venue identity');
  check(element('#venue-detail')?.dataset.venueId === venue.venue_id, 'Profile DOM should preserve Venue identity');
  check(visible('.site-header'), 'Global Cal Golden Bars header should remain visible on the Venue Profile');
  check(visible('#game-button'), 'Global game selector should remain visible and functional');
  check(Boolean(element('#venue-detail .detail-game-context')), 'Complete Profile should include selected-game context');
  check(!element('#cgb-desktop-detail-hierarchy'), 'Profile presentation should not be injected as a runtime style correction');
  check(Array.from(document.styleSheets).some((sheet) => String(sheet.href || '').endsWith('/css/venue-detail.css')), 'Profile presentation should load from the static stylesheet chain');
  check(element('#header-game-label')?.textContent?.includes(game?.opponent_name || ''), 'Global game selector should identify the selected opponent');
  check(element('#venue-detail .detail-game-context h2')?.textContent?.includes(game?.opponent_name || ''), 'In-profile game context should identify the selected opponent');
  const kickoff = element('#header-kickoff')?.textContent?.trim() || '';
  check(game?.kickoff_status === 'tbd' ? kickoff.includes('Time TBD') : /\d/.test(kickoff), 'Global game selector should preserve known or TBD kickoff behavior');

  if (mobile) {
    check(!visible('.opening-stat'), 'Opening Watch Party/location stats should be absent on mobile full Profile');
    check(visible('#detail-view'), 'Mobile direct Venue URL should use the full Profile destination');
    check(visible('#detail-back'), 'Mobile full Profile should keep Back to map visible');
    check(visible('.mobile-command-bar'), 'Mobile Profile should preserve the global Map / Search / Add / List navigation');
  } else {
    check(visible('.opening-stat'), 'Desktop should retain map-level Watch Party/location stats');
    check(!visible('.mobile-command-bar'), 'Desktop Profile should not expose the mobile bottom navigation');
    verifyDesktopRail();
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
    check(actionLabels(element('#venue-detail > .action-row.detail-primary-actions')).includes('Invite more'), 'Selected Profile should use Invite more for the contextual share action');
    check(Boolean(element('#venue-detail .detail-share .ui-icon')), 'Contextual Invite more action should retain the share icon');
    check(!element('#venue-detail .detail-post-join-invitation .post-join-share'), 'Profile should not duplicate the contextual share action inside a post-join message');
    verifyStickyActions();
  }

  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, 'Profile should not create horizontal document overflow');
  await verifyGameSelectorRoundTrip(requestedGameId, selectedVenueId);

  if (mobile) {
    element('#mobile-list-button')?.click();
    await waitFor(() =>
      state()?.detailMode === false &&
      document.body.dataset.view === 'map' &&
      element('#venue-tray')?.dataset?.state === 'full',
    'mobile Profile List navigation');
    check(state()?.selectedVenueId === selectedVenueId, 'Leaving mobile Profile through bottom navigation should preserve the selected Venue');
  } else {
    check(state()?.detailMode === true, 'Desktop command shell should keep the selected Venue in complete Profile state');
    check(visible('#map-view'), 'Desktop Profile should still be alongside the map after game-selector round trip');
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