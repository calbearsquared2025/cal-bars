import { ACTIVE_INSTANCE_CONFIG } from './instance-config.mjs';

function normalizedCount(value) {
  const count = Math.trunc(Number(value) || 0);
  return count > 0 ? count : 0;
}

function normalizedSeason(value) {
  const season = Math.trunc(Number(value) || 0);
  return season >= 2000 && season <= 2100 ? season : null;
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
  const { fanSingular, fanPlural, schoolShortName } = ACTIVE_INSTANCE_CONFIG.identity;
  if (total === 1) return `1 ${fanSingular} watched ${schoolShortName} games here this season.`;
  if (total > 1) return `${total} ${fanPlural} watched ${schoolShortName} games here this season.`;
  return '';
}

// Compatibility for existing renderers that used legacy description detection only to
// suppress migrated source copy. Historical activity no longer depends on description text.
export function legacyActivitySeason() {
  return null;
}

export function venueActivityPresentation({ snapshot, game, venue, currentCopy = '' } = {}) {
  const season = normalizedSeason(game?.season);
  const seasonCount = getVenueSeasonCount(snapshot, season, venue?.venue_id);
  const seasonCopy = seasonActivityCopy(seasonCount);
  const selectedGameCompleted = game?.game_status === 'completed';

  if (selectedGameCompleted) {
    if (seasonCopy) return { primary: seasonCopy, secondary: [] };
    return {
      primary: `No ${ACTIVE_INSTANCE_CONFIG.identity.schoolShortName}-game activity is recorded here for this season.`,
      secondary: []
    };
  }

  if (seasonCopy) return { primary: currentCopy, secondary: [seasonCopy] };
  return { primary: currentCopy, secondary: [] };
}
