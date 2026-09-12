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
const FIREBASE_VERSION = '12.18.0';
const GOOGLE_PROVIDER_ID = 'google.com';
const EMAIL_PROVIDER_ID = 'password';

let auth = null;
let authModule = null;
let googleProvider = null;
let currentUser = null;
let account = null;
let favoriteVenueIds = [];
let dom = null;
let pendingSignedOutStatus = null;
let authStateRevision = 0;

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
          <p>Save favorite places and build your game-day history. Browsing CGB still works without an account.</p>
        </div>
        <div class="accounts-provider-actions">
          <button class="accounts-provider-button" type="button" data-account-provider="google">Continue with Google</button>
          <button class="accounts-provider-button" type="button" data-account-provider="email">Continue with email</button>
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
        <p class="accounts-fine-print">Your email and sign-in identifiers stay private. Public profile and attendance visibility are separate choices.</p>
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

async function postFan(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
  const response = await postFan(buildFanRequest('ensureFanAccount', token));
  if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
  const validated = validateFanAccountResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  return validated;
}

async function loadFavorites(user) {
  const token = await tokenForUser(user);
  const response = await postFan(buildFanRequest('listFanFavorites', token));
  if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
  const validated = validateFanFavoritesResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  return [...validated];
}

function venueById(venueId) {
  return appState.snapshot?.venues?.find((venue) => venue.venue_id === venueId) || null;
}

function renderFavorites() {
  if (!dom?.favorites) return;
  dom.favorites.replaceChildren();
  const selected = venueById(appState.selectedVenueId);
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
    { id: EMAIL_PROVIDER_ID, label: 'Email + password' }
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

function renderSignedOut() {
  account = null;
  favoriteVenueIds = [];
  dom.signedOut.hidden = false;
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
  dom.signedIn.hidden = false;
  dom.displayName.textContent = account.displayName;
  dom.email.textContent = String(currentUser.email || 'Signed in');
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

async function refreshSignedInState(user, revision) {
  setStatus('Loading My CGB…');
  const [loadedAccount] = await Promise.all([
    loadAccount(user),
    waitForApplicationReady().catch(() => null)
  ]);
  if (!authStateIsCurrent(user, revision)) return false;
  const loadedFavorites = await loadFavorites(user);
  if (!authStateIsCurrent(user, revision)) return false;
  account = loadedAccount;
  favoriteVenueIds = [...loadedFavorites];
  renderSignedIn();
  return true;
}

function readableError(error) {
  if (error?.name === 'AbortError') return fanErrorCopy('fan_backend_unavailable');
  const code = String(error?.code || error?.message || 'fan_backend_unavailable');
  if (code === 'auth/email-already-in-use') return 'That email already has a CGB sign-in. Sign in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/weak-password') return 'Choose a password with at least 6 characters.';
  if (code === 'auth/too-many-requests') return 'Too many sign-in attempts. Try again later.';
  if (code === 'auth/user-disabled') return 'This sign-in is unavailable.';
  if (code.startsWith('auth/')) return 'Sign-in did not complete. Try again.';
  return fanErrorCopy(code);
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
  if (!auth || !authModule || !googleProvider) return;
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

function emailActionSettings() {
  return { url: new URL('/', window.location.origin).toString() };
}

function passwordProviderPresent(user) {
  return Array.isArray(user?.providerData) && user.providerData.some((provider) => provider?.providerId === EMAIL_PROVIDER_ID);
}

async function signInWithEmailPassword(email, password) {
  if (!auth || !authModule) return;
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
  if (!auth || !authModule) return;
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
  if (!auth || !authModule) return;
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
    if (!validated) throw new Error('fan_backend_unavailable');
    if (!authStateIsCurrent(user, revision)) return;
    account = validated;
    renderSignedIn();
    setStatus('Profile saved.');
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
  if (!user) return;
  setStatus(favorited ? 'Saving favorite…' : 'Removing favorite…');
  try {
    const token = await tokenForUser(user);
    const response = await postFan(buildFanRequest('setFanFavorite', token, { venueId, favorited }));
    if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
    const validated = validateFanFavoritesResponse(response);
    if (!validated) throw new Error('fan_backend_unavailable');
    if (!authStateIsCurrent(user, revision)) return;
    favoriteVenueIds = [...validated];
    renderFavorites();
    setStatus(favorited ? 'Favorite saved.' : 'Favorite removed.');
  } catch (error) {
    if (!authStateIsCurrent(user, revision)) return;
    setStatus(readableError(error), { error: true });
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
  dom.signOut.addEventListener('click', async () => {
    if (!auth || !authModule) return;
    dom.signOut.disabled = true;
    try {
      await authModule.signOut(auth);
    } finally {
      dom.signOut.disabled = false;
    }
  });
  dom.saveSelected.addEventListener('click', () => {
    const venueId = dom.saveSelected.dataset.venueId;
    if (venueId) setFavorite(venueId, true);
  });
  dom.favorites.addEventListener('click', (event) => {
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
      favoriteVenueIds = [];
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
    favoriteVenueIds = [];
    if (!user) {
      renderSignedOut();
      return;
    }
    try {
      await refreshSignedInState(user, revision);
    } catch (error) {
      if (!authStateIsCurrent(user, revision)) return;
      setStatus(readableError(error), { error: true });
    }
  });
  markCgbPerformance('cgb:firebase:init:ready');
  measureCgbPerformance('cgb:firebase:init', 'cgb:firebase:init:start', 'cgb:firebase:init:ready');
}

export async function initializeAccountsUi() {
  if (!accountsConfigIsReady(CGB_ACCOUNTS_CONFIG)) return false;
  injectAccountsStyles();
  dom = collectDom();
  if (!dom) return false;
  bindEvents();
  renderSignedOut();
  try {
    await initializeFirebase();
    return true;
  } catch (error) {
    setStatus('CGB Accounts could not start.', { error: true });
    return false;
  }
}

window.CGBAccounts = Object.freeze({
  isSignedIn: () => Boolean(currentUser && account),
  getIdToken: (forceRefresh = false) => currentToken(forceRefresh),
  getProfile: () => clientProfile(),
  request: (action, extra = {}) => requestFanAction(action, extra)
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void initializeAccountsUi(); }, { once: true });
} else {
  void initializeAccountsUi();
}
