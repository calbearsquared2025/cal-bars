const FIREBASE_REQUIRED_FIELDS = Object.freeze(['apiKey', 'authDomain', 'projectId', 'appId']);
const FAN_ACTIONS = Object.freeze([
  'fanHealth',
  'ensureFanAccount',
  'saveFanProfile',
  'listFanFavorites',
  'setFanFavorite',
  'claimFanIntent',
  'getFanAttendance',
  'setFanAttendance',
  'setFanAttendanceVisibility',
  'submitFanExperience',
  'submitFanWatchParty'
]);
const PUBLIC_PROFILE_STATUSES = Object.freeze(['private', 'public']);
const ATTENDANCE_VISIBILITY_VALUES = Object.freeze(['anonymous', 'public']);
const ATTENDANCE_ACTIONS = Object.freeze(['join', 'move', 'withdraw']);
const WATCH_PARTY_ORGANIZER_TYPES = Object.freeze(['alumni_group', 'venue', 'other_organization', 'individual', 'unknown']);
const WATCH_PARTY_SOURCE_TYPES = Object.freeze(['fan_submitted', 'venue_submitted', 'alumni_group_submitted']);
const WATCH_PARTY_AGE_POLICIES = Object.freeze(['unknown', 'all_ages', '21_plus']);
const WATCH_PARTY_SOUND_STATUSES = Object.freeze(['unknown', 'confirmed_on', 'confirmed_off']);
const WATCH_PARTY_FEATURE_TAGS = Object.freeze(['rsvp_requested', 'cal_specials']);
const VENUE_ID_PATTERN = /^venue_[a-f0-9]{24}$/;
const GAME_ID_PATTERN = /^game_[a-f0-9]{24}$/;
const BROWSER_ID_PATTERN = /^browser_[A-Za-z0-9_-]{16,128}$/;
const CONTRIBUTION_REQUEST_PATTERN = /^req_[A-Za-z0-9_-]{16,80}$/;
const WATCH_PARTY_ID_PATTERN = /^wp_[a-f0-9]{24}$/;
const PRIVATE_RESPONSE_KEYS = new Set([
  'accountId', 'account_id', 'firebaseUid', 'firebase_uid', 'browserId', 'browser_id',
  'fan_intent_id', 'email', 'primary_email', 'idToken', 'id_token', 'workbook_id',
  'workbook_url', 'spreadsheet_id', 'spreadsheet_url'
]);

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeProviderIds(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(clean).filter((provider) => provider === 'google.com' || provider === 'password'))];
}

function normalizeAttendanceVisibility(value) {
  const visibility = clean(value) || 'anonymous';
  if (!ATTENDANCE_VISIBILITY_VALUES.includes(visibility)) throw new Error('invalid_attendance_visibility');
  return visibility;
}

function responseContainsPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(responseContainsPrivateKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    PRIVATE_RESPONSE_KEYS.has(key) || responseContainsPrivateKeys(child)
  );
}

function nonnegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function exactKeys(extra, expected) {
  return Object.keys(extra || {}).sort().join(',') === expected.slice().sort().join(',');
}

function boundedText(value, maximumLength, { required = false } = {}) {
  const text = clean(value).replace(/\s+/g, ' ');
  if ((required && !text) || text.length > maximumLength) throw new Error('invalid_fan_contribution');
  return text;
}

function normalizeContributionRequestId(value) {
  const id = clean(value);
  if (!CONTRIBUTION_REQUEST_PATTERN.test(id)) throw new Error('invalid_fan_contribution');
  return id;
}

function normalizeWatchPartyFeatureTags(values) {
  if (!Array.isArray(values) || values.length > WATCH_PARTY_FEATURE_TAGS.length) throw new Error('invalid_fan_contribution');
  const selected = [...new Set(values.map(clean))];
  if (selected.some((value) => !WATCH_PARTY_FEATURE_TAGS.includes(value))) throw new Error('invalid_fan_contribution');
  return WATCH_PARTY_FEATURE_TAGS.filter((tag) => selected.includes(tag));
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
    config.providers.includes('email')
  );
}

export function normalizeFanProfileDraft(input = {}) {
  const displayName = clean(input.displayName);
  const avatarUrl = clean(input.avatarUrl);
  const homeCity = clean(input.homeCity);
  const xHandle = clean(input.xHandle).replace(/^@+/, '');
  const publicProfileStatus = clean(input.publicProfileStatus) || 'private';
  const attendanceVisibilityDefault = normalizeAttendanceVisibility(input.attendanceVisibilityDefault);

  if (!displayName || displayName.length > 80) throw new Error('invalid_display_name');
  if (avatarUrl && (!/^https:\/\//i.test(avatarUrl) || avatarUrl.length > 2048)) throw new Error('invalid_avatar_url');
  if (homeCity.length > 80) throw new Error('invalid_home_city');
  if (xHandle && !/^[A-Za-z0-9_]{1,30}$/.test(xHandle)) throw new Error('invalid_x_handle');
  if (!PUBLIC_PROFILE_STATUSES.includes(publicProfileStatus)) throw new Error('invalid_public_profile_status');

  return Object.freeze({
    displayName,
    avatarUrl,
    homeCity,
    xHandle,
    publicProfileStatus,
    attendanceVisibilityDefault
  });
}

export function buildFanRequest(action, idToken, extra = {}) {
  const normalizedAction = clean(action);
  const token = clean(idToken);
  if (!FAN_ACTIONS.includes(normalizedAction)) throw new Error('invalid_fan_action');
  if (!token) throw new Error('missing_id_token');
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) throw new Error('invalid_fan_request');

  const payload = { action: normalizedAction, idToken: token };
  if (normalizedAction === 'saveFanProfile') {
    const keys = Object.keys(extra);
    if (keys.length !== 1 || keys[0] !== 'changes') throw new Error('invalid_fan_request');
    payload.changes = normalizeFanProfileDraft(extra.changes);
  } else if (normalizedAction === 'setFanFavorite') {
    const keys = Object.keys(extra).sort();
    if (keys.join(',') !== 'favorited,venueId') throw new Error('invalid_fan_request');
    const venueId = clean(extra.venueId);
    if (!VENUE_ID_PATTERN.test(venueId) || typeof extra.favorited !== 'boolean') throw new Error('invalid_favorite');
    payload.venueId = venueId;
    payload.favorited = extra.favorited;
  } else if (normalizedAction === 'claimFanIntent') {
    const keys = Object.keys(extra);
    if (keys.length !== 1 || keys[0] !== 'browserId') throw new Error('invalid_fan_request');
    const browserId = clean(extra.browserId);
    if (!BROWSER_ID_PATTERN.test(browserId)) throw new Error('invalid_browser_id');
    payload.browserId = browserId;
  } else if (normalizedAction === 'setFanAttendance') {
    const keys = Object.keys(extra).sort();
    if (keys.join(',') !== 'attendanceAction,gameId,venueId,visibility') throw new Error('invalid_fan_request');
    const attendanceAction = clean(extra.attendanceAction);
    const gameId = clean(extra.gameId);
    const venueId = clean(extra.venueId);
    if (!ATTENDANCE_ACTIONS.includes(attendanceAction) || !GAME_ID_PATTERN.test(gameId)) {
      throw new Error('invalid_fan_attendance');
    }
    if ((attendanceAction === 'join' || attendanceAction === 'move') && !VENUE_ID_PATTERN.test(venueId)) {
      throw new Error('invalid_fan_attendance');
    }
    if (attendanceAction === 'withdraw' && venueId && !VENUE_ID_PATTERN.test(venueId)) {
      throw new Error('invalid_fan_attendance');
    }
    payload.attendanceAction = attendanceAction;
    payload.gameId = gameId;
    payload.venueId = venueId;
    payload.visibility = normalizeAttendanceVisibility(extra.visibility);
  } else if (normalizedAction === 'setFanAttendanceVisibility') {
    const keys = Object.keys(extra).sort();
    if (keys.join(',') !== 'gameId,visibility') throw new Error('invalid_fan_request');
    const gameId = clean(extra.gameId);
    if (!GAME_ID_PATTERN.test(gameId)) throw new Error('invalid_fan_attendance');
    payload.gameId = gameId;
    payload.visibility = normalizeAttendanceVisibility(extra.visibility);
  } else if (normalizedAction === 'submitFanExperience') {
    if (!exactKeys(extra, ['clientRequestId', 'venueId', 'text', 'displayName'])) throw new Error('invalid_fan_request');
    const venueId = clean(extra.venueId);
    if (!VENUE_ID_PATTERN.test(venueId)) throw new Error('invalid_fan_contribution');
    payload.clientRequestId = normalizeContributionRequestId(extra.clientRequestId);
    payload.venueId = venueId;
    payload.text = boundedText(extra.text, 500, { required: true });
    payload.displayName = boundedText(extra.displayName, 60);
  } else if (normalizedAction === 'submitFanWatchParty') {
    const expected = [
      'clientRequestId', 'venueId', 'gameId', 'organizerName', 'organizerType', 'sourceType',
      'officialEventUrl', 'eventStart', 'agePolicy', 'soundStatus', 'restrictionsNote',
      'gameDayNote', 'featureTags'
    ];
    if (!exactKeys(extra, expected)) throw new Error('invalid_fan_request');
    const venueId = clean(extra.venueId);
    const gameId = clean(extra.gameId);
    const organizerType = clean(extra.organizerType);
    const sourceType = clean(extra.sourceType);
    const agePolicy = clean(extra.agePolicy) || 'unknown';
    const soundStatus = clean(extra.soundStatus) || 'unknown';
    const officialEventUrl = clean(extra.officialEventUrl);
    if (!VENUE_ID_PATTERN.test(venueId) || !GAME_ID_PATTERN.test(gameId) ||
        !WATCH_PARTY_ORGANIZER_TYPES.includes(organizerType) || !WATCH_PARTY_SOURCE_TYPES.includes(sourceType) ||
        !WATCH_PARTY_AGE_POLICIES.includes(agePolicy) || !WATCH_PARTY_SOUND_STATUSES.includes(soundStatus) ||
        (officialEventUrl && (!/^https:\/\/[^\s]+$/i.test(officialEventUrl) || officialEventUrl.length > 2048))) {
      throw new Error('invalid_fan_contribution');
    }
    payload.clientRequestId = normalizeContributionRequestId(extra.clientRequestId);
    payload.venueId = venueId;
    payload.gameId = gameId;
    payload.organizerName = boundedText(extra.organizerName, 180, { required: true });
    payload.organizerType = organizerType;
    payload.sourceType = sourceType;
    payload.officialEventUrl = officialEventUrl;
    payload.eventStart = boundedText(extra.eventStart, 240);
    payload.agePolicy = agePolicy;
    payload.soundStatus = soundStatus;
    payload.restrictionsNote = boundedText(extra.restrictionsNote, 1200);
    payload.gameDayNote = boundedText(extra.gameDayNote, 1200);
    payload.featureTags = normalizeWatchPartyFeatureTags(extra.featureTags);
  } else if (Object.keys(extra).length) {
    throw new Error('invalid_fan_request');
  }
  return Object.freeze(payload);
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

  const providers = normalizeProviderIds(account.providers);
  if (!providers.length) return null;
  return Object.freeze({ ...profile, providers: Object.freeze(providers) });
}

export function validateFanFavoritesResponse(payload) {
  if (!payload || payload.ok !== true || !['listFanFavorites', 'setFanFavorite'].includes(payload.action)) return null;
  if (!Array.isArray(payload.venueIds)) return null;
  const venueIds = [...new Set(payload.venueIds.map(clean))];
  if (venueIds.some((venueId) => !VENUE_ID_PATTERN.test(venueId))) return null;
  return Object.freeze(venueIds);
}

export function validateFanContributionResponse(payload) {
  if (!payload || responseContainsPrivateKeys(payload) || payload.ok !== true ||
      !['submitFanExperience', 'submitFanWatchParty'].includes(payload.action)) return null;
  const contributionType = clean(payload.contributionType);
  const status = clean(payload.status);
  const relatedRecordId = clean(payload.relatedRecordId);
  if (!['fan_experience', 'watch_party'].includes(contributionType) || !['published', 'held'].includes(status)) return null;
  if (contributionType === 'watch_party') {
    if (status !== 'published' || !WATCH_PARTY_ID_PATTERN.test(relatedRecordId)) return null;
  } else if (relatedRecordId && !/^account_native\|fc_[a-f0-9]{24}$/.test(relatedRecordId)) {
    return null;
  }
  return Object.freeze({ contributionType, status, relatedRecordId });
}

export function validateFanAttendanceResponse(payload) {
  if (!payload || responseContainsPrivateKeys(payload) || payload.ok !== true || ![
    'claimFanIntent', 'getFanAttendance', 'setFanAttendance', 'setFanAttendanceVisibility'
  ].includes(payload.action)) return null;
  if (!Array.isArray(payload.selections) || !Array.isArray(payload.fanCounts) ||
      !Array.isArray(payload.venueHistoryCounts)) return null;

  const selections = [];
  const seenGames = new Set();
  for (const row of payload.selections) {
    if (!row || typeof row !== 'object') return null;
    const gameId = clean(row.game_id);
    const venueId = clean(row.venue_id);
    const visibility = clean(row.visibility) || 'anonymous';
    if (!GAME_ID_PATTERN.test(gameId) || !VENUE_ID_PATTERN.test(venueId) ||
        !ATTENDANCE_VISIBILITY_VALUES.includes(visibility) || seenGames.has(gameId)) return null;
    seenGames.add(gameId);
    selections.push(Object.freeze({ game_id: gameId, venue_id: venueId, visibility }));
  }

  const fanCounts = [];
  for (const row of payload.fanCounts) {
    const count = nonnegativeInteger(row?.count);
    const gameId = clean(row?.game_id);
    const venueId = clean(row?.venue_id);
    if (count === null || !GAME_ID_PATTERN.test(gameId) || !VENUE_ID_PATTERN.test(venueId)) return null;
    fanCounts.push(Object.freeze({ game_id: gameId, venue_id: venueId, count }));
  }

  const venueHistoryCounts = [];
  for (const row of payload.venueHistoryCounts) {
    const pastGameCount = nonnegativeInteger(row?.past_game_count);
    const venueId = clean(row?.venue_id);
    if (pastGameCount === null || !VENUE_ID_PATTERN.test(venueId)) return null;
    venueHistoryCounts.push(Object.freeze({ venue_id: venueId, past_game_count: pastGameCount }));
  }

  return Object.freeze({
    selections: Object.freeze(selections),
    fanCounts: Object.freeze(fanCounts),
    venueHistoryCounts: Object.freeze(venueHistoryCounts)
  });
}

export function validatePublicAttendanceResponse(payload) {
  if (!payload || responseContainsPrivateKeys(payload) || payload.ok !== true || payload.action !== 'publicAttendance') return null;
  const gameId = clean(payload.game_id);
  const venueId = clean(payload.venue_id);
  const count = nonnegativeInteger(payload.count);
  if (!GAME_ID_PATTERN.test(gameId) || !VENUE_ID_PATTERN.test(venueId) || count === null) return null;
  if (!Array.isArray(payload.attendees)) return null;
  const attendees = [];
  for (const attendee of payload.attendees) {
    if (!attendee || typeof attendee !== 'object') return null;
    const profileId = clean(attendee.profile_id);
    const displayName = clean(attendee.display_name);
    const avatarUrl = clean(attendee.avatar_url);
    const homeCity = clean(attendee.home_city);
    const xHandle = clean(attendee.x_handle).replace(/^@+/, '');
    if (!/^profile_[a-f0-9]{24}$/.test(profileId) || !displayName || displayName.length > 80) return null;
    if (avatarUrl && (!/^https:\/\//i.test(avatarUrl) || avatarUrl.length > 2048)) return null;
    if (homeCity.length > 80 || (xHandle && !/^[A-Za-z0-9_]{1,30}$/.test(xHandle))) return null;
    attendees.push(Object.freeze({ profileId, displayName, avatarUrl, homeCity, xHandle }));
  }
  if (attendees.length > count) return null;
  return Object.freeze({ gameId, venueId, count, attendees: Object.freeze(attendees) });
}

export function fanErrorCopy(code) {
  switch (clean(code)) {
    case 'fan_unauthorized':
      return 'Your CGB sign-in could not be verified.';
    case 'fan_account_suspended':
      return 'This CGB account is unavailable.';
    case 'fan_invalid_venue':
      return 'That venue is no longer available to save.';
    case 'fan_game_not_open':
      return 'This game is no longer open for selections.';
    case 'fan_selection_conflict':
      return 'Your CGB selection changed on another device. Refresh and try again.';
    case 'fan_invalid_request':
      return 'Check the contribution details and try again.';
    case 'fan_not_configured':
      return 'CGB Accounts is not configured yet.';
    default:
      return 'CGB Accounts is temporarily unavailable.';
  }
}
