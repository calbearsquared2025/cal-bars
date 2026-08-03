const ENTITY_ALIAS_KEYS = Object.freeze({ venue: 'venues', game: 'games' });

export function resolveSnapshotId(snapshot, entityType, value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  const aliasKey = ENTITY_ALIAS_KEYS[entityType];
  const aliases = aliasKey ? snapshot?.idAliases?.[aliasKey] : null;
  return String(aliases?.[candidate] || candidate);
}

export function canonicalizeSnapshotIds(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return snapshot;

  const canonical = structuredClone(snapshot);
  const resolveVenue = (value) => resolveSnapshotId(canonical, 'venue', value);
  const resolveGame = (value) => resolveSnapshotId(canonical, 'game', value);

  canonical.venues = (canonical.venues || []).map((venue) => ({
    ...venue,
    venue_id: resolveVenue(venue.venue_id)
  }));
  canonical.games = (canonical.games || []).map((game) => ({
    ...game,
    game_id: resolveGame(game.game_id)
  }));
  canonical.watchParties = (canonical.watchParties || []).map((party) => ({
    ...party,
    venue_id: resolveVenue(party.venue_id),
    game_id: resolveGame(party.game_id)
  }));
  canonical.fanCounts = (canonical.fanCounts || []).map((row) => ({
    ...row,
    venue_id: resolveVenue(row.venue_id),
    game_id: resolveGame(row.game_id)
  }));
  canonical.venueHistoryCounts = (canonical.venueHistoryCounts || []).map((row) => ({
    ...row,
    venue_id: resolveVenue(row.venue_id)
  }));

  return canonical;
}

export function canonicalizeStoredSelections(snapshot, selections) {
  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) return {};
  const result = {};
  for (const [gameId, venueId] of Object.entries(selections)) {
    const canonicalGameId = resolveSnapshotId(snapshot, 'game', gameId);
    const canonicalVenueId = resolveSnapshotId(snapshot, 'venue', venueId);
    if (canonicalGameId && canonicalVenueId) result[canonicalGameId] = canonicalVenueId;
  }
  return result;
}

export function rewriteLegacyGameQuery(snapshot, locationLike, historyLike) {
  if (!locationLike?.href || !historyLike?.replaceState) return false;
  const url = new URL(locationLike.href);
  const legacyGameId = url.searchParams.get('game');
  const canonicalGameId = resolveSnapshotId(snapshot, 'game', legacyGameId);
  if (!legacyGameId || canonicalGameId === legacyGameId) return false;
  url.searchParams.set('game', canonicalGameId);
  historyLike.replaceState(historyLike.state || null, '', url);
  return true;
}
