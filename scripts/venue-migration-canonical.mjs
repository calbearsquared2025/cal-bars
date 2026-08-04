import { PUBLIC_ID_ALIASES } from '../js/id-aliases.mjs';
import { deterministicCanonicalId, isCanonicalId } from './canonical-id-contract.mjs';
import { migrateRows as migrateRowsLegacy, buildPublicSnapshot as buildPublicSnapshotLegacy } from './venue-migration-core.mjs';

function canonicalEntityId(entityType, value) {
  const candidate = String(value || '');
  if (isCanonicalId(entityType, candidate)) return candidate;
  const aliases = entityType === 'game' ? PUBLIC_ID_ALIASES.games : PUBLIC_ID_ALIASES.venues;
  return aliases[candidate] || deterministicCanonicalId(entityType, candidate);
}

export function canonicalizeMigrationResult(result) {
  for (const record of result.records || []) {
    record.candidate.venue_id = canonicalEntityId('venue', record.candidate.venue_id);
  }

  result.accepted_records = (result.accepted_records || [])
    .slice()
    .sort((first, second) => first.candidate.venue_id.localeCompare(second.candidate.venue_id));
  result.accepted_venues = result.accepted_records.map((record) => record.candidate);
  return result;
}

export function canonicalizeMigrationBaseSnapshot(baseSnapshot = {}) {
  const snapshot = structuredClone(baseSnapshot || {});
  snapshot.games = Array.isArray(snapshot.games)
    ? snapshot.games.map((game) => ({
        ...game,
        game_id: canonicalEntityId('game', game.game_id)
      }))
    : [];
  return snapshot;
}

export function migrateRows(sourceRows, options = {}) {
  return canonicalizeMigrationResult(migrateRowsLegacy(sourceRows, options));
}

export function buildPublicSnapshot(result, baseSnapshot, generatedAt = result.migration_timestamp) {
  return buildPublicSnapshotLegacy(
    canonicalizeMigrationResult(result),
    canonicalizeMigrationBaseSnapshot(baseSnapshot),
    generatedAt
  );
}
