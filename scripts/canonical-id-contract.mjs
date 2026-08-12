#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const CANONICAL_ID_PATTERNS = Object.freeze({
  venue: /^venue_[a-f0-9]{24}$/,
  game: /^game_[a-f0-9]{24}$/,
  watchParty: /^wp_[a-f0-9]{24}$/,
  fanIntent: /^fi_[a-f0-9]{24}$/,
  watchPartySubmission: /^wps_[a-f0-9]{24}$/
});

/**
 * Retained only for deterministic legacy data migration tooling. Runtime
 * compatibility aliases are retired and are not read by the application.
 */
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
  for (const [index, row] of (snapshot.venueSeasonCounts || []).entries()) {
    if (!venueIds.has(row.venue_id)) errors.push(`venueSeasonCounts[${index}].venue_id is unresolved`);
  }
  return errors;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node scripts/canonical-id-contract.mjs <snapshot.json>');
    process.exitCode = 2;
    return;
  }

  const snapshot = JSON.parse(await readFile(inputPath, 'utf8'));
  const errors = validateCanonicalSnapshotIds(snapshot);
  if (errors.length) {
    console.error(`Canonical ID validation failed with ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Canonical ID contract passed: ${snapshot.venues.length} venues, ${snapshot.games.length} games`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
