export const FIREBASE_CONFIG_FIELDS = Object.freeze([
  'apiKey',
  'authDomain',
  'projectId',
  'appId'
]);

function clean(value) {
  return String(value ?? '').trim();
}

export function firebaseConfigIsComplete(config = {}) {
  return FIREBASE_CONFIG_FIELDS.every((field) => clean(config[field]));
}

export function buildAdminHealthRequest(idToken) {
  const token = clean(idToken);
  if (!token) throw new Error('missing_id_token');
  return Object.freeze({
    action: 'adminHealth',
    idToken: token
  });
}

export function validateAdminHealthResponse(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'adminHealth') return null;
  const email = clean(payload.admin?.email);
  const displayName = clean(payload.admin?.displayName);
  const venueCount = Number(payload.venueCount);
  if (!email || payload.workbookReachable !== true || !Number.isInteger(venueCount) || venueCount < 0) {
    return null;
  }
  return Object.freeze({
    email,
    displayName,
    venueCount,
    workbookReachable: true
  });
}

export function adminErrorCopy(code) {
  const messages = {
    admin_not_configured: 'Admin authentication is not fully configured yet.',
    admin_unauthorized: 'This Google account is not authorized for CGB Admin.',
    admin_backend_unavailable: 'CGB Admin could not reach the private backend.',
    admin_invalid_request: 'CGB Admin rejected the request.'
  };
  return messages[clean(code)] || 'CGB Admin could not verify access.';
}
