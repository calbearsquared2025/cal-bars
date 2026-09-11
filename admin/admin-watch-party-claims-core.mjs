export const ADMIN_WATCH_PARTY_CLAIM_STATUSES = Object.freeze(['all', 'pending', 'approved', 'rejected']);
export const ADMIN_WATCH_PARTY_CLAIM_RELATIONSHIPS = Object.freeze([
  'organizer', 'alumni_group_representative', 'venue_representative', 'other'
]);
export const ADMIN_WATCH_PARTY_CLAIM_DECISIONS = Object.freeze(['approve', 'reject']);

const CLAIM_ID = /^wpc_[a-f0-9]{24}$/;
const WATCH_PARTY_ID = /^wp_[a-f0-9]{24}$/;
const PRIVATE_KEYS = new Set([
  'idToken', 'id_token', 'firebaseUid', 'firebase_uid', 'browserId', 'browser_id',
  'fanIntentId', 'fan_intent_id', 'accountId', 'account_id', 'workbookId', 'workbook_id'
]);

function clean(value, maximum = 1200) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, maximum);
}

function containsForbiddenPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenPrivateKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => PRIVATE_KEYS.has(key) || containsForbiddenPrivateKeys(child));
}

function validDate(value) {
  return value === '' || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

function validHttpUrl(value) {
  return value === '' || (typeof value === 'string' && value.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(value));
}

function validManagement(entry) {
  return Boolean(
    entry && ['owner', 'manager'].includes(clean(entry.role, 20)) &&
    clean(entry.displayName, 80) &&
    clean(entry.email, 254).length <= 254
  );
}

function validClaim(claim) {
  return Boolean(
    claim && CLAIM_ID.test(clean(claim.claimId, 80)) && WATCH_PARTY_ID.test(clean(claim.watchPartyId, 80)) &&
    clean(claim.claimantName, 120) &&
    ADMIN_WATCH_PARTY_CLAIM_RELATIONSHIPS.includes(clean(claim.relationship, 80)) &&
    ['pending', 'approved', 'rejected'].includes(clean(claim.status, 20)) &&
    clean(claim.explanation, 1200).length <= 1200 && validHttpUrl(claim.supportingUrl || '') &&
    validDate(claim.createdAt || '') && validDate(claim.updatedAt || '') && validDate(claim.reviewedAt || '') &&
    claim.claimant && clean(claim.claimant.displayName, 80) &&
    clean(claim.claimant.email, 254).length <= 254 && ['active', 'suspended'].includes(clean(claim.claimant.accountStatus, 20)) &&
    claim.watchParty && clean(claim.watchParty.venueName, 180) && clean(claim.watchParty.opponentName, 180) &&
    ['active', 'cancelled'].includes(clean(claim.watchParty.eventStatus, 20)) &&
    ['published', 'draft', 'archived'].includes(clean(claim.watchParty.publicationStatus, 20)) &&
    Array.isArray(claim.management) && claim.management.every(validManagement)
  );
}

export function buildAdminWatchPartyClaimsRequest(idToken) {
  const token = clean(idToken, 16384);
  if (!token) throw new Error('missing_id_token');
  return Object.freeze({ action: 'adminWatchPartyClaims', idToken: token });
}

export function buildResolveAdminWatchPartyClaimRequest(idToken, claimId, decision, decisionNote = '') {
  const token = clean(idToken, 16384);
  const normalizedClaimId = clean(claimId, 80);
  const normalizedDecision = clean(decision, 20);
  const note = clean(decisionNote, 600);
  if (!token || !CLAIM_ID.test(normalizedClaimId) || !ADMIN_WATCH_PARTY_CLAIM_DECISIONS.includes(normalizedDecision)) {
    throw new Error('invalid_admin_watch_party_claim');
  }
  return Object.freeze({
    action: 'resolveAdminWatchPartyClaim',
    idToken: token,
    claimId: normalizedClaimId,
    decision: normalizedDecision,
    decisionNote: note
  });
}

export function validateAdminWatchPartyClaimsResponse(payload) {
  if (!payload || containsForbiddenPrivateKeys(payload) || payload.ok !== true || payload.action !== 'adminWatchPartyClaims') return null;
  if (!Array.isArray(payload.claims) || !payload.counts || typeof payload.counts !== 'object') return null;
  if (!payload.claims.every(validClaim)) return null;
  const total = Number(payload.counts.total);
  const pending = Number(payload.counts.pending);
  const approved = Number(payload.counts.approved);
  const rejected = Number(payload.counts.rejected);
  if (![total, pending, approved, rejected].every(Number.isInteger) ||
      [total, pending, approved, rejected].some((value) => value < 0) ||
      total !== payload.claims.length || total !== pending + approved + rejected) return null;
  return Object.freeze({
    claims: Object.freeze(payload.claims.map((claim) => Object.freeze({
      ...claim,
      claimant: Object.freeze({ ...claim.claimant }),
      watchParty: Object.freeze({ ...claim.watchParty }),
      management: Object.freeze(claim.management.map((entry) => Object.freeze({ ...entry })))
    }))),
    counts: Object.freeze({ total, pending, approved, rejected })
  });
}

export function validateResolveAdminWatchPartyClaimResponse(payload) {
  if (!payload || containsForbiddenPrivateKeys(payload) || payload.ok !== true || payload.action !== 'resolveAdminWatchPartyClaim') return null;
  if (!validClaim(payload.claim) || payload.claim.status === 'pending') return null;
  return Object.freeze({
    ...payload.claim,
    claimant: Object.freeze({ ...payload.claim.claimant }),
    watchParty: Object.freeze({ ...payload.claim.watchParty }),
    management: Object.freeze(payload.claim.management.map((entry) => Object.freeze({ ...entry })))
  });
}

export function filterAdminWatchPartyClaims(claims, status = 'pending') {
  const normalizedStatus = ADMIN_WATCH_PARTY_CLAIM_STATUSES.includes(status) ? status : 'pending';
  return (Array.isArray(claims) ? claims : []).filter((claim) =>
    normalizedStatus === 'all' || claim.status === normalizedStatus
  );
}
