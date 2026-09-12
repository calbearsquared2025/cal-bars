import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import {
  accountsConfigIsReady,
  buildFanRequest,
  fanErrorCopy,
  normalizeFanProfileDraft,
  validateFanAccountResponse,
  validateFanFavoritesResponse
} from './accounts-core.mjs';
import { CGB_AVATAR_PRESETS, isCgbAvatarPresetUrl } from './account-avatar-presets.mjs';
import { appState, waitForApplicationReady } from './app-state.mjs';
import { markCgbPerformance, measureCgbPerformance } from './performance.mjs';

const REQUEST_TIMEOUT_MS = 12000;
const ACCOUNT_HYDRATION_TIMEOUT_MS = 30000;
const FIREBASE_VERSION = '12.18.0';
const GOOGLE_PROVIDER_ID = 'google.com';
const EMAIL_PROVIDER_ID = 'password';
const ANONYMOUS_PROVIDER_ID = 'anonymous';
const SAFE_FAN_DIAGNOSTIC_CODES = new Set([
  'fan_account_deleted',
  'fan_account_suspended',
  'fan_backend_unavailable',
  'fan_network_failure',
  'fan_network_timeout',
  'fan_not_configured',
  'fan_schema_mismatch',
  'fan_unauthorized'
]);

let auth = null;
let authModule = null;
let googleProvider = null;
let currentUser = null;
let account = null;
let favoriteVenueIds = [];
let favoritesLoadState = 'idle';
let favoritesErrorCode = '';
let favoritesRequestRevision = 0;
let dom = null;
let pendingSignedOutStatus = null;
let authStateRevision = 0;
let uiInitialized = false;
let accountStartupPromise = null;
let deferredStartupScheduled = false;

function injectAccountsStyles() {
  if (document.querySelector('link[data-cgb-accounts-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/accounts.css';
  link.dataset.cgbAccountsStyle = 'true';
  document.head.append(link);
}

function avatarPresetMarkup() {
  return CGB_AVATAR_PRESETS.map((preset, index) => `
    <label class="accounts-avatar-choice">
      <input name="avatarUrl" type="radio" value="${preset.url}">
      <img src="${preset.url}" alt="Avatar option ${index + 1}" loading="lazy" decoding="async">
    </label>`).join('');
}

function buildDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = 'cgb-account-dialog';
  dialog.className = 'accounts-dialog';
  dialog.setAttribute('aria-labelledby', 'cgb-account-title');
  dialog.innerHTML = `
    <div class="accounts-shell">
      <header class="accounts-header">
        <div>
          <span class="eyebrow">Cal Golden Bars</span>
          <h2 id="cgb-account-title">My CGB</h2>
        </div>
        <button class="icon-button accounts-close" type="button" aria-label="Close My CGB">×</button>
      </header>
      <p class="accounts-status" role="status" aria-live="polite"></p>

      <section class="accounts-signed-out">
        <div class="accounts-intro">
          <strong>Make Cal Golden Bars yours.</strong>
          <p>Create a profile to save favorite places, keep your attendance history, and build your CGB progress. Browsing still works without an account.</p>
        </div>
        <div class="accounts-provider-actions">
          <button class="accounts-provider-button" type="button" data-account-provider="google">Continue with Google</button>
          <button class="accounts-provider-button" type="button" data-account-provider="email">Continue with email</button>
          <button class="accounts-provider-button accounts-provider-button--anonymous" type="button" data-account-provider="anonymous">
            <span>Continue without email</span>
            <small>Private, device-based profile</small>
          </button>
        </div>
        <form class="accounts-email-form" hidden>
          <label>
            <span>Email address</span>
            <input name="email" type="email" maxlength="254" required autocomplete="email" inputmode="email">
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" minlength="6" maxlength="128" required autocomplete="current-password">
          </label>
          <p class="accounts-email-help">Sign in, or create an account with at least 6 characters. New email accounts must be verified before My CGB opens.</p>
          <div class="accounts-email-actions">
            <button class="primary-button accounts-email-submit" type="submit">Sign in</button>
            <button class="text-button accounts-email-create" type="button">Create account</button>
            <button class="text-button accounts-email-reset" type="button">Forgot password?</button>
            <button class="text-button accounts-email-cancel" type="button">Cancel</button>
          </div>
        </form>
        <p class="accounts-fine-print">No-email profiles stay on this browser and cannot be recovered on another device. Your sign-in identifiers stay private. Public profile and attendance visibility are separate choices.</p>
      </section>

      <section class="accounts-authenticated-error" hidden>
        <div class="accounts-intro">
          <strong class="accounts-authenticated-error-title">You’re signed in. Your CGB data couldn’t load.</strong>
          <p class="accounts-authenticated-error-detail">Retry to load your CGB account, or sign out.</p>
        </div>
        <div class="accounts-provider-actions">
          <button class="primary-button accounts-core-retry" type="button">Retry</button>
          <button class="text-button accounts-degraded-sign-out" type="button">Sign out</button>
        </div>
      </section>

      <section class="accounts-signed-in" hidden>
        <div class="accounts-identity">
          <img class="accounts-avatar" alt="" hidden>
          <div>
            <strong class="accounts-display-name">Bear</strong>
            <span class="accounts-email"></span>
          </div>
        </div>

        <section class="accounts-section" aria-labelledby="accounts-favorites-title">
          <div class="accounts-section__heading">
            <div>
              <span class="eyebrow">Your places</span>
              <h3 id="accounts-favorites-title">Favorites</h3>
            </div>
            <button class="text-button accounts-save-selected" type="button" hidden></button>
          </div>
          <div class="accounts-favorites"></div>
        </section>

        <section class="accounts-section" aria-labelledby="accounts-profile-title">
          <div class="accounts-section__heading">
            <div>
              <span class="eyebrow">Identity</span>
              <h3 id="accounts-profile-title">Profile</h3>
            </div>
          </div>
          <form class="accounts-profile-form">
            <label>
              <span>Display name</span>
              <input name="displayName" type="text" maxlength="80" required autocomplete="nickname">
            </label>
            <fieldset class="accounts-avatar-picker">
              <legend>Public avatar</legend>
              <div class="accounts-avatar-options">${avatarPresetMarkup()}</div>
              <small>Choose the CGB avatar other Bears will see on the leaderboard and public attendance.</small>
            </fieldset>
            <label>
              <span>Home city <small>optional</small></span>
              <input name="homeCity" type="text" maxlength="80" autocomplete="address-level2">
            </label>
            <label>
              <span>X handle <small>optional</small></span>
              <input name="xHandle" type="text" maxlength="31" inputmode="text" autocomplete="off" placeholder="@CalBear">
            </label>
            <label class="accounts-toggle">
              <input name="publicProfile" type="checkbox">
              <span>Allow my CGB profile to appear publicly when I choose public attendance.</span>
            </label>
            <label class="accounts-toggle">
              <input name="publicAttendance" type="checkbox">
              <span>Default future attendance to public. I can still change this for a game.</span>
            </label>
            <button class="primary-button accounts-profile-save" type="submit">Save profile</button>
          </form>
        </section>

        <section class="accounts-section accounts-connections" aria-labelledby="accounts-connections-title">
          <div class="accounts-section__heading">
            <div>
              <span class="eyebrow">Sign-in</span>
              <h3 id="accounts-connections-title">Sign-in methods</h3>
            </div>
          </div>
          <div class="accounts-connected-methods"></div>
          <button class="text-button accounts-sign-out" type="button">Sign out</button>
        </section>
      </section>
    </div>`;
  document.body.append(dialog);
  return dialog;
}

function collectDom() {
  const dialog = buildDialog();
  if (!dialog) return null;
  return {
    dialog,
    close: dialog.querySelector('.accounts-close'),
    status: dialog.querySelector('.accounts-status'),
    signedOut: dialog.querySelector('.accounts-signed-out'),
    authenticatedError: dialog.querySelector('.accounts-authenticated-error'),
    authenticatedErrorTitle: dialog.querySelector('.accounts-authenticated-error-title'),
    authenticatedErrorDetail: dialog.querySelector('.accounts-authenticated-error-detail'),
    coreRetry: dialog.querySelector('.accounts-core-retry'),
    degradedSignOut: dialog.querySelector('.accounts-degraded-sign-out'),
    signedIn: dialog.querySelector('.accounts-signed-in'),
    providerButtons: [...dialog.querySelectorAll('[data-account-provider]')],
    emailForm: dialog.querySelector('.accounts-email-form'),
    emailInput: dialog.querySelector('.accounts-email-form input[name="email"]'),
    passwordInput: dialog.querySelector('.accounts-email-form input[name="password"]'),
    emailSubmit: dialog.querySelector('.accounts-email-submit'),
    emailCreate: dialog.querySelector('.accounts-email-create'),
    emailReset: dialog.querySelector('.accounts-email-reset'),
    emailCancel: dialog.querySelector('.accounts-email-cancel'),
    avatar: dialog.querySelector('.accounts-avatar'),
    displayName: dialog.querySelector('.accounts-display-name'),
    email: dialog.querySelector('.accounts-email'),
    favorites: dialog.querySelector('.accounts-favorites'),
    saveSelected: dialog.querySelector('.accounts-save-selected'),
    profileForm: dialog.querySelector('.accounts-profile-form'),
    profileSave: dialog.querySelector('.accounts-profile-save'),
    connectedMethods: dialog.querySelector('.accounts-connected-methods'),
    signOut: dialog.querySelector('.accounts-sign-out')
  };
}

function setStatus(message = '', { error = false } = {}) {
  if (!dom?.status) return;
  dom.status.textContent = message;
  dom.status.dataset.state = error ? 'error' : 'normal';
  dom.status.hidden = !message;
}

function fanClientErrorCode(error) {
  if (error?.name === 'AbortError') return 'fan_network_timeout';
  if (error?.code === 'auth/network-request-failed') return 'fan_network_failure';
  if (String(error?.code || '').startsWith('auth/')) return 'fan_unauthorized';
  const code = String(error?.message || 'fan_backend_unavailable');
  if (SAFE_FAN_DIAGNOSTIC_CODES.has(code)) return code;
  return 'fan_backend_unavailable';
}

function logFanDiagnostic(context, error) {
  console.warn(`${context}: ${fanClientErrorCode(error)}`);
}

async function postFan(payload, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(CGB_ACCOUNTS_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) throw new Error('fan_backend_unavailable');
    return body;
  } catch (error) {
    if (error?.message === 'fan_backend_unavailable') throw error;
    if (error?.name === 'AbortError') throw new Error('fan_network_timeout');
    throw new Error('fan_network_failure');
  } finally {
    window.clearTimeout(timeout);
  }
}

async function tokenForUser(user, forceRefresh = false) {
  if (!user) throw new Error('fan_unauthorized');
  return user.getIdToken(forceRefresh);
}

async function currentToken(forceRefresh = false) {
  return tokenForUser(currentUser, forceRefresh);
}

function authStateIsCurrent(user, revision) {
  return revision === authStateRevision && currentUser === user;
}

function clientProfile() {
  if (!account) return null;
  return Object.freeze({
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    homeCity: account.homeCity,
    xHandle: account.xHandle,
    publicProfileStatus: account.publicProfileStatus,
    attendanceVisibilityDefault: account.attendanceVisibilityDefault,
    providers: Object.freeze([...(account.providers || [])])
  });
}

function dispatchAccountState() {
  window.dispatchEvent(new CustomEvent('cgb:account-state', {
    detail: Object.freeze({
      signedIn: Boolean(currentUser && account),
      profile: clientProfile()
    })
  }));
}

async function requestFanAction(action, extra = {}) {
  const user = currentUser;
  const revision = authStateRevision;
  const token = await tokenForUser(user);
  const response = await postFan(buildFanRequest(action, token, extra));
  if (!authStateIsCurrent(user, revision)) throw new Error('fan_unauthorized');
  return response;
}

async function loadAccount(user) {
  const token = await tokenForUser(user, true);
  const response = await postFan(
    buildFanRequest('ensureFanAccount', token),
    ACCOUNT_HYDRATION_TIMEOUT_MS
  );
  if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
  const validated = validateFanAccountResponse(response);
  if (!validated) throw new Error('fan_schema_mismatch');
  return validated;
}

async function loadFavorites(user) {
  const token = await tokenForUser(user);
  const response = await postFan(buildFanRequest('listFanFavorites', token));
  if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
  const validated = validateFanFavoritesResponse(response);
  if (!validated) throw new Error('fan_schema_mismatch');
  return [...validated];
}

function venueById(venueId) {
  return appState.snapshot?.venues?.find((venue) => venue.venue_id === venueId) || null;
}

function favoritesUnavailableCopy(code) {
  if (code === 'fan_network_timeout') return 'Favorites took too long to load.';
  if (code === 'fan_network_failure') return 'Favorites couldn’t reach CGB.';
  return 'Favorites are temporarily unavailable.';
}

function renderFavorites() {
  if (!dom?.favorites) return;
  dom.favorites.replaceChildren();
  const selected = venueById(appState.selectedVenueId);

  if (favoritesLoadState === 'loading') {
    dom.saveSelected.hidden = true;
    dom.saveSelected.dataset.venueId = '';
    const loading = document.createElement('p');
    loading.className = 'accounts-empty';
    loading.textContent = 'Loading favorites…';
    dom.favorites.append(loading);
    return;
  }

  if (favoritesLoadState === 'error') {
    dom.saveSelected.hidden = true;
    dom.saveSelected.dataset.venueId = '';
    const unavailable = document.createElement('p');
    unavailable.className = 'accounts-empty';
    unavailable.textContent = favoritesUnavailableCopy(favoritesErrorCode);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'text-button';
    retry.dataset.retryFavorites = 'true';
    retry.textContent = 'Retry favorites';
    dom.favorites.append(unavailable, retry);
    return;
  }

  const selectedIsFavorite = selected && favoriteVenueIds.includes(selected.venue_id);
  if (selected && !selectedIsFavorite) {
    dom.saveSelected.hidden = false;
    dom.saveSelected.dataset.venueId = selected.venue_id;
    dom.saveSelected.textContent = `Save ${selected.name}`;
  } else {
    dom.saveSelected.hidden = true;
    dom.saveSelected.dataset.venueId = '';
  }

  const venues = favoriteVenueIds.map(venueById).filter(Boolean);
  if (!venues.length) {
    const empty = document.createElement('p');
    empty.className = 'accounts-empty';
    empty.textContent = selected
      ? 'No favorite places yet. Save the selected venue to start your list.'
      : 'No favorite places yet. Select a venue on the map, then open My CGB to save it.';
    dom.favorites.append(empty);
    return;
  }

  venues.forEach((venue) => {
    const row = document.createElement('div');
    row.className = 'accounts-favorite-row';
    const copy = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = venue.name;
    const place = document.createElement('span');
    place.textContent = [venue.city, venue.region].filter(Boolean).join(', ');
    copy.append(name, place);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-button';
    remove.dataset.removeFavorite = venue.venue_id;
    remove.textContent = 'Remove';
    row.append(copy, remove);
    dom.favorites.append(row);
  });
}

function renderConnections() {
  if (!dom?.connectedMethods || !account) return;
  dom.connectedMethods.replaceChildren();
  const accountProviders = new Set(account.providers || []);
  [
    { id: GOOGLE_PROVIDER_ID, label: 'Google' },
    { id: EMAIL_PROVIDER_ID, label: 'Email + password' },
    { id: ANONYMOUS_PROVIDER_ID, label: 'No-email profile · this device only' }
  ].forEach((choice) => {
    if (!accountProviders.has(choice.id)) return;
    const method = document.createElement('span');
    method.className = 'accounts-connected-method';
    method.textContent = choice.label;
    dom.connectedMethods.append(method);
  });
}

function fillProfileForm() {
  if (!account || !dom?.profileForm) return;
  const form = dom.profileForm.elements;
  form.displayName.value = account.displayName;
  form.homeCity.value = account.homeCity;
  form.xHandle.value = account.xHandle ? `@${account.xHandle}` : '';
  form.publicProfile.checked = account.publicProfileStatus === 'public';
  form.publicAttendance.checked = account.attendanceVisibilityDefault === 'public';
  const selectedAvatar = isCgbAvatarPresetUrl(account.avatarUrl) ? account.avatarUrl : '';
  [...dom.profileForm.querySelectorAll('input[name="avatarUrl"]')].forEach((input) => {
    input.checked = input.value === selectedAvatar;
  });
}

function hideEmailForm() {
  if (!dom?.emailForm) return;
  dom.emailForm.hidden = true;
  dom.emailSubmit.disabled = false;
  dom.emailCreate.disabled = false;
  dom.emailReset.disabled = false;
  dom.emailInput.value = '';
  dom.passwordInput.value = '';
}

function showEmailForm() {
  if (!dom?.emailForm) return;
  pendingSignedOutStatus = null;
  dom.emailForm.hidden = false;
  window.setTimeout(() => dom.emailInput.focus(), 0);
}

function resetFavoritesState() {
  favoritesRequestRevision += 1;
  favoriteVenueIds = [];
  favoritesLoadState = 'idle';
  favoritesErrorCode = '';
}

function renderSignedOut() {
  account = null;
  resetFavoritesState();
  dom.signedOut.hidden = false;
  dom.authenticatedError.hidden = true;
  dom.signedIn.hidden = true;
  if (pendingSignedOutStatus) {
    setStatus(pendingSignedOutStatus.message, { error: pendingSignedOutStatus.error });
  } else {
    setStatus('');
  }
  hideEmailForm();
  dispatchAccountState();
}

function renderSignedIn() {
  if (!account || !currentUser) return;
  pendingSignedOutStatus = null;
  dom.signedOut.hidden = true;
  dom.authenticatedError.hidden = true;
  dom.signedIn.hidden = false;
  dom.displayName.textContent = account.displayName;
  dom.email.textContent = String(currentUser.email || 'No email · this device only');
  if (isCgbAvatarPresetUrl(account.avatarUrl)) {
    dom.avatar.src = account.avatarUrl;
    dom.avatar.hidden = false;
  } else {
    dom.avatar.removeAttribute('src');
    dom.avatar.hidden = true;
  }
  fillProfileForm();
  renderConnections();
  renderFavorites();
  setStatus('');
  dispatchAccountState();
}

function firebaseAuthenticatedLead(user) {
  const providers = new Set(
    Array.isArray(user?.providerData)
      ? user.providerData.map((provider) => String(provider?.providerId || '')).filter(Boolean)
      : []
  );
  if (providers.size === 1 && providers.has(GOOGLE_PROVIDER_ID)) return 'Signed in with Google.';
  return 'You’re signed in.';
}

function coreHydrationDetail(code) {
  if (code === 'fan_account_deleted') return 'This CGB account was deleted. Retry to check again, or sign out to use a different account.';
  if (code === 'fan_unauthorized') return 'CGB couldn’t verify the current account session. Retry to refresh it, or sign out.';
  if (code === 'fan_schema_mismatch') return 'CGB returned account data in an unexpected format. Retry, or sign out.';
  if (code === 'fan_network_timeout') return 'CGB took too long to return your account data. Retry, or sign out.';
  if (code === 'fan_network_failure') return 'CGB couldn’t reach the account service. Retry when your connection is available, or sign out.';
  return 'The CGB account service is temporarily unavailable. Retry, or sign out.';
}

function renderAuthenticatedError(error) {
  if (!currentUser) {
    renderSignedOut();
    return;
  }
  const code = fanClientErrorCode(error);
  account = null;
  resetFavoritesState();
  pendingSignedOutStatus = null;
  dom.signedOut.hidden = true;
  dom.signedIn.hidden = true;
  dom.authenticatedError.hidden = false;
  dom.authenticatedErrorTitle.textContent = code === 'fan_account_deleted'
    ? `${firebaseAuthenticatedLead(currentUser)} This CGB account was deleted.`
    : `${firebaseAuthenticatedLead(currentUser)} Your CGB data couldn’t load.`;
  dom.authenticatedErrorDetail.textContent = coreHydrationDetail(code);
  setStatus('');
}

async function refreshFavorites(user, revision) {
  if (!account || !authStateIsCurrent(user, revision)) return false;
  const requestRevision = ++favoritesRequestRevision;
  favoritesLoadState = 'loading';
  favoritesErrorCode = '';
  renderFavorites();
  try {
    const [loadedFavorites] = await Promise.all([
      loadFavorites(user),
      waitForApplicationReady().catch(() => null)
    ]);
    if (!authStateIsCurrent(user, revision) || requestRevision !== favoritesRequestRevision) return false;
    favoriteVenueIds = [...loadedFavorites];
    favoritesLoadState = 'ready';
    favoritesErrorCode = '';
    renderFavorites();
    markCgbPerformance('cgb:accounts:favorites:ready');
    return true;
  } catch (error) {
    if (!authStateIsCurrent(user, revision) || requestRevision !== favoritesRequestRevision) return false;
    favoriteVenueIds = [];
    favoritesLoadState = 'error';
    favoritesErrorCode = fanClientErrorCode(error);
    renderFavorites();
    logFanDiagnostic('CGB Favorites load failed', error);
    return false;
  }
}

async function refreshSignedInState(user, revision) {
  setStatus('Loading My CGB…');
  const loadedAccount = await loadAccount(user);
  if (!authStateIsCurrent(user, revision)) return false;
  account = loadedAccount;
  markCgbPerformance('cgb:accounts:core:ready');
  measureCgbPerformance('cgb:accounts:core-hydration', 'cgb:firebase:init:start', 'cgb:accounts:core:ready');
  favoriteVenueIds = [];
  favoritesLoadState = 'loading';
  favoritesErrorCode = '';
  renderSignedIn();
  void refreshFavorites(user, revision);
  return true;
}

async function retryCoreHydration() {
  const user = currentUser;
  const revision = authStateRevision;
  if (!user || !authStateIsCurrent(user, revision)) return;
  dom.coreRetry.disabled = true;
  try {
    await refreshSignedInState(user, revision);
  } catch (error) {
    if (!authStateIsCurrent(user, revision)) return;
    renderAuthenticatedError(error);
    logFanDiagnostic('CGB core account hydration failed', error);
  } finally {
    if (authStateIsCurrent(user, revision)) dom.coreRetry.disabled = false;
  }
}

function readableError(error) {
  const code = String(error?.code || error?.message || 'fan_backend_unavailable');
  if (code === 'auth/email-already-in-use') return 'That email already has a CGB sign-in. Sign in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/weak-password') return 'Choose a password with at least 6 characters.';
  if (code === 'auth/too-many-requests') return 'Too many sign-in attempts. Try again later.';
  if (code === 'auth/user-disabled') return 'This sign-in is unavailable.';
  if (code.startsWith('auth/')) return 'Sign-in did not complete. Try again.';
  const fanCode = fanClientErrorCode(error);
  if (fanCode === 'fan_account_deleted') return 'This CGB account was deleted.';
  if (fanCode === 'fan_schema_mismatch') return 'CGB account data is temporarily incompatible. Try again.';
  if (fanCode === 'fan_network_timeout') return 'CGB Accounts took too long to respond. Try again.';
  if (fanCode === 'fan_network_failure') return 'CGB Accounts couldn’t reach the service. Check your connection and try again.';
  return fanErrorCopy(fanCode);
}

function prefersRedirectSignIn() {
  const userAgent = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

function popupShouldFallbackToRedirect(error) {
  const code = String(error?.code || '');
  return code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment';
}

async function startGoogleSignIn() {
  if ((!auth || !authModule || !googleProvider) && !await startAccountInitialization()) return;
  pendingSignedOutStatus = null;
  setStatus(prefersRedirectSignIn() ? 'Continuing to Google sign-in…' : 'Opening Google sign-in…');
  try {
    if (prefersRedirectSignIn()) {
      await authModule.signInWithRedirect(auth, googleProvider);
      return;
    }
    try {
      await authModule.signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (popupShouldFallbackToRedirect(error)) {
        await authModule.signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
  } catch (error) {
    const code = String(error?.code || '');
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      setStatus('');
      return;
    }
    setStatus(readableError(error), { error: true });
  }
}

async function startAnonymousSignIn() {
  if ((!auth || !authModule) && !await startAccountInitialization()) return;
  pendingSignedOutStatus = null;
  setStatus('Creating your private CGB profile…');
  try {
    await authModule.signInAnonymously(auth);
  } catch (error) {
    setStatus(readableError(error), { error: true });
  }
}

function emailActionSettings() {
  return { url: new URL('/', window.location.origin).toString() };
}

function passwordProviderPresent(user) {
  return Array.isArray(user?.providerData) && user.providerData.some((provider) => provider?.providerId === EMAIL_PROVIDER_ID);
}

async function signInWithEmailPassword(email, password) {
  if ((!auth || !authModule) && !await startAccountInitialization()) return;
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail || !password) return;
  pendingSignedOutStatus = null;
  dom.emailSubmit.disabled = true;
  setStatus('Signing in…');
  try {
    const credential = await authModule.signInWithEmailAndPassword(auth, normalizedEmail, password);
    if (passwordProviderPresent(credential.user) && credential.user.emailVerified !== true) {
      await authModule.sendEmailVerification(credential.user, emailActionSettings());
      pendingSignedOutStatus = {
        message: 'Verify your email before signing in. We sent you a new verification email.',
        error: false
      };
      await authModule.signOut(auth);
    }
  } catch (error) {
    dom.emailSubmit.disabled = false;
    setStatus(readableError(error), { error: true });
  }
}

async function createEmailPasswordAccount(email, password) {
  if ((!auth || !authModule) && !await startAccountInitialization()) return;
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail || !password) return;
  pendingSignedOutStatus = null;
  dom.emailCreate.disabled = true;
  setStatus('Creating account…');
  try {
    const credential = await authModule.createUserWithEmailAndPassword(auth, normalizedEmail, password);
    await authModule.sendEmailVerification(credential.user, emailActionSettings());
    pendingSignedOutStatus = {
      message: 'Account created. Check your email to verify it, then sign in.',
      error: false
    };
    await authModule.signOut(auth);
  } catch (error) {
    dom.emailCreate.disabled = false;
    setStatus(readableError(error), { error: true });
  }
}

async function sendPasswordReset(email) {
  if ((!auth || !authModule) && !await startAccountInitialization()) return;
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail || !dom.emailInput.checkValidity()) {
    dom.emailInput.reportValidity();
    return;
  }
  pendingSignedOutStatus = null;
  dom.emailReset.disabled = true;
  setStatus('Sending password reset…');
  try {
    await authModule.sendPasswordResetEmail(auth, normalizedEmail, emailActionSettings());
    setStatus('If that email has a CGB account, check your inbox for a password-reset link.');
  } catch (error) {
    setStatus(readableError(error), { error: true });
  } finally {
    dom.emailReset.disabled = false;
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const user = currentUser;
  const revision = authStateRevision;
  if (!account || !user) return;
  dom.profileSave.disabled = true;
  try {
    const fields = dom.profileForm.elements;
    const selectedAvatar = String(fields.avatarUrl?.value || '').trim();
    const changes = normalizeFanProfileDraft({
      displayName: fields.displayName.value,
      avatarUrl: isCgbAvatarPresetUrl(selectedAvatar) ? selectedAvatar : '',
      homeCity: fields.homeCity.value,
      xHandle: fields.xHandle.value,
      publicProfileStatus: fields.publicProfile.checked ? 'public' : 'private',
      attendanceVisibilityDefault: fields.publicAttendance.checked ? 'public' : 'anonymous'
    });
    const token = await tokenForUser(user);
    const response = await postFan(buildFanRequest('saveFanProfile', token, { changes }));
    if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
    const validated = validateFanAccountResponse(response);
    if (!validated) throw new Error('fan_schema_mismatch');
    if (!authStateIsCurrent(user, revision)) return;
    account = validated;
    renderSignedIn();
    setStatus('Profile saved.');
    window.dispatchEvent(new CustomEvent('cgb:profile-saved'));
  } catch (error) {
    if (!authStateIsCurrent(user, revision)) return;
    setStatus(readableError(error), { error: true });
  } finally {
    dom.profileSave.disabled = false;
  }
}

async function setFavorite(venueId, favorited) {
  const user = currentUser;
  const revision = authStateRevision;
  if (!user || favoritesLoadState !== 'ready') return;
  setStatus(favorited ? 'Saving favorite…' : 'Removing favorite…');
  try {
    const token = await tokenForUser(user);
    const response = await postFan(buildFanRequest('setFanFavorite', token, { venueId, favorited }));
    if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
    const validated = validateFanFavoritesResponse(response);
    if (!validated) throw new Error('fan_schema_mismatch');
    if (!authStateIsCurrent(user, revision)) return;
    favoriteVenueIds = [...validated];
    favoritesLoadState = 'ready';
    favoritesErrorCode = '';
    renderFavorites();
    setStatus(favorited ? 'Favorite saved.' : 'Favorite removed.');
  } catch (error) {
    if (!authStateIsCurrent(user, revision)) return;
    setStatus(readableError(error), { error: true });
  }
}

async function signOutCurrentUser(button) {
  if (!auth || !authModule) return;
  button.disabled = true;
  try {
    await authModule.signOut(auth);
  } finally {
    button.disabled = false;
  }
}

function bindEvents() {
  dom.close.addEventListener('click', () => dom.dialog.close());
  dom.dialog.addEventListener('click', (event) => {
    if (event.target === dom.dialog) dom.dialog.close();
  });
  dom.providerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.accountProvider === 'google') {
        void startGoogleSignIn();
      } else if (button.dataset.accountProvider === 'email') {
        showEmailForm();
      } else if (button.dataset.accountProvider === 'anonymous') {
        void startAnonymousSignIn();
      }
    });
  });
  dom.emailForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!dom.emailForm.reportValidity()) return;
    void signInWithEmailPassword(dom.emailInput.value, dom.passwordInput.value);
  });
  dom.emailCreate.addEventListener('click', () => {
    if (!dom.emailForm.reportValidity()) return;
    void createEmailPasswordAccount(dom.emailInput.value, dom.passwordInput.value);
  });
  dom.emailReset.addEventListener('click', () => {
    void sendPasswordReset(dom.emailInput.value);
  });
  dom.emailCancel.addEventListener('click', () => {
    hideEmailForm();
    setStatus('');
  });
  dom.profileForm.addEventListener('submit', saveProfile);
  dom.signOut.addEventListener('click', () => { void signOutCurrentUser(dom.signOut); });
  dom.degradedSignOut.addEventListener('click', () => { void signOutCurrentUser(dom.degradedSignOut); });
  dom.coreRetry.addEventListener('click', () => { void retryCoreHydration(); });
  dom.saveSelected.addEventListener('click', () => {
    const venueId = dom.saveSelected.dataset.venueId;
    if (venueId) setFavorite(venueId, true);
  });
  dom.favorites.addEventListener('click', (event) => {
    const retry = event.target.closest('[data-retry-favorites]');
    if (retry && currentUser && account) {
      void refreshFavorites(currentUser, authStateRevision);
      return;
    }
    const button = event.target.closest('[data-remove-favorite]');
    if (button) setFavorite(button.dataset.removeFavorite, false);
  });
}

async function initializeFirebase() {
  markCgbPerformance('cgb:firebase:init:start');
  const appUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
  const authUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;
  const [appModule, loadedAuthModule] = await Promise.all([import(appUrl), import(authUrl)]);
  authModule = loadedAuthModule;
  const firebaseApp = appModule.initializeApp(CGB_ACCOUNTS_CONFIG.firebase);
  auth = authModule.getAuth(firebaseApp);
  await authModule.setPersistence(auth, authModule.browserLocalPersistence);

  googleProvider = new authModule.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  await authModule.getRedirectResult(auth).catch((error) => {
    setStatus(readableError(error), { error: true });
  });

  authModule.onAuthStateChanged(auth, async (user) => {
    const revision = ++authStateRevision;
    if (user && passwordProviderPresent(user) && user.emailVerified !== true) {
      currentUser = null;
      account = null;
      resetFavoritesState();
      pendingSignedOutStatus = pendingSignedOutStatus || {
        message: 'Verify your email before signing in.',
        error: false
      };
      await authModule.signOut(auth).catch(() => null);
      if (revision !== authStateRevision) return;
      renderSignedOut();
      return;
    }
    currentUser = user || null;
    account = null;
    resetFavoritesState();
    if (!user) {
      renderSignedOut();
      return;
    }
    try {
      await refreshSignedInState(user, revision);
    } catch (error) {
      if (!authStateIsCurrent(user, revision)) return;
      renderAuthenticatedError(error);
      logFanDiagnostic('CGB core account hydration failed', error);
    }
  });
  markCgbPerformance('cgb:firebase:init:ready');
  measureCgbPerformance('cgb:firebase:init', 'cgb:firebase:init:start', 'cgb:firebase:init:ready');
}

function scheduleDeferredAccountStartup() {
  if (deferredStartupScheduled || accountStartupPromise) return;
  deferredStartupScheduled = true;
  const start = () => { void startAccountInitialization(); };
  if (window.CGBPublicLaunchUsable === true) {
    queueMicrotask(start);
    return;
  }
  window.addEventListener('cgb:public-usable', start, { once: true });
}

export async function initializeAccountsUi() {
  if (!accountsConfigIsReady(CGB_ACCOUNTS_CONFIG)) return false;
  if (uiInitialized) return true;
  injectAccountsStyles();
  dom = collectDom();
  if (!dom) return false;
  bindEvents();
  renderSignedOut();
  uiInitialized = true;
  scheduleDeferredAccountStartup();
  return true;
}

export function startAccountInitialization() {
  if (!accountsConfigIsReady(CGB_ACCOUNTS_CONFIG)) return Promise.resolve(false);
  if (!uiInitialized && !initializeAccountsUi()) return Promise.resolve(false);
  if (accountStartupPromise) return accountStartupPromise;
  accountStartupPromise = initializeFirebase()
    .then(() => true)
    .catch((error) => {
      setStatus('CGB Accounts could not start.', { error: true });
      console.warn(`CGB Accounts startup failed: ${fanClientErrorCode(error)}`);
      return false;
    });
  return accountStartupPromise;
}

window.CGBAccounts = Object.freeze({
  isSignedIn: () => Boolean(currentUser && account),
  start: startAccountInitialization,
  getIdToken: (forceRefresh = false) => currentToken(forceRefresh),
  getProfile: () => clientProfile(),
  request: (action, extra = {}) => requestFanAction(action, extra)
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountsUi, { once: true });
} else {
  initializeAccountsUi();
}
