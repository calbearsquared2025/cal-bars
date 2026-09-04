import {
  buildWatchPartyFormGameLabel,
  buildWatchPartyPrefillUrl
} from './watch-party-form-core.mjs';
import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';
import {
  buildListingUpdatePrefillUrl,
  resolveListingUpdateVenue
} from './listing-update-core.mjs';
import { getWatchParty } from './core.mjs';
import {
  buildWatchPartyIssueUrl,
  resolveWatchPartyIssueContext
} from './watch-party-issue-core.mjs';
import { subscribeAppEvent } from './app-state.mjs';
import {
  WATCH_PARTY_ATTENDANCE_CHOICES,
  closeWaitingFormWindow,
  navigateWaitingFormWindow,
  requestWatchPartyAttendance
} from './watch-party-attendance-handoff.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const CONTRIBUTION_INTENTS = Object.freeze({
  watchParty: 'watch-party',
  calBar: 'cal-bar',
  report: 'report'
});

let currentSurface = 'map';
let contributionIntent = '';
let searchSubmissionPending = false;
let dom = null;

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function selectedVenue(state = appState()) {
  if (!state?.snapshot?.venues || !state.selectedVenueId) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function selectedGame(state = appState()) {
  if (!state?.snapshot?.games || !state.gameId) return null;
  return state.snapshot.games.find((game) => game.game_id === state.gameId) || null;
}

function isMobileLayout() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function showStatus(message, timeout = 3600) {
  window.CGBApp?.showStatus?.(message, timeout);
}

function openExternalUrl(href) {
  if (!href) return false;
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  return true;
}

function openWatchPartyUrlWithAttendanceChoice(href, venueId, gameId) {
  if (!href || !venueId || !gameId) return false;

  void (async () => {
    const handoff = await requestWatchPartyAttendance({
      documentObject: document,
      windowObject: window
    });
    if (!handoff) return;

    if (handoff.choice === WATCH_PARTY_ATTENDANCE_CHOICES.attend) {
      const ensureAttendance = window.CGBFanIntent?.ensureAttendance;
      if (typeof ensureAttendance !== 'function') {
        closeWaitingFormWindow(handoff.windowRef);
        showStatus('Attendance is temporarily unavailable. Try again or continue without checking in.', 5000);
        return;
      }
      const saved = await ensureAttendance(venueId, gameId);
      if (!saved) {
        closeWaitingFormWindow(handoff.windowRef);
        showStatus('Attendance was not saved. Try again or continue without checking in.', 5000);
        return;
      }
    }

    if (!navigateWaitingFormWindow(handoff.windowRef, href, window)) {
      showStatus('Could not open the Watch Party form. Try again.', 5000);
    }
  })();

  return true;
}

function watchPartyUrl(venueId, state = appState()) {
  const venue = state?.snapshot?.venues?.find((item) => item.venue_id === venueId);
  const game = selectedGame(state);
  if (!venue || !game || String(game.game_status).toLowerCase() !== 'upcoming') return '';
  const gameLabel = buildWatchPartyFormGameLabel(game);
  if (!gameLabel) return '';
  return buildWatchPartyPrefillUrl({
    formUrl: meta('cgb-watch-party-form-url'),
    venueIdEntry: meta('cgb-watch-party-venue-id-entry'),
    venueNameEntry: meta('cgb-watch-party-venue-name-entry'),
    gameIdEntry: meta('cgb-watch-party-game-id-entry')
  }, {
    venueId: venue.venue_id,
    venueName: venue.name,
    gameId: game.game_id,
    gameLabel
  });
}

function calBarNominationUrl(venueId, state = appState()) {
  const context = resolveCalBarNominationVenue(state?.snapshot, venueId);
  return buildCalBarNominationPrefillUrl({
    formUrl: meta('cgb-cal-bar-nomination-form-url'),
    venueNameEntry: meta('cgb-cal-bar-nomination-venue-name-entry'),
    venueIdEntry: meta('cgb-cal-bar-nomination-venue-id-entry')
  }, context);
}

function listingUpdateUrl(venueId, state = appState()) {
  const context = resolveListingUpdateVenue(state?.snapshot, venueId);
  return buildListingUpdatePrefillUrl({
    formUrl: meta('cgb-listing-update-form-url'),
    venueNameEntry: meta('cgb-listing-update-venue-name-entry'),
    venueIdEntry: meta('cgb-listing-update-venue-id-entry')
  }, context);
}

function watchPartyIssueUrl(venueId, state = appState()) {
  const party = getWatchParty(state?.snapshot, state?.gameId, venueId);
  const context = resolveWatchPartyIssueContext(state?.snapshot, party);
  return buildWatchPartyIssueUrl({
    formUrl: meta('cgb-watch-party-issue-form-url'),
    venueNameEntry: meta('cgb-watch-party-issue-venue-name-entry'),
    gameEntry: meta('cgb-watch-party-issue-game-entry'),
    watchPartyIdEntry: meta('cgb-watch-party-issue-id-entry')
  }, context);
}

function contributionUrl(intent, venueId, state = appState()) {
  if (intent === CONTRIBUTION_INTENTS.watchParty) return watchPartyUrl(venueId, state);
  if (intent === CONTRIBUTION_INTENTS.calBar) return calBarNominationUrl(venueId, state);
  if (intent === CONTRIBUTION_INTENTS.report) return listingUpdateUrl(venueId, state);
  return '';
}

function syncContributionStructure() {
  if (!dom?.addContext || !dom.addContextActions) return;
  if (dom.addContextActions.parentElement !== dom.addContext) {
    dom.addContext.append(dom.addContextActions);
  }
}

function updateResponsiveCommandLabels() {
  const mobile = isMobileLayout();
  const venue = selectedVenue();
  const labels = mobile
    ? { map: 'Map', search: 'Search', add: 'Add', list: 'List', about: 'About' }
    : { map: 'Selected', search: 'Search', add: 'Add to CGB', list: 'Locations', about: 'About' };

  syncContributionStructure();

  dom.commandButtons.forEach((button) => {
    const label = button.querySelector('span:last-child');
    const command = button.dataset.command;
    if (label && labels[command]) label.textContent = labels[command];
  });

  const addButton = dom.commandButtons.find((button) => button.dataset.command === 'add');
  if (addButton) {
    addButton.setAttribute('aria-label', mobile ? 'Add' : 'Add to Cal Golden Bars');
  }
  const addTitle = document.querySelector('#add-surface-title');
  const addIntro = document.querySelector('#add-surface > .command-surface__shell > .command-surface__intro');
  if (addTitle) addTitle.textContent = mobile ? 'Add to the map' : 'Add to Cal Golden Bars';
  if (addIntro) {
    addIntro.textContent = mobile
      ? 'Choose what you would like to add or correct.'
      : venue
        ? 'Choose an action for the selected location, or search for another location.'
        : 'If the location is already listed in CGB, select it first to add a Watch Party or other content. If it isn’t listed yet, search below to add it.';
  }

  if (dom.addCalBarTitle) {
    dom.addCalBarTitle.textContent = mobile ? 'Tell us about this location' : 'Tell us about a location';
  }
  if (dom.addSomewhereElseTitle) {
    dom.addSomewhereElseTitle.textContent = mobile
      ? 'Add somewhere else'
      : venue ? 'Add somewhere else' : 'New location';
  }
  if (dom.addSomewhereElseIntro) {
    dom.addSomewhereElseIntro.hidden = !mobile;
    dom.addSomewhereElseIntro.textContent = 'Search for a place that isn’t listed in Cal Golden Bars yet.';
  }
  if (dom.addNewLocationTitle) {
    dom.addNewLocationTitle.textContent = mobile ? 'Search for another location' : 'Search for another location';
  }
  if (dom.addNewLocationDetail) {
    dom.addNewLocationDetail.textContent = mobile
      ? 'Find a place that isn’t listed yet.'
      : 'Find a place that isn’t listed in CGB yet.';
  }

  const selectedButton = dom.commandButtons.find((button) => button.dataset.command === 'map');
  if (selectedButton) {
    selectedButton.disabled = !mobile && !venue;
    selectedButton.setAttribute('aria-disabled', String(selectedButton.disabled));
  }
}

function updateCommandState() {
  updateResponsiveCommandLabels();
  const mobile = isMobileLayout();
  const trayState = dom.tray?.dataset.state || 'peek';
  const active = currentSurface === 'search' || currentSurface === 'add' || currentSurface === 'about'
    ? currentSurface
    : !mobile && !selectedVenue()
      ? 'list'
      : trayState === 'full'
      ? 'list'
      : 'map';

  dom.commandButtons.forEach((button) => {
    const command = button.dataset.command;
    const isActive = command === active && (mobile || command !== 'add');
    button.classList.toggle('mobile-command--active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

function setSurface(next, { focus = false } = {}) {
  currentSurface = next;
  dom.searchSurface.hidden = next !== 'search';
  dom.addSurface.hidden = next !== 'add';
  dom.aboutSurface.hidden = next !== 'about';
  document.body.dataset.commandSurface = next;
  moveSearchForm();
  updateCommandState();

  if (next === 'search' && focus) {
    requestAnimationFrame(() => {
      dom.searchInput?.focus({ preventScroll: true });
      dom.searchInput?.select?.();
    });
  }
}

function moveSearchForm() {
  if (!dom.searchForm || !dom.searchSlot || !dom.mapToolbar) return;
  if (isMobileLayout()) {
    if (dom.searchForm.parentElement !== dom.searchSlot) dom.searchSlot.append(dom.searchForm);
    return;
  }
  if (dom.searchForm.parentElement !== dom.mapToolbar) {
    dom.mapToolbar.insertBefore(dom.searchForm, dom.mapToolbar.firstChild);
  }
}

function leaveDetailForCommand() {
  const state = appState();
  if (!isMobileLayout() || !state?.detailMode) return false;
  const back = document.querySelector('#detail-back');
  if (!back) return false;
  back.click();
  return true;
}

function setSearchMode(mode = 'existing', { refresh = true } = {}) {
  if (!dom) return;
  const state = appState();
  const changed = state?.searchMode !== mode;
  if (state) state.searchMode = mode;
  const addingLocation = mode === 'add-location';
  document.body.dataset.searchMode = mode;
  dom.searchTitle.textContent = addingLocation ? 'Search for another location' : 'Search locations';
  dom.searchIntro.textContent = addingLocation
    ? 'Find a place that isn’t listed in Cal Golden Bars yet.'
    : 'Find a location already listed in Cal Golden Bars.';
  dom.searchInput.placeholder = addingLocation ? 'Venue or address' : 'City, ZIP, or venue';
  if (mode !== 'existing') dom.addLocationSearch.hidden = true;
  if (changed && refresh) dom.searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  if (addingLocation && refresh) window.CGBExternalVenueSearch?.searchCurrentQuery?.({ immediate: true });
}

function showMap() {
  leaveDetailForCommand();
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('existing');
  setSurface('map');
  if (dom.tray?.dataset.state === 'full') dom.closeList?.click();
  if (!isMobileLayout()) normalizeDesktopTray();
  updateCommandState();
}

function showList() {
  leaveDetailForCommand();
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('existing');
  setSurface('map');
  if (window.CGBApp?.showLocations) {
    currentSurface = 'list';
    window.CGBApp.showLocations();
    updateCommandState();
    return;
  }
  if (dom.tray?.dataset.state !== 'full') dom.trayHandle?.click();
  currentSurface = 'list';
  updateCommandState();
}

function normalizeDesktopTray() {
  if (isMobileLayout() || !dom.tray) return;
  const state = appState();
  if (state?.selectedVenueId) {
    window.CGBApp?.showSelectedVenue?.();
  } else {
    window.CGBApp?.showLocations?.();
  }
}

function showSearch() {
  leaveDetailForCommand();
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('existing');
  setSurface(isMobileLayout() ? 'search' : 'map', { focus: true });
  if (!isMobileLayout()) {
    window.setTimeout(() => {
      dom.searchInput?.focus({ preventScroll: true });
      dom.searchInput?.select?.();
    }, 0);
  }
}

function showAdd({ preserveSearchQuery = false } = {}) {
  leaveDetailForCommand();
  contributionIntent = '';
  updateSearchIntent();
  const state = appState();
  if (!preserveSearchQuery) {
    if (state) state.listQuery = '';
    if (dom.searchInput) dom.searchInput.value = '';
    if (dom.searchDropdown) dom.searchDropdown.hidden = true;
  }
  setSearchMode('add-location');
  setSurface('add');
  updateAddContext();
}

function closeCurrentSurface() {
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('existing');
  setSurface('map');
  if (isMobileLayout() && dom.tray?.dataset.state === 'full') dom.trayHandle?.click();
}

function clearSearchUi() {
  if (dom.searchInput) dom.searchInput.value = '';
  if (dom.searchDropdown) dom.searchDropdown.hidden = true;
  if (dom.searchSuggestions) dom.searchSuggestions.replaceChildren();
}

function searchSubmissionWantsAddFlow() {
  return appState()?.searchMode === 'add-location';
}

function armSearchSubmissionHandoff() {
  if (!dom?.searchForm || searchSubmissionPending) return;
  const mode = appState()?.searchMode || 'existing';
  const query = dom.searchInput?.value?.trim() || '';
  if (!query) return;
  searchSubmissionPending = true;
  queueMicrotask(() => {
    searchSubmissionPending = false;
    if (mode === 'add-location') return;
    if (isMobileLayout()) setSurface('map');
  });
}

function completeExternalSearchSelection() {
  if (!isMobileLayout()) return;
  setSurface('map');
}

function updateSearchIntent() {
  document.body.dataset.addIntent = contributionIntent || '';
}

function updateAddContext() {
  const state = appState();
  const venue = selectedVenue(state);
  if (!dom.addContext) return;
  dom.addContext.hidden = !venue;
  if (!venue) return;

  dom.addContextName.textContent = venue.name;
  dom.addContextLocation.textContent = [venue.city, venue.region].filter(Boolean).join(', ');
  dom.addWatchParty.hidden = !watchPartyUrl(venue.venue_id, state);
  dom.addCalBar.hidden = !calBarNominationUrl(venue.venue_id, state);
  dom.addReport.hidden = !listingUpdateUrl(venue.venue_id, state);
  dom.addCalBarTitle.textContent = venue.venue_type === 'community_location' ? 'Tell us about this location' : 'Tell us about this location';
}
