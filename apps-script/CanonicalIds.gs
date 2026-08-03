/**
 * Canonical entity-ID contract and legacy-alias support.
 *
 * Canonical IDs are opaque relationship keys. They must not encode dates,
 * sequence numbers, locations, or other business meaning.
 */

const CGB_ID_ALIAS_TAB = 'ID_Aliases';
const CGB_ID_ALIAS_HEADERS = Object.freeze([
  'entity_type', 'legacy_id', 'canonical_id', 'mapping_version', 'migrated_at'
]);
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

function readCanonicalIdAliases_(workbook) {
  const sheet = workbook.getSheetByName(CGB_ID_ALIAS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value).trim(); });
  CGB_ID_ALIAS_HEADERS.forEach(function(header) {
    if (headers.indexOf(header) < 0) throw new Error('Missing ID_Aliases column: ' + header);
  });
  return values.slice(1).filter(function(row) {
    return row.some(function(value) { return value !== '' && value !== null; });
  }).map(function(row) {
    const object = {};
    headers.forEach(function(header, index) {
      object[header] = normalizeCellValue_(row[index]);
    });
    return object;
  });
}

function resolveCanonicalId_(workbook, entityType, value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  if (isCanonicalEntityId_(entityType, candidate)) return candidate;

  const match = readCanonicalIdAliases_(workbook).find(function(row) {
    return String(row.entity_type || '') === entityType &&
      String(row.legacy_id || '') === candidate;
  });
  if (!match) return candidate;

  const canonicalId = String(match.canonical_id || '');
  if (!isCanonicalEntityId_(entityType, canonicalId)) {
    throw new Error('Invalid canonical alias target for ' + entityType + ': ' + candidate);
  }
  return canonicalId;
}

function buildPublicIdAliases_(workbook) {
  const result = { venues: {}, games: {} };
  readCanonicalIdAliases_(workbook).forEach(function(row) {
    const entityType = String(row.entity_type || '');
    const legacyId = String(row.legacy_id || '');
    const canonicalId = String(row.canonical_id || '');
    if (entityType === 'venue' && legacyId && isCanonicalEntityId_('venue', canonicalId)) {
      result.venues[legacyId] = canonicalId;
    }
    if (entityType === 'game' && legacyId && isCanonicalEntityId_('game', canonicalId)) {
      result.games[legacyId] = canonicalId;
    }
  });
  return result;
}

/** Owner-only integrity check after an ID migration or alias-table edit. */
function validateCanonicalIdWorkbook() {
  const workbook = getWorkbook_();
  const venues = readSheetObjects_(workbook, 'Venues');
  const games = readSheetObjects_(workbook, 'Games');
  const watchParties = readSheetObjects_(workbook, 'Watch_Parties');
  const fanIntent = readSheetObjects_(workbook, 'Fan_Intent');
  const aliases = readCanonicalIdAliases_(workbook);
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

  const aliasKeys = new Set();
  aliases.forEach(function(row, index) {
    const entityType = String(row.entity_type || '');
    const legacyId = String(row.legacy_id || '');
    const canonicalId = String(row.canonical_id || '');
    const key = entityType + '::' + legacyId;
    if (aliasKeys.has(key)) errors.push('ID_Aliases row ' + (index + 2) + ': duplicate alias');
    aliasKeys.add(key);
    if (!isCanonicalEntityId_(entityType, canonicalId)) {
      errors.push('ID_Aliases row ' + (index + 2) + ': invalid canonical target');
    }
  });

  if (errors.length) throw new Error('Canonical ID validation failed:\n' + errors.join('\n'));
  return {
    ok: true,
    venues: venues.length,
    games: games.length,
    watchParties: watchParties.length,
    fanIntent: fanIntent.length,
    aliases: aliases.length
  };
}
