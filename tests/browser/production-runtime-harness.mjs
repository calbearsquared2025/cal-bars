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

function locationToggleLabels() {
  return [...document.querySelectorAll('#list-location-toggle > button')]
    .map((button) => button.textContent?.trim() || '');
}

function locationModeSelected(mode) {
  const selector = mode === 'nearby' ? '#list-location-nearby' : '#list-location-all';
  return element(selector)?.getAttribute('aria-pressed') === 'true';
}

function locationToggleIsStable() {
  const toggle = element('#list-location-toggle');
  return toggle?.children[0]?.id === 'list-location-nearby' &&
    toggle?.children[1]?.id === 'list-location-all' &&
    locationToggleLabels().join('|') === 'Near me|All locations';
}

function badgeTexts(selectorOrElement) {
  const target = typeof selectorOrElement === 'string' ? element(selectorOrElement) : selectorOrElement;
  return [...(target?.querySelectorAll('.venue-badge') || [])]
    .map((badge) => badge.textContent?.trim())
    .filter(Boolean);
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
    document.querySelectorAll('.mobile-command[data-command]').length === 5 &&
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
    document.querySelectorAll('.mobile-command[data-command]').length === 5 &&
    Boolean(element('#cgb-mobile-tab-location-refinement')) &&
    Boolean(element('#cgb-map-profile-final-pass')), label, 7000);
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

function attendanceNumber() {
  const numeral = element('#tray-selected .bear-count__number');
  if (numeral) return Number(numeral.textContent || 0);
  const source = element('#tray-selected .bear-count')?.textContent || '';
  const match = source.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function attendancePresentation() {
  const count = element('#tray-selected .bear-count');
  if (!count) return null;
  const style = getComputedStyle(count);
  return {
    alignSelf: style.alignSelf,
    display: style.display,
    gridColumn: style.gridColumn,
    minHeight: style.minHeight,
    paddingTop: style.paddingTop,
    paddingRight: style.paddingRight,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    borderRadius: style.borderRadius,
    textAlign: style.textAlign,
    backgroundImage: style.backgroundImage
  };
}

function postJoinInvitation(surface = '#tray-selected') {
  return element(`${surface} .post-join-invitation`);
}

function invitationHeading(surface = '#tray-selected') {
  return postJoinInvitation(surface)?.querySelector('strong')?.textContent?.trim() || '';
}

function checkPostJoinInvitationLayout(label, surface = '#tray-selected') {
  const panel = postJoinInvitation(surface);
  const detail = surface === '#venue-detail';
  const row = detail
    ? panel?.parentElement?.querySelector(':scope > .action-row.detail-primary-actions')
    : panel?.closest('.action-row');
  const intent = row?.querySelector(':scope > .intent-button');
  const share = row?.querySelector(detail ? ':scope > .detail-share' : ':scope > .selected-card__share');
  const details = row?.querySelector(':scope > .selected-card__details');
  check(isVisible(panel), `${label} should be visible inline`);
  check(Boolean(row?.classList.contains('has-post-join-invitation')), `${label} should use the selected action row`);
  check(detail ? panel?.nextElementSibling === row : intent?.nextElementSibling === panel, `${label} should immediately precede its action row`);
  check(!share || Boolean(panel.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING), `${label} should precede Share`);
  check(!details || Boolean(panel.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING), `${label} should precede Details`);
}

function isCanonicalAttendancePresentation(presentation) {
  return presentation?.alignSelf === 'center' &&
    presentation.display === 'grid' &&
    presentation.gridColumn === '2' &&
    presentation.minHeight === '94px' &&
    presentation.paddingTop === '8px' &&
    presentation.paddingRight === '7px' &&
    presentation.paddingBottom === '8px' &&
    presentation.paddingLeft === '7px' &&
    presentation.borderRadius === '14px' &&
    presentation.textAlign === 'center' &&
    presentation.backgroundImage.includes('linear-gradient');
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

async function verifyListLocationControl(expectedMode, label) {
  click('#mobile-list-button');
  return waitFor(() => {
    const toggle = element('#list-location-toggle');
    return activeCommand() === 'list' &&
      trayState() === 'full' &&
      isVisible(toggle) &&
      locationToggleIsStable() &&
      locationModeSelected(expectedMode);
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

async function runDesktopChecks() {
  progress('desktop-ready');
  await waitForDesktopApplicationReady();

  progress('desktop-initial-locations');
  check(isVisible('#map-view'), 'Desktop Map view should be visible');
  check(isVisible('#location-search'), 'Desktop Search should remain persistently visible');
  check(!element('#near-me-button'), 'Desktop should not expose a standalone Near me map action');
  check(!element('#desktop-add-location-button'), 'Desktop should not expose a permanent Add location map action');
  check(trayState() === 'full', 'Desktop should open with Locations as the primary panel state');
  check(isVisible('#tray-list'), 'Desktop Locations should visibly occupy the panel');
  check(!isVisible('#tray-selected'), 'Desktop Locations should not stack selected Venue content');
  check(element('#location-list')?.children.length > 0, 'Desktop Locations should render shared location data');
  check(isVisible('.mobile-command-bar'), 'Desktop should expose the shared panel controls');
  check(!isVisible('#mobile-search-button'), 'Desktop should remove Search from the panel controls');
  check(element('#mobile-map-button span:last-child')?.textContent?.trim() === 'Selected', 'Desktop Map command should be presented as Selected');
  check(element('#mobile-list-button span:last-child')?.textContent?.trim() === 'Locations', 'Desktop List command should be presented as Locations');
  check(!isVisible('#mobile-add-button'), 'Desktop should keep Add contextual instead of permanent');
  check(!isVisible('#mobile-about-button'), 'Desktop should keep About outside the panel toggle');
  check(element('#mobile-map-button')?.disabled === true, 'Desktop Selected should be disabled until a Venue is selected');
  check(element('#mobile-map-button')?.getAttribute('aria-disabled') === 'true', 'Desktop Selected should expose its disabled state to assistive technology');
  check(element('#mobile-list-button')?.getAttribute('aria-current') === 'page', 'Desktop Locations should be the active panel state initially');
  check(!selectedVenueId(), 'Initial desktop state should have no selected venue');

  const mapViewRect = element('#map-view')?.getBoundingClientRect();
  const mapRect = element('#map')?.getBoundingClientRect();
  const railRect = element('#venue-tray')?.getBoundingClientRect();
  const list = element('#tray-list');
  const footerRect = element('.site-footer')?.getBoundingClientRect();
  check(Math.abs((mapRect?.width || 0) - (mapViewRect?.width || 0)) < 1, 'Desktop Map should fill the complete application canvas width');
  check(Math.abs((railRect?.top || 0) - (mapViewRect?.top || 0) - 22) < 1, 'Desktop rail should keep its 22px top canvas margin');
  check(Math.abs((mapViewRect?.right || 0) - (railRect?.right || 0) - 24) < 1, 'Desktop rail should keep its 24px right canvas margin');
  check(Math.abs((mapViewRect?.bottom || 0) - (railRect?.bottom || 0) - 22) < 1, 'Desktop rail should keep its 22px bottom canvas margin');
  check(getComputedStyle(list).overflowY === 'auto' && list.clientHeight > 0, 'Desktop Locations should own the available panel scroll region');
  check((footerRect?.bottom || Infinity) <= window.innerHeight + 1, 'Desktop footer should remain fully inside the viewport');
  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'Desktop shell should not create horizontal document overflow');

  const partyVenueIds = currentPartyVenueIds();
  const noPartyVenue = firstVenue((venue) => venue.venue_type === 'community_location' && !partyVenueIds.has(venue.venue_id));
  const partyVenue = firstVenue((venue) => venue.venue_type === 'cal_bar' && partyVenueIds.has(venue.venue_id));
  check(Boolean(noPartyVenue), 'Desktop fixture should contain a Community Location without a Watch Party');
  check(Boolean(partyVenue), 'Desktop fixture should contain a Cal Bar with a Watch Party');
  const communityListBadges = badgeTexts(`#location-list .location-card[data-venue-id="${noPartyVenue?.venue_id}"]`);
  const partyListBadges = badgeTexts(`#location-list .location-card[data-venue-id="${partyVenue?.venue_id}"]`);
  check(!communityListBadges.includes('COMMUNITY LOCATION'), 'Desktop Locations should omit the Community Location badge');
  check(partyListBadges.includes('WATCH PARTY'), 'Desktop Locations should preserve the Watch Party badge');
  check(partyListBadges.includes('CAL BAR'), 'Desktop Locations should preserve the Cal Bar badge');

  progress('desktop-select-from-list');
  const noPartyCard = noPartyVenue && element(`#location-list .location-card[data-venue-id="${noPartyVenue.venue_id}"]`);
  check(Boolean(noPartyCard), 'Desktop venue should render in shared Locations');
  noPartyCard?.click();
  await waitFor(() =>
    selectedVenueId() === noPartyVenue?.venue_id &&
    trayState() === 'selected' &&
    state()?.detailMode === true &&
    element('#venue-detail')?.parentElement?.id === 'tray-selected',
  'desktop Locations selection');
  await waitFor(() => element('#mobile-map-button')?.disabled === false && element('#mobile-map-button')?.getAttribute('aria-current') === 'page', 'desktop Selected control state');
  check(isVisible('#tray-selected'), 'Desktop Selected should visibly occupy the panel');
  check(!isVisible('#tray-list'), 'Desktop Selected should not stack Locations underneath');
  check(element('#detail-view')?.hidden === true, 'Desktop should not open the standalone mobile Detail surface');
  check(element('#venue-detail')?.dataset?.venueId === noPartyVenue?.venue_id, 'Desktop Selected should render the canonical Venue Profile identity');
  check(element('#venue-detail')?.dataset?.profilePresentation === 'desktop', 'Desktop Selected should use the desktop Venue Profile presentation');
  check(element('#venue-detail h1')?.textContent?.trim() === noPartyVenue?.name, 'Desktop Venue Profile should preserve the selected Venue name');
  check(element('#venue-detail .detail-address')?.textContent?.includes(noPartyVenue?.address_line_1 || ''), 'Desktop Venue Profile should preserve useful street information');
  check(isVisible('#venue-detail .detail-primary-actions .intent-button'), 'Desktop Venue Profile should preserve Fan Intent');
  check(isVisible('#venue-detail .detail-primary-actions .detail-share'), 'Desktop Venue Profile should preserve Share');
  check(!element('#tray-selected .selected-card'), 'Desktop Selected should not leak the obsolete compact selected card');
  check(getComputedStyle(element('#tray-selected')).overflowY === 'auto', 'Desktop Selected should own the available panel scroll region');

  progress('desktop-locations-roundtrip');
  click('#mobile-list-button');
  await waitFor(() => trayState() === 'full' && state()?.detailMode === false && isVisible('#tray-list') && !isVisible('#tray-selected'), 'desktop Selected to Locations');
  check(selectedVenueId() === noPartyVenue?.venue_id, 'Desktop Locations should preserve selected Venue identity');
  check(element('#mobile-list-button')?.getAttribute('aria-current') === 'page', 'Desktop Locations should become the active panel state');
  click('#mobile-map-button');
  await waitFor(() =>
    trayState() === 'selected' &&
    state()?.detailMode === true &&
    isVisible('#tray-selected') &&
    !isVisible('#tray-list') &&
    element('#venue-detail')?.parentElement?.id === 'tray-selected' &&
    element('#venue-detail')?.dataset?.venueId === noPartyVenue?.venue_id,
  'desktop Locations to Selected canonical profile');
  check(!element('#tray-selected .selected-card'), 'Desktop Locations → Selected should restore the canonical Venue Profile rather than the compact card');
  check(element('#venue-detail h1')?.textContent?.trim() === noPartyVenue?.name, 'Desktop Locations → Selected should restore the same Venue Profile');

  progress('desktop-locations-roundtrip-repeat');
  click('#mobile-list-button');
  await waitFor(() => trayState() === 'full' && state()?.detailMode === false, 'desktop repeated Selected to Locations');
  click('#mobile-map-button');
  await waitFor(() =>
    trayState() === 'selected' &&
    state()?.detailMode === true &&
    element('#venue-detail')?.parentElement?.id === 'tray-selected' &&
    element('#venue-detail')?.dataset?.venueId === noPartyVenue?.venue_id,
  'desktop repeated Locations to Selected');
  check(!element('#tray-selected .selected-card'), 'Repeated desktop roundtrip should not recreate the obsolete compact card');

  progress('desktop-game-dialog');
  click('#game-button');
  await waitFor(() => element('#game-dialog')?.open === true, 'desktop Game dialog');
  check(isVisible('#game-dialog'), 'Desktop Game dialog should be visibly usable');
  element('#game-dialog')?.close();

  finish('CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS');
}

async function runShortLandscapeChecks() {
  progress('short-landscape-ready');
  await waitForApplicationReady('short landscape application ready');
  check(window.innerWidth > window.innerHeight, 'Short landscape harness should run in landscape orientation');
  check(window.innerHeight <= 500, 'Short landscape harness should exercise the compact-height breakpoint');

  const partyVenueIds = currentPartyVenueIds();
  const longVenue = firstVenue((venue) =>
    venue.name.length > 50 && venue.address_line_1.length > 35 && !partyVenueIds.has(venue.venue_id));
  check(Boolean(longVenue), 'Short landscape fixture should include long Venue name and address content');
  element(`#location-list .location-card[data-venue-id="${longVenue?.venue_id}"]`)?.click();
  await waitFor(() => selectedVenueId() === longVenue?.venue_id && trayState() === 'selected', 'short landscape long Venue selection');

  check(isVisible('#tray-selected .selected-card'), 'Short landscape should keep the selected profile visible');
  check(element('#tray-selected .venue-location')?.textContent?.includes(longVenue?.address_line_1 || ''), 'Short landscape should preserve useful street information');
  check(!element('#tray-selected .party-module'), 'Short landscape no-Watch-Party state should not fabricate a Watch Party');
  check(attendanceNumber() === 0, 'Short landscape zero-Bear state should remain explicit');
  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'Short landscape should not create horizontal document overflow');
  check((element('#venue-tray')?.getBoundingClientRect().top || -1) >= (element('.site-header')?.getBoundingClientRect().bottom || 0), 'Short landscape selected tray should remain below the header');
  finish('CGB_SHORT_LANDSCAPE_RUNTIME_HARNESS');
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
  const noPartyVenue = firstVenue((venue) => venue.venue_type === 'community_location' && !partyVenueIds.has(venue.venue_id));
  const partyVenue = firstVenue((venue) => venue.venue_type === 'cal_bar' && partyVenueIds.has(venue.venue_id));
  check(Boolean(noPartyVenue), 'Fixture should contain a Community Location without a Watch Party for the selected game');
  check(Boolean(partyVenue), 'Fixture should contain a Cal Bar with a Watch Party for the selected game');
  const communityListBadges = badgeTexts(`#location-list .location-card[data-venue-id="${noPartyVenue?.venue_id}"]`);
  const partyListBadges = badgeTexts(`#location-list .location-card[data-venue-id="${partyVenue?.venue_id}"]`);
  check(!communityListBadges.includes('COMMUNITY LOCATION'), 'Mobile List should omit the Community Location badge');
  check(partyListBadges.includes('WATCH PARTY'), 'Mobile List should preserve the Watch Party badge');
  check(partyListBadges.includes('CAL BAR'), 'Mobile List should preserve the Cal Bar badge');

  progress('select-no-party');
  await ensureListSurface('List before selecting venue');
  const noPartyCard = noPartyVenue && element(`#location-list .location-card[data-venue-id="${noPartyVenue.venue_id}"]`);
  check(Boolean(noPartyCard), 'No-Watch-Party venue should render in List');
  noPartyCard?.click();
  await waitFor(() => selectedVenueId() === noPartyVenue?.venue_id && trayState() === 'selected', 'venue selection');
  await waitFor(() => activeCommand() === 'map', 'selected venue returning to Map');
  await waitFor(() =>
    isVisible('#tray-selected .selected-card__plan-party') &&
    isVisible('#tray-selected .intent-button') &&
    isVisible('#tray-selected .selected-card__directions-inline') &&
    isVisible('#tray-selected .selected-card__share') &&
    isVisible('#tray-selected .selected-card__details'),
  'selected profile refinements');
  check(!element('#venue-tray')?.hasAttribute('data-selected-density'), 'Selected venue should not expose an intermediate density state');
  check(isVisible('#tray-selected .selected-card'), 'Selected venue should render the full selected card');
  check(!element('#tray-selected .party-module'), 'No-Watch-Party venue should not render a Watch Party module');
  check(isVisible('#tray-selected .selected-card__plan-party'), 'No-Watch-Party selected profile should preserve the contribution action');
  check(isVisible('#tray-selected .intent-button'), 'Selected profile should preserve Fan Intent');
  check(isVisible('#tray-selected .selected-card__directions-inline'), 'Selected profile should preserve Directions');
  check(isVisible('#tray-selected .selected-card__share'), 'Selected profile should preserve Share');
  check(isVisible('#tray-selected .selected-card__details'), 'Selected profile should preserve Details');
  check(!badgeTexts('#tray-selected .selected-card').includes('COMMUNITY LOCATION'), 'Mobile selected card should omit the Community Location badge');

  progress('selected-to-mini');
  click('#tray-handle');
  await waitFor(() => trayState() === 'peek' && selectedVenueId() === noPartyVenue?.venue_id, 'selected profile → mini profile');
  await waitFor(() =>
    element('#browse-locations-button')?.dataset?.directVenueId === noPartyVenue?.venue_id &&
    element('#tray-summary-copy')?.textContent?.includes(noPartyVenue?.address_line_1 || ''),
  'selected mini profile content');
  check(isVisible('#tray-peek'), 'Selected Venue mini profile should be visible');
  check(!isVisible('#tray-selected'), 'Full selected profile should be hidden in mini state');
  check(element('#browse-locations-button')?.dataset?.directVenueId === noPartyVenue?.venue_id, 'Mini profile should retain the selected Venue');
  check(element('#tray-summary-copy')?.textContent?.includes(noPartyVenue?.address_line_1 || ''), 'Mini profile should show useful street information');

  progress('mini-to-selected');
  click('#tray-handle');
  await waitFor(() => trayState() === 'selected' && selectedVenueId() === noPartyVenue?.venue_id, 'mini profile → full selected profile');
  await waitFor(() =>
    isVisible('#tray-selected .selected-card__details') &&
    element('#tray-selected .venue-location')?.textContent?.includes(noPartyVenue?.address_line_1 || ''),
  'full selected profile refinements after mini transition');
  check(!element('#venue-tray')?.hasAttribute('data-selected-density'), 'Mini profile should open directly to the full selected profile');
  check(isVisible('#tray-selected .selected-card__details'), 'Direct mini-to-selected transition should expose full selected actions');
  check(element('#tray-selected .venue-location')?.textContent?.includes(noPartyVenue?.address_line_1 || ''), 'Full selected profile should show useful street information');

  progress('rsvp-join-selected');
  check(attendanceNumber() === 0, 'Mocked selected venue should begin at zero attendance');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'RSVP 0 → 1');
  await waitFor(() => !element('#tray-selected .bear-count')?.classList.contains('bear-count--empty'), 'mobile positive attendance refinement');
  check(!isVisible('#tray-selected .bear-count__icon'), 'Mobile positive attendance should hide the people icon');
  check(isCanonicalAttendancePresentation(attendancePresentation()), 'Selected mobile tray should use the canonical attendance-card presentation');
  check(trayState() === 'selected', 'RSVP 0 → 1 must retain the full selected profile');
  check(!element('#venue-tray')?.hasAttribute('data-selected-density'), 'RSVP 0 → 1 must not recreate an intermediate density state');
  await waitForIntentSettled('RSVP 0 → 1 transaction completion');

  await waitFor(() => invitationHeading() === "You're starting the Cal crowd here.", 'first-Bear post-join invitation');
  checkPostJoinInvitationLayout('First-Bear post-join invitation');
  const mobileTrayRect = element('#tray-selected')?.getBoundingClientRect();
  const mobileInvitationRect = postJoinInvitation()?.getBoundingClientRect();
  check(
    (mobileInvitationRect?.top || -1) >= (mobileTrayRect?.top || 0) &&
      (mobileInvitationRect?.bottom || Infinity) <= (mobileTrayRect?.bottom || 0) + 1,
    'Mobile post-join invitation should be visible in the selected action area without scrolling'
  );
  window.CGBApp?.render?.();
  await waitFor(() => invitationHeading() === "You're starting the Cal crowd here.", 'first-Bear invitation after selected-tray rerender');

  progress('rsvp-withdraw-selected');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 0 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'false', 'RSVP 1 → 0');
  check(trayState() === 'selected', 'RSVP 1 → 0 must retain the full selected profile');
  check(!element('#venue-tray')?.hasAttribute('data-selected-density'), 'RSVP 1 → 0 must not recreate an intermediate density state');
  await waitForIntentSettled('RSVP 1 → 0 transaction completion');

  check(!postJoinInvitation(), 'Undo should not display the post-join invitation');

  progress('rsvp-rejoin-selected');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'RSVP rejoin success');
  await waitFor(() => invitationHeading() === "You're starting the Cal crowd here.", 'post-Undo rejoin invitation');
  checkPostJoinInvitationLayout('Post-Undo rejoin invitation');
  await waitForIntentSettled('RSVP rejoin transaction completion');
  click('#tray-selected .intent-button');
  await waitFor(() => attendanceNumber() === 0 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'false', 'Undo before retry scenario');
  await waitForIntentSettled('Undo before retry transaction completion');

  progress('rsvp-retry-success');
  window.CGBProductionHarness?.failNextJoin?.();
  click('#tray-selected .intent-button');
  await waitFor(() => Boolean(element('#tray-selected .intent-retry')), 'failed join retry control');
  check(!postJoinInvitation(), 'Failed join should not display the post-join invitation');
  click('#tray-selected .intent-retry');
  await waitFor(() => attendanceNumber() === 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true', 'retry join success');
  await waitFor(() => invitationHeading() === "You're starting the Cal crowd here.", 'retry-success invitation');
  checkPostJoinInvitationLayout('Retry-success invitation');
  await waitForIntentSettled('retry-success transaction completion');

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
  check(trayState() === 'selected', 'Selected Add roundtrip must return to the full selected profile');
  check(!element('#venue-tray')?.hasAttribute('data-selected-density'), 'Selected Add rerender must not recreate an intermediate density state');

  progress('search-result');
  if (partyVenue) {
    click('#mobile-search-button');
    await waitFor(() => activeCommand() === 'search', 'Map → Search for existing venue');
    setInputValue('#location-query', partyVenue.name);
    await waitFor(() => Boolean(element(`#search-suggestions button[data-venue-id="${partyVenue.venue_id}"]`)), 'existing Search result');
    element(`#search-suggestions button[data-venue-id="${partyVenue.venue_id}"]`)?.click();
    await waitFor(() => selectedVenueId() === partyVenue.venue_id && activeCommand() === 'map' && trayState() === 'selected', 'Search result → full selected Map state');
    await waitFor(() =>
      isVisible('#tray-selected .party-module__report') &&
      isVisible('#tray-selected .selected-card__details'),
    'Watch Party selected profile refinements');
    check(!element('#venue-tray')?.hasAttribute('data-selected-density'), 'Search result should open directly to the full selected profile');
    check(Boolean(element('#tray-selected .party-module')), 'Watch Party venue should render a Watch Party module in the selected card');
    const selectedParty = state()?.snapshot?.watchParties?.find((party) =>
      party.game_id === state()?.gameId && party.venue_id === partyVenue.venue_id);
    check(
      isVisible('#tray-selected .party-module__event') === Boolean(selectedParty?.official_event_url),
      'Watch Party selected profile should show Event information only when an official event URL exists'
    );
    check(isVisible('#tray-selected .party-module__report'), 'Watch Party selected profile should preserve Report an Issue');
    check(isVisible('#tray-selected .selected-card__details'), 'Watch Party selected profile should preserve Details');
    const selectedPartyBadges = badgeTexts('#tray-selected .selected-card');
    check(selectedPartyBadges.includes('WATCH PARTY'), 'Mobile selected card should preserve the Watch Party badge');
    check(selectedPartyBadges.includes('CAL BAR'), 'Mobile selected card should preserve the Cal Bar badge');
    check(!selectedPartyBadges.includes('COMMUNITY LOCATION'), 'Mobile selected Cal Bar should not render a Community Location badge');

    const communityPartyVenue = firstVenue((venue) => venue.venue_type === 'community_location' && currentPartyVenueIds().has(venue.venue_id));
    const communityPartyCard = communityPartyVenue && element(`#location-list .location-card[data-venue-id="${communityPartyVenue.venue_id}"]`);
    check(Boolean(communityPartyCard), 'Mobile fixture should include a Watch Party at a Community Location');
    communityPartyCard?.click();
    await waitFor(() => selectedVenueId() === communityPartyVenue?.venue_id && trayState() === 'selected', 'Community Location Watch Party selection');
    const communityPartyBadges = badgeTexts('#tray-selected .selected-card');
    check(communityPartyBadges.includes('WATCH PARTY') && !communityPartyBadges.includes('CAL BAR'), 'Mobile Watch Party at a Community Location should remain distinct from a Cal Bar');

    progress('rsvp-move-selected');
    const partyAttendanceBeforeMove = attendanceNumber();
    click('#tray-selected .intent-button');
    await waitFor(
      () => attendanceNumber() === partyAttendanceBeforeMove + 1 && element('#tray-selected .intent-button')?.getAttribute('aria-pressed') === 'true',
      'RSVP move to Watch Party venue'
    );
    const expectedMoveInvitation = partyAttendanceBeforeMove === 0
      ? "You're starting the Cal crowd here."
      : "You're in. Bring more Bears.";
    await waitFor(() => invitationHeading() === expectedMoveInvitation, 'post-move invitation');
    checkPostJoinInvitationLayout('Post-move invitation');
    await waitForIntentSettled('RSVP move transaction completion');
  }

  progress('nearby-list');
  let mobileGeolocationCalls = 0;
  try {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          mobileGeolocationCalls += 1;
          success({ coords: { latitude: 37.8715, longitude: -122.2730 } });
        }
      }
    });
  } catch (error) {
    failures.push(`Could not install deterministic geolocation mock: ${error.message}`);
  }

  await ensureListSurface('List for Nearby / All locations');
  await verifyListLocationControl('all', 'All locations List control');
  check(locationToggleIsStable(), 'Mobile location toggle should keep Near me left and All locations right');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin), 'Nearby location state');
  check(mobileGeolocationCalls === 1, 'Mobile initial Nearby should request geolocation once');
  check(Boolean(state()?.nearbyOrigin), 'Mobile Nearby should retain coordinates in canonical app state');

  await verifyListLocationControl('nearby', 'Near me selected List control');
  click('#list-location-all');
  await waitFor(() => !state()?.origin, 'All locations state');

  await verifyListLocationControl('all', 'All locations selected control');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin), 'saved Nearby location state');
  check(mobileGeolocationCalls === 1, 'Mobile Show nearby should reuse coordinates without geolocation');
  check(locationToggleIsStable() && locationModeSelected('nearby'), 'Mobile saved Nearby should preserve the fixed toggle order');

  progress('list-back-map');
  click('#mobile-map-button');
  await waitFor(() => activeCommand() === 'map' && trayState() !== 'full', 'List → Map after Nearby / All locations');

  finish('CGB_PRODUCTION_RUNTIME_HARNESS');
}

async function runNearbyMobileChecks() {
  progress('nearby-mobile-ready');
  await waitFor(() => Boolean(state()?.snapshot), 'focused mobile Nearby application ready');
  progress('nearby-mobile-controls');
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

  await ensureListSurface('focused mobile Locations');
  await waitFor(() => locationToggleIsStable() && locationModeSelected('all'), 'focused mobile All locations control');
  click('#list-location-nearby');
  await yieldToBrowser();
  check(Boolean(state()?.origin && state()?.nearbyOrigin), `Focused mobile initial Nearby transition did not settle (geolocation calls: ${geolocationCalls}, origin: ${JSON.stringify(state()?.origin)}, nearbyOrigin: ${JSON.stringify(state()?.nearbyOrigin)})`);
  await waitFor(() => Boolean(state()?.origin && state()?.nearbyOrigin), 'focused mobile Nearby state');
  await waitFor(() => activeCommand() === 'list' && trayState() === 'full' && locationToggleIsStable() && locationModeSelected('nearby'), 'focused mobile Near me selection');
  click('#list-location-all');
  await waitFor(() => !state()?.origin, 'focused mobile Show all state');
  await waitFor(() => activeCommand() === 'list' && trayState() === 'full' && locationToggleIsStable() && locationModeSelected('all'), 'focused mobile All locations selection');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin), 'focused mobile saved Nearby restore');
  check(geolocationCalls === 1, 'Focused mobile Show nearby should not request geolocation again');
  check(locationToggleIsStable() && locationModeSelected('nearby'), 'Focused mobile saved Nearby should preserve the fixed toggle order');
  finish('CGB_NEARBY_MOBILE_RUNTIME_HARNESS');
}

async function runSearchModeChecks({ desktop = false } = {}) {
  progress(desktop ? 'search-desktop-ready' : 'search-mobile-ready');
  if (desktop) await waitForDesktopApplicationReady('focused desktop Search application ready');
  else {
    await waitForApplicationReady('focused mobile Search application ready');
    click('#mobile-search-button');
    await waitFor(() => activeCommand() === 'search' && !element('#search-surface')?.hidden, 'focused mobile Search surface');
  }

  const input = element('#location-query');
  input?.focus();
  if (input) input.value = 'toast';
  input?.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => isVisible('#search-add-location-button'), 'persistent add-location Search footer');
  await yieldToBrowser();
  check(state()?.searchMode === 'existing', 'Normal Search should use canonical existing-only mode');
  check(window.CGBProductionHarness?.mapTilerSearchCalls?.() === 0, 'Normal Search typing should not request MapTiler external places');
  check(!element('.search-result-group--external'), 'Normal Search should not render external places');
  check(input?.value === 'toast', 'Normal Search should retain the entered query');

  const focusShadow = getComputedStyle(element('.search-field')).boxShadow || '';
  check((focusShadow.match(/253, 181, 21/g) || []).length <= 1, 'Search should render one intentional gold focus treatment');

  click('#search-add-location-button');
  await waitFor(() => state()?.searchMode === 'add-location' && !element('#search-surface')?.hidden, 'add-location Search mode');
  check(element('#search-surface-title')?.textContent?.trim() === 'Add a location', 'Add-location mode should use the approved heading');
  check(element('#search-surface-intro')?.textContent?.trim() === 'Search for the place you want to add.', 'Add-location mode should use the approved instruction');
  check(input?.placeholder === 'Search for the location to add', 'Add-location mode should use the approved placeholder');
  check(input?.value === 'toast', 'Add-location mode should preserve the existing query');
  await waitFor(() => window.CGBProductionHarness?.mapTilerSearchCalls?.() === 1, 'one immediate external Search request');
  await waitFor(() => Boolean(element('.search-result-group--external button[data-external-place-id]')), 'external result in add-location mode');
  check(!isVisible('#search-add-location-button'), 'Add-location mode should replace the footer action instead of duplicating it');

  click('#search-surface [data-command-close]');
  await waitFor(() => state()?.searchMode === 'existing' && element('#search-surface')?.hidden, 'return from add-location Search');
  check(!element('.search-result-group--external'), 'Leaving add-location mode should clear external results');
  check(!element('#desktop-add-location-button'), 'No permanent desktop Add location control should return');

  finish(desktop ? 'CGB_SEARCH_MODE_DESKTOP_RUNTIME_HARNESS' : 'CGB_SEARCH_MODE_MOBILE_RUNTIME_HARNESS');
}

async function runNearbyDesktopChecks() {
  progress('nearby-desktop-ready');
  await waitForDesktopApplicationReady('focused desktop Nearby application ready');
  const card = element('#location-list .location-card');
  check(Boolean(card), 'Focused desktop fixture should contain a selectable Venue');
  card?.click();
  await waitFor(() => Boolean(selectedVenueId()) && trayState() === 'selected' && state()?.detailMode === true, 'focused desktop selected Venue');
  const retainedVenueId = selectedVenueId();
  click('#mobile-list-button');
  await waitFor(() => trayState() === 'full' && state()?.detailMode === false, 'focused desktop Locations browse state');

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

  check(locationToggleIsStable() && locationModeSelected('all'), 'Focused desktop should start with the fixed All locations selection');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin && state()?.nearbyOrigin), 'focused desktop Nearby state');
  await waitFor(() => locationToggleIsStable() && locationModeSelected('nearby'), 'focused desktop Near me fixed toggle selection');
  click('#list-location-all');
  await waitFor(() => !state()?.origin && trayState() === 'full' && state()?.detailMode === false, 'focused desktop Show all state');
  check(selectedVenueId() === retainedVenueId, 'Focused desktop Show all should preserve selected Venue identity');
  check(locationToggleIsStable() && locationModeSelected('all'), 'Focused desktop All locations should keep the fixed toggle order');
  click('#mobile-list-button');
  await waitFor(() => trayState() === 'full' && state()?.detailMode === false, 'focused desktop Locations after Show all');
  check(locationToggleIsStable() && locationModeSelected('all'), 'Focused desktop Locations should preserve All locations selection');
  click('#list-location-nearby');
  await waitFor(() => Boolean(state()?.origin) && trayState() === 'full' && state()?.detailMode === false, 'focused desktop saved Nearby restore');
  check(geolocationCalls === 1, 'Focused desktop Show nearby should not request geolocation again');
  check(locationToggleIsStable() && locationModeSelected('nearby'), 'Focused desktop saved Nearby should preserve the fixed toggle order');
  check(selectedVenueId() === retainedVenueId, 'Focused desktop Show nearby should preserve selected Venue identity');
  finish('CGB_NEARBY_DESKTOP_RUNTIME_HARNESS');
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
      : mode === 'landscape'
        ? 'CGB_SHORT_LANDSCAPE_RUNTIME_HARNESS'
        : mode === 'desktop'
          ? 'CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS'
          : 'CGB_PRODUCTION_RUNTIME_HARNESS');
});
