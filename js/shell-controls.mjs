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
  dom.addLocationSearch.hidden = mode !== 'existing';
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
  setSurface('list');
  if (window.CGBApp?.showLocations) {
    window.CGBApp.showLocations();
    updateCommandState();
    return;
  }
  if (dom.tray?.dataset.state !== 'full') dom.trayHandle?.click();
  updateCommandState();
}

function updateSearchIntent() {
  const calBarTitle = isMobileLayout() ? 'Tell us about this location' : 'Tell us about a location';
  const messages = {
    [CONTRIBUTION_INTENTS.watchParty]: '<strong>Add a Watch Party</strong><span>Search for the venue. Existing CGB locations open the prefilled form; external places offer “Add a Watch Party” after selection.</span>',
    [CONTRIBUTION_INTENTS.calBar]: `<strong>${calBarTitle}</strong><span>Search for an existing CGB location. Unlisted places must first be added to Cal Golden Bars.</span>`,
    [CONTRIBUTION_INTENTS.report]: '<strong>Report a problem</strong><span>Search for the existing CGB listing you need to correct.</span>'
  };
  const message = messages[contributionIntent] || '';
  dom.searchIntent.hidden = !message;
  dom.searchIntent.innerHTML = message;
}

function showSearch(intent = '') {
  leaveDetailForCommand();
  contributionIntent = intent;
  updateSearchIntent();
  setSearchMode(intent === CONTRIBUTION_INTENTS.watchParty || intent === CONTRIBUTION_INTENTS.calBar
    ? 'contribution-external'
    : intent === CONTRIBUTION_INTENTS.report ? 'contribution-existing' : 'existing');
  setSurface('search', { focus: true });
}

function updateAddContext() {
  const venue = selectedVenue();
  dom.addContext.hidden = !venue;
  dom.reportOptions.hidden = true;
  dom.reportButton.setAttribute('aria-expanded', 'false');
  if (!venue) {
    dom.addContextName.textContent = 'No place selected';
    dom.addContextCopy.textContent = 'Choose an action and Search will help you find the right place.';
    dom.reportPartyButton.hidden = true;
    return;
  }
  const place = [venue.city, venue.region].filter(Boolean).join(', ');
  dom.addContextName.textContent = venue.name;
  if (isMobileLayout()) {
    dom.addContextCopy.replaceChildren();
    if (place) {
      dom.addContextCopy.append(document.createTextNode(place), document.createElement('br'));
    }
    dom.addContextCopy.append(document.createTextNode('Available actions will use this place when possible.'));
  } else {
    dom.addContextCopy.textContent = place || 'Selected location';
  }
  dom.reportPartyButton.hidden = !watchPartyIssueUrl(venue.venue_id);
}

function showAdd() {
  leaveDetailForCommand();
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('existing');
  updateAddContext();
  setSurface('add');
}

function showAbout() {
  leaveDetailForCommand();
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('existing');
  setSurface('about');
}

function showAddLocationSearch() {
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('add-location');

  if (isMobileLayout()) {
    setSurface('search', { focus: true });
    return;
  }

  setSurface('map');
  requestAnimationFrame(() => {
    dom.searchInput?.focus({ preventScroll: true });
    dom.searchInput?.select?.();
  });
}

function beginContribution(intent, {
  venueId: requestedVenueId = ''
} = {}) {
  const state = appState();
  const venue = requestedVenueId
    ? state?.snapshot?.venues?.find((item) => item.venue_id === requestedVenueId) || null
    : selectedVenue(state);
  const venueId = venue?.venue_id || '';
  const href = venueId ? contributionUrl(intent, venueId, state) : '';

  if (intent === CONTRIBUTION_INTENTS.report && venueId) {
    const partyHref = watchPartyIssueUrl(venueId);
    dom.reportPartyButton.hidden = !partyHref;
    dom.reportOptions.hidden = false;
    dom.reportButton.setAttribute('aria-expanded', 'true');
    dom.reportListingButton.focus();
    return;
  }

  if (href) {
    if (intent === CONTRIBUTION_INTENTS.watchParty) openWatchPartyUrlWithAttendanceChoice(href, venueId, state?.gameId || '');
    else openExternalUrl(href);
    return;
  }

  if (intent === CONTRIBUTION_INTENTS.report && !venueId) {
    showSearch(CONTRIBUTION_INTENTS.report);
    return;
  }

  showSearch(intent);
}

function handleSearchResultClick(event) {
  const target = event.target.closest?.('.search-result--venue, .search-result--external');
  if (!target || !contributionIntent) return;
  const state = appState();

  if (target.classList.contains('search-result--venue')) {
    const venueId = target.dataset.venueId;
    const href = contributionUrl(contributionIntent, venueId, state);
    if (href) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (contributionIntent === CONTRIBUTION_INTENTS.watchParty) openWatchPartyUrlWithAttendanceChoice(href, venueId, state?.gameId || '');
      else openExternalUrl(href);
      return;
    }
  }

  if (target.classList.contains('search-result--external') && contributionIntent === CONTRIBUTION_INTENTS.watchParty) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.CGBWatchParty?.selectExternal?.(target.dataset.externalIndex);
  }
}

function handleSelectedVenueWatchParty(event) {
  const target = event.target.closest?.('[data-open-watch-party]');
  if (!target) return;
  const venueId = target.dataset.venueId || appState()?.selectedVenueId || '';
  const href = watchPartyUrl(venueId);
  if (!href) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openWatchPartyUrlWithAttendanceChoice(href, venueId, appState()?.gameId || '');
}

function handleMobileLocationListSelection(event) {
  if (!isMobileLayout()) return;
  if (!event.target.closest?.('#location-list .location-card')) return;
  setSurface('map');
}

function normalizeDesktopTray() {
  if (isMobileLayout() || document.body.dataset.view === 'detail') return false;
  if (selectedVenue() || currentSurface === 'search' || currentSurface === 'add' || currentSurface === 'about') {
    return false;
  }

  currentSurface = 'list';
  if (dom.tray?.dataset.state !== 'full' && window.CGBApp?.showLocations) {
    window.CGBApp.showLocations();
    return true;
  }
  return false;
}

function syncDesktopBrowseState() {
  if (!dom || isMobileLayout()) return;
  const state = appState();
  if (!state?.listQuery) {
    dom.listHeading.textContent = 'Find your Cal crowd';
    dom.listEyebrow.textContent = 'Browse';
  }

}

function syncViewState() {
  const pendingDirectDetail = isMobileLayout() &&
    dom.app?.getAttribute('aria-busy') === 'true' &&
    new URLSearchParams(location.search).has('venue');
  const detailVisible = !dom.detailView?.hidden || pendingDirectDetail;
  document.body.dataset.view = detailVisible ? 'detail' : 'map';

  if (detailVisible) {
    dom.searchSurface.hidden = true;
    dom.addSurface.hidden = true;
    dom.aboutSurface.hidden = true;
  } else {
    normalizeDesktopTray();
  }

  updateAddContext();
  updateCommandState();
  syncDesktopBrowseState();

  const trayState = dom.tray?.dataset.state || 'peek';
  if (searchSubmissionPending && currentSurface === 'search' && (trayState === 'full' || trayState === 'selected')) {
    searchSubmissionPending = false;
    contributionIntent = '';
    updateSearchIntent();

    if (isMobileLayout()) {
      const state = appState();
      if (trayState === 'full' && state) state.selectedVenueId = '';
      if (trayState === 'full' && state?.listQuery) showList();
      else showMap();
      return;
    }

    setSurface(trayState === 'full' ? 'list' : 'map');
  }
}

function cacheDom() {
  const commandButtons = Array.from(document.querySelectorAll('.mobile-command'));
  const addNewLocationButton = document.querySelector('#add-new-location-button');
  const addCalBarButton = document.querySelector('#add-cal-bar-button');
  dom = {
    app: document.querySelector('#app'),
    detailView: document.querySelector('#detail-view'),
    mapToolbar: document.querySelector('.map-toolbar'),
    searchForm: document.querySelector('#location-search'),
    searchInput: document.querySelector('#location-query'),
    suggestions: document.querySelector('#search-suggestions'),
    addLocationSearch: document.querySelector('#search-add-location-button'),
    searchSurface: document.querySelector('#search-surface'),
    searchTitle: document.querySelector('#search-surface-title'),
    searchIntro: document.querySelector('#search-surface-intro'),
    searchSlot: document.querySelector('#search-surface-form-slot'),
    searchIntent: document.querySelector('#search-surface-intent'),
    addSurface: document.querySelector('#add-surface'),
    aboutSurface: document.querySelector('#about-surface'),
    addContext: document.querySelector('#add-surface .add-context:not(.add-game-context)'),
    addContextActions: document.querySelector('#add-surface .add-context:not(.add-game-context) > .add-actions'),
    addContextName: document.querySelector('#add-context-name'),
    addContextCopy: document.querySelector('#add-context-copy'),
    addSomewhereElse: document.querySelector('#add-surface .add-somewhere-else'),
    addSomewhereElseTitle: document.querySelector('#add-somewhere-else-title'),
    addSomewhereElseIntro: document.querySelector('#add-surface .add-somewhere-else > .command-surface__intro'),
    addNewLocationButton,
    addNewLocationTitle: addNewLocationButton?.querySelector('strong'),
    addNewLocationDetail: addNewLocationButton?.querySelector('small'),
    addCalBarButton,
    addCalBarTitle: addCalBarButton?.querySelector('strong'),
    reportButton: document.querySelector('#add-report-button'),
    reportOptions: document.querySelector('#add-report-options'),
    reportListingButton: document.querySelector('#add-report-listing-button'),
    reportPartyButton: document.querySelector('#add-report-party-button'),
    listHeading: document.querySelector('#list-heading'),
    listEyebrow: document.querySelector('#tray-list .tray-list__header .eyebrow'),
    tray: document.querySelector('#venue-tray'),
    trayHandle: document.querySelector('#tray-handle'),
    closeList: document.querySelector('#close-list-button'),
    commandButtons
  };
  commandButtons.forEach((button) => {
    if (button.id === 'mobile-map-button') button.dataset.command = 'map';
    if (button.id === 'mobile-search-button') button.dataset.command = 'search';
    if (button.id === 'mobile-add-button') button.dataset.command = 'add';
    if (button.id === 'mobile-list-button') button.dataset.command = 'list';
    if (button.id === 'mobile-about-button') button.dataset.command = 'about';
  });
  return Object.entries(dom).every(([key, value]) => key === 'commandButtons' ? value.length === 5 : Boolean(value));
}

function initializeShellControls() {
  if (!cacheDom()) return;
  setSearchMode('existing', { refresh: false });
  setSurface('map');

  document.querySelector('#header-about-button')?.addEventListener('click', () => {
    if (isMobileLayout()) {
      showAbout();
      return;
    }
    document.querySelector('#about-button')?.click();
  });
  document.querySelector('#mobile-map-button')?.addEventListener('click', showMap);
  document.querySelector('#mobile-search-button')?.addEventListener('click', () => showSearch());
  document.querySelector('#mobile-add-button')?.addEventListener('click', showAdd);
  document.querySelector('#mobile-list-button')?.addEventListener('click', showList);
  document.querySelector('#mobile-about-button')?.addEventListener('click', showAbout);
  dom.addLocationSearch.addEventListener('click', showAddLocationSearch);
  document.querySelectorAll('[data-command-close]').forEach((button) => button.addEventListener('click', showMap));

  document.addEventListener('click', handleMobileLocationListSelection, { capture: true });
  document.addEventListener('click', handleSelectedVenueWatchParty);
  document.querySelector('#add-watch-party-button')?.addEventListener('click', () => beginContribution(CONTRIBUTION_INTENTS.watchParty));
  document.querySelector('#add-cal-bar-button')?.addEventListener('click', () => beginContribution(CONTRIBUTION_INTENTS.calBar));
  document.querySelector('#add-report-button')?.addEventListener('click', () => beginContribution(CONTRIBUTION_INTENTS.report));
  dom.reportListingButton.addEventListener('click', () => {
    const href = listingUpdateUrl(selectedVenue()?.venue_id || '');
    if (href) openExternalUrl(href);
    else showSearch(CONTRIBUTION_INTENTS.report);
  });
  dom.reportPartyButton.addEventListener('click', () => {
    const href = watchPartyIssueUrl(selectedVenue()?.venue_id || '');
    if (href) openExternalUrl(href);
  });

  dom.suggestions.addEventListener('click', handleSearchResultClick, { capture: true });
  dom.searchForm.addEventListener('submit', () => {
    const state = appState();
    searchSubmissionPending = Boolean(dom.searchInput.value.trim() && state?.searchMode !== 'add-location');
  }, { capture: true });
  dom.searchInput.addEventListener('input', () => {
    searchSubmissionPending = false;
  });
  document.addEventListener('click', (event) => {
    if (isMobileLayout()) return;
    if (!event.target.closest?.('#location-list .location-card, .cgb-marker')) return;
    setSearchMode('existing');
    requestAnimationFrame(updateCommandState);
  });

  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', () => {
    setSearchMode('existing');
    moveSearchForm();
    if (!isMobileLayout()) {
      currentSurface = 'map';
      dom.searchSurface.hidden = true;
      dom.addSurface.hidden = true;
      dom.aboutSurface.hidden = true;
      document.body.dataset.commandSurface = 'map';
      normalizeDesktopTray();
    }
    updateCommandState();
    syncDesktopBrowseState();
  });

  syncViewState();
  subscribeAppEvent('rendered', syncViewState);
  subscribeAppEvent('ready', syncViewState);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeShellControls, { once: true });
} else {
  initializeShellControls();
}
