import { appState } from './app-state.mjs';
import { buildCommittedExternalVenueWatchPartyUrl } from './external-watch-party-cta-core.mjs';

const FORM_URL_META = 'cgb-watch-party-form-url';
const VENUE_ENTRY_META = 'cgb-watch-party-venue-id-entry';
const VENUE_NAME_ENTRY_META = 'cgb-watch-party-venue-name-entry';
const GAME_ENTRY_META = 'cgb-watch-party-game-id-entry';
const WAIT_TIMEOUT_MS = 11000;
const POLL_MS = 40;

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function formConfig(documentObject = document) {
  return {
    formUrl: meta(FORM_URL_META, documentObject),
    venueIdEntry: meta(VENUE_ENTRY_META, documentObject),
    venueNameEntry: meta(VENUE_NAME_ENTRY_META, documentObject),
    gameIdEntry: meta(GAME_ENTRY_META, documentObject)
  };
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

function selectedVenueWatchPartyContext(documentObject = document) {
  const venueId = appState.selectedVenueId || '';
  const gameId = appState.gameId || '';
  const href = buildCommittedExternalVenueWatchPartyUrl({
    config: formConfig(documentObject),
    snapshot: appState.snapshot,
    gameId,
    venueId
  });
  return href && venueId && gameId ? { href, venueId, gameId } : null;
}

function activeVenueId(gameId) {
  return appState.fanIntent?.selections?.[gameId] || '';
}

function waitUntil(predicate, timeoutMs = WAIT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const value = predicate();
      if (value !== undefined) {
        resolve(value);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(check, POLL_MS);
    };
    check();
  });
}

async function waitForIntentButton(venueId) {
  return waitUntil(() => {
    const button = document.querySelector(`.intent-button[data-venue-id="${CSS.escape(venueId)}"]`);
    return button || undefined;
  }, 1600);
}

async function commitAttendance(venueId, gameId) {
  if (activeVenueId(gameId) === venueId) return true;
  if (appState.gameId !== gameId) return false;

  const button = await waitForIntentButton(venueId);
  if (!button) return false;
  button.click();

  return waitUntil(() => {
    if (activeVenueId(gameId) === venueId && !appState.fanIntent?.pending) return true;
    const retry = appState.fanIntent?.retry;
    if (!appState.fanIntent?.pending && retry?.gameId === gameId && retry?.venueId === venueId) return false;
    return undefined;
  });
}

function openExternalUrl(href, documentObject = document) {
  if (!href) return false;
  const link = documentObject.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.dataset.watchPartyAttendanceBypass = 'true';
  link.hidden = true;
  documentObject.body.append(link);
  link.click();
  link.remove();
  return true;
}

function openWaitingWindow(windowObject = window) {
  const opened = windowObject.open('', '_blank');
  try {
    if (opened?.document) {
      opened.document.title = 'Preparing Watch Party Form';
      opened.document.body.textContent = 'Saving your attendance before opening the Watch Party Form…';
    }
  } catch (_) {}
  return opened;
}

function navigatePreparedWindow(opened, href) {
  try {
    if (opened && !opened.closed) {
      opened.location.href = href;
      return true;
    }
  } catch (_) {}
  return false;
}

function reportAttendanceFailure() {
  window.CGBApp?.showStatus?.(
    'Watch Party planning can continue, but attendance was not saved. Use “I’ll be here” when you return.',
    6200
  );
}

function handleSelectedVenuePlan(event) {
  const button = event.target.closest?.('.selected-card__plan-party');
  if (!button) return false;

  const context = selectedVenueWatchPartyContext();
  if (!context) return false;

  event.preventDefault();
  event.stopImmediatePropagation();

  // This CTA already has venue + game context, so bypass the generic Add surface.
  // Open the prefilled Google Form immediately from the user's click, then reuse
  // the existing Fan Intent action in the CGB tab to record/move attendance.
  openExternalUrl(context.href);

  if (activeVenueId(context.gameId) !== context.venueId) {
    void commitAttendance(context.venueId, context.gameId).then((saved) => {
      if (!saved) reportAttendanceFailure();
    });
  }
  return true;
}

function handleWatchPartyFormLaunch(event) {
  if (handleSelectedVenuePlan(event)) return;

  const anchor = event.target.closest?.('a[href]');
  if (!anchor || anchor.dataset.watchPartyAttendanceBypass === 'true') return;

  const context = watchPartyCommitmentContext(anchor.href);
  if (!context || activeVenueId(context.gameId) === context.venueId) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const href = anchor.href;
  const preparedWindow = openWaitingWindow();

  void commitAttendance(context.venueId, context.gameId).then((saved) => {
    if (!saved) reportAttendanceFailure();
    if (navigatePreparedWindow(preparedWindow, href)) return;
    openExternalUrl(href);
  });
}

document.addEventListener('click', handleWatchPartyFormLaunch, { capture: true });
