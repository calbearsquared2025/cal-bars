#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const CANONICAL_ID_PATTERNS = Object.freeze({
  venue: /^venue_[a-f0-9]{24}$/,
  game: /^game_[a-f0-9]{24}$/,
  watchParty: /^wp_[a-f0-9]{24}$/,
  fanIntent: /^fi_[a-f0-9]{24}$/,
  watchPartySubmission: /^wps_[a-f0-9]{24}$/
});

export function deterministicCanonicalId(entityType, legacyId) {
  const prefixes = { venue: 'venue_', game: 'game_' };
  const prefix = prefixes[entityType];
  if (!prefix) throw new TypeError(`Unsupported deterministic entity type: ${entityType}`);
  const source = String(legacyId || '').trim();
  if (!source) throw new TypeError('legacyId is required');
  const token = createHash('sha256')
    .update(`cgb:v2:${entityType}:${source}`, 'utf8')
    .digest('hex')
    .slice(0, 24);
  return `${prefix}${token}`;
}

export function isCanonicalId(entityType, value) {
  const pattern = CANONICAL_ID_PATTERNS[entityType];
  return Boolean(pattern && pattern.test(String(value || '')));
}

export function validateAliasManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['alias manifest must be an object'];
  }
  if (manifest.mappingVersion !== 'sha256-v1') errors.push('mappingVersion must equal sha256-v1');

  for (const [plural, entityType] of [['venues', 'venue'], ['games', 'game']]) {
    const aliases = manifest[plural];
    if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) {
      errors.push(`${plural} aliases must be an object`);
      continue;
    }
    const targets = new Set();
    for (const [legacyId, canonicalId] of Object.entries(aliases)) {
      if (!legacyId) errors.push(`${plural} contains an empty legacy ID`);
      if (!isCanonicalId(entityType, canonicalId)) {
        errors.push(`${plural}.${legacyId} has invalid canonical target ${canonicalId}`);
      }
      if (targets.has(canonicalId)) errors.push(`${plural} duplicates canonical target ${canonicalId}`);
      targets.add(canonicalId);
      const expected = deterministicCanonicalId(entityType, legacyId);
      if (canonicalId !== expected) {
        errors.push(`${plural}.${legacyId} does not match deterministic sha256-v1 mapping`);
      }
    }
  }
  return errors;
}

export function canonicalizeSnapshot(snapshot, manifest) {
  const errors = validateAliasManifest(manifest);
  if (errors.length) throw new Error(errors.join('\n'));
  const copy = structuredClone(snapshot);
  const venueAliases = manifest.venues;
  const gameAliases = manifest.games;
  const resolveVenue = (value) => venueAliases[value] || value;
  const resolveGame = (value) => gameAliases[value] || value;

  copy.venues = (copy.venues || []).map((venue) => ({
    ...venue,
    venue_id: resolveVenue(venue.venue_id)
  }));
  copy.games = (copy.games || []).map((game) => ({
    ...game,
    game_id: resolveGame(game.game_id)
  }));
  copy.watchParties = (copy.watchParties || []).map((party) => ({
    ...party,
    venue_id: resolveVenue(party.venue_id),
    game_id: resolveGame(party.game_id)
  }));
  copy.fanCounts = (copy.fanCounts || []).map((row) => ({
    ...row,
    venue_id: resolveVenue(row.venue_id),
    game_id: resolveGame(row.game_id)
  }));
  copy.venueHistoryCounts = (copy.venueHistoryCounts || []).map((row) => ({
    ...row,
    venue_id: resolveVenue(row.venue_id)
  }));
  copy.idAliases = {
    venues: { ...venueAliases },
    games: { ...gameAliases }
  };
  copy.generatedAt = manifest.migratedAt || copy.generatedAt;
  return copy;
}

export function validateCanonicalSnapshotIds(snapshot) {
  const errors = [];
  const venueIds = new Set();
  for (const [index, venue] of (snapshot.venues || []).entries()) {
    if (!isCanonicalId('venue', venue.venue_id)) errors.push(`venues[${index}].venue_id is not canonical`);
    if (venueIds.has(venue.venue_id)) errors.push(`venues[${index}].venue_id is duplicated`);
    venueIds.add(venue.venue_id);
  }

  const gameIds = new Set();
  for (const [index, game] of (snapshot.games || []).entries()) {
    if (!isCanonicalId('game', game.game_id)) errors.push(`games[${index}].game_id is not canonical`);
    if (gameIds.has(game.game_id)) errors.push(`games[${index}].game_id is duplicated`);
    gameIds.add(game.game_id);
  }

  for (const [index, party] of (snapshot.watchParties || []).entries()) {
    if (!isCanonicalId('watchParty', party.watch_party_id)) errors.push(`watchParties[${index}].watch_party_id is not canonical`);
    if (!venueIds.has(party.venue_id)) errors.push(`watchParties[${index}].venue_id is unresolved`);
    if (!gameIds.has(party.game_id)) errors.push(`watchParties[${index}].game_id is unresolved`);
  }
  for (const [index, row] of (snapshot.fanCounts || []).entries()) {
    if (!venueIds.has(row.venue_id)) errors.push(`fanCounts[${index}].venue_id is unresolved`);
    if (!gameIds.has(row.game_id)) errors.push(`fanCounts[${index}].game_id is unresolved`);
  }
  for (const [index, row] of (snapshot.venueHistoryCounts || []).entries()) {
    if (!venueIds.has(row.venue_id)) errors.push(`venueHistoryCounts[${index}].venue_id is unresolved`);
  }
  return errors;
}

async function main() {
  const [inputPath, aliasPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !aliasPath) {
    console.error('Usage: node scripts/canonical-id-contract.mjs <snapshot.json> <id-aliases.json> [output.json]');
    process.exitCode = 2;
    return;
  }
  const snapshot = JSON.parse(await readFile(inputPath, 'utf8'));
  const aliases = JSON.parse(await readFile(aliasPath, 'utf8'));
  const canonical = canonicalizeSnapshot(snapshot, aliases);
  const errors = validateCanonicalSnapshotIds(canonical);
  if (errors.length) {
    console.error(`Canonical ID validation failed with ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  const serialized = `${JSON.stringify(canonical, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, serialized, 'utf8');
  else process.stdout.write(serialized);
  console.error(`Canonical ID contract passed: ${canonical.venues.length} venues, ${canonical.games.length} games`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
