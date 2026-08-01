const GOOGLE_FORMS_HOST = 'docs.google.com';
const GOOGLE_FORMS_PATH_PREFIX = '/forms/';
const ENTRY_ID_PATTERN = /^(?:entry\.)?(\d+)$/;
const GAME_MONTHS = Object.freeze([
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]);

function clean(value) {
  return String(value ?? '').trim();
}

export function normalizeGoogleFormsEntryId(value) {
  const match = clean(value).match(ENTRY_ID_PATTERN);
  return match ? `entry.${match[1]}` : '';
}

export function normalizeWatchPartyFormConfig(config = {}) {
  const rawFormUrl = clean(config.formUrl);
  let formUrl;

  try {
    formUrl = new URL(rawFormUrl);
  } catch (_) {
    return null;
  }

  if (
    formUrl.protocol !== 'https:' ||
    formUrl.hostname.toLowerCase() !== GOOGLE_FORMS_HOST ||
    !formUrl.pathname.startsWith(GOOGLE_FORMS_PATH_PREFIX)
  ) {
    return null;
  }

  const venueIdEntry = normalizeGoogleFormsEntryId(config.venueIdEntry);
  const venueNameEntry = normalizeGoogleFormsEntryId(config.venueNameEntry);
  const gameIdEntry = normalizeGoogleFormsEntryId(config.gameIdEntry);
  const entryIds = [venueIdEntry, venueNameEntry, gameIdEntry];

  if (entryIds.some((entryId) => !entryId) || new Set(entryIds).size !== entryIds.length) {
    return null;
  }

  return Object.freeze({
    formUrl: formUrl.toString(),
    venueIdEntry,
    venueNameEntry,
    gameIdEntry
  });
}

export function buildWatchPartyFormGameLabel(game = {}) {
  const dateMatch = clean(game.game_date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const opponentName = clean(game.opponent_name);
  if (!dateMatch || !opponentName) return '';

  const month = GAME_MONTHS[Number(dateMatch[2]) - 1];
  const day = Number(dateMatch[3]);
  if (!month || !Number.isInteger(day) || day < 1 || day > 31) return '';

  const relationship = clean(game.home_away).toLowerCase() === 'away'
    ? 'Cal at '
    : 'Cal vs. ';
  return `${month} ${day} — ${relationship}${opponentName}`;
}

export function resolveWatchPartyFormContext({
  snapshot,
  gameId,
  selectedVenueId,
  detailMode
} = {}) {
  if (!detailMode || !snapshot || !Array.isArray(snapshot.venues) || !Array.isArray(snapshot.games)) {
    return null;
  }

  const venue = snapshot.venues.find((item) => clean(item?.venue_id) === clean(selectedVenueId));
  const game = snapshot.games.find((item) => clean(item?.game_id) === clean(gameId));

  if (!venue || !game) return null;

  const venueId = clean(venue.venue_id);
  const venueName = clean(venue.name);
  const canonicalGameId = clean(game.game_id);
  const gameLabel = buildWatchPartyFormGameLabel(game);

  if (!venueId || !venueName || !canonicalGameId || !gameLabel) return null;

  return Object.freeze({
    venueId,
    venueName,
    gameId: canonicalGameId,
    gameLabel
  });
}

export function buildWatchPartyPrefillUrl(config, context) {
  const normalizedConfig = normalizeWatchPartyFormConfig(config);
  const venueId = clean(context?.venueId);
  const venueName = clean(context?.venueName);
  const gameLabel = clean(context?.gameLabel);

  if (!normalizedConfig || !venueId || !venueName || !gameLabel) return '';

  const url = new URL(normalizedConfig.formUrl);
  if (!url.searchParams.has('usp')) url.searchParams.set('usp', 'pp_url');
  url.searchParams.set(normalizedConfig.venueIdEntry, venueId);
  url.searchParams.set(normalizedConfig.venueNameEntry, venueName);
  url.searchParams.set(normalizedConfig.gameIdEntry, gameLabel);
  return url.toString();
}
