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

async function waitFor(predicate, label, timeout = 12000) {
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

function click(selector) {
  const node = element(selector);
  check(Boolean(node), `Missing control: ${selector}`);
  node?.click();
}

function finish(marker) {
  if (!result) return;
  result.textContent = failures.length
    ? `${marker}_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : `${marker}_PASS`;
}

async function ready(desktop = false) {
  await waitFor(() =>
    document.readyState === 'complete' &&
    element('#app')?.getAttribute('aria-busy') === 'false' &&
    Boolean(state()?.snapshot) &&
    state()?.dataSource === 'live' &&
    window.matchMedia('(max-width: 899px)').matches === !desktop,
  desktop ? 'desktop application' : 'mobile application');
}

function partyVenue() {
  const current = state();
  const active = current?.snapshot?.watchParties?.find((party) =>
    party.game_id === current.gameId && party.event_status === 'active');
  return current?.snapshot?.venues?.find((venue) => venue.venue_id === active?.venue_id) || null;
}

async function openList() {
  if (document.body.dataset.commandSurface !== 'list' || element('#venue-tray')?.dataset?.state !== 'full') {
    click('#mobile-list-button');
  }
  await waitFor(() => visible('#tray-list') && element('#venue-tray')?.dataset?.state === 'full', 'Locations list');
}

async function selectVenue(venue) {
  if (!venue) return;
  await openList();
  const selector = `#location-list .location-card[data-venue-id="${venue.venue_id}"]`;
  check(Boolean(element(selector)), `Venue ${venue.venue_id} should appear in Locations`);
  click(selector);
  await waitFor(() => state()?.selectedVenueId === venue.venue_id && visible('#tray-selected'), `selected venue ${venue.name}`);
}

async function runMobile() {
  await ready(false);
  const phase = sessionStorage.getItem('cgb_smoke_phase') || 'initial';

  if (phase === 'profile') {
    await waitFor(() =>
      state()?.detailMode === true &&
      visible('#venue-detail') &&
      visible('#venue-detail [data-fan-experiences]'),
    'mobile full Venue Profile with BEARS SAY');
    check(document.body.dataset.view === 'detail', 'Mobile full Venue Profile should use Detail view');
    const section = element('#venue-detail [data-fan-experiences]');
    check(section?.querySelector('h2')?.textContent?.trim() === 'BEARS SAY', 'Mobile full Venue Profile should show BEARS SAY');
    check(section?.textContent?.includes('Synthetic Bears Say experience for browser coverage.'), 'Mobile BEARS SAY should show the Fan Experience text');
    const mark = section?.querySelector('.detail-fan-experiences__mark');
    check(visible(mark), 'Mobile BEARS SAY should visibly render the decorative opening quote');
    const attribution = section?.querySelector('.detail-fan-experiences__attribution');
    check(visible(attribution), 'Mobile BEARS SAY should visibly render attribution');
    check(attribution?.textContent?.trim() === 'Synthetic Bear · 2026', 'Mobile BEARS SAY should render display name and year together');
    const year = section?.querySelector('.detail-fan-experiences__year');
    check(visible(year), 'Mobile BEARS SAY should visibly render the submission year');
    check(year?.textContent?.trim() === '2026', 'Mobile BEARS SAY should render the expected submission year');
    const invite = element('#venue-detail .detail-share');
    check(visible(invite), 'Mobile full Venue Profile should visibly render Invite Others');
    check(invite?.textContent?.trim() === 'Invite Others', 'Selected mobile full Profile should label the share action Invite Others');
    check(!invite?.querySelector('.ui-icon'), 'Mobile full Profile Invite Others should remain text-only without a late icon');
    const localMap = element('#venue-detail .detail-local-map');
    if (localMap) check(localMap.dataset.zoom === '15.4', 'Mobile full Profile map preview should use the slightly wider zoom');
    finish('CGB_SMOKE_MOBILE');
    return;
  }

  check(document.body.dataset.commandSurface === 'map', 'Mobile should open on Map');
  check(Boolean(state()?.gameId), 'A default game should be selected');
  check((state()?.snapshot?.venues?.length || 0) > 0, 'Locations should load');
  check(visible('#map-view'), 'Map should be visible');

  if (phase === 'joined') {
    const selectedVenueId = Object.values(JSON.parse(localStorage.getItem('cgb_v2_fan_intent_selections') || '{}'))[0];
    check(Boolean(selectedVenueId), 'Fan Intent selection should persist through reload');
    await openList();
    const persistedCard = element(`#location-list .location-card[data-venue-id="${selectedVenueId}"]`);
    check(Boolean(persistedCard), 'Persisted Fan Intent venue should still render');

    const party = partyVenue();
    check(Boolean(party), 'Fixture should include an active Watch Party');
    await selectVenue(party);
    check(visible('#tray-selected .party-module'), 'Watch Party details should render on the selected Venue Profile');

    click('#mobile-search-button');
    await waitFor(() => document.body.dataset.commandSurface === 'search' && visible('#search-surface'), 'Search surface');
    click('#search-surface [data-command-close]');
    await waitFor(() => document.body.dataset.commandSurface === 'map', 'Search close to Map');

    await waitFor(() => visible('#tray-selected .selected-card__details'), 'mobile full Profile action');
    const details = element('#tray-selected .selected-card__details');
    check(Boolean(details?.href), 'Selected mobile Venue should expose a full Profile URL');
    if (failures.length || !details?.href) {
      finish('CGB_SMOKE_MOBILE');
      return;
    }
    sessionStorage.setItem('cgb_smoke_phase', 'profile');
    location.assign(details.href);
    return;
  }

  await openList();
  const firstCard = element('#location-list .location-card[data-venue-id]');
  check(Boolean(firstCard), 'At least one Location card should render');
  const firstVenueId = firstCard?.dataset?.venueId;
  firstCard?.click();
  await waitFor(() => state()?.selectedVenueId === firstVenueId && visible('#tray-selected'), 'Venue Profile selection');

  click('#mobile-list-button');
  await waitFor(() => document.body.dataset.commandSurface === 'list' && visible('#tray-list'), 'Profile to Locations');
  click('#mobile-map-button');
  await waitFor(() => document.body.dataset.commandSurface === 'map' && visible('#map-view'), 'Locations to Map');

  const intentButton = element('#tray-selected .intent-button');
  check(Boolean(intentButton), 'Selected Venue Profile should expose Fan Intent');
  intentButton?.click();
  await waitFor(() =>
    element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true' &&
    !state()?.fanIntent?.pending,
  'Fan Intent join');

  if (failures.length) {
    finish('CGB_SMOKE_MOBILE');
    return;
  }

  sessionStorage.setItem('cgb_smoke_phase', 'joined');
  location.reload();
}

async function runDesktop() {
  await ready(true);
  check(visible('#map-view'), 'Desktop map should be visible');
  check(visible('#tray-list'), 'Desktop Locations should be visible');
  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'Desktop should not have horizontal page overflow');

  const party = partyVenue() || state()?.snapshot?.venues?.[0];
  check(Boolean(party), 'Desktop fixture should include a venue');
  await selectVenue(party);
  check(visible('#tray-selected'), 'Desktop Venue Profile should render after selection');
  if (partyVenue()?.venue_id === party?.venue_id) {
    check(visible('#tray-selected .party-module'), 'Desktop Watch Party should render in the Venue Profile');
  }
  finish('CGB_SMOKE_DESKTOP');
}

try {
  if (mode === 'desktop') await runDesktop();
  else await runMobile();
} catch (error) {
  failures.push(error?.stack || error?.message || String(error));
  finish(mode === 'desktop' ? 'CGB_SMOKE_DESKTOP' : 'CGB_SMOKE_MOBILE');
}