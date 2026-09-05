import { appState } from './app-state.mjs';
import {
  externalCreationFailureCopy,
  upsertCanonicalVenue
} from './external-venue-core.mjs';
import { validateAddExternalVenueResponse } from './external-venue-contribution-core.mjs';
import {
  canonicalVenueWasKnown,
  showNewLocationContributionPrompt
} from './new-location-contribution-prompt.mjs';
import { configuredDataEndpoint } from './config.mjs';

const WRITE_TIMEOUT_MS = 12000;

function configuredEndpoint(documentObject, windowObject) {
  return configuredDataEndpoint({ documentObject, windowObject });
}

async function fetchJson(windowObject, url, options = {}, timeoutMs = WRITE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = windowObject.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await windowObject.fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return payload;
  } finally {
    windowObject.clearTimeout(timeout);
  }
}

function renderApplication(windowObject) {
  try { windowObject.CGBApp?.render?.(); } catch (error) {
    console.error('External venue contribution render failed.', error);
  }
}

function externalPlacePayload(selected) {
  const payload = {
    source: selected.source,
    placeId: selected.placeId,
    name: selected.name
  };
  if (selected.submittedAddress) payload.submittedAddress = selected.submittedAddress;
  return payload;
}

async function postAddExternalVenue(selected, documentObject, windowObject) {
  const endpoint = configuredEndpoint(documentObject, windowObject);
  if (!endpoint) {
    const error = new Error('not_configured');
    error.code = 'not_configured';
    throw error;
  }

  const response = await fetchJson(windowObject, endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({
      action: 'addExternalVenue',
      gameId: selected.gameId,
      externalPlace: externalPlacePayload(selected)
    })
  });

  if (!response?.ok) {
    const error = new Error(response?.error || 'write_failed');
    error.code = response?.error || 'write_failed';
    throw error;
  }
  if (!validateAddExternalVenueResponse(response)) throw new Error('invalid_write_response');
  return response;
}

export async function createExternalVenueWithoutAttendance({
  selected,
  documentObject = document,
  windowObject = window
} = {}) {
  const external = appState.externalSearch;
  if (!selected || !external || external.pending || !appState.snapshot) return null;

  if (selected.gameId !== appState.gameId) {
    external.error = 'Choose the external place again for the currently selected game.';
    external.retry = null;
    renderApplication(windowObject);
    return null;
  }

  external.pending = true;
  external.error = null;
  external.retry = null;
  renderApplication(windowObject);

  try {
    const response = await postAddExternalVenue(selected, documentObject, windowObject);
    const venueAlreadyKnown = canonicalVenueWasKnown(appState.snapshot, response.venue?.venue_id);
    const venue = upsertCanonicalVenue(appState.snapshot, response.venue);

    appState.selectedVenueId = venue.venue_id;
    appState.listQuery = '';
    appState.origin = null;
    appState.trayState = 'selected';
    external.selected = null;
    external.retry = null;
    external.error = null;

    const input = documentObject.querySelector('#location-query');
    if (input) input.value = venue.name;
    const dropdown = documentObject.querySelector('#search-dropdown');
    if (dropdown) dropdown.hidden = true;
    const dialog = documentObject.querySelector('#external-venue-dialog');
    try { if (dialog?.open) dialog.close(); } catch (_) {}

    windowObject.CGBApp?.showStatus?.('Fan-Added location added.', 3200);
    windowObject.gtag?.('event', 'community_location_created');
    windowObject.CGBApp?.focusLocation?.({
      lon: venue.longitude,
      lat: venue.latitude,
      venueId: venue.venue_id
    });
    renderApplication(windowObject);
    if (!venueAlreadyKnown) showNewLocationContributionPrompt(venue, { documentObject });
    return venue;
  } catch (error) {
    external.error = externalCreationFailureCopy(error);
    external.retry = null;
    windowObject.CGBApp?.showStatus?.(external.error, 5000);
    renderApplication(windowObject);
    return null;
  } finally {
    external.pending = false;
    renderApplication(windowObject);
  }
}
