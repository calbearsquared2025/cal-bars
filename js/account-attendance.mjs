import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import {
  accountsConfigIsReady,
  validateFanAttendanceResponse,
  validatePublicAttendanceResponse
} from './accounts-core.mjs';
import { appState, subscribeAppEvent, waitForApplicationReady } from './app-state.mjs';
import { INTENT_SELECTIONS_STORAGE_KEY } from './fan-intent-core.mjs';

const PUBLIC_ATTENDANCE_CACHE_MS = 30000;
const publicAttendanceCache = new Map();
const publicAttendancePending = new Map();
let accountStateKnown = false;
let accountSignedIn = false;
let accountProfile = null;
let accountStateRevision = 0;
let syncInFlight = null;
let visibilityWritePending = false;

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function storageRemove(key) {
  try { window.localStorage.removeItem(key); } catch (_) {}
}

function profileSnapshot() {
  return accountProfile || window.CGBAccounts?.getProfile?.() || null;
}

function selectionsFromAttendance(validated) {
  return Object.fromEntries(validated.selections.map((row) => [row.game_id, row.venue_id]));
}

function visibilityFromAttendance(validated) {
  return Object.fromEntries(validated.selections.map((row) => [row.game_id, row.visibility]));
}

function applyAttendanceState(validated) {
  appState.fanIntent.selections = selectionsFromAttendance(validated);
  appState.fanIntent.visibilityByGame = visibilityFromAttendance(validated);
  if (appState.snapshot) {
    appState.snapshot.fanCounts = validated.fanCounts.map((row) => ({ ...row }));
    appState.snapshot.venueHistoryCounts = validated.venueHistoryCounts.map((row) => ({ ...row }));
  }
}

function compatibilityResponse(validated, operation) {
  const selection = validated.selections.find((row) => row.game_id === operation.gameId) || null;
  return {
    ok: true,
    action: operation.action,
    selection: selection ? {
      game_id: selection.game_id,
      venue_id: selection.venue_id,
      status: 'attending'
    } : null,
    fanCounts: validated.fanCounts.map((row) => ({ ...row })),
    venueHistoryCounts: validated.venueHistoryCounts.map((row) => ({ ...row }))
  };
}

function currentVisibility(gameId) {
  const current = appState.fanIntent.visibilityByGame?.[gameId];
  if (current === 'public' || current === 'anonymous') return current;
  return profileSnapshot()?.attendanceVisibilityDefault === 'public' ? 'public' : 'anonymous';
}

function cacheKey(gameId, venueId) {
  return `${gameId}::${venueId}`;
}

function invalidatePublicAttendance(gameId, venueId = null) {
  if (!gameId) return;
  if (venueId) {
    publicAttendanceCache.delete(cacheKey(gameId, venueId));
    return;
  }
  [...publicAttendanceCache.keys()].forEach((key) => {
    if (key.startsWith(`${gameId}::`)) publicAttendanceCache.delete(key);
  });
}

async function requestAccountAttendance(action, extra = {}) {
  const response = await window.CGBAccounts?.request?.(action, extra);
  if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
  const validated = validateFanAttendanceResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  return validated;
}

async function synchronizeAccountAttendance() {
  if (!enabled() || !accountSignedIn || !appState.fanIntent.browserId || !window.CGBAccounts?.isSignedIn?.()) return false;
  const revision = accountStateRevision;
  if (syncInFlight?.revision === revision) return syncInFlight.promise;

  let promise;
  promise = (async () => {
    try {
      const validated = await requestAccountAttendance('claimFanIntent', {
        browserId: appState.fanIntent.browserId
      });
      if (revision !== accountStateRevision || !accountSignedIn || !window.CGBAccounts?.isSignedIn?.()) return false;
      applyAttendanceState(validated);
      appState.fanIntent.accountMode = true;
      // The private account is now canonical for this browser's prior selections.
      // Do not leave a second anonymous selection state that could double-count later.
      storageRemove(INTENT_SELECTIONS_STORAGE_KEY);
      window.CGBApp?.restoreSelection?.({ preserveCurrentWhenEmpty: false });
      window.CGBApp?.render?.();
      return true;
    } catch (error) {
      if (revision === accountStateRevision && accountSignedIn) {
        console.error('CGB account attendance sync failed.', error);
      }
      return false;
    } finally {
      if (syncInFlight?.promise === promise) syncInFlight = null;
    }
  })();
  syncInFlight = { revision, promise };
  return promise;
}

async function postIntent(operation) {
  if (!appState.fanIntent.accountMode || !accountSignedIn) throw new Error('fan_unauthorized');
  const validated = await requestAccountAttendance('setFanAttendance', {
    attendanceAction: operation.action,
    gameId: operation.gameId,
    venueId: operation.venueId,
    visibility: currentVisibility(operation.gameId)
  });
  applyAttendanceState(validated);
  invalidatePublicAttendance(operation.gameId);
  return compatibilityResponse(validated, operation);
}

async function fetchPublicAttendance(gameId, venueId) {
  if (!enabled() || !gameId || !venueId) return null;
  const key = cacheKey(gameId, venueId);
  const cached = publicAttendanceCache.get(key);
  if (cached && Date.now() - cached.at < PUBLIC_ATTENDANCE_CACHE_MS) return cached.value;
  if (publicAttendancePending.has(key)) return publicAttendancePending.get(key);

  const pending = (async () => {
    try {
      const url = new URL(CGB_ACCOUNTS_CONFIG.endpoint, window.location.href);
      url.searchParams.set('action', 'publicAttendance');
      url.searchParams.set('gameId', gameId);
      url.searchParams.set('venueId', venueId);
      const response = await fetch(url.toString(), { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) return null;
      const validated = validatePublicAttendanceResponse(payload);
      if (!validated) return null;
      publicAttendanceCache.set(key, { at: Date.now(), value: validated });
      return validated;
    } catch (_) {
      return null;
    } finally {
      publicAttendancePending.delete(key);
    }
  })();
  publicAttendancePending.set(key, pending);
  return pending;
}

function avatarElement(attendee) {
  const wrapper = document.createElement('span');
  wrapper.className = 'account-attendee-avatar';
  wrapper.title = attendee.displayName;
  wrapper.setAttribute('aria-label', attendee.displayName);
  if (attendee.avatarUrl) {
    const image = document.createElement('img');
    image.src = attendee.avatarUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    wrapper.append(image);
  } else {
    wrapper.textContent = attendee.displayName.slice(0, 1).toUpperCase();
  }
  return wrapper;
}

function renderPublicAttendees(card, attendance) {
  const existing = card.querySelector(':scope .account-attendees');
  if (!attendance?.attendees?.length) {
    existing?.remove();
    return;
  }

  const surface = existing || document.createElement('div');
  surface.className = 'account-attendees';
  surface.replaceChildren();
  surface.setAttribute('aria-label', `${attendance.attendees.length} Bears showing their CGB profiles`);

  const stack = document.createElement('div');
  stack.className = 'account-attendee-stack';
  attendance.attendees.slice(0, 5).forEach((attendee) => stack.append(avatarElement(attendee)));
  const hiddenVisible = Math.max(0, attendance.attendees.length - 5);
  const anonymousOrHidden = Math.max(0, attendance.count - attendance.attendees.length);
  const extra = hiddenVisible + anonymousOrHidden;
  if (extra > 0) {
    const more = document.createElement('span');
    more.className = 'account-attendee-more';
    more.textContent = `+${extra}`;
    more.setAttribute('aria-label', `${extra} other Bears`);
    stack.append(more);
  }

  const names = document.createElement('span');
  names.className = 'account-attendee-names';
  names.textContent = attendance.attendees.slice(0, 3).map((attendee) => attendee.displayName).join(' · ');
  surface.append(stack, names);

  if (!existing) {
    const count = card.querySelector('.bear-count');
    if (count) count.insertAdjacentElement('afterend', surface);
  }
}

function renderVisibilityControl(card) {
  const existing = card.querySelector(':scope .account-attendance-visibility');
  const selectedVenueId = appState.fanIntent.selections?.[appState.gameId];
  const shouldShow = appState.fanIntent.accountMode && selectedVenueId &&
    selectedVenueId === card.dataset.venueId &&
    appState.snapshot?.games?.find((game) => game.game_id === appState.gameId)?.game_status === 'upcoming';
  if (!shouldShow) {
    existing?.remove();
    return;
  }

  const profile = profileSnapshot();
  const publicProfile = profile?.publicProfileStatus === 'public';
  const control = existing || document.createElement('label');
  control.className = 'account-attendance-visibility';
  control.replaceChildren();

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = currentVisibility(appState.gameId) === 'public' && publicProfile;
  checkbox.disabled = visibilityWritePending || !publicProfile;
  checkbox.dataset.accountVisibility = appState.gameId;
  const copy = document.createElement('span');
  copy.textContent = publicProfile
    ? 'Show my CGB profile to other Bears here'
    : 'Make your profile public in My CGB to show your avatar here';
  control.append(checkbox, copy);

  if (!existing) {
    const actionRow = card.querySelector('.action-row');
    actionRow?.insertAdjacentElement('afterend', control);
  }
}

async function renderPresence() {
  if (!enabled()) return;
  const card = document.querySelector('.selected-card[data-venue-id]');
  if (!card || !appState.gameId) return;
  renderVisibilityControl(card);
  const gameId = appState.gameId;
  const venueId = card.dataset.venueId;
  const attendance = await fetchPublicAttendance(gameId, venueId);
  if (!attendance) return;
  const currentCard = document.querySelector(`.selected-card[data-venue-id="${CSS.escape(venueId)}"]`);
  if (!currentCard || appState.gameId !== gameId) return;
  renderPublicAttendees(currentCard, attendance);
}

async function handleVisibilityChange(event) {
  const checkbox = event.target.closest('input[data-account-visibility]');
  if (!checkbox || !appState.fanIntent.accountMode || visibilityWritePending) return;
  const revision = accountStateRevision;
  const gameId = checkbox.dataset.accountVisibility;
  const visibility = checkbox.checked ? 'public' : 'anonymous';
  visibilityWritePending = true;
  checkbox.disabled = true;
  try {
    const validated = await requestAccountAttendance('setFanAttendanceVisibility', { gameId, visibility });
    if (revision !== accountStateRevision || !accountSignedIn) return;
    applyAttendanceState(validated);
    invalidatePublicAttendance(gameId);
    window.CGBApp?.render?.();
  } catch (error) {
    if (revision !== accountStateRevision || !accountSignedIn) return;
    window.CGBApp?.showStatus?.('Could not change attendance visibility.', 4000);
    window.CGBApp?.render?.();
  } finally {
    if (revision === accountStateRevision) visibilityWritePending = false;
  }
}

function handleAccountState(event) {
  accountStateRevision += 1;
  const wasAccountMode = appState.fanIntent.accountMode;
  accountStateKnown = true;
  accountSignedIn = event?.detail?.signedIn === true;
  accountProfile = event?.detail?.profile || null;
  visibilityWritePending = false;
  if (!accountSignedIn) {
    // Accounts UI renders a provisional signed-out surface before Firebase resolves.
    // Only clear client attendance after a real account-backed session had become canonical.
    if (!wasAccountMode) return;
    appState.fanIntent.accountMode = false;
    appState.fanIntent.visibilityByGame = {};
    appState.fanIntent.selections = {};
    storageRemove(INTENT_SELECTIONS_STORAGE_KEY);
    window.CGBApp?.render?.();
    return;
  }
  void synchronizeAccountAttendance();
  void renderPresence();
}

function injectPresenceStyles() {
  if (document.querySelector('link[data-cgb-account-presence-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-presence.css';
  link.dataset.cgbAccountPresenceStyle = 'true';
  document.head.append(link);
}

async function initializeAccountAttendance() {
  if (!enabled()) return false;
  injectPresenceStyles();
  window.addEventListener('cgb:account-state', handleAccountState);
  window.addEventListener('cgb:fan-intent-ready', () => { void synchronizeAccountAttendance(); });
  document.addEventListener('change', handleVisibilityChange);
  subscribeAppEvent('rendered', () => { void renderPresence(); });
  await waitForApplicationReady();

  if (!accountStateKnown && window.CGBAccounts?.isSignedIn?.()) {
    accountStateKnown = true;
    accountSignedIn = true;
    accountProfile = window.CGBAccounts.getProfile?.() || null;
  }
  if (accountSignedIn) await synchronizeAccountAttendance();
  void renderPresence();
  return true;
}

window.CGBAccountAttendance = Object.freeze({
  postIntent,
  sync: synchronizeAccountAttendance,
  refreshPresence() {
    if (appState.gameId && appState.selectedVenueId) invalidatePublicAttendance(appState.gameId, appState.selectedVenueId);
    return renderPresence();
  }
});

void initializeAccountAttendance();
