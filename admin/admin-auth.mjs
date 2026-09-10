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
  ADMIN_ACTIVITY_FILTER_TYPES,
  ADMIN_ACTIVITY_LABELS,
  adminActivityDisplayType,
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
const activityListNode = document.querySelector('#activity-list');
const activitySummaryNode = document.querySelector('#activity-summary');
const activityTypeFilter = document.querySelector('#activity-type-filter');
const activityReviewFilter = document.querySelector('#activity-review-filter');
const activityBulkReviewButton = document.querySelector('#activity-bulk-review');
const activityRefreshButton = document.querySelector('#activity-refresh');
const navButtons = [...document.querySelectorAll('.admin-nav__item')];
const panels = [...document.querySelectorAll('[data-panel]')];

let auth = null;
let currentUser = null;
let activityItems = [];
let toastTimer = 0;
let activityLoading = false;

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
  activityLoading = false;
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

function compactDetail(value, maximum = 110) {
  const text = String(value || '').trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, maximum - 1).trimEnd()}…`;
}

function createActivityDetail(item) {
  const text = String(item.detail || '').trim();
  if (!text) return document.createTextNode('—');
  if (text.length <= 110) return document.createTextNode(text);

  const details = document.createElement('details');
  details.className = 'activity-detail';
  const summary = document.createElement('summary');
  summary.textContent = compactDetail(text);
  const expanded = document.createElement('div');
  expanded.textContent = text;
  details.append(summary, expanded);
  return details;
}

function createActivityAction(item) {
  if (!item.relatedWatchPartyId && !item.relatedVenueId) return document.createTextNode('—');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  if (item.relatedWatchPartyId) {
    button.dataset.openWatchParty = item.relatedWatchPartyId;
    button.textContent = 'Open Watch Party';
  } else {
    button.dataset.openVenue = item.relatedVenueId;
    button.textContent = 'Open Venue';
  }
  return button;
}

function createActivityRow(item) {
  const row = document.createElement('tr');
  row.dataset.reviewed = String(item.reviewed);

  const dateCell = document.createElement('td');
  dateCell.dataset.label = 'Date';
  const timestamp = document.createElement('time');
  timestamp.dateTime = item.occurredAt || '';
  timestamp.textContent = formatDate(item.occurredAt);
  dateCell.append(timestamp);

  const typeCell = document.createElement('td');
  typeCell.dataset.label = 'Type';
  const type = document.createElement('span');
  type.className = 'activity-type';
  const displayType = adminActivityDisplayType(item);
  type.textContent = ADMIN_ACTIVITY_LABELS[displayType] || ADMIN_ACTIVITY_LABELS[item.type] || 'Activity';
  typeCell.append(type);

  const itemCell = document.createElement('td');
  itemCell.dataset.label = 'Item';
  const title = document.createElement('strong');
  title.textContent = item.title;
  itemCell.append(title);

  const detailCell = document.createElement('td');
  detailCell.dataset.label = 'Detail';
  detailCell.className = 'activity-detail-cell';
  detailCell.append(createActivityDetail(item));

  const statusCell = document.createElement('td');
  statusCell.dataset.label = 'Status';
  if (item.status) {
    const status = document.createElement('span');
    status.className = 'status-chip';
    status.textContent = formatStatus(item.status);
    statusCell.append(status);
  } else {
    statusCell.textContent = '—';
  }

  const actionCell = document.createElement('td');
  actionCell.dataset.label = 'Open';
  actionCell.className = 'activity-action-cell';
  actionCell.append(createActivityAction(item));

  const reviewCell = document.createElement('td');
  reviewCell.dataset.label = 'Inbox';
  reviewCell.className = 'activity-review-cell';
  if (item.reviewed) {
    const label = document.createElement('span');
    label.className = 'reviewed-label';
    label.textContent = 'Reviewed';
    reviewCell.append(label);
  } else {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.reviewKey = item.key;
    button.textContent = 'Mark reviewed';
    reviewCell.append(button);
  }

  row.append(dateCell, typeCell, itemCell, detailCell, statusCell, actionCell, reviewCell);
  return row;
}

function renderActivityTable(node, items) {
  node.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No activity matches these filters.';
    node.append(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'activity-table';
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Date', 'Type', 'Item', 'Detail', 'Status', 'Open', 'Inbox'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headerRow.append(th);
  });
  head.append(headerRow);

  const body = document.createElement('tbody');
  items.forEach((item) => body.append(createActivityRow(item)));
  table.append(head, body);
  node.append(table);
}

function currentActivityItems() {
  return filterAdminActivity(activityItems, {
    type: activityTypeFilter.value,
    review: activityReviewFilter.value
  });
}

function currentBulkReviewKeys() {
  return currentActivityItems().filter((item) => !item.reviewed).map((item) => item.key);
}

function renderDashboard() {
  const historyItems = currentActivityItems();
  const reviewedCount = activityItems.filter((item) => item.reviewed).length;
  const unreviewedCount = activityItems.length - reviewedCount;
  const bulkKeys = currentBulkReviewKeys();

  activitySummaryNode.textContent = `${activityItems.length} total · ${unreviewedCount} unreviewed · ${reviewedCount} reviewed`;
  activityBulkReviewButton.disabled = activityLoading || bulkKeys.length === 0;
  activityBulkReviewButton.textContent = bulkKeys.length
    ? `Mark ${bulkKeys.length} as reviewed`
    : 'Mark all as reviewed';
  if (activityRefreshButton) activityRefreshButton.disabled = activityLoading;

  renderActivityTable(activityListNode, historyItems);
}

function populateTypeFilters() {
  ADMIN_ACTIVITY_FILTER_TYPES.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = ADMIN_ACTIVITY_LABELS[type] || type;
    activityTypeFilter.append(option);
  });
}

async function loadAdminActivity(user, { refresh = false } = {}) {
  if (activityLoading) return;
  activityLoading = true;
  if (!refresh) {
    setSignedInPendingUi(user);
    setStatus('Loading CGB Admin…');
  } else {
    renderDashboard();
  }
  try {
    const idToken = await user.getIdToken(!refresh);
    const payload = await postAdmin(buildAdminActivityRequest(idToken));
    if (payload.ok !== true) throw new Error(payload.error || 'admin_backend_unavailable');
    const result = validateAdminActivityResponse(payload);
    if (!result) throw new Error('admin_backend_unavailable');
    activityItems = [...result.items];
    if (refresh) {
      renderDashboard();
      showToast('Activity refreshed.');
    } else {
      showDashboard(user);
    }
  } catch (error) {
    const code = error?.name === 'AbortError'
      ? 'admin_backend_unavailable'
      : String(error?.message || 'admin_backend_unavailable');
    if (refresh) {
      showToast(adminErrorCopy(code), { error: true });
    } else {
      setStatus(adminErrorCopy(code), { error: true });
    }
  } finally {
    activityLoading = false;
    if (refresh && !dashboard.hidden) renderDashboard();
  }
}

async function markReviewed(keys) {
  if (!currentUser || !keys.length) return;
  activityBulkReviewButton.disabled = true;
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

function openVenueFromActivity(venueId) {
  const open = () => {
    const node = [...document.querySelectorAll('#venue-list .venue-list-item[data-venue-id]')]
      .find((item) => item.dataset.venueId === venueId);
    if (!node) return false;
    node.click();
    node.scrollIntoView({ block: 'nearest' });
    return true;
  };
  const search = document.querySelector('#venue-search');
  const typeFilter = document.querySelector('#venue-type-filter');
  const statusFilter = document.querySelector('#venue-status-filter');
  if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); }
  if (typeFilter) { typeFilter.value = 'all'; typeFilter.dispatchEvent(new Event('change', { bubbles: true })); }
  if (statusFilter) { statusFilter.value = 'all'; statusFilter.dispatchEvent(new Event('change', { bubbles: true })); }
  document.querySelector('[data-view="venues"]')?.click();
  if (open()) return;
  const list = document.querySelector('#venue-list');
  if (!list) return;
  const observer = new MutationObserver(() => { if (open()) observer.disconnect(); });
  observer.observe(list, { childList: true, subtree: true });
  window.setTimeout(() => {
    const found = open();
    observer.disconnect();
    if (!found) showToast('That Venue could not be opened.', { error: true });
  }, 6000);
}

function openWatchPartyFromActivity(watchPartyId) {
  const open = () => {
    const node = [...document.querySelectorAll('#watch-party-list .venue-list-item[data-watch-party-id]')]
      .find((item) => item.dataset.watchPartyId === watchPartyId);
    if (!node) return false;
    node.click();
    node.scrollIntoView({ block: 'nearest' });
    return true;
  };
  const search = document.querySelector('#watch-party-search');
  const gameFilter = document.querySelector('#watch-party-game-filter');
  const venueFilter = document.querySelector('#watch-party-venue-filter');
  if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); }
  if (gameFilter) { gameFilter.value = 'all'; gameFilter.dispatchEvent(new Event('change', { bubbles: true })); }
  if (venueFilter) { venueFilter.value = 'all'; venueFilter.dispatchEvent(new Event('change', { bubbles: true })); }
  document.querySelector('[data-view="watch-parties"]')?.click();
  if (open()) return;
  const list = document.querySelector('#watch-party-list');
  if (!list) return;
  const observer = new MutationObserver(() => { if (open()) observer.disconnect(); });
  observer.observe(list, { childList: true, subtree: true });
  window.setTimeout(() => {
    const found = open();
    observer.disconnect();
    if (!found) showToast('That Watch Party could not be opened.', { error: true });
  }, 6000);
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

  [activityTypeFilter, activityReviewFilter].forEach((control) => {
    control.addEventListener('change', renderDashboard);
  });

  activityListNode.addEventListener('click', (event) => {
    const watchPartyButton = event.target.closest('[data-open-watch-party]');
    if (watchPartyButton) {
      openWatchPartyFromActivity(watchPartyButton.dataset.openWatchParty);
      return;
    }
    const venueButton = event.target.closest('[data-open-venue]');
    if (venueButton) {
      openVenueFromActivity(venueButton.dataset.openVenue);
      return;
    }
    const reviewButton = event.target.closest('[data-review-key]');
    if (!reviewButton) return;
    reviewButton.disabled = true;
    markReviewed([reviewButton.dataset.reviewKey]);
  });

  activityBulkReviewButton.addEventListener('click', () => {
    markReviewed(currentBulkReviewKeys());
  });

  activityRefreshButton?.addEventListener('click', () => {
    if (currentUser) loadAdminActivity(currentUser, { refresh: true });
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
