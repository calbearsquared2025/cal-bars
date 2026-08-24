const result = document.querySelector('#cgb-browser-acceptance-result');
const failures = [];
const params = new URLSearchParams(location.search);
const mode = params.get('__cgb_acceptance') || 'mobile-flow';

function check(condition, message) {
  if (!condition) failures.push(message);
}

function element(selector) {
  return document.querySelector(selector);
}

function isVisible(selectorOrElement) {
  const target = typeof selectorOrElement === 'string' ? element(selectorOrElement) : selectorOrElement;
  if (!target || target.hidden) return false;
  const style = getComputedStyle(target);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function click(selector) {
  const target = element(selector);
  check(Boolean(target), `Missing control: ${selector}`);
  target?.click();
  return target;
}

function sleep(ms = 10) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, label, attempts = 1600) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (predicate()) return true;
    } catch (_) {}
    await sleep();
  }
  failures.push(`Timed out waiting for ${label}`);
  return false;
}

function snapshot() {
  return window.CGBApp?.getSnapshot?.() || window.CGBApp?.getState?.()?.snapshot || null;
}

function venueBySlug(slug) {
  return snapshot()?.venues?.find((venue) => venue.slug === slug) || null;
}

function gameByOpponent(opponent) {
  return snapshot()?.games?.find((game) => game.opponent_name === opponent) || null;
}

function routeVenue() {
  return venueBySlug(params.get('venue') || '');
}

function routeGame() {
  const requested = (params.get('game') || '').toLowerCase();
  return snapshot()?.games?.find((game) => game.opponent_name?.toLowerCase() === requested) || null;
}

async function waitForReady() {
  return waitFor(() =>
    document.readyState === 'complete' &&
    element('#app')?.getAttribute('aria-busy') === 'false' &&
    Boolean(snapshot()) &&
    !element('#header-game-label')?.textContent?.includes('Loading'),
  'application readiness', 2400);
}

async function openLocations() {
  const list = element('#tray-list');
  if (!isVisible(list)) click('#mobile-list-button');
  return waitFor(() => isVisible('#tray-list') && document.querySelectorAll('#location-list .location-card[data-venue-id]').length > 0,
    'visible Locations list');
}

async function chooseVenue(slug) {
  const venue = venueBySlug(slug);
  check(Boolean(venue), `Fixture venue not found: ${slug}`);
  if (!venue) return null;
  await openLocations();
  const button = element(`#location-list .location-card[data-venue-id="${venue.venue_id}"]`);
  check(Boolean(button), `Locations list is missing ${venue.name}`);
  button?.click();
  await waitFor(() => isVisible('#tray-selected') && element('#tray-selected')?.textContent?.includes(venue.name),
    `selected preview for ${venue.name}`);
  return venue;
}

async function openMobileProfile(venue) {
  const details = element('#tray-selected .selected-card__details');
  check(isVisible(details), 'Selected venue preview should expose its Profile action');
  details?.click();
  await waitFor(() => isVisible('#venue-detail') && element('#venue-detail')?.textContent?.includes(venue.name),
    `Profile for ${venue.name}`);
}

function noHorizontalOverflow() {
  return document.documentElement.scrollWidth <= window.innerWidth + 1;
}

function finish() {
  if (!result) return;
  result.textContent = failures.length
    ? `CGB_BROWSER_ACCEPTANCE_FAIL:${mode}\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    : `CGB_BROWSER_ACCEPTANCE_PASS:${mode}`;
}

async function runMobileFlow() {
  await waitForReady();
  check(window.matchMedia('(max-width: 899px)').matches, 'Mobile flow must run in the mobile layout');
  check(isVisible('#map-view'), 'Map should be visible on initial mobile load');
  check(element('#header-game-label')?.textContent?.includes('UCLA'), 'Selected game should be UCLA');

  const venue = await chooseVenue('golden-bear-test-pub-berkeley');
  if (!venue) return;
  check(isVisible('#tray-selected .party-module'), 'Selected Watch Party venue should visibly show its Watch Party');

  await openMobileProfile(venue);
  check(isVisible('#detail-back'), 'Mobile Profile should retain Back to map');
  check(element('#venue-detail')?.textContent?.includes(venue.address_line_1), 'Mobile Profile should show the street address');

  click('#mobile-list-button');
  await waitFor(() => isVisible('#tray-list') && !isVisible('#detail-view'), 'Locations after leaving mobile Profile');
  check(isVisible('#tray-list'), 'Locations should visibly open from Profile');

  click('#game-button');
  await waitFor(() => document.querySelectorAll('#game-list .game-option').length > 1, 'game picker options');
  const syracuse = [...document.querySelectorAll('#game-list .game-option')]
    .find((button) => button.textContent?.includes('Syracuse'));
  check(Boolean(syracuse), 'Game picker should include Syracuse');
  syracuse?.click();
  await waitFor(() => element('#header-game-label')?.textContent?.includes('Syracuse'), 'Syracuse game selection');
}

async function runMobileDirect() {
  await waitForReady();
  const venue = routeVenue();
  const game = routeGame();
  check(Boolean(venue), 'Direct-route venue fixture should exist');
  check(Boolean(game), 'Direct-route game fixture should exist');
  await waitFor(() => isVisible('#venue-detail') && element('#venue-detail')?.textContent?.includes(venue?.name || ''),
    'direct mobile Profile');
  check(element('#header-game-label')?.textContent?.includes(game?.opponent_name || ''), `Direct Profile should preserve the ${game?.opponent_name || 'requested'} game`);
  check(element('#venue-detail')?.textContent?.includes(venue?.address_line_1 || ''), 'Direct Profile should show the venue address');
  check(isVisible('#detail-back'), 'Direct mobile Profile should expose Back to map');
}

async function runRestoredFanIntent() {
  await waitForReady();
  const venue = venueBySlug('golden-bear-test-pub-berkeley');
  const game = gameByOpponent('UCLA');
  check(Boolean(venue && game), 'Restored Fan Intent fixture should exist');
  await waitFor(() =>
    isVisible('#tray-peek') &&
    element('#browse-locations-button')?.dataset.previewMode === 'selected' &&
    element('#tray-summary-title')?.textContent?.includes(venue?.name || ''),
  'restored selected venue in micro tray');
  check(isVisible('#tray-peek'), 'Stored Fan Intent should restore the Venue in the visible micro tray');
  check(element('#browse-locations-button')?.dataset.previewMode === 'selected', 'Restored micro tray should be in selected Venue mode');
  check(element('#tray-summary-title')?.textContent?.includes(venue?.name || ''), 'Restored micro tray should show the stored Venue name');
  check(element('#header-game-label')?.textContent?.includes(game?.opponent_name || ''), 'Restored selection should preserve the stored game');
}

async function runDesktopFlow() {
  await waitForReady();
  check(!window.matchMedia('(max-width: 899px)').matches, 'Desktop flow must run in desktop layout');
  check(isVisible('#map-view'), 'Desktop map should remain visible');
  check(isVisible('#location-search'), 'Desktop Search should remain visible');

  const venue = await chooseVenue('golden-bear-test-pub-berkeley');
  if (!venue) return;
  await waitFor(() => isVisible('#tray-selected #venue-detail'), 'full desktop Venue Profile');
  check(isVisible('#map-view'), 'Desktop map should remain visible beside the Venue Profile');
  check(element('#tray-selected #venue-detail')?.textContent?.includes(venue.address_line_1), 'Desktop Venue Profile should show the street address');

  const party = element('#tray-selected #venue-detail .party-module.party-module--multiple') ||
    element('#tray-selected #venue-detail .party-module');
  check(isVisible(party), 'Desktop Watch Party venue should show the Watch Party module');
  if (party) {
    const style = getComputedStyle(party);
    check(!['auto', 'scroll'].includes(style.overflowY), 'Full desktop Venue Profile must not have an internal Watch Party scrollbar');
  }

  click('#mobile-list-button');
  await waitFor(() => isVisible('#tray-list'), 'desktop Locations after selected Profile');
  check(isVisible('#tray-list'), 'Desktop Locations should reopen from a selected Profile');
}

async function runCompactProfile() {
  await runMobileDirect();
  check(noHorizontalOverflow(), 'Compact mobile Profile should not overflow horizontally');
  const title = element('#venue-detail h1, #venue-detail h2');
  check(isVisible(title), 'Compact mobile Profile title should be visible');
  if (title) {
    const rect = title.getBoundingClientRect();
    check(rect.left >= -1 && rect.right <= window.innerWidth + 1, 'Compact mobile Profile title should remain inside the viewport');
  }
}

try {
  if (mode === 'mobile-flow') await runMobileFlow();
  else if (mode === 'mobile-direct') await runMobileDirect();
  else if (mode === 'restored-fan-intent') await runRestoredFanIntent();
  else if (mode === 'desktop-flow') await runDesktopFlow();
  else if (mode === 'compact-profile') await runCompactProfile();
  else failures.push(`Unknown acceptance mode: ${mode}`);
} catch (error) {
  failures.push(error?.stack || String(error));
} finally {
  finish();
}
