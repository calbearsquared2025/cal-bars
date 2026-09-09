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
  ADMIN_ACTIVITY_LABELS,
  ADMIN_ACTIVITY_TYPES,
  adminErrorCopy,
  applyReviewedState,
  buildAdminActivityRequest,
  buildMarkReviewedRequest,
  filterAdminActivity,
  firebaseConfigIsComplete,
  validateAdminActivityResponse,
  validateMarkReviewedResponse
} from './admin-auth-core.mjs';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const REQUEST_TIMEOUT_MS = 12000;
const firebaseConfig = ADMIN_AUTH_CONFIG.firebase || {};
const adminEndpoint = String(ADMIN_AUTH_CONFIG.endpoint || '').trim();

const authShell = document.querySelector('#auth-shell');
const dashboard = document.querySelector('#dashboard');
const statusNode = document.querySelector('#admin-status');
const signInButton = document.querySelector('#admin-sign-in');
const signOutButtons = [...document.querySelectorAll('.admin-sign-out')];
const accountNode = document.querySelector('#admin-account');
const dashboardAccountNode = document.querySelector('#dashboard-account');
const dashboardStatusNode = document.querySelector('#dashboard-status');
const overviewListNode = document.querySelector('#overview-list');
const activityListNode = document.querySelector('#activity-list');
const overviewSummaryNode = document.querySelector('#overview-summary');
const activitySummaryNode = document.querySelector('#activity-summary');
const overviewTypeFilter = document.querySelector('#overview-type-filter');
const activityTypeFilter = document.querySelector('#activity-type-filter');
const activityReviewFilter = document.querySelector('#activity-review-filter');
const markAllReviewedButton = document.querySelector('#mark-all-reviewed');
const navButtons = [...document.querySelectorAll('.admin-nav__item')];
const panels = [...document.querySelectorAll('[data-panel]')];

let auth = null;
let currentUser = null;
let activityItems = [];
let toastTimer = 0;

function setStatus(message, { error = false } = {}) {
  statusNode.textContent = message;
  statusNode.dataset.state = error ? 'error' : 'normal';
}

function setAccount(user) {
  const email = String(user?.email || '').trim();
  accountNode.textContent = email ? `Signed in as ${email}` : '';
  dashboardAccountNode.textContent = email;
}

function setSignedOutUi() {
  currentUser = null;
  activityItems = [];
  setAccount(null);
  authShell.hidden = false;
  dashboard.hidden = true;
  signInButton.hidden = false;
  signInButton.disabled = false;
  signOutButtons.forEach((button) => { button.hidden = true; });
  setStatus('Sign in with the Google account authorized for CGB Admin.');
}

function setSignedInPendingUi(user) {
  setAccount(user);
  authShell.hidden = false;
  dashboard.hidden = true;
  signInButton.hidden = true;
  signOutButtons.forEach((button) => { button.hidden = false; });
}

function showDashboard(user) {
  setAccount(user);
  authShell.hidden = true;
  dashboard.hidden = false;
  signOutButtons.forEach((button) => { button.hidden = false; });
  renderDashboard();
}

function showToast(message, { error = false } = {}) {
  window.clearTimeout(toastTimer);
  dashboardStatusNode.textContent = message;
  dashboardStatusNode.dataset.state = error ? 'error' : 'normal';
  dashboardStatusNode.dataset.visible = 'true';
  toastTimer = window.setTimeout(() => {
    dashboardStatusNode.dataset.visible = 'false';
  }, 3200);
}

async function postAdmin(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(adminEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal
    });
    const responsePayload = await response.json().catch(() => null);
    if (!response.ok || !responsePayload) throw new Error('admin_backend_unavailable');
    return responsePayload;
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function formatStatus(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createActivityCard(item) {
  const card = document.createElement('article');
  card.className = 'activity-card';
  card.dataset.reviewed = String(item.reviewed);

  const content = document.createElement('div');
  const meta = document.createElement('div');
  meta.className = 'activity-card__meta';

  const type = document.createElement('span');
  type.className = 'activity-type';
  type.textContent = ADMIN_ACTIVITY_LABELS[item.type] || 'Activity';
  meta.append(type);

  const timestamp = document.createElement('time');
  timestamp.dateTime = item.occurredAt || '';
  timestamp.textContent = formatDate(item.occurredAt);
  meta.append(timestamp);

  if (item.status) {
    const status = document.createElement('span');
    status.className = 'status-chip';
    status.textContent = formatStatus(item.status);
    meta.append(status);
  }

  const title = document.createElement('h2');
  title.textContent = item.title;
  content.append(meta, title);

  if (item.detail) {
    const detail = document.createElement('p');
    detail.textContent = item.detail;
    content.append(detail);
  }

  const action = document.createElement('div');
  action.className = 'activity-card__action';
  if (item.reviewed) {
    const label = document.createElement('span');
    label.className = 'reviewed-label';
    label.textContent = 'Reviewed';
    action.append(label);
  } else {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.reviewKey = item.key;
    button.textContent = 'Mark reviewed';
    action.append(button);
  }

  card.append(content, action);
  return card;
}

function renderList(node, items, emptyCopy) {
  node.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = emptyCopy;
    node.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.append(createActivityCard(item)));
  node.append(fragment);
}

function currentOverviewItems() {
  return filterAdminActivity(activityItems, {
    overview: true,
    type: overviewTypeFilter.value
  });
}

function currentActivityItems() {
  return filterAdminActivity(activityItems, {
    type: activityTypeFilter.value,
    review: activityReviewFilter.value
  });
}

function renderDashboard() {
  const overviewItems = currentOverviewItems();
  const historyItems = currentActivityItems();
  const reviewedCount = activityItems.filter((item) => item.reviewed).length;
  const unreviewedCount = activityItems.length - reviewedCount;

  overviewSummaryNode.textContent = unreviewedCount === 1
    ? '1 item needs review.'
    : `${unreviewedCount} items need review.`;
  activitySummaryNode.textContent = `${activityItems.length} total · ${unreviewedCount} unreviewed · ${reviewedCount} reviewed`;

  markAllReviewedButton.disabled = overviewItems.length === 0;
  markAllReviewedButton.textContent = overviewItems.length
    ? `Mark ${overviewItems.length} as reviewed`
    : 'Mark all as reviewed';

  renderList(overviewListNode, overviewItems, 'No unreviewed items match this filter.');
  renderList(activityListNode, historyItems, 'No activity matches these filters.');
}

function populateTypeFilters() {
  ADMIN_ACTIVITY_TYPES.forEach((type) => {
    const label = ADMIN_ACTIVITY_LABELS[type] || type;
    [overviewTypeFilter, activityTypeFilter].forEach((select) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = label;
      select.append(option);
    });
  });
}

async function loadAdminActivity(user) {
  setSignedInPendingUi(user);
  setStatus('Loading CGB Admin…');
  try {
    const idToken = await user.getIdToken(true);
    const payload = await postAdmin(buildAdminActivityRequest(idToken));
    if (payload.ok !== true) {
      setStatus(adminErrorCopy(payload.error), { error: true });
      return;
    }
    const result = validateAdminActivityResponse(payload);
    if (!result) throw new Error('admin_backend_unavailable');
    activityItems = [...result.items];
    showDashboard(user);
  } catch (error) {
    const code = error?.name === 'AbortError'
      ? 'admin_backend_unavailable'
      : String(error?.message || 'admin_backend_unavailable');
    setStatus(adminErrorCopy(code), { error: true });
  }
}

async function markReviewed(keys) {
  if (!currentUser || !keys.length) return;
  markAllReviewedButton.disabled = true;
  try {
    const idToken = await currentUser.getIdToken();
    const payload = await postAdmin(buildMarkReviewedRequest(idToken, keys));
    if (payload.ok !== true) throw new Error(payload.error || 'admin_backend_unavailable');
    const result = validateMarkReviewedResponse(payload);
    if (!result) throw new Error('admin_backend_unavailable');
    activityItems = applyReviewedState(activityItems, result.reviewedKeys, result.reviewedAt);
    renderDashboard();
    showToast(result.reviewedCount === 1 ? 'Marked reviewed.' : `Marked ${result.reviewedCount} items reviewed.`);
  } catch (error) {
    const code = error?.name === 'AbortError'
      ? 'admin_backend_unavailable'
      : String(error?.message || 'admin_backend_unavailable');
    renderDashboard();
    showToast(adminErrorCopy(code), { error: true });
  }
}

function bindDashboardEvents() {
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      navButtons.forEach((candidate) => {
        candidate.setAttribute('aria-selected', String(candidate === button));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== view;
      });
    });
  });

  [overviewTypeFilter, activityTypeFilter, activityReviewFilter].forEach((control) => {
    control.addEventListener('change', renderDashboard);
  });

  [overviewListNode, activityListNode].forEach((node) => {
    node.addEventListener('click', (event) => {
      const button = event.target.closest('[data-review-key]');
      if (!button) return;
      button.disabled = true;
      markReviewed([button.dataset.reviewKey]);
    });
  });

  markAllReviewedButton.addEventListener('click', () => {
    const keys = currentOverviewItems().map((item) => item.key);
    markReviewed(keys);
  });
}

function configurationReady() {
  return firebaseConfigIsComplete(firebaseConfig) && Boolean(adminEndpoint);
}

async function initializeAdminAuth() {
  populateTypeFilters();
  bindDashboardEvents();

  if (!configurationReady()) {
    signInButton.disabled = true;
    signOutButtons.forEach((button) => { button.hidden = true; });
    setStatus('Firebase Admin setup is not configured.', { error: true });
    return;
  }

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
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

  signOutButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await signOut(auth);
      } finally {
        button.disabled = false;
      }
    });
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      setSignedOutUi();
      return;
    }
    currentUser = user;
    loadAdminActivity(user);
  });
}

initializeAdminAuth().catch(() => {
  signInButton.disabled = true;
  setStatus('CGB Admin authentication could not start.', { error: true });
});
