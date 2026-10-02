import { ACTIVE_INSTANCE_CONFIG } from './instance-config.mjs';

const OWNER_RELATIONSHIPS = Object.freeze(['organizer', 'representative']);
const ALLOWED_FEATURE_TAGS = Object.freeze(['rsvp_requested', 'cal_specials']);
const WATCH_PARTY_ID_PATTERN = /^wp_[a-f0-9]{24}$/;
const RSVP_MODES = Object.freeze(['none', 'native', 'external']);

function clean(value) {
  return String(value ?? '').trim();
}

export function relationshipCanManageNewWatchParty(value) {
  return OWNER_RELATIONSHIPS.includes(clean(value));
}

export function rsvpModeRequestsRsvp(value) {
  const mode = clean(value);
  return mode === 'native' || mode === 'external';
}

export function resolveNativeRsvpSetupState({
  signedIn = false,
  relationship = '',
  productName = ACTIVE_INSTANCE_CONFIG.identity.productName
} = {}) {
  const normalizedRelationship = clean(relationship);
  if (!signedIn) {
    return Object.freeze({
      eligible: false,
      explanation: `Sign in to ${productName} to collect RSVPs here.`
    });
  }
  if (!relationshipCanManageNewWatchParty(normalizedRelationship)) {
    return Object.freeze({
      eligible: false,
      explanation: `Only event organizers can collect RSVPs through ${productName}.`
    });
  }
  return Object.freeze({
    eligible: true,
    explanation: `RSVPs will be visible in your My CGB Profile.`
  });
}

export function normalizeWatchPartyFeatureTags(values, { nativeRsvpEnabled = false, rsvpMode = '' } = {}) {
  const selected = [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
  if ((nativeRsvpEnabled || rsvpModeRequestsRsvp(rsvpMode)) && !selected.includes('rsvp_requested')) {
    selected.push('rsvp_requested');
  }
  return ALLOWED_FEATURE_TAGS.filter((tag) => selected.includes(tag));
}

export function buildNativeWatchPartySubmission({
  clientRequestId,
  context,
  values,
  nativeRsvpEnabled = false,
  rsvpMode = ''
} = {}) {
  const relationship = clean(values?.submitterRelationship);
  const normalizedRsvpMode = RSVP_MODES.includes(clean(rsvpMode)) ? clean(rsvpMode) : '';
  const featureTags = normalizeWatchPartyFeatureTags(values?.featureTags, {
    nativeRsvpEnabled,
    rsvpMode: normalizedRsvpMode
  });
  return Object.freeze({
    clientRequestId: clean(clientRequestId),
    venueId: clean(context?.venueId),
    gameId: clean(context?.gameId),
    organizerName: clean(values?.organizerName),
    organizerType: clean(values?.organizerType),
    submitterRelationship: relationship,
    officialEventUrl: clean(values?.officialEventUrl),
    eventStart: clean(values?.eventStart),
    agePolicy: clean(values?.agePolicy) || 'unknown',
    soundStatus: clean(values?.soundStatus) || 'unknown',
    restrictionsNote: clean(values?.restrictionsNote),
    gameDayNote: clean(values?.gameDayNote),
    featureTags
  });
}

export function validatePublicWatchPartySubmissionResponse(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'submitPublicWatchParty') return null;
  const watchPartyId = clean(payload.watchPartyId);
  if (!WATCH_PARTY_ID_PATTERN.test(watchPartyId) || clean(payload.status) !== 'published') return null;
  const allowed = ['ok', 'action', 'schemaVersion', 'watchPartyId', 'status'];
  if (Object.keys(payload).some((key) => !allowed.includes(key))) return null;
  return Object.freeze({ watchPartyId, status: 'published' });
}

export function publicWatchPartyErrorCopy(code, productShortName = ACTIVE_INSTANCE_CONFIG.identity.productShortName) {
  switch (clean(code)) {
    case 'game_not_open':
      return 'One of the selected games is no longer open for Watch Party submissions.';
    case 'venue_not_found':
      return 'That location is no longer available.';
    case 'invalid_request':
    case 'invalid_json':
      return 'Check the Watch Party details and try again.';
    case 'not_configured':
      return `${productShortName} Watch Party submissions are not configured for this site.`;
    default:
      return 'The Watch Party could not be added right now. Try again.';
  }
}
