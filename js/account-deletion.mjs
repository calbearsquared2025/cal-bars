import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady } from './accounts-core.mjs';

const FIREBASE_VERSION = '12.18.0';
const GOOGLE_PROVIDER_ID = 'google.com';
const EMAIL_PROVIDER_ID = 'password';
const STYLE_ATTR = 'data-cgb-account-deletion-style';

let authModulePromise = null;
let dialog = null;
let deleteButton = null;
let status = null;
let passwordField = null;
let confirmButton = null;
let backendDeleted = false;

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function injectStyles() {
  if (document.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-deletion.css';
  link.setAttribute(STYLE_ATTR, 'true');
  document.head.append(link);
}

function loadAuthModule() {
  if (!authModulePromise) {
    authModulePromise = import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
  }
  return authModulePromise;
}

function providerIds(user) {
  return new Set((user?.providerData || []).map((provider) => String(provider?.providerId || '')).filter(Boolean));
}

function ensureDeleteControl() {
  const section = document.querySelector('.accounts-connections');
  if (!section) return null;
  deleteButton = section.querySelector('.accounts-delete-account');
  if (!deleteButton) {
    const danger = document.createElement('div');
    danger.className = 'accounts-delete-zone';
    deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'text-button accounts-delete-account';
    deleteButton.textContent = 'Delete account';
    danger.append(deleteButton);
    section.append(danger);
    deleteButton.addEventListener('click', openDeleteDialog);
  }
  return deleteButton;
}

function buildDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'account-delete-dialog';
  dialog.setAttribute('aria-labelledby', 'account-delete-title');
  dialog.innerHTML = `
    <form method="dialog" class="account-delete-shell">
      <div class="account-delete-heading">
        <span class="eyebrow">My CGB</span>
        <h2 id="account-delete-title">Delete account?</h2>
      </div>
      <p class="account-delete-copy">Your CGB profile, email, Favorites, personal attendance history, season statistics and other account data will be permanently deleted.</p>
      <p class="account-delete-copy">Anonymous attendance and useful community contributions may be retained so CGB can preserve aggregate venue and event information, but they will no longer be linked to you.</p>
      <label class="account-delete-password" hidden>
        <span>Confirm your password</span>
        <input type="password" autocomplete="current-password" maxlength="128">
      </label>
      <p class="account-delete-status" role="status" aria-live="polite" hidden></p>
      <div class="account-delete-actions">
        <button class="text-button account-delete-cancel" type="button">Cancel</button>
        <button class="account-delete-confirm" type="submit">Delete account</button>
      </div>
    </form>`;
  document.body.append(dialog);
  status = dialog.querySelector('.account-delete-status');
  passwordField = dialog.querySelector('.account-delete-password');
  confirmButton = dialog.querySelector('.account-delete-confirm');
  dialog.querySelector('.account-delete-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('form').addEventListener('submit', handleDeleteSubmit);
  dialog.addEventListener('close', resetDialog);
  return dialog;
}

function setStatus(message = '', error = false) {
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  status.dataset.state = error ? 'error' : 'normal';
}

function resetDialog() {
  backendDeleted = false;
  if (passwordField) {
    passwordField.hidden = true;
    passwordField.querySelector('input').value = '';
  }
  if (confirmButton) confirmButton.disabled = false;
  setStatus('');
}

async function currentFirebaseContext() {
  const authModule = await loadAuthModule();
  const auth = authModule.getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('auth/requires-recent-login');
  return { authModule, user };
}

async function openDeleteDialog() {
  const target = buildDialog();
  try {
    const { user } = await currentFirebaseContext();
    const providers = providerIds(user);
    const passwordOnly = providers.has(EMAIL_PROVIDER_ID) && !providers.has(GOOGLE_PROVIDER_ID);
    passwordField.hidden = !passwordOnly;
    target.showModal();
    window.setTimeout(() => {
      if (passwordOnly) passwordField.querySelector('input').focus();
      else confirmButton.focus();
    }, 0);
  } catch (_) {
    target.showModal();
    setStatus('Sign in again before deleting your account.', true);
    confirmButton.disabled = true;
  }
}

async function reauthenticate(authModule, user) {
  const providers = providerIds(user);
  if (providers.has(GOOGLE_PROVIDER_ID)) {
    const provider = new authModule.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await authModule.reauthenticateWithPopup(user, provider);
    return;
  }
  if (providers.has(EMAIL_PROVIDER_ID) && user.email) {
    const password = String(passwordField?.querySelector('input')?.value || '');
    if (!password) {
      passwordField?.querySelector('input')?.focus();
      throw new Error('cgb/password-required');
    }
    const credential = authModule.EmailAuthProvider.credential(user.email, password);
    await authModule.reauthenticateWithCredential(user, credential);
    return;
  }
  throw new Error('auth/requires-recent-login');
}

function readableDeleteError(error) {
  const code = String(error?.code || error?.message || '');
  if (code === 'cgb/password-required') return 'Enter your password to continue.';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Password is incorrect.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Account deletion was cancelled.';
  if (code === 'auth/requires-recent-login') return 'Sign in again, then retry account deletion.';
  if (code.startsWith('auth/')) return 'We could not verify your sign-in. Try again.';
  return 'Account deletion could not be completed. Try again.';
}

async function handleDeleteSubmit(event) {
  event.preventDefault();
  if (!confirmButton || confirmButton.disabled) return;
  confirmButton.disabled = true;
  setStatus('');
  try {
    const { authModule, user } = await currentFirebaseContext();
    await reauthenticate(authModule, user);
    setStatus('Deleting your CGB data…');
    if (!backendDeleted) {
      const response = await window.CGBAccounts?.request?.('deleteFanAccount');
      if (!response || response.ok !== true) throw new Error(response?.error || 'fan_backend_unavailable');
      backendDeleted = true;
    }
    setStatus('Deleting your sign-in…');
    await authModule.deleteUser(user);
    dialog.close();
  } catch (error) {
    setStatus(
      backendDeleted
        ? 'Your CGB data is deleted. We still need to remove the Firebase sign-in; verify your sign-in and try Delete account again.'
        : readableDeleteError(error),
      true
    );
    confirmButton.disabled = false;
  }
}

function handleAccountState(event) {
  if (event?.detail?.signedIn === true) ensureDeleteControl();
  else if (dialog?.open) dialog.close();
}

export function initializeAccountDeletion() {
  if (!enabled()) return false;
  injectStyles();
  buildDialog();
  ensureDeleteControl();
  void loadAuthModule().catch(() => null);
  window.addEventListener('cgb:account-state', handleAccountState);
  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountDeletion, { once: true });
} else {
  initializeAccountDeletion();
}
