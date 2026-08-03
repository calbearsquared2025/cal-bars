import { PUBLIC_ID_ALIASES } from '../js/id-aliases.mjs';
import { deterministicCanonicalId, isCanonicalId } from './canonical-id-contract.mjs';
import { migrateRows as migrateRowsLegacy, buildPublicSnapshot as buildPublicSnapshotLegacy } from './venue-migration-core.mjs';

function canonicalVenueId(value) {
  const candidate = String(value || '');
  if (isCanonicalId('venue', candidate)) return candidate;
  return deterministicCanonicalId('venue', candidate);
}

export function canonicalizeMigrationResult(result) {
  for (const record of result.records || []) {
    record.candidate.venue_id = canonicalVenueId(record.candidate.venue_id);
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
        game_id: PUBLIC_ID_ALIASES.games[game.game_id] || game.game_id
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
