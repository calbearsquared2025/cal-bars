import { appState, subscribeAppEvent, waitForApplicationReady } from './app-state.mjs';
import {
  INTENT_SELECTIONS_STORAGE_KEY,
  applyAggregateResponse,
  withStoredSelection
} from './fan-intent-core.mjs';
import {
  buildMapTilerSearchUrl,
  externalCreationFailureCopy,
  externalSearchFailureCopy,
  normalizeMapTilerResults,
  upsertCanonicalVenue,
  validateJoinExternalVenueResponse
} from './external-venue-core.mjs';
import {
  buildMissingLocationFormUrl,
  shouldShowMissingLocationFallback
} from './missing-location-core.mjs';
import {
  canonicalVenueWasKnown,
  showNewLocationContributionPrompt
} from './new-location-contribution-prompt.mjs';

const DATA_URL_KEY = 'cgb_v2_public_data_url';
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_TIMEOUT_MS = 8000;
const WRITE_TIMEOUT_MS = 12000;
const MINIMUM_QUERY_LENGTH = 3;
const MISSING_LOCATION_COPY = 'Can’t find the location? Suggest it here.';

let searchTimer = null;
let searchSequence = 0;
let searchController = null;
let dom = null;

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}

function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (_) {}
}

function configuredEndpoint() {
  return storageGet(DATA_URL_KEY)?.trim() ||
    document.querySelector('meta[name="cgb-data-endpoint"]')?.content.trim() || '';
}

function configuredMissingLocationForm() {
  return {
    formUrl: document.querySelector('meta[name="cgb-missing-location-form-url"]')?.content.trim() || '',
    placeNameEntry: document.querySelector('meta[name="cgb-missing-location-form-place-name-entry"]')?.content.trim() || ''
  };
}

function ensureExternalState() {
  if (!appState.externalSearch) {
    appState.externalSearch = {
      query: '',
      results: [],
      selected: null,
      pending: false,
      retry: null,
      error: null
    };
  }
  return appState.externalSearch;
}

function configuredMapTilerKey() {
  return String(window.CGBApp?.mapTilerKey || '').trim();
}

async function fetchJson(url, options = {}, timeoutMs = SEARCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

function resultGroup(kind, headingText) {
  const group = document.createElement('section');
  group.className = `search-result-group search-result-group--${kind}`;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', headingText);
  const heading = document.createElement('strong');
  heading.className = 'search-result-group__heading';
  heading.textContent = headingText;
  group.append(heading);
  return group;
}

function decorateExistingResults() {
  const container = dom.suggestions;
  if (!container || container.querySelector(':scope > .search-result-group--existing')) return;
  const buttons = Array.from(container.children).filter((child) =>
    child.matches?.('button[data-venue-id]')
  );
  if (!buttons.length) return;
  const group = resultGroup('existing', 'Existing CGB locations');
  buttons.forEach((button) => group.append(button));
  container.prepend(group);
}

function missingLocationLink() {
  const url = buildMissingLocationFormUrl(configuredMissingLocationForm(), {
    searchText: ensureExternalState().query
  });
  if (!url) return null;
  const link = document.createElement('a');
  link.className = 'missing-location-link';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = MISSING_LOCATION_COPY;
  return link;
}

function replaceExternalGroup(contentBuilder) {
  dom.suggestions.querySelector(':scope > .search-result-group--external')?.remove();
  const group = resultGroup('external', 'External MapTiler places');
  const note = document.createElement('span');
  note.className = 'search-result-group__note';
  note.textContent = 'Not yet listed in Cal Golden Bars.';
  group.append(note);
  contentBuilder(group);
  dom.suggestions.append(group);
  dom.searchDropdown.hidden = false;
}

function showExternalLoading() {
  decorateExistingResults();
  replaceExternalGroup((group) => {
    const status = document.createElement('span');
    status.className = 'external-search-status';
    status.textContent = 'Searching external places…';
    group.append(status);
  });
}

function showExternalFailure(error) {
  const state = ensureExternalState();
  state.error = externalSearchFailureCopy(error);
  state.results = [];
  decorateExistingResults();
  replaceExternalGroup((group) => {
    const status = document.createElement('span');
    status.className = 'external-search-status external-search-status--error';
    status.setAttribute('role', 'status');
    status.textContent = state.error;
    group.append(status);
    const existingResultCount = dom.suggestions.querySelectorAll('.search-result-group--existing button[data-venue-id]').length;
    if (shouldShowMissingLocationFallback({ existingResultCount, normalSearchFinished: true })) {
      const fallback = missingLocationLink();
      if (fallback) group.append(fallback);
    }
  });
}

function showExternalResults(results) {
  const state = ensureExternalState();
  state.results = results;
  state.error = null;
  decorateExistingResults();
  replaceExternalGroup((group) => {
    if (!results.length) {
      const status = document.createElement('span');
      status.className = 'external-search-status';
      status.textContent = 'No concrete external places found.';
      group.append(status);
      const existingResultCount = dom.suggestions.querySelectorAll('.search-result-group--existing button[data-venue-id]').length;
      if (shouldShowMissingLocationFallback({ existingResultCount, normalSearchFinished: true })) {
        const fallback = missingLocationLink();
        if (fallback) group.append(fallback);
      }
      return;
    }

    results.forEach((place) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'external-place-result';
      button.dataset.externalPlaceId = place.placeId;
      button.setAttribute('role', 'option');
      const name = document.createElement('strong');
      name.textContent = place.name;
      const address = document.createElement('span');
      address.textContent = place.address;
      const source = document.createElement('small');
      source.textContent = 'External place result';
      button.append(name, address, source);
      button.addEventListener('click', () => selectExternalPlace(place));
      group.append(button);
    });
    const fallback = missingLocationLink();
    if (fallback) group.append(fallback);
  });
}

async function searchExternalPlaces(query, sequence) {
  const key = configuredMapTilerKey();
  if (!key) {
    showExternalFailure(Object.assign(new Error('maptiler_not_configured'), { code: 'maptiler_not_configured' }));
    return;
  }

  searchController?.abort();
  searchController = new AbortController();
  const timeout = window.setTimeout(() => searchController.abort(), SEARCH_TIMEOUT_MS);
  try {
    const url = buildMapTilerSearchUrl(query, key);
    const response = await fetch(url, { signal: searchController.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`external_search_http_${response.status}`);
    const payload = await response.json();
    if (sequence !== searchSequence || dom.searchInput.value.trim() !== query) return;
    showExternalResults(normalizeMapTilerResults(payload));
  } catch (error) {
    if (sequence !== searchSequence || error?.name === 'AbortError' && dom.searchInput.value.trim() !== query) return;
    showExternalFailure(error);
  } finally {
    window.clearTimeout(timeout);
  }
}

function invalidateExternalSearch() {
  const state = ensureExternalState();
  searchSequence += 1;
  window.clearTimeout(searchTimer);
  searchController?.abort();
  searchController = null;
  state.results = [];
  state.error = null;
  dom?.suggestions?.querySelector(':scope > .search-result-group--external')?.remove();
}

function handleSearchSubmit(event) {
  invalidateExternalSearch();
  const query = dom.searchInput.value.trim();
  if (!query || appState.searchMode !== 'add-location') return;

  event.preventDefault();
  event.stopImmediatePropagation();
  scheduleExternalSearch({ immediate: true });
}

function externalSearchAllowed() {
  return appState.searchMode === 'add-location' || appState.searchMode === 'contribution-external';
}

function scheduleExternalSearch({ immediate = false } = {}) {
  const query = dom.searchInput.value.trim();
  const state = ensureExternalState();
  state.query = query;
  searchSequence += 1;
  const sequence = searchSequence;
  window.clearTimeout(searchTimer);
  searchController?.abort();
  decorateExistingResults();

  if (!externalSearchAllowed() || query.length < MINIMUM_QUERY_LENGTH) {
    dom.suggestions.querySelector(':scope > .search-result-group--external')?.remove();
    return;
  }

  const run = () => {
    showExternalLoading();
    searchExternalPlaces(query, sequence);
  };
  if (immediate) run();
  else searchTimer = window.setTimeout(run, SEARCH_DEBOUNCE_MS);
}

function renderConfirmation() {
  const state = ensureExternalState();
  const selected = state.selected;
  if (!selected) return;
  dom.externalName.textContent = selected.name;
  dom.externalAddress.textContent = selected.address;
  dom.externalContext.textContent = selected.locationContext;
  dom.externalError.hidden = !state.error;
  dom.externalError.textContent = state.error || '';
  dom.externalConfirm.disabled = state.pending;
  dom.externalCancel.disabled = state.pending;
  dom.externalConfirm.textContent = state.pending
    ? 'Adding location…'
    : state.retry
      ? 'Retry'
      : 'I’ll be here';
}

function selectExternalPlace(place) {
  const state = ensureExternalState();
  state.selected = { ...place, gameId: appState.gameId };
  state.retry = null;
  state.error = null;
  dom.searchDropdown.hidden = true;
  renderConfirmation();
  if (!dom.externalDialog.open) dom.externalDialog.showModal();
  window.gtag?.('event', 'external_place_result_selected', { place_type: place.placeType });
}

function externalPlacePayload(selected) {
  return {
    source: selected.source,
    placeId: selected.placeId
  };
}

async function postJoinExternalVenue(selected) {
  const endpoint = configuredEndpoint();
  if (!endpoint) {
    const error = new Error('not_configured');
    error.code = 'not_configured';
    throw error;
  }
  const response = await fetchJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      action: 'joinExternalVenue',
      browserId: appState.fanIntent.browserId,
      gameId: selected.gameId,
      externalPlace: externalPlacePayload(selected)
    })
  }, WRITE_TIMEOUT_MS);
  if (!response?.ok) {
    const error = new Error(response?.error || 'write_failed');
    error.code = response?.error || 'write_failed';
    throw error;
  }
  if (!validateJoinExternalVenueResponse(response)) throw new Error('invalid_write_response');
  return response;
}

function persistSelection(gameId, venueId) {
  appState.fanIntent.selections = withStoredSelection(appState.fanIntent.selections, gameId, venueId);
  storageSet(INTENT_SELECTIONS_STORAGE_KEY, JSON.stringify(appState.fanIntent.selections));
}

function commitExternalVenue(response, selected) {
  const venue = upsertCanonicalVenue(appState.snapshot, response.venue);
  if (!applyAggregateResponse(appState.snapshot, response)) throw new Error('invalid_aggregate_response');
  persistSelection(selected.gameId, response.selection.venue_id);
  appState.selectedVenueId = venue.venue_id;
  appState.listQuery = '';
  appState.origin = null;
  appState.trayState = 'selected';
  dom.searchInput.value = venue.name;
  dom.searchDropdown.hidden = true;
  return venue;
}

function renderApplicationSafely(context) {
  try {
    window.CGBApp?.render();
  } catch (error) {
    console.error(`External venue ${context} render failed.`, error);
  }
}

async function joinSelectedExternalVenue() {
  const state = ensureExternalState();
  const selected = state.retry || state.selected;
  if (!selected || state.pending || appState.fanIntent.pending) return false;
  if (selected.gameId !== appState.gameId) {
    state.error = 'Choose the external place again for the currently selected game.';
    state.retry = null;
    renderConfirmation();
    return false;
  }

  state.pending = true;
  state.error = null;
  appState.fanIntent.pending = {
    action: 'joinExternalVenue',
    gameId: selected.gameId,
    externalPlaceId: selected.placeId
  };
  renderConfirmation();
  renderApplicationSafely('pending-state');

  try {
    let response;
    try {
      response = await postJoinExternalVenue(selected);
    } catch (error) {
      state.retry = selected;
      state.error = externalCreationFailureCopy(error);
      window.CGBApp?.showStatus(state.error, 5000);
      return false;
    }

    try {
      const venueAlreadyKnown = canonicalVenueWasKnown(appState.snapshot, response.venue?.venue_id);
      const venue = commitExternalVenue(response, selected);
      state.selected = null;
      state.retry = null;
      state.error = null;
      if (dom.externalDialog.open) dom.externalDialog.close();
      window.CGBApp?.showStatus('Fan-Added location added. You’ll be here.', 3200);
      window.gtag?.('event', 'community_location_created');
      window.CGBApp?.focusLocation?.({
        lon: venue.longitude,
        lat: venue.latitude,
        venueId: venue.venue_id
      });
      renderApplicationSafely('post-success');
      if (!venueAlreadyKnown) showNewLocationContributionPrompt(venue);
      return true;
    } catch (error) {
      console.error('External venue write succeeded but the local application commit failed.', error);
      state.selected = null;
      state.retry = null;
      state.error = null;
      if (dom.externalDialog.open) dom.externalDialog.close();
      window.CGBApp?.showStatus('Location saved. Refresh to update the map.', 5000);
      return true;
    }
  } finally {
    state.pending = false;
    appState.fanIntent.pending = null;
    renderConfirmation();
    renderApplicationSafely('settled-state');
  }
}

function cancelConfirmation() {
  const state = ensureExternalState();
  if (state.pending) return;
  state.selected = null;
  state.retry = null;
  state.error = null;
  dom.externalDialog.close();
}

function cacheDom() {
  dom = {
    searchForm: document.querySelector('#location-search'),
    searchInput: document.querySelector('#location-query'),
    searchDropdown: document.querySelector('#search-dropdown'),
    suggestions: document.querySelector('#search-suggestions'),
    externalDialog: document.querySelector('#external-venue-dialog'),
    externalName: document.querySelector('#external-venue-name'),
    externalAddress: document.querySelector('#external-venue-address'),
    externalContext: document.querySelector('#external-venue-context'),
    externalError: document.querySelector('#external-venue-error'),
    externalConfirm: document.querySelector('#external-venue-confirm'),
    externalCancel: document.querySelector('#external-venue-cancel')
  };
  return Object.values(dom).every(Boolean);
}

async function bootExternalVenueSearch() {
  ensureExternalState();
  await waitForApplicationReady();
  if (!cacheDom()) throw new Error('external_search_dom_missing');
  dom.searchInput.addEventListener('input', () => scheduleExternalSearch());
  dom.searchForm.addEventListener('submit', handleSearchSubmit, { capture: true });
  dom.suggestions.addEventListener('click', (event) => {
    if (event.target.closest('button[data-venue-id]')) invalidateExternalSearch();
  }, { capture: true });
  dom.externalConfirm.addEventListener('click', joinSelectedExternalVenue);
  dom.externalCancel.addEventListener('click', cancelConfirmation);
  dom.externalDialog.addEventListener('cancel', (event) => {
    if (ensureExternalState().pending) event.preventDefault();
    else cancelConfirmation();
  });
  subscribeAppEvent('rendered', () => {
    const state = ensureExternalState();
    if (state.selected && state.selected.gameId !== appState.gameId && !state.pending) {
      state.selected = null;
      state.retry = null;
      state.error = null;
      if (dom.externalDialog.open) dom.externalDialog.close();
    }
  });
}

window.CGBExternalVenueSearch = Object.freeze({
  invalidate: invalidateExternalSearch,
  searchCurrentQuery: scheduleExternalSearch,
  retry: joinSelectedExternalVenue,
  getState: () => ensureExternalState()
});

bootExternalVenueSearch().catch((error) => console.error('External venue search initialization failed.', error));