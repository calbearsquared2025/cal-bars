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
import { buildMissingLocationFormUrl } from './missing-location-core.mjs';
import { getWatchParty } from './core.mjs';
import {
  buildWatchPartyIssueUrl,
  resolveWatchPartyIssueContext
} from './watch-party-issue-core.mjs';
import { subscribeAppEvent } from './app-state.mjs';

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

function missingLocationUrl() {
  return buildMissingLocationFormUrl({
    formUrl: meta('cgb-missing-location-form-url'),
    placeNameEntry: meta('cgb-missing-location-form-place-name-entry')
  }, {
    searchText: dom?.searchInput?.value?.trim() || ''
  });
}

function contributionUrl(intent, venueId, state = appState()) {
  if (intent === CONTRIBUTION_INTENTS.watchParty) return watchPartyUrl(venueId, state);
  if (intent === CONTRIBUTION_INTENTS.calBar) return calBarNominationUrl(venueId, state);
  if (intent === CONTRIBUTION_INTENTS.report) return listingUpdateUrl(venueId, state);
  return '';
}

function updateResponsiveCommandLabels() {
  const mobile = isMobileLayout();
  const labels = mobile
    ? { map: 'Map', search: 'Search', add: 'Add', list: 'List' }
    : { map: 'Selected', search: 'Search', add: 'Add', list: 'Locations' };

  dom.commandButtons.forEach((button) => {
    const label = button.querySelector('span:last-child');
    const command = button.dataset.command;
    if (label && labels[command]) label.textContent = labels[command];
  });

  const selectedButton = dom.commandButtons.find((button) => button.dataset.command === 'map');
  if (selectedButton) selectedButton.disabled = !mobile && !selectedVenue();
}

function updateCommandState() {
  updateResponsiveCommandLabels();
  const mobile = isMobileLayout();
  const trayState = dom.tray?.dataset.state || 'peek';
  const active = currentSurface === 'search' || currentSurface === 'add'
    ? currentSurface
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
  const mobile = isMobileLayout();
  if (mobile || currentSurface === 'search') {
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
  dom.searchTitle.textContent = addingLocation ? 'Add a location' : 'Search locations';
  dom.searchIntro.textContent = addingLocation
    ? 'Search for the place you want to add.'
    : 'Find a location already listed in Cal Golden Bars.';
  dom.searchInput.placeholder = addingLocation ? 'Search for the location to add' : 'City, ZIP, or venue';
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
  setSurface('map');
  if (!isMobileLayout() && window.CGBApp?.showLocations) {
    currentSurface = 'list';
    window.CGBApp.showLocations();
    updateCommandState();
    return;
  }
  if (dom.tray?.dataset.state !== 'full') dom.trayHandle?.click();
  currentSurface = 'list';
  updateCommandState();
}

function updateSearchIntent() {
  const messages = {
    [CONTRIBUTION_INTENTS.watchParty]: '<strong>Plan a Watch Party</strong><span>Search for the venue. Existing CGB locations open the prefilled form; external places offer “Plan a Watch Party” after selection.</span>',
    [CONTRIBUTION_INTENTS.calBar]: '<strong>Nominate a Cal Bar</strong><span>Search for an existing Community Location. Unlisted places must first be added to Cal Golden Bars.</span>',
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
  dom.addContextCopy.textContent = `${place ? `${place} is` : 'This place is'} selected. Available actions will use this place when possible.`;
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

function showAddLocationSearch() {
  contributionIntent = '';
  updateSearchIntent();
  setSearchMode('add-location');
  setSurface('search', { focus: true });
  configureMissingLocationLink();
}

function beginContribution(intent, {
  venueId: requestedVenueId = '',
  ensureAttendance = false
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

  if (intent === CONTRIBUTION_INTENTS.calBar && venue && venue.venue_type !== 'community_location') {
    showStatus('The selected place is already classified. Search for a Community Location to nominate.');
    showSearch(intent);
    return;
  }

  if (href) {
    const opened = openExternalUrl(href);
    if (opened && ensureAttendance && intent === CONTRIBUTION_INTENTS.watchParty) {
      void window.CGBFanIntent?.ensureAttendance?.(venueId, selectedGame(state)?.game_id);
    }
    setSurface('map');
    return opened;
  }

  if (intent === CONTRIBUTION_INTENTS.watchParty && selectedGame(state)?.game_status !== 'upcoming') {
    showStatus('Watch Parties can be submitted for an upcoming game. Choose another game first.');
  }
  showSearch(intent);
  return false;
}

function handleSelectedVenueWatchParty(event) {
  const button = event.target.closest?.('.selected-card__plan-party');
  if (!button) return;

  const venueId = button.closest('.selected-card[data-venue-id]')?.dataset.venueId || '';
  if (!venueId) return;

  event.preventDefault();
  beginContribution(CONTRIBUTION_INTENTS.watchParty, {
    venueId,
    ensureAttendance: true
  });
}

function handleSearchResultClick(event) {
  const existing = event.target.closest('button[data-venue-id]');
  const external = event.target.closest('button[data-external-place-id]');
  if (!existing && !external) return;

  requestAnimationFrame(() => setSearchMode('existing'));

  if (existing) {
    const venueId = existing.dataset.venueId;
    if (contributionIntent === CONTRIBUTION_INTENTS.report) {
      contributionIntent = '';
      updateSearchIntent();
      requestAnimationFrame(() => {
        updateAddContext();
        setSurface('add');
        dom.reportOptions.hidden = false;
        dom.reportButton.setAttribute('aria-expanded', 'true');
        dom.reportListingButton.focus();
      });
      return;
    }
    if (contributionIntent) {
      const href = contributionUrl(contributionIntent, venueId);
      if (href) openExternalUrl(href);
      else if (contributionIntent === CONTRIBUTION_INTENTS.calBar) {
        showStatus('Only Community Locations can be nominated as Cal Bars.');
      } else {
        showStatus('That contribution is not available for the selected place or game.');
      }
      contributionIntent = '';
      updateSearchIntent();
    }
    requestAnimationFrame(() => setSurface('map'));
    return;
  }

  if (contributionIntent === CONTRIBUTION_INTENTS.watchParty) {
    showStatus('In the place confirmation, choose “Plan a Watch Party.”', 4200);
  } else if (contributionIntent === CONTRIBUTION_INTENTS.calBar) {
    showStatus('Add the external place to CGB first, then nominate it as a Cal Bar.', 4600);
  } else if (contributionIntent === CONTRIBUTION_INTENTS.report) {
    showStatus('Only existing CGB listings can be reported.', 3600);
  }
  requestAnimationFrame(() => setSurface('map'));
}

function normalizeDesktopTray() {
  if (isMobileLayout() || document.body.dataset.view === 'detail') return;
  if (dom.tray?.dataset.state === 'peek') dom.trayHandle?.click();
}

function syncDesktopBrowseState() {
  if (!dom || isMobileLayout()) return;
  const state = appState();
  if (!state?.listQuery) {
    dom.listHeading.textContent = 'Locations';
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
    setSurface(trayState === 'full' ? 'list' : 'map');
  }
}

function configureMissingLocationLink() {
  const href = missingLocationUrl();
  dom.missingLocationLink.hidden = !href;
  if (href) dom.missingLocationLink.href = href;
}

function cacheDom() {
  const commandButtons = Array.from(document.querySelectorAll('.mobile-command'));
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
    addContext: document.querySelector('#add-surface .add-context:not(.add-game-context)'),
    addContextName: document.querySelector('#add-context-name'),
    addContextCopy: document.querySelector('#add-context-copy'),
    missingLocationLink: document.querySelector('#add-missing-location-link'),
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
  });
  return Object.entries(dom).every(([key, value]) => key === 'commandButtons' ? value.length === 4 : Boolean(value));
}

function initializeShellControls() {
  if (!cacheDom()) return;
  configureMissingLocationLink();
  setSearchMode('existing', { refresh: false });
  setSurface('map');

  document.querySelector('#header-about-button')?.addEventListener('click', () => {
    document.querySelector('#about-button')?.click();
  });
  document.querySelector('#mobile-map-button')?.addEventListener('click', showMap);
  document.querySelector('#mobile-search-button')?.addEventListener('click', () => showSearch());
  document.querySelector('#mobile-add-button')?.addEventListener('click', showAdd);
  document.querySelector('#mobile-list-button')?.addEventListener('click', showList);
  dom.addLocationSearch.addEventListener('click', showAddLocationSearch);
  document.querySelectorAll('[data-command-close]').forEach((button) => button.addEventListener('click', showMap));

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
    searchSubmissionPending = Boolean(dom.searchInput.value.trim());
  }, { capture: true });
  dom.searchInput.addEventListener('input', configureMissingLocationLink);
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
