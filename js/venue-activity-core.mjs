function normalizedCount(value) {
  const count = Math.trunc(Number(value) || 0);
  return count > 0 ? count : 0;
}

function normalizedSeason(value) {
  const season = Math.trunc(Number(value) || 0);
  return season >= 2000 && season <= 2100 ? season : null;
}

function getVenueGameCount(snapshot, gameId, venueId) {
  if (!gameId || !venueId) return 0;
  const row = (snapshot?.fanCounts || []).find((item) =>
    item?.game_id === gameId && item?.venue_id === venueId
  );
  return normalizedCount(row?.count);
}

export function getVenueSeasonCount(snapshot, season, venueId) {
  const normalized = normalizedSeason(season);
  if (!normalized || !venueId) return 0;
  const row = (snapshot?.venueSeasonCounts || []).find((item) =>
    Number(item?.season) === normalized && item?.venue_id === venueId
  );
  return normalizedCount(row?.count);
}

export function seasonActivityCopy(count) {
  const total = normalizedCount(count);
  if (total === 1) return '1 Bear watched Cal games here this season.';
  if (total > 1) return `${total} Bears watched Cal games here this season.`;
  return '';
}

export function lastSeasonActivityCopy() {
  return 'Bears watched Cal games here last season.';
}

// Compatibility for existing renderers that used legacy description detection only to
// suppress migrated source copy. Historical activity no longer depends on description text.
export function legacyActivitySeason() {
  return null;
}

export function legacyActivityCopy() {
  return lastSeasonActivityCopy();
}

export function venueActivityPresentation({ snapshot, game, venue, currentCopy = '' } = {}) {
  const season = normalizedSeason(game?.season);
  const seasonCount = getVenueSeasonCount(snapshot, season, venue?.venue_id);
  const seasonCopy = seasonActivityCopy(seasonCount);
  const currentGameCount = getVenueGameCount(snapshot, game?.game_id, venue?.venue_id);
  const selectedGameCompleted = game?.game_status === 'completed';

  if (selectedGameCompleted) {
    if (seasonCopy) return { primary: seasonCopy, secondary: [] };
    return {
      primary: 'No Cal-game activity is recorded here for this season.',
      secondary: []
    };
  }

  if (seasonCopy) return { primary: currentCopy, secondary: [seasonCopy] };
  if (currentGameCount > 0) return { primary: currentCopy, secondary: [] };
  if (season) {
    return {
      primary: currentCopy,
      secondary: [lastSeasonActivityCopy(), `Be part of the ${season} season.`]
    };
  }
  return { primary: currentCopy, secondary: [] };
}
