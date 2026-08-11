import { appState } from './app-state.mjs';

const FORM_URL_META = 'cgb-watch-party-form-url';
const VENUE_ENTRY_META = 'cgb-watch-party-venue-id-entry';
const GAME_ENTRY_META = 'cgb-watch-party-game-id-entry';
const INTENT_BUTTON_WAIT_MS = 1600;
const POLL_MS = 40;

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function normalizeFormUrl(value, base = location.href) {
  if (!value) return '';
  try {
    const url = new URL(value, base);
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch (_) {
    return '';
  }
}

export function isWatchPartyFormUrl(href, documentObject = document) {
  const configured = normalizeFormUrl(meta(FORM_URL_META, documentObject));
  const candidate = normalizeFormUrl(href);
  return Boolean(configured && candidate && configured === candidate);
}

export function watchPartyCommitmentContext(href, documentObject = document) {
  if (!isWatchPartyFormUrl(href, documentObject)) return null;
  try {
    const url = new URL(href, location.href);
    const venueEntry = meta(VENUE_ENTRY_META, documentObject);
    const gameEntry = meta(GAME_ENTRY_META, documentObject);
    const venueId = venueEntry ? url.searchParams.get(venueEntry)?.trim() || '' : '';
    const gameId = gameEntry ? url.searchParams.get(gameEntry)?.trim() || '' : '';
    return venueId && gameId ? { venueId, gameId } : null;
  } catch (_) {
    return null;
  }
}

function activeVenueId(gameId) {
  return appState.fanIntent?.selections?.[gameId] || '';
}

function findIntentButton(venueId) {
  return document.querySelector(`.intent-button[data-venue-id="${CSS.escape(venueId)}"]`);
}

function commitAttendanceWhenReady(venueId, gameId) {
  if (appState.gameId !== gameId || activeVenueId(gameId) === venueId) return;

  const started = Date.now();
  const attempt = () => {
    if (appState.gameId !== gameId || activeVenueId(gameId) === venueId) return;
    const button = findIntentButton(venueId);
    if (button && !button.disabled) {
      button.click();
      return;
    }
    if (Date.now() - started < INTENT_BUTTON_WAIT_MS) window.setTimeout(attempt, POLL_MS);
  };
  attempt();
}

function observeWatchPartyFormLaunch(event) {
  const anchor = event.target.closest?.('a[href]');
  if (!anchor) return;

  const context = watchPartyCommitmentContext(anchor.href);
  if (!context) return;

  // Navigation remains owned by the existing form-launch path. This listener only
  // couples that launch to the existing Fan Intent control in the original CGB tab.
  commitAttendanceWhenReady(context.venueId, context.gameId);
}

document.addEventListener('click', observeWatchPartyFormLaunch, { capture: true });
