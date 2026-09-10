import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

import {
  buildAdminAccountsRequest,
  buildSaveAdminAccountRequest,
  filterAdminAccounts,
  validateAdminAccountsResponse,
  validateSaveAdminAccountResponse
} from './admin-accounts-core.mjs';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const REQUEST_TIMEOUT_MS = 12000;
const endpoint = String(ADMIN_AUTH_CONFIG.endpoint || '').trim();
const navButton = document.querySelector('[data-view="accounts"]');
const listNode = document.querySelector('#accounts-list');
const summaryNode = document.querySelector('#accounts-summary');
const searchInput = document.querySelector('#accounts-search');
const statusFilter = document.querySelector('#accounts-status-filter');

let accounts = [];
let loaded = false;
let loading = false;

function formatStatus(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function postAdmin(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
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

function currentUser() {
  try {
    return getAuth().currentUser;
  } catch (_) {
    return null;
  }
}

function setEmpty(message) {
  listNode.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = message;
  listNode.append(empty);
}

function currentAccounts() {
  return filterAdminAccounts(accounts, {
    query: searchInput.value,
    status: statusFilter.value
  });
}

function updateSummary() {
  const active = accounts.filter((account) => account.accountStatus === 'active').length;
  const suspended = accounts.length - active;
  const publicProfiles = accounts.filter((account) => account.publicProfileStatus === 'public').length;
  summaryNode.textContent = `${accounts.length} total · ${active} active · ${suspended} suspended · ${publicProfiles} public profiles`;
}

function createActionButton(label, action, accountId, secondary = true) {
  const button = document.createElement('button');
  button.type = 'button';
  if (secondary) button.className = 'secondary';
  button.dataset.accountAction = action;
  button.dataset.accountId = accountId;
  button.textContent = label;
  return button;
}

function createRow(account) {
  const row = document.createElement('tr');
  row.dataset.accountId = account.accountId;
  row.dataset.suspended = String(account.accountStatus === 'suspended');

  const bearCell = document.createElement('td');
  bearCell.dataset.label = 'Bear';
  const name = document.createElement('strong');
  name.textContent = account.displayName;
  bearCell.append(name);
  if (account.xHandle) {
    const handle = document.createElement('small');
    handle.textContent = ` @${account.xHandle}`;
    bearCell.append(handle);
  }

  const emailCell = document.createElement('td');
  emailCell.dataset.label = 'Email';
  emailCell.textContent = account.email || '—';

  const homeCell = document.createElement('td');
  homeCell.dataset.label = 'Home';
  homeCell.textContent = account.homeCity || '—';

  const profileCell = document.createElement('td');
  profileCell.dataset.label = 'Profile';
  const profileStatus = document.createElement('span');
  profileStatus.className = 'status-chip';
  profileStatus.textContent = formatStatus(account.publicProfileStatus);
  profileCell.append(profileStatus);

  const accountCell = document.createElement('td');
  accountCell.dataset.label = 'Account';
  const accountStatus = document.createElement('span');
  accountStatus.className = 'status-chip';
  accountStatus.textContent = formatStatus(account.accountStatus);
  accountCell.append(accountStatus);

  const actionCell = document.createElement('td');
  actionCell.dataset.label = 'Actions';
  actionCell.className = 'activity-review-cell';
  actionCell.append(
    createActionButton(
      account.publicProfileStatus === 'public' ? 'Hide profile' : 'Allow profile',
      'profile',
      account.accountId
    ),
    document.createTextNode(' '),
    createActionButton(
      account.accountStatus === 'active' ? 'Suspend' : 'Restore',
      'status',
      account.accountId,
      account.accountStatus !== 'active'
    )
  );

  row.append(bearCell, emailCell, homeCell, profileCell, accountCell, actionCell);
  return row;
}

function render() {
  updateSummary();
  const filtered = currentAccounts();
  listNode.replaceChildren();
  if (!filtered.length) {
    setEmpty(accounts.length ? 'No accounts match these filters.' : 'No fan accounts yet.');
    return;
  }

  const table = document.createElement('table');
  table.className = 'activity-table';
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Bear', 'Email', 'Home', 'Profile', 'Account', 'Actions'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headerRow.append(th);
  });
  head.append(headerRow);
  const body = document.createElement('tbody');
  filtered.forEach((account) => body.append(createRow(account)));
  table.append(head, body);
  listNode.append(table);
}

async function loadAccounts() {
  if (loading || loaded) return;
  const user = currentUser();
  if (!user || !endpoint) {
    setEmpty('Account moderation is unavailable until Admin authentication completes.');
    return;
  }
  loading = true;
  setEmpty('Loading accounts…');
  try {
    const idToken = await user.getIdToken();
    const payload = await postAdmin(buildAdminAccountsRequest(idToken));
    if (payload.ok !== true) throw new Error(payload.error || 'admin_backend_unavailable');
    const result = validateAdminAccountsResponse(payload);
    if (!result) throw new Error('admin_backend_unavailable');
    accounts = [...result.accounts];
    loaded = true;
    render();
  } catch (_) {
    setEmpty('Account moderation could not reach the private backend.');
  } finally {
    loading = false;
  }
}

async function saveAccount(account, changes, button) {
  const user = currentUser();
  if (!user || !account) return;
  button.disabled = true;
  try {
    const idToken = await user.getIdToken();
    const payload = await postAdmin(buildSaveAdminAccountRequest(idToken, account.accountId, changes));
    if (payload.ok !== true) throw new Error(payload.error || 'admin_backend_unavailable');
    const updated = validateSaveAdminAccountResponse(payload);
    if (!updated) throw new Error('admin_backend_unavailable');
    accounts = accounts.map((candidate) => candidate.accountId === updated.accountId ? updated : candidate);
    render();
  } catch (_) {
    window.alert('Account moderation could not be saved.');
    button.disabled = false;
  }
}

navButton?.addEventListener('click', () => { void loadAccounts(); });
searchInput?.addEventListener('input', () => { if (loaded) render(); });
statusFilter?.addEventListener('change', () => { if (loaded) render(); });
listNode?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-account-action][data-account-id]');
  if (!button) return;
  const account = accounts.find((candidate) => candidate.accountId === button.dataset.accountId);
  if (!account) return;

  if (button.dataset.accountAction === 'profile') {
    void saveAccount(account, {
      publicProfileStatus: account.publicProfileStatus === 'public' ? 'private' : 'public'
    }, button);
    return;
  }

  if (button.dataset.accountAction === 'status') {
    const suspending = account.accountStatus === 'active';
    if (suspending && !window.confirm(`Suspend ${account.displayName}? They will be unable to use signed-in CGB features until restored.`)) {
      return;
    }
    void saveAccount(account, { accountStatus: suspending ? 'suspended' : 'active' }, button);
  }
});
