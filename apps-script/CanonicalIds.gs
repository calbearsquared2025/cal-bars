/**
 * Canonical entity-ID contract.
 *
 * Canonical IDs are opaque relationship keys. They must not encode dates,
 * sequence numbers, locations, or other business meaning.
 */

const CGB_CANONICAL_ID_PATTERNS = Object.freeze({
  venue: /^venue_[a-f0-9]{24}$/,
  game: /^game_[a-f0-9]{24}$/,
  watch_party: /^wp_[a-f0-9]{24}$/,
  fan_intent: /^fi_[a-f0-9]{24}$/,
  watch_party_submission: /^wps_[a-f0-9]{24}$/
});
const CGB_CANONICAL_ID_PREFIXES = Object.freeze({
  venue: 'venue_',
  game: 'game_',
  watch_party: 'wp_',
  fan_intent: 'fi_',
  watch_party_submission: 'wps_'
});

function isCanonicalEntityId_(entityType, value) {
  const pattern = CGB_CANONICAL_ID_PATTERNS[entityType];
  return Boolean(pattern && pattern.test(String(value || '')));
}

function createCanonicalEntityId_(entityType) {
  const prefix = CGB_CANONICAL_ID_PREFIXES[entityType];
  if (!prefix) throw new Error('Unsupported canonical ID entity type: ' + entityType);
  return prefix + String(Utilities.getUuid()).replace(/-/g, '').toLowerCase().slice(0, 24);
}

/** Owner-only canonical-ID and relationship integrity check. */
function validateCanonicalIdWorkbook() {
  const workbook = getWorkbook_();
  const venues = readSheetObjects_(workbook, 'Venues');
  const games = readSheetObjects_(workbook, 'Games');
  const watchParties = readSheetObjects_(workbook, 'Watch_Parties');
  const fanIntent = readSheetObjects_(workbook, 'Fan_Intent');
  const errors = [];

  const venueIds = new Set();
  venues.forEach(function(row, index) {
    const id = String(row.venue_id || '');
    if (!isCanonicalEntityId_('venue', id)) errors.push('Venues row ' + (index + 2) + ': invalid venue_id');
    if (venueIds.has(id)) errors.push('Venues row ' + (index + 2) + ': duplicate venue_id');
    venueIds.add(id);
  });

  const gameIds = new Set();
  games.forEach(function(row, index) {
    const id = String(row.game_id || '');
    if (!isCanonicalEntityId_('game', id)) errors.push('Games row ' + (index + 2) + ': invalid game_id');
    if (gameIds.has(id)) errors.push('Games row ' + (index + 2) + ': duplicate game_id');
    gameIds.add(id);
  });

  const watchPartyIds = new Set();
  watchParties.forEach(function(row, index) {
    const id = String(row.watch_party_id || '');
    if (!isCanonicalEntityId_('watch_party', id)) errors.push('Watch_Parties row ' + (index + 2) + ': invalid watch_party_id');
    if (!venueIds.has(String(row.venue_id || ''))) errors.push('Watch_Parties row ' + (index + 2) + ': unknown venue_id');
    if (!gameIds.has(String(row.game_id || ''))) errors.push('Watch_Parties row ' + (index + 2) + ': unknown game_id');
    if (watchPartyIds.has(id)) errors.push('Watch_Parties row ' + (index + 2) + ': duplicate watch_party_id');
    watchPartyIds.add(id);
  });

  fanIntent.forEach(function(row, index) {
    if (!isCanonicalEntityId_('fan_intent', String(row.fan_intent_id || ''))) {
      errors.push('Fan_Intent row ' + (index + 2) + ': invalid fan_intent_id');
    }
    if (!venueIds.has(String(row.venue_id || ''))) errors.push('Fan_Intent row ' + (index + 2) + ': unknown venue_id');
    if (!gameIds.has(String(row.game_id || ''))) errors.push('Fan_Intent row ' + (index + 2) + ': unknown game_id');
  });

  if (errors.length) throw new Error('Canonical ID validation failed:\n' + errors.join('\n'));
  return {
    ok: true,
    venues: venues.length,
    games: games.length,
    watchParties: watchParties.length,
    fanIntent: fanIntent.length
  };
}
