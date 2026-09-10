const ACCOUNT_ID_PATTERN = /^acct_[a-f0-9]{24}$/;
const ACCOUNT_STATUSES = Object.freeze(['active', 'suspended']);
const PROFILE_STATUSES = Object.freeze(['private', 'public']);

function clean(value) {
  return String(value ?? '').trim();
}

function token(value) {
  const result = clean(value);
  if (!result) throw new Error('missing_id_token');
  return result;
}

export function buildAdminAccountsRequest(idToken) {
  return Object.freeze({ action: 'adminAccounts', idToken: token(idToken) });
}

export function buildSaveAdminAccountRequest(idToken, accountId, changes = {}) {
  const id = clean(accountId);
  if (!ACCOUNT_ID_PATTERN.test(id) || !changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new Error('invalid_account_changes');
  }
  const keys = Object.keys(changes);
  if (!keys.length || keys.some((key) => !['accountStatus', 'publicProfileStatus'].includes(key))) {
    throw new Error('invalid_account_changes');
  }
  const normalized = {};
  if (Object.prototype.hasOwnProperty.call(changes, 'accountStatus')) {
    const value = clean(changes.accountStatus);
    if (!ACCOUNT_STATUSES.includes(value)) throw new Error('invalid_account_changes');
    normalized.accountStatus = value;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'publicProfileStatus')) {
    const value = clean(changes.publicProfileStatus);
    if (!PROFILE_STATUSES.includes(value)) throw new Error('invalid_account_changes');
    normalized.publicProfileStatus = value;
  }
  return Object.freeze({
    action: 'saveAdminAccountModeration',
    idToken: token(idToken),
    accountId: id,
    changes: Object.freeze(normalized)
  });
}

function normalizeAccount(value) {
  if (!value || typeof value !== 'object') return null;
  const accountId = clean(value.accountId);
  const accountStatus = clean(value.accountStatus);
  const publicProfileStatus = clean(value.publicProfileStatus);
  const displayName = clean(value.displayName);
  const email = clean(value.email);
  const homeCity = clean(value.homeCity);
  const xHandle = clean(value.xHandle).replace(/^@+/, '');
  const createdAt = clean(value.createdAt);
  const updatedAt = clean(value.updatedAt);
  if (!ACCOUNT_ID_PATTERN.test(accountId) || !ACCOUNT_STATUSES.includes(accountStatus) ||
      !PROFILE_STATUSES.includes(publicProfileStatus) || !displayName || displayName.length > 80 ||
      email.length > 254 || homeCity.length > 80 || !/^[A-Za-z0-9_]{0,30}$/.test(xHandle) ||
      (createdAt && Number.isNaN(Date.parse(createdAt))) || (updatedAt && Number.isNaN(Date.parse(updatedAt)))) {
    return null;
  }
  return Object.freeze({
    accountId,
    displayName,
    email,
    homeCity,
    xHandle,
    publicProfileStatus,
    accountStatus,
    createdAt,
    updatedAt
  });
}

export function validateAdminAccountsResponse(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'adminAccounts' || !Array.isArray(payload.accounts)) return null;
  const accounts = payload.accounts.map(normalizeAccount);
  if (accounts.some((account) => !account)) return null;
  const total = Number(payload.counts?.total);
  const active = Number(payload.counts?.active);
  const suspended = Number(payload.counts?.suspended);
  const publicProfiles = Number(payload.counts?.publicProfiles);
  if (![total, active, suspended, publicProfiles].every(Number.isInteger) ||
      total < 0 || active < 0 || suspended < 0 || publicProfiles < 0 ||
      total !== accounts.length || active + suspended !== total ||
      active !== accounts.filter((account) => account.accountStatus === 'active').length ||
      publicProfiles !== accounts.filter((account) => account.publicProfileStatus === 'public').length) return null;
  return Object.freeze({
    accounts: Object.freeze(accounts),
    counts: Object.freeze({ total, active, suspended, publicProfiles })
  });
}

export function validateSaveAdminAccountResponse(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'saveAdminAccountModeration') return null;
  return normalizeAccount(payload.account);
}

export function filterAdminAccounts(accounts, { query = '', status = 'all', profile = 'all' } = {}) {
  const normalizedQuery = clean(query).toLowerCase();
  return (Array.isArray(accounts) ? accounts : []).filter((account) => {
    if (!account) return false;
    if (status !== 'all' && account.accountStatus !== status) return false;
    if (profile !== 'all' && account.publicProfileStatus !== profile) return false;
    if (!normalizedQuery) return true;
    return [account.displayName, account.email, account.homeCity, account.xHandle]
      .some((value) => clean(value).toLowerCase().includes(normalizedQuery));
  });
}
