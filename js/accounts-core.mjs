const FIREBASE_REQUIRED_FIELDS = Object.freeze(['apiKey', 'authDomain', 'projectId', 'appId']);
const FAN_ACTIONS = Object.freeze(['fanHealth', 'ensureFanAccount', 'saveFanProfile']);
const PUBLIC_PROFILE_STATUSES = Object.freeze(['private', 'public']);
const ATTENDANCE_VISIBILITY_VALUES = Object.freeze(['anonymous', 'public']);

function clean(value) {
  return String(value ?? '').trim();
}

export function firebaseConfigIsComplete(config) {
  return Boolean(config && FIREBASE_REQUIRED_FIELDS.every((field) => clean(config[field])));
}

export function accountsConfigIsReady(config) {
  return Boolean(
    config?.enabled === true &&
    clean(config?.endpoint) &&
    firebaseConfigIsComplete(config?.firebase) &&
    Array.isArray(config?.providers) &&
    config.providers.includes('google') &&
    config.providers.includes('twitter')
  );
}

export function buildFanRequest(action, idToken, extra = {}) {
  const normalizedAction = clean(action);
  const token = clean(idToken);
  if (!FAN_ACTIONS.includes(normalizedAction)) throw new Error('invalid_fan_action');
  if (!token) throw new Error('missing_id_token');
  return Object.freeze({ action: normalizedAction, idToken: token, ...extra });
}

export function normalizeFanProfileDraft(input = {}) {
  const displayName = clean(input.displayName);
  const avatarUrl = clean(input.avatarUrl);
  const homeCity = clean(input.homeCity);
  const xHandle = clean(input.xHandle).replace(/^@+/, '');
  const publicProfileStatus = clean(input.publicProfileStatus) || 'private';
  const attendanceVisibilityDefault = clean(input.attendanceVisibilityDefault) || 'anonymous';

  if (!displayName || displayName.length > 80) throw new Error('invalid_display_name');
  if (avatarUrl && (!/^https:\/\//i.test(avatarUrl) || avatarUrl.length > 2048)) throw new Error('invalid_avatar_url');
  if (homeCity.length > 80) throw new Error('invalid_home_city');
  if (xHandle && !/^[A-Za-z0-9_]{1,30}$/.test(xHandle)) throw new Error('invalid_x_handle');
  if (!PUBLIC_PROFILE_STATUSES.includes(publicProfileStatus)) throw new Error('invalid_public_profile_status');
  if (!ATTENDANCE_VISIBILITY_VALUES.includes(attendanceVisibilityDefault)) throw new Error('invalid_attendance_visibility');

  return Object.freeze({
    displayName,
    avatarUrl,
    homeCity,
    xHandle,
    publicProfileStatus,
    attendanceVisibilityDefault
  });
}

export function validateFanAccountResponse(payload) {
  if (!payload || payload.ok !== true || !['ensureFanAccount', 'saveFanProfile'].includes(payload.action)) return null;
  const account = payload.account;
  if (!account || typeof account !== 'object') return null;

  let profile;
  try {
    profile = normalizeFanProfileDraft(account);
  } catch (_) {
    return null;
  }

  const providers = Array.isArray(account.providers)
    ? account.providers.map(clean).filter((provider) => provider === 'google.com' || provider === 'twitter.com')
    : [];
  if (!providers.length) return null;

  return Object.freeze({ ...profile, providers: Object.freeze([...new Set(providers)]) });
}

export function fanErrorCopy(code) {
  switch (clean(code)) {
    case 'fan_unauthorized':
      return 'Your CGB sign-in could not be verified.';
    case 'fan_account_suspended':
      return 'This CGB account is unavailable.';
    case 'fan_not_configured':
      return 'CGB Accounts is not configured yet.';
    default:
      return 'CGB Accounts is temporarily unavailable.';
  }
}
