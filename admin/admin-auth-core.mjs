export const FIREBASE_CONFIG_FIELDS = Object.freeze([
  'apiKey',
  'authDomain',
  'projectId',
  'appId'
]);

export const ADMIN_ACTIVITY_TYPES = Object.freeze([
  'community_location',
  'watch_party',
  'fan_experience',
  'photo',
  'cal_bar_nomination',
  'listing_update',
  'missing_location',
  'processing_error'
]);

export const ADMIN_ACTIVITY_FILTER_TYPES = Object.freeze([
  'new_venue',
  'new_watch_party',
  'watch_party_update',
  'venue_update',
  'fan_experience',
  'photo',
  'cal_bar_nomination',
  'missing_location',
  'processing_error'
]);

export const ADMIN_ACTIVITY_LABELS = Object.freeze({
  community_location: 'New Venue',
  watch_party: 'New Watch Party',
  listing_update: 'Venue Update',
  new_venue: 'New Venue',
  new_watch_party: 'New Watch Party',
  watch_party_update: 'Watch Party Update',
  venue_update: 'Venue Update',
  fan_experience: 'Fan Experience',
  photo: 'Photo',
  cal_bar_nomination: 'Cal Bar nomination',
  missing_location: 'Missing location',
  processing_error: 'Processing error'
});

const REVIEW_KEY_PATTERN = /^[a-z0-9:_-]{1,160}$/;
const VENUE_ID_PATTERN = /^venue_[0-9a-f]{24}$/;
const WATCH_PARTY_ID_PATTERN = /^wp_[0-9a-f]{24}$/;

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

export function buildAdminActivityRequest(idToken) {
  const token = clean(idToken);
  if (!token) throw new Error('missing_id_token');
  return Object.freeze({
    action: 'adminActivity',
    idToken: token
  });
}

export function buildMarkReviewedRequest(idToken, activityKeys) {
  const token = clean(idToken);
  if (!token) throw new Error('missing_id_token');
  if (!Array.isArray(activityKeys) || activityKeys.length < 1 || activityKeys.length > 500) {
    throw new Error('invalid_activity_keys');
  }
  const seen = new Set();
  const keys = activityKeys.map((value) => {
    const key = clean(value);
    if (!REVIEW_KEY_PATTERN.test(key) || seen.has(key)) throw new Error('invalid_activity_keys');
    seen.add(key);
    return key;
  });
  return Object.freeze({
    action: 'markAdminReviewed',
    idToken: token,
    activityKeys: Object.freeze(keys)
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

function normalizeActivityItem(item) {
  if (!item || typeof item !== 'object') return null;
  const key = clean(item.key);
  const type = clean(item.type);
  const title = clean(item.title);
  const detail = clean(item.detail);
  const source = clean(item.source);
  const status = clean(item.status);
  const occurredAt = clean(item.occurredAt);
  const reviewedAt = clean(item.reviewedAt);
  const relatedVenueId = clean(item.relatedVenueId);
  const relatedWatchPartyId = clean(item.relatedWatchPartyId);
  if (!REVIEW_KEY_PATTERN.test(key) || !ADMIN_ACTIVITY_TYPES.includes(type) || !title) return null;
  if (occurredAt && Number.isNaN(Date.parse(occurredAt))) return null;
  if (reviewedAt && Number.isNaN(Date.parse(reviewedAt))) return null;
  if (relatedVenueId && !VENUE_ID_PATTERN.test(relatedVenueId)) return null;
  if (relatedWatchPartyId && !WATCH_PARTY_ID_PATTERN.test(relatedWatchPartyId)) return null;
  if (Boolean(item.reviewed) !== Boolean(reviewedAt)) return null;
  return Object.freeze({
    key,
    type,
    title,
    detail,
    source,
    status,
    occurredAt,
    relatedVenueId,
    relatedWatchPartyId,
    reviewed: Boolean(item.reviewed),
    reviewedAt
  });
}

export function validateAdminActivityResponse(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'adminActivity' || !Array.isArray(payload.items)) {
    return null;
  }
  const email = clean(payload.admin?.email);
  if (!email) return null;
  const items = payload.items.map(normalizeActivityItem);
  if (items.some((item) => !item)) return null;
  const total = Number(payload.counts?.total);
  const reviewed = Number(payload.counts?.reviewed);
  const unreviewed = Number(payload.counts?.unreviewed);
  if (![total, reviewed, unreviewed].every(Number.isInteger) ||
      total < 0 || reviewed < 0 || unreviewed < 0 ||
      total !== items.length || reviewed + unreviewed !== total ||
      reviewed !== items.filter((item) => item.reviewed).length) {
    return null;
  }
  return Object.freeze({
    email,
    displayName: clean(payload.admin?.displayName),
    items: Object.freeze(items),
    counts: Object.freeze({ total, reviewed, unreviewed })
  });
}

export function validateMarkReviewedResponse(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'markAdminReviewed' ||
      !Array.isArray(payload.reviewedKeys)) return null;
  const keys = payload.reviewedKeys.map(clean);
  if (keys.length < 1 || keys.some((key) => !REVIEW_KEY_PATTERN.test(key))) return null;
  const reviewedAt = clean(payload.reviewedAt);
  if (!reviewedAt || Number.isNaN(Date.parse(reviewedAt))) return null;
  const reviewedCount = Number(payload.reviewedCount);
  if (!Number.isInteger(reviewedCount) || reviewedCount !== keys.length) return null;
  return Object.freeze({
    reviewedKeys: Object.freeze(keys),
    reviewedCount,
    newlyReviewedCount: Number(payload.newlyReviewedCount) || 0,
    reviewedAt
  });
}

export function adminActivityDisplayType(item) {
  if (!item) return '';
  if (item.type === 'community_location') return 'new_venue';
  if (item.type === 'watch_party') return 'new_watch_party';
  if (item.type === 'listing_update') {
    return item.source === 'Watch Party Problem Submission' ? 'watch_party_update' : 'venue_update';
  }
  return item.type;
}

export function filterAdminActivity(items, { type = 'all', review = 'all' } = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((item) => {
    if (!item) return false;
    if (type !== 'all' && adminActivityDisplayType(item) !== type) return false;
    if (review === 'reviewed' && !item.reviewed) return false;
    if (review === 'unreviewed' && item.reviewed) return false;
    return true;
  });
}

export function applyReviewedState(items, reviewedKeys, reviewedAt) {
  const keySet = new Set(Array.isArray(reviewedKeys) ? reviewedKeys : []);
  return (Array.isArray(items) ? items : []).map((item) => {
    if (!item || !keySet.has(item.key)) return item;
    return Object.freeze({ ...item, reviewed: true, reviewedAt });
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
