const result = document.querySelector('#cgb-production-runtime-result');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function element(selector) {
  return document.querySelector(selector);
}

function state() {
  return window.CGBApp?.getState?.() || null;
}

function isMobile() {
  return window.matchMedia('(max-width: 899px)').matches;
}

function visible(selectorOrElement) {
  const node = typeof selectorOrElement === 'string' ? element(selectorOrElement) : selectorOrElement;
  if (!node || node.hidden) return false;
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function sleep(ms = 20) {
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

function slugifyRoute(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function routeGameId(snapshot, routeValue) {
  const routeSlug = slugifyRoute(routeValue);
  if (!routeSlug) return '';
  return snapshot?.games?.find((game) => slugifyRoute(game.opponent_name) === routeSlug)?.game_id || '';
}

function actionLabels(row) {
  return [...(row?.children || [])]
    .filter((node) => node.matches?.('a, button'))
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() || '');
}

function badgeTexts() {
  return [...document.querySelectorAll('#venue-detail .venue-badge')]
    .map((badge) => badge.textContent?.trim())
    .filter(Boolean);
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
  ensurePhotoFormMeta();
  if (venue.slug === 'golden-bear-test-pub-berkeley') {
    venue.photo_url = `${location.origin}/tests/fixtures/venue-photo.synthetic.svg`;
    venue.photo_caption = 'Synthetic Cal gathering fixture for responsive Venue Profile testing.';
    venue.photo_credit = '@cgb-test-fixture';
    venue.photo_credit_url = 'https://example.com/cgb-test-fixture';
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

function verifyStickyActions() {
  const row = element('#venue-detail > .action-row.detail-primary-actions');
  check(Boolean(row), 'Profile should retain the primary action row');
  const labels = actionLabels(row);
  check(labels.length === 2, 'Profile primary action row should contain exactly two primary actions');
  check(labels.some((label) => /I’ll be here|You’ll be here/.test(label)), 'Profile primary row should retain Fan Intent');
  check(labels.includes('Share') || labels.includes('Invite Others'), 'Profile primary row should retain the contextual share action');
  check(!labels.includes('Directions') && !labels.some((label) => /Details|View venue/.test(label)), 'Profile primary row should exclude Directions and a deeper Details transition');
}

function verifyResponsiveShell() {
  if (isMobile()) {
    check(visible('#detail-view'), 'Mobile direct Venue URL should use the full Profile destination');
    check(visible('#detail-back'), 'Mobile full Profile should keep Back to map visible');
    check(visible('.mobile-command-bar'), 'Mobile Profile should preserve the global Map / Search / Add / List navigation');
    return;
  }

  check(visible('#map-view'), 'Desktop direct Venue presentation should keep the map visible');
  check(!visible('#detail-view'), 'Desktop should not expose the standalone Detail surface');
  check(element('#venue-detail')?.parentElement?.id === 'tray-selected', 'Desktop should mount the complete Venue Profile in the selected rail');
  check(element('#venue-tray')?.dataset?.state === 'selected', 'Desktop direct Venue presentation should open the selected Profile rail');
  check(!visible('#detail-back'), 'Desktop Profile should not manufacture a Back to map control');
  check(visible('.mobile-command-bar'), 'Desktop Profile should preserve the shared Selected / Locations controls');
  check(element('#mobile-map-button span:last-child')?.textContent?.trim() === 'Selected', 'Desktop shared control should present Selected');
  check(element('#mobile-list-button span:last-child')?.textContent?.trim() === 'Locations', 'Desktop shared control should present Locations');
  check(!visible('#mobile-search-button') && !visible('#mobile-add-button') && !visible('#mobile-about-button'), 'Desktop shared controls should hide mobile-only commands');
}

function verifyIdentity(venue, hasParty) {
  const badges = badgeTexts();
  check(!badges.includes('COMMUNITY LOCATION'), 'Venue Profile should not expose COMMUNITY LOCATION');
  check(badges.includes('WATCH PARTY') === hasParty, 'Venue Profile should preserve Watch Party identity');
  check(badges.includes('CAL BAR') === (venue.venue_type === 'cal_bar'), 'Venue Profile should preserve Cal Bar identity');
  check(element('#venue-detail h1')?.textContent?.trim() === venue.name, 'Venue Profile should preserve Venue name');
  check(element('#venue-detail .detail-address')?.textContent?.includes(venue.address_line_1 || ''), 'Profile should preserve the useful street address');
  check(Boolean(element('#venue-detail .detail-directions-inline')), 'Directions should appear inline in the identity area');
  check(!element('#venue-detail .detail-game-context'), 'Profile should not duplicate selected-game context below the global selector');
}

function verifyWatchParty(hasParty) {
  const modules = [...document.querySelectorAll('#venue-detail > .party-module')];
  check((modules.length > 0) === hasParty, 'Profile should render Watch Party modules only when applicable');
  modules.forEach((module) => {
    const style = getComputedStyle(module);
    check(style.overflowY !== 'auto' && style.overflowY !== 'scroll', 'Full Venue Profile Watch Party should not create an internal scrollbar');
    check(style.maxHeight === 'none' || !style.maxHeight, 'Full Venue Profile Watch Party should not impose a compact-card max-height');
  });
}

function verifyContribution(venue, fixtureMode) {
  const contribution = element('#venue-detail > .detail-contribution');
  check(Boolean(contribution), 'Profile should render one compact contribution section');
  check(contribution?.querySelector('h2')?.textContent?.trim() === 'Help improve this listing', 'Contribution section should use the resolved heading');
  const photoLink = contribution?.querySelector('[data-photo-form-entry="contribution"]');
  check(photoLink?.textContent?.trim() === 'Submit a Photo', 'Configured photo Form should add Submit a Photo to the contribution area');
  const url = photoLink ? new URL(photoLink.href) : null;
  check(url?.hostname === 'docs.google.com', 'Photo contribution should use the configured Google Form');
  check(url?.searchParams.get('entry.101') === venue.venue_id, 'Photo Form should prefill the canonical Venue ID');
  check(url?.searchParams.get('entry.202') === venue.name, 'Photo Form should prefill the Venue name');
  const overlay = element('#venue-detail [data-photo-form-entry="map-overlay"]');
  check(fixtureMode === 'photo' ? !overlay : overlay?.href === photoLink?.href, 'Photo entry points should reflect whether a photo is already present');
}

function verifyLocalMapOrPhoto(venue, fixtureMode) {
  const photo = element('#venue-detail .detail-photo');
  const mapNode = element('#venue-detail .detail-local-map');
  if (fixtureMode === 'photo') {
    check(Boolean(photo), 'Photo-present Profile should render the approved photo figure');
    check(!mapNode, 'Photo-present Profile should replace the local-map fallback');
    const image = photo?.querySelector('.detail-photo__image');
    check(image?.src === safeExternalUrl(venue.photo_url), 'Venue photo should use the approved photo URL');
    check(image?.alt === venue.photo_caption, 'Venue photo alt text should prefer the approved caption');
    const creditLink = photo?.querySelector('.detail-photo__credit a');
    check(creditLink?.href === safeExternalUrl(venue.photo_credit_url), 'Valid HTTP(S) photo credit URL should be used');
    return;
  }

  check(!photo, fixtureMode === 'broken' ? 'Failed Venue photo should be removed rather than leaving broken-image UI' : 'No-photo Profile should not render a photo figure');
  check(Boolean(mapNode), fixtureMode === 'broken' ? 'Failed Venue photo should restore the local-map fallback' : 'No-photo Profile should render a local-map fallback');
  check(mapNode?.classList.contains('is-ready') && mapNode?.getAttribute('aria-busy') === 'false', 'Profile local map should reveal only after MapLibre is ready');
  check(Number(mapNode?.dataset.latitude) === Number(venue.latitude) && Number(mapNode?.dataset.longitude) === Number(venue.longitude), 'Profile local map should use canonical Venue coordinates');
  const photoAction = mapNode?.querySelector(':scope > .detail-local-map__photo-action');
  check(photoAction?.textContent?.trim() === 'Add a Photo!', 'Local-map fallback should expose the contextual Add a Photo action');
  const runtime = localMapRuntime();
  check(Boolean(runtime) && runtime.options?.interactive === false, 'Profile should create a noninteractive local-map runtime');
}

async function verifyGameSelectorRoundTrip(originalGameId, venueId) {
  const options = () => [...document.querySelectorAll('#game-list .game-option')];
  const originalRouteGame = new URLSearchParams(location.search).get('game');
  element('#game-button')?.click();
  await waitFor(() => element('#game-dialog')?.open === true && options().length > 1, 'global game selector options');
  const alternate = options().find((option) => option.dataset.gameId !== originalGameId);
  check(Boolean(alternate), 'Global game selector should expose an alternate game');
  if (!alternate) return;
  const alternateGameId = alternate.dataset.gameId;
  alternate.click();
  await waitFor(() => state()?.gameId === alternateGameId, 'Profile game change');
  check(state()?.selectedVenueId === venueId, 'Changing games from the Profile should preserve Venue identity');
  check(new URLSearchParams(location.search).get('game') !== originalRouteGame, 'Changing games should change the canonical game route parameter');
  check(Boolean(new URLSearchParams(location.search).get('venue')), 'Changing games from the Profile should preserve the Venue route');

  element('#game-button')?.click();
  await waitFor(() => element('#game-dialog')?.open === true && options().some((option) => option.dataset.gameId === originalGameId), 'original game option');
  options().find((option) => option.dataset.gameId === originalGameId)?.click();
  await waitFor(() => state()?.gameId === originalGameId, 'Profile game restore');
  check(state()?.selectedVenueId === venueId, 'Restoring the game should preserve Venue identity');
}

async function main() {
  const params = new URLSearchParams(location.search);
  const requestedSlug = params.get('venue');
  const requestedGameRoute = params.get('game');
  await waitFor(() => {
    const current = state();
    const expectedGameId = routeGameId(current?.snapshot, requestedGameRoute);
    return element('#app')?.getAttribute('aria-busy') === 'false' &&
      current?.dataSource === 'live' &&
      current?.snapshot?.venues?.some((venue) => venue.slug === requestedSlug) &&
      Boolean(expectedGameId) &&
      current?.gameId === expectedGameId;
  }, 'live direct-route fixture', 15000);

  const initialState = state();
  const venue = initialState?.snapshot?.venues?.find((candidate) => candidate.slug === requestedSlug) || null;
  const requestedGameId = routeGameId(initialState?.snapshot, requestedGameRoute);
  const marker = params.get('__cgb_harness') === 'desktop-direct'
    ? 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE'
    : 'CGB_PRODUCTION_DIRECT_ROUTE';
  if (!venue || !requestedGameId) {
    failures.push(`Direct-route fixture should resolve Venue and game for ${requestedSlug || '(missing slug)'}`);
    result.textContent = `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`;
    return;
  }

  const mobile = isMobile();
  if (mobile) {
    await waitFor(() =>
      document.body.dataset.view === 'detail' &&
      document.body.dataset.detailState === 'ready' &&
      element('#detail-view')?.getAttribute('aria-busy') === 'false' &&
      Boolean(element('#venue-detail .detail-hero')),
    'settled mobile Profile first-paint gate', 15000);
  } else {
    await waitFor(() =>
      document.body.dataset.view === 'map' &&
      element('#venue-detail')?.parentElement?.id === 'tray-selected' &&
      visible('#map-view'),
    'settled desktop map-side Profile', 15000);
  }

  const fixtureMode = configureVenuePhotoFixture(venue);
  window.CGBApp?.render?.();
  await waitFor(() => Boolean(element('#venue-detail .detail-hero')), 'responsive Venue Profile presentation');
  await waitFor(() => Boolean(element('#venue-detail .detail-photo') || element('#venue-detail .detail-local-map')), 'Venue photo or local-map presentation');
  await waitFor(() => Boolean(element('#venue-detail > .detail-contribution')), 'compact contribution section');
  if (fixtureMode !== 'photo') {
    await waitFor(() => element('#venue-detail .detail-local-map')?.classList.contains('is-ready'), 'ready Venue local map');
    await waitFor(() => Boolean(element('#venue-detail [data-photo-form-entry="map-overlay"]')), 'Add a photo local-map action');
  }

  const settled = state();
  const game = settled?.snapshot?.games?.find((candidate) => candidate.game_id === settled.gameId);
  const selectedVenueId = settled?.selectedVenueId;
  const hasParty = Boolean(partyFor(selectedVenueId, settled?.gameId));
  check(settled?.detailMode === true, 'Direct Venue URL should activate the complete Profile state');
  check(selectedVenueId === venue.venue_id, 'Direct Venue URL should preserve Venue identity');
  check(element('#venue-detail')?.dataset?.venueId === venue.venue_id, 'Profile DOM should preserve Venue identity');
  check(visible('.site-header'), 'Global Cal Golden Bars header should remain visible on the Venue Profile');
  check(visible('#game-button'), 'Global game selector should remain visible and functional');
  check(element('#header-game-label')?.textContent?.includes(game?.opponent_name || ''), 'Global game selector should identify the selected opponent');
  const kickoff = element('#header-kickoff')?.textContent?.trim() || '';
  check(game?.kickoff_status === 'tbd' ? kickoff.includes('Time TBD') : /\d/.test(kickoff), 'Global game selector should preserve known or TBD kickoff behavior');

  verifyResponsiveShell();
  verifyIdentity(venue, hasParty);
  verifyWatchParty(hasParty);
  verifyContribution(venue, fixtureMode);
  verifyLocalMapOrPhoto(venue, fixtureMode);
  verifyStickyActions();

  if (params.get('__cgb_prejoined') === '1') {
    await waitFor(() => element('#venue-detail .intent-button')?.getAttribute('aria-pressed') === 'true', 'restored Fan Intent selection');
    check(element('#venue-detail .intent-button')?.getAttribute('aria-pressed') === 'true', 'Refresh should restore Fan Intent state');
    await waitFor(() => actionLabels(element('#venue-detail > .action-row.detail-primary-actions')).includes('Invite Others'), 'contextual Invite Others action');
    check(actionLabels(element('#venue-detail > .action-row.detail-primary-actions')).includes('Invite Others'), 'Selected Profile should use Invite Others for the contextual share action');
    check(!element('#venue-detail .post-join-invitation'), 'Selected Profile should not duplicate its contextual share action in a second invitation panel');
    verifyStickyActions();
  }

  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, 'Profile should not create horizontal document overflow');
  await verifyGameSelectorRoundTrip(requestedGameId, selectedVenueId);

  if (mobile) {
    element('#mobile-list-button')?.click();
    await waitFor(() =>
      state()?.detailMode === false &&
      document.body.dataset.view === 'map' &&
      document.body.dataset.commandSurface === 'list' &&
      element('#venue-tray')?.dataset?.state === 'full' &&
      visible('#tray-list'),
    'mobile Profile List navigation');
    check(state()?.selectedVenueId === selectedVenueId, 'Leaving mobile Profile through List should preserve the selected Venue');
  } else {
    check(state()?.detailMode === true, 'Desktop command shell should keep the selected Venue in complete Profile state');
    check(visible('#map-view'), 'Desktop Profile should remain alongside the map after the game-selector round trip');
  }

  result.textContent = failures.length
    ? `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : `${marker}_PASS`;
}

main().catch((error) => {
  result.textContent = `CGB_PRODUCTION_DIRECT_ROUTE_FAIL\n- ${error?.stack || error}`;
});