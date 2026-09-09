import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
  GoogleAuthProvider,
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

import {
  adminErrorCopy,
  buildAdminHealthRequest,
  firebaseConfigIsComplete,
  validateAdminHealthResponse
} from './admin-auth-core.mjs';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const REQUEST_TIMEOUT_MS = 12000;
const firebaseConfig = ADMIN_AUTH_CONFIG.firebase || {};
const adminEndpoint = String(ADMIN_AUTH_CONFIG.endpoint || '').trim();

const statusNode = document.querySelector('#admin-status');
const detailNode = document.querySelector('#admin-detail');
const signInButton = document.querySelector('#admin-sign-in');
const signOutButton = document.querySelector('#admin-sign-out');
const accountNode = document.querySelector('#admin-account');

function setStatus(message, { error = false } = {}) {
  statusNode.textContent = message;
  statusNode.dataset.state = error ? 'error' : 'normal';
}

function setAccount(user) {
  const email = String(user?.email || '').trim();
  accountNode.textContent = email ? `Signed in as ${email}` : '';
}

function setSignedOutUi() {
  setAccount(null);
  detailNode.replaceChildren();
  signInButton.hidden = false;
  signOutButton.hidden = true;
  setStatus('Sign in with the Google account authorized for CGB Admin.');
}

function setSignedInUi(user) {
  setAccount(user);
  signInButton.hidden = true;
  signOutButton.hidden = false;
}

async function postAdminHealth(idToken) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(adminEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(buildAdminHealthRequest(idToken)),
      cache: 'no-store',
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) throw new Error('admin_backend_unavailable');
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

function renderAdminHealth(health) {
  detailNode.replaceChildren();
  const list = document.createElement('dl');
  const rows = [
    ['Google account', health.email],
    ['Private workbook', health.workbookReachable ? 'Reachable' : 'Unavailable'],
    ['Venue rows', String(health.venueCount)]
  ];
  rows.forEach(([label, value]) => {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    list.append(term, detail);
  });
  detailNode.append(list);
}

async function verifyAdmin(user) {
  setSignedInUi(user);
  detailNode.replaceChildren();
  setStatus('Verifying CGB Admin access…');
  try {
    const idToken = await user.getIdToken(true);
    const payload = await postAdminHealth(idToken);
    if (payload.ok !== true) {
      setStatus(adminErrorCopy(payload.error), { error: true });
      return;
    }
    const health = validateAdminHealthResponse(payload);
    if (!health) throw new Error('admin_backend_unavailable');
    renderAdminHealth(health);
    setStatus('Admin access confirmed.');
  } catch (error) {
    const code = error?.name === 'AbortError'
      ? 'admin_backend_unavailable'
      : String(error?.message || 'admin_backend_unavailable');
    setStatus(adminErrorCopy(code), { error: true });
  }
}

function configurationReady() {
  return firebaseConfigIsComplete(firebaseConfig) && Boolean(adminEndpoint);
}

async function initializeAdminAuth() {
  if (!configurationReady()) {
    signInButton.disabled = true;
    signOutButton.hidden = true;
    setStatus('Firebase Admin setup is not configured on this branch yet.', { error: true });
    detailNode.textContent = 'Add the Firebase web configuration and admin Apps Script endpoint before testing sign-in.';
    return;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await setPersistence(auth, browserSessionPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  signInButton.addEventListener('click', async () => {
    signInButton.disabled = true;
    setStatus('Opening Google sign-in…');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (String(error?.code || '') !== 'auth/popup-closed-by-user') {
        setStatus('Google sign-in did not complete.', { error: true });
      } else {
        setStatus('Sign in with the Google account authorized for CGB Admin.');
      }
    } finally {
      signInButton.disabled = false;
    }
  });

  signOutButton.addEventListener('click', async () => {
    signOutButton.disabled = true;
    try {
      await signOut(auth);
    } finally {
      signOutButton.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      setSignedOutUi();
      return;
    }
    verifyAdmin(user);
  });
}

initializeAdminAuth().catch(() => {
  signInButton.disabled = true;
  setStatus('CGB Admin authentication could not start.', { error: true });
});
