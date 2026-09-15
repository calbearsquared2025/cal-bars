import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import {
  accountsConfigIsReady,
  validateFanAttendanceResponse,
  validatePublicAttendanceResponse
} from './accounts-core.mjs';
import { publicAttendeePresentation } from './account-attendance-presence-core.mjs';
import { appState, subscribeAppEvent, waitForApplicationReady } from './app-state.mjs';
import { INTENT_SELECTIONS_STORAGE_KEY } from './fan-intent-core.mjs';

const PUBLIC_ATTENDANCE_CACHE_MS = 30000;
const publicAttendanceCache = new Map();
const publicAttendancePending = new Map();
let publicAttendanceRevision = 0;
let accountStateKnown = false;
let accountSignedIn = false;
let accountProfile = null;
let accountStateRevision = 0;
let syncInFlight = null;
let lastSyncResult = null;
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

function cacheKey(gameId, venueId, revision = publicAttendanceRevision) {
  return `${revision}::${gameId}::${venueId}`;
}

function invalidatePublicAttendance() {
  publicAttendanceRevision += 1;
  publicAttendanceCache.clear();
}

async function requestAccountAttendance(action, extra = {}, { includePayload = false } = {}) {
  const response = await window.CGBAccounts?.request?.(action, extra);
  if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
  const validated = validateFanAttendanceResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  return includePayload ? { validated, payload: response } : validated;
}

async function synchronizeAccountAttendance() {
  if (!enabled() || !accountSignedIn || !appState.fanIntent.browserId || !window.CGBAccounts?.isSignedIn?.()) return null;
  const revision = accountStateRevision;
  if (lastSyncResult?.revision === revision) return lastSyncResult.payload;
  if (syncInFlight?.revision === revision) return syncInFlight.promise;

  let promise;
  promise = (async () => {
    try {
      const result = await requestAccountAttendance('claimFanIntent', {
        browserId: appState.fanIntent.browserId
      }, { includePayload: true });
      if (revision !== accountStateRevision || !accountSignedIn || !window.CGBAccounts?.isSignedIn?.()) return null;
      applyAttendanceState(result.validated);
      appState.fanIntent.accountMode = true;
      // The private account is now canonical for this browser's prior selections.
      // Do not leave a second anonymous selection state that could double-count later.
      storageRemove(INTENT_SELECTIONS_STORAGE_KEY);
      invalidatePublicAttendance();
      window.CGBApp?.restoreSelection?.({ preserveCurrentWhenEmpty: false });
      window.CGBApp?.render?.();
      lastSyncResult = { revision, payload: result.payload };
      return result.payload;
    } catch (error) {
      if (revision === accountStateRevision && accountSignedIn) {
        console.error('CGB account attendance sync failed.', error);
      }
      return null;
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
  invalidatePublicAttendance();
  return compatibilityResponse(validated, operation);
}

async function fetchPublicAttendance(gameId, venueId) {
  if (!enabled() || !gameId || !venueId) return null;
  const revision = publicAttendanceRevision;
  const key = cacheKey(gameId, venueId, revision);
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
      if (!validated || revision !== publicAttendanceRevision) return null;
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

function presenceHost() {
  const desktopDetail = document.querySelector('#venue-detail[data-profile-presentation="desktop"][data-venue-id]');
  if (desktopDetail) return desktopDetail;
  return document.querySelector('.selected-card[data-venue-id]');
}

function attendanceCountElement(host) {
  if (!host) return null;
  if (host.matches?.('#venue-detail[data-profile-presentation="desktop"]')) {
    return host.querySelector(':scope > .detail-hero > .activity-card > strong');
  }
  return host.querySelector('.bear-count--hero, .bear-count');
}

function displayedAttendanceCount(host) {
  const value = Number(attendanceCountElement(host)?.querySelector('.bear-count__number')?.textContent);
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function ensureMobileAttendanceHero(host, count) {
  if (!host?.matches?.('.selected-card[data-venue-id]') || !count?.classList?.contains('bear-count--hero')) return null;
  const existing = count.closest('.selected-card__attendance-hero');
  if (existing) return existing;
  const wrapper = document.createElement('div');
  wrapper.className = 'selected-card__attendance-hero';
  count.replaceWith(wrapper);
  wrapper.append(count);
  return wrapper;
}

function clearMobileAttendanceHero(host) {
  const wrapper = host?.querySelector?.(':scope .selected-card__attendance-hero');
  const count = wrapper?.querySelector?.(':scope > .bear-count--hero');
  if (wrapper && count) wrapper.replaceWith(count);
}

function renderPublicAttendees(host, attendance) {
  const existing = host.querySelector(':scope .account-attendees');
  const presentation = publicAttendeePresentation({
    attendees: attendance?.attendees,
    displayedTotal: displayedAttendanceCount(host)
  });
  if (!presentation.total || !presentation.publicAttendees.length) {
    existing?.remove();
    clearMobileAttendanceHero(host);
    return;
  }

  const surface = existing || document.createElement('div');
  surface.className = 'account-attendees';
  surface.replaceChildren();
  surface.setAttribute('aria-label', `${presentation.publicAttendees.length} Bears showing their CGB profiles`);

  presentation.namedAttendees.forEach((attendee) => {
    const person = document.createElement('div');
    person.className = 'account-attendee-person';
    const name = document.createElement('span');
    name.className = 'account-attendee-name';
    name.textContent = attendee.displayName;
    person.append(avatarElement(attendee), name);
    surface.append(person);
  });

  if (presentation.avatarOnlyAttendees.length || presentation.anonymousCount > 0) {
    const loneAnonymousOverflow = presentation.avatarOnlyAttendees.length === 0 && presentation.anonymousCount > 0;
    const overflow = document.createElement('div');
    overflow.className = loneAnonymousOverflow
      ? 'account-attendee-overflow account-attendee-overflow--anonymous-only'
      : 'account-attendee-overflow';
    presentation.avatarOnlyAttendees.forEach((attendee) => overflow.append(avatarElement(attendee)));
    if (presentation.anonymousCount > 0) {
      const more = document.createElement('span');
      more.className = 'account-attendee-more';
      more.textContent = `+${presentation.anonymousCount}`;
      more.setAttribute('aria-label', `${presentation.anonymousCount} anonymous Bears`);
      overflow.append(more);
      if (loneAnonymousOverflow) {
        const label = document.createElement('span');
        label.className = 'account-attendee-overflow-label';
        label.textContent = presentation.anonymousCount === 1 ? 'other' : 'others';
        overflow.append(label);
      }
    }
    surface.append(overflow);
  }

  const count = attendanceCountElement(host);
  const mobileHero = ensureMobileAttendanceHero(host, count);
  if (mobileHero) {
    if (surface.parentElement !== mobileHero) mobileHero.append(surface);
  } else if (!existing && count) {
    count.insertAdjacentElement('afterend', surface);
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
  const host = presenceHost();
  if (!host || !appState.gameId) return;
  if (host.matches?.('.selected-card[data-venue-id]')) renderVisibilityControl(host);
  const gameId = appState.gameId;
  const venueId = host.dataset.venueId;
  const attendance = await fetchPublicAttendance(gameId, venueId);
  if (!attendance) return;
  const currentHost = presenceHost();
  if (!currentHost || currentHost.dataset.venueId !== venueId || appState.gameId !== gameId) return;
  renderPublicAttendees(currentHost, attendance);
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
    invalidatePublicAttendance();
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
  syncInFlight = null;
  lastSyncResult = null;
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
    invalidatePublicAttendance();
    return renderPresence();
  }
});

void initializeAccountAttendance();
