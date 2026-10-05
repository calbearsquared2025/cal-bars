export const ADMIN_GAME_HOME_AWAY = Object.freeze(['home', 'away', 'neutral']);
export const ADMIN_GAME_STATUSES = Object.freeze(['upcoming', 'completed', 'postponed', 'cancelled']);

const GAME_ID = /^game_[a-f0-9]{24}$/;
const EDITABLE_FIELDS = Object.freeze([
  'opponent_name', 'home_away', 'game_date', 'kickoff_local_time', 'game_status'
]);
const PRIVATE_KEYS = new Set([
  'idToken', 'firebaseUid', 'firebase_uid', 'browser_id', 'browserId',
  'contact_email', 'contactEmail', 'submitter_email', 'submitterEmail',
  'workbook_id', 'workbookId', 'source_submission_id', 'sourceSubmissionId'
]);

function clean(value, maximum = 180) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function containsPrivateKeys(value) {
  if (Array.isArray(value)) return value.some(containsPrivateKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => PRIVATE_KEYS.has(key) || containsPrivateKeys(child));
}

function validDateOnly(value) {
  const text = clean(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeLocalTime(value) {
  const text = clean(value, 20).toLowerCase().replace(/\./g, '');
  if (!text) return '';
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(text);
  if (!match) throw new Error('admin_invalid_game');
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3] || '';
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('admin_invalid_game');
  if (meridiem) {
    if (hour < 1 || hour > 12) throw new Error('admin_invalid_game');
    if (meridiem === 'am') hour = hour === 12 ? 0 : hour;
    else hour = hour === 12 ? 12 : hour + 12;
  } else if (hour < 0 || hour > 23) {
    throw new Error('admin_invalid_game');
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function validLocalTime(value) {
  if (value === '') return true;
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  return Boolean(match && Number(match[1]) >= 0 && Number(match[1]) <= 23 &&
    Number(match[2]) >= 0 && Number(match[2]) <= 59);
}

function validGame(game) {
  return Boolean(
    game &&
    GAME_ID.test(clean(game.game_id, 80)) &&
    Number.isInteger(Number(game.season)) &&
    Number.isInteger(Number(game.schedule_order)) &&
    clean(game.opponent_name, 180) &&
    ADMIN_GAME_HOME_AWAY.includes(game.home_away) &&
    validDateOnly(game.game_date) &&
    validLocalTime(game.kickoff_local_time) &&
    (game.kickoff_at === '' || Number.isFinite(Date.parse(game.kickoff_at))) &&
    ['confirmed', 'tbd'].includes(game.kickoff_status) &&
    ADMIN_GAME_STATUSES.includes(game.game_status) &&
    (game.updated_at === '' || Number.isFinite(Date.parse(game.updated_at)))
  );
}

function validateBaseResponse(response, action) {
  return Boolean(
    response && typeof response === 'object' &&
    !containsPrivateKeys(response) &&
    response.ok === true &&
    response.action === action
  );
}

export function buildAdminGamesRequest() {
  return Object.freeze({ action: 'adminGames' });
}

export function normalizeAdminGameChanges(input) {
  const get = input instanceof FormData
    ? (key) => input.get(key)
    : (key) => input?.[key];
  const opponentName = clean(get('opponent_name'), 180);
  const homeAway = clean(get('home_away'), 40).toLowerCase();
  const gameDate = clean(get('game_date'), 10);
  const kickoffLocalTime = normalizeLocalTime(get('kickoff_local_time'));
  const gameStatus = clean(get('game_status'), 40).toLowerCase();

  if (!opponentName || !ADMIN_GAME_HOME_AWAY.includes(homeAway) ||
      !validDateOnly(gameDate) || !ADMIN_GAME_STATUSES.includes(gameStatus)) {
    throw new Error('admin_invalid_game');
  }

  return Object.freeze({
    opponent_name: opponentName,
    home_away: homeAway,
    game_date: gameDate,
    kickoff_local_time: kickoffLocalTime,
    game_status: gameStatus
  });
}

export function buildSaveAdminGameRequest(gameId, changes) {
  const id = clean(gameId, 80);
  if (!GAME_ID.test(id) || !changes || typeof changes !== 'object' || Array.isArray(changes)) {
    throw new Error('admin_invalid_game');
  }
  const keys = Object.keys(changes);
  if (!keys.length || keys.some((key) => !EDITABLE_FIELDS.includes(key))) {
    throw new Error('admin_invalid_game');
  }
  return Object.freeze({
    action: 'saveAdminGame',
    gameId: id,
    changes: normalizeAdminGameChanges(changes)
  });
}

export function validateAdminGamesResponse(response) {
  return Boolean(
    validateBaseResponse(response, 'adminGames') &&
    Array.isArray(response.games) &&
    response.games.every(validGame) &&
    response.counts &&
    Number(response.counts.total) === response.games.length
  );
}

export function validateAdminGameSaveResponse(response) {
  return Boolean(validateBaseResponse(response, 'saveAdminGame') && validGame(response.game));
}

export function adminGameErrorCopy(error) {
  const code = String(error?.code || error?.message || error || '');
  if (code.includes('admin_game_not_found')) return 'That game no longer exists.';
  if (code.includes('admin_invalid_game')) return 'Check the game fields and try again.';
  if (code.includes('admin_game_timezone')) return 'The school timezone is not configured correctly.';
  return '';
}
