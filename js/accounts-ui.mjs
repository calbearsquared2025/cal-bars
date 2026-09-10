import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import {
  accountsConfigIsReady,
  buildFanRequest,
  fanErrorCopy,
  normalizeFanProfileDraft,
  validateFanAccountResponse,
  validateFanFavoritesResponse
} from './accounts-core.mjs';
import { appState, waitForApplicationReady } from './app-state.mjs';

const REQUEST_TIMEOUT_MS = 12000;
const FIREBASE_VERSION = '12.18.0';
const GOOGLE_PROVIDER_ID = 'google.com';
const EMAIL_PROVIDER_ID = 'password';
const EMAIL_SIGNIN_STORAGE_KEY = 'cgb.accounts.emailForSignIn';
const EMAIL_LINK_QUERY_KEYS = Object.freeze([
  'apiKey', 'oobCode', 'mode', 'lang', 'tenantId', 'continueUrl'
]);

let auth = null;
let authModule = null;
let googleProvider = null;
let currentUser = null;
let account = null;
let favoriteVenueIds = [];
let dom = null;
let pendingEmailLinkUrl = '';

function injectAccountsStyles() {
  if (document.querySelector('link[data-cgb-accounts-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/accounts.css';
  link.dataset.cgbAccountsStyle = 'true';
  document.head.append(link);
}

function buildLauncher() {
  const brandRow = document.querySelector('.site-header__brand-row');
  const aboutButton = document.querySelector('#header-about-button');
  if (!brandRow || !aboutButton) return null;

  const button = document.createElement('button');
  button.id = 'cgb-account-button';
  button.type = 'button';
  button.className = 'account-launcher';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'cgb-account-dialog');
  button.setAttribute('aria-label', 'Open My CGB');

  const avatar = document.createElement('span');
  avatar.className = 'account-launcher__avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = 'C';
  const label = document.createElement('span');
  label.className = 'account-launcher__label';
  label.textContent = 'Sign in';
  button.append(avatar, label);
  brandRow.insertBefore(button, aboutButton);
  return button;
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
          <p class="accounts-email-help">No password. We’ll send you a secure sign-in link.</p>
          <div class="accounts-email-actions">
            <button class="primary-button accounts-email-submit" type="submit">Email me a sign-in link</button>
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
  const launcher = buildLauncher();
  const dialog = buildDialog();
  if (!launcher || !dialog) return null;
  return {
    launcher,
    launcherAvatar: launcher.querySelector('.account-launcher__avatar'),
    launcherLabel: launcher.querySelector('.account-launcher__label'),
    dialog,
    close: dialog.querySelector('.accounts-close'),
    status: dialog.querySelector('.accounts-status'),
    signedOut: dialog.querySelector('.accounts-signed-out'),
    signedIn: dialog.querySelector('.accounts-signed-in'),
    providerButtons: [...dialog.querySelectorAll('[data-account-provider]')],
    emailForm: dialog.querySelector('.accounts-email-form'),
    emailInput: dialog.querySelector('.accounts-email-form input[name="email"]'),
    emailHelp: dialog.querySelector('.accounts-email-help'),
    emailSubmit: dialog.querySelector('.accounts-email-submit'),
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

async function currentToken(forceRefresh = false) {
  if (!currentUser) throw new Error('fan_unauthorized');
  return currentUser.getIdToken(forceRefresh);
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
  const token = await currentToken();
  return postFan(buildFanRequest(action, token, extra));
}

async function loadAccount() {
  const token = await currentToken(true);
  const response = await postFan(buildFanRequest('ensureFanAccount', token));
  if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
  const validated = validateFanAccountResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  account = validated;
  return account;
}

async function loadFavorites() {
  const token = await currentToken();
  const response = await postFan(buildFanRequest('listFanFavorites', token));
  if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
  const validated = validateFanFavoritesResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  favoriteVenueIds = [...validated];
  return favoriteVenueIds;
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
    { id: EMAIL_PROVIDER_ID, label: 'Email link' }
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
}

function hideEmailForm() {
  if (!dom?.emailForm) return;
  dom.emailForm.hidden = true;
  dom.emailSubmit.disabled = false;
  dom.emailInput.value = '';
}

function showEmailForm({ completing = false } = {}) {
  if (!dom?.emailForm) return;
  dom.emailForm.hidden = false;
  dom.emailHelp.textContent = completing
    ? 'Confirm the email address that received this sign-in link.'
    : 'No password. We’ll send you a secure sign-in link.';
  dom.emailSubmit.textContent = completing ? 'Finish sign in' : 'Email me a sign-in link';
  window.setTimeout(() => dom.emailInput.focus(), 0);
}

function renderSignedOut() {
  account = null;
  favoriteVenueIds = [];
  dom.signedOut.hidden = false;
  dom.signedIn.hidden = true;
  dom.launcherLabel.textContent = 'Sign in';
  dom.launcherAvatar.textContent = 'C';
  dom.launcherAvatar.replaceChildren(document.createTextNode('C'));
  dom.launcherAvatar.style.backgroundImage = '';
  setStatus('');
  if (pendingEmailLinkUrl) {
    showEmailForm({ completing: true });
    setStatus('Confirm your email to finish signing in.');
  } else {
    hideEmailForm();
  }
  dispatchAccountState();
}

function renderSignedIn() {
  if (!account || !currentUser) return;
  dom.signedOut.hidden = true;
  dom.signedIn.hidden = false;
  dom.launcherLabel.textContent = 'My CGB';
  const initial = account.displayName.slice(0, 1).toUpperCase() || 'C';
  dom.launcherAvatar.replaceChildren(document.createTextNode(initial));
  dom.launcherAvatar.style.backgroundImage = account.avatarUrl ? `url("${account.avatarUrl.replace(/"/g, '')}")` : '';
  dom.displayName.textContent = account.displayName;
  dom.email.textContent = String(currentUser.email || 'Signed in');
  if (account.avatarUrl) {
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

async function refreshSignedInState() {
  setStatus('Loading My CGB…');
  await Promise.all([loadAccount(), waitForApplicationReady().catch(() => null)]);
  await loadFavorites();
  renderSignedIn();
}

function readableError(error) {
  if (error?.name === 'AbortError') return fanErrorCopy('fan_backend_unavailable');
  const code = String(error?.message || error?.code || 'fan_backend_unavailable');
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

function emailSignInReturnUrl() {
  const url = new URL(window.location.href);
  EMAIL_LINK_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
  return url.toString();
}

function clearEmailLinkFromAddressBar() {
  const cleanUrl = emailSignInReturnUrl();
  window.history.replaceState(window.history.state, '', cleanUrl);
}

function savedEmailForSignIn() {
  try {
    return String(window.localStorage.getItem(EMAIL_SIGNIN_STORAGE_KEY) || '').trim();
  } catch (_) {
    return '';
  }
}

function rememberEmailForSignIn(email) {
  try {
    window.localStorage.setItem(EMAIL_SIGNIN_STORAGE_KEY, email);
  } catch (_) {
    // Cross-device completion can ask for the email again if storage is unavailable.
  }
}

function forgetEmailForSignIn() {
  try {
    window.localStorage.removeItem(EMAIL_SIGNIN_STORAGE_KEY);
  } catch (_) {
    // No persisted email to clean up.
  }
}

async function sendEmailLink(email) {
  if (!auth || !authModule) return;
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) return;
  dom.emailSubmit.disabled = true;
  setStatus('Sending sign-in link…');
  try {
    await authModule.sendSignInLinkToEmail(auth, normalizedEmail, {
      url: emailSignInReturnUrl(),
      handleCodeInApp: true,
      linkDomain: CGB_ACCOUNTS_CONFIG.firebase.authDomain
    });
    rememberEmailForSignIn(normalizedEmail);
    hideEmailForm();
    setStatus('Check your email for a CGB sign-in link.');
  } catch (error) {
    dom.emailSubmit.disabled = false;
    setStatus(readableError(error), { error: true });
  }
}

async function finishEmailLinkSignIn(email) {
  if (!auth || !authModule || !pendingEmailLinkUrl) return;
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) return;
  dom.emailSubmit.disabled = true;
  setStatus('Finishing sign in…');
  try {
    await authModule.signInWithEmailLink(auth, normalizedEmail, pendingEmailLinkUrl);
    pendingEmailLinkUrl = '';
    forgetEmailForSignIn();
    clearEmailLinkFromAddressBar();
    hideEmailForm();
  } catch (error) {
    dom.emailSubmit.disabled = false;
    setStatus(readableError(error), { error: true });
  }
}

async function saveProfile(event) {
  event.preventDefault();
  if (!account || !currentUser) return;
  dom.profileSave.disabled = true;
  try {
    const fields = dom.profileForm.elements;
    const changes = normalizeFanProfileDraft({
      displayName: fields.displayName.value,
      avatarUrl: account.avatarUrl,
      homeCity: fields.homeCity.value,
      xHandle: fields.xHandle.value,
      publicProfileStatus: fields.publicProfile.checked ? 'public' : 'private',
      attendanceVisibilityDefault: fields.publicAttendance.checked ? 'public' : 'anonymous'
    });
    const token = await currentToken();
    const response = await postFan(buildFanRequest('saveFanProfile', token, { changes }));
    if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
    const validated = validateFanAccountResponse(response);
    if (!validated) throw new Error('fan_backend_unavailable');
    account = validated;
    renderSignedIn();
    setStatus('Profile saved.');
  } catch (error) {
    setStatus(readableError(error), { error: true });
  } finally {
    dom.profileSave.disabled = false;
  }
}

async function setFavorite(venueId, favorited) {
  if (!currentUser) return;
  setStatus(favorited ? 'Saving favorite…' : 'Removing favorite…');
  try {
    const token = await currentToken();
    const response = await postFan(buildFanRequest('setFanFavorite', token, { venueId, favorited }));
    if (response.ok !== true) throw new Error(response.error || 'fan_backend_unavailable');
    const validated = validateFanFavoritesResponse(response);
    if (!validated) throw new Error('fan_backend_unavailable');
    favoriteVenueIds = [...validated];
    renderFavorites();
    setStatus(favorited ? 'Favorite saved.' : 'Favorite removed.');
  } catch (error) {
    setStatus(readableError(error), { error: true });
  }
}

function bindEvents() {
  dom.launcher.addEventListener('click', () => {
    renderFavorites();
    dom.dialog.showModal();
  });
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
    if (!dom.emailInput.reportValidity()) return;
    if (pendingEmailLinkUrl) {
      void finishEmailLinkSignIn(dom.emailInput.value);
    } else {
      void sendEmailLink(dom.emailInput.value);
    }
  });
  dom.emailCancel.addEventListener('click', () => {
    if (pendingEmailLinkUrl) {
      pendingEmailLinkUrl = '';
      clearEmailLinkFromAddressBar();
    }
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

  if (authModule.isSignInWithEmailLink(auth, window.location.href)) {
    pendingEmailLinkUrl = window.location.href;
  }

  authModule.onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    if (!user) {
      renderSignedOut();
      return;
    }
    try {
      await refreshSignedInState();
    } catch (error) {
      setStatus(readableError(error), { error: true });
    }
  });

  if (pendingEmailLinkUrl) {
    const savedEmail = savedEmailForSignIn();
    if (savedEmail) {
      await finishEmailLinkSignIn(savedEmail);
    } else {
      if (!dom.dialog.open) dom.dialog.showModal();
      showEmailForm({ completing: true });
      setStatus('Confirm your email to finish signing in.');
    }
  }
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
    dom.launcher.disabled = true;
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
