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
  if (total === 1) return '1 Bear watched Cal games here this season.';
  if (total > 1) return `${total} Bears watched Cal games here this season.`;
  return '';
}

export function legacyActivitySeason(venue) {
  const description = String(venue?.short_description || '').trim();
  if (!description || !/(?:watch\s+part(?:y|ies)|cal\s+games?)/i.test(description)) return null;
  const years = [...description.matchAll(/\b(20\d{2})\b/g)]
    .map((match) => normalizedSeason(match[1]))
    .filter(Boolean);
  return years.at(-1) || null;
}

export function legacyActivityCopy(season) {
  const year = normalizedSeason(season);
  return year ? `Bears watched Cal games here in ${year}.` : '';
}

export function venueActivityPresentation({ snapshot, game, venue, currentCopy = '' } = {}) {
  const season = normalizedSeason(game?.season);
  const seasonCount = getVenueSeasonCount(snapshot, season, venue?.venue_id);
  const seasonCopy = seasonActivityCopy(seasonCount);
  const legacySeason = legacyActivitySeason(venue);
  const legacyCopy = legacyActivityCopy(legacySeason);
  const selectedGameCompleted = game?.game_status === 'completed';

  if (selectedGameCompleted) {
    if (seasonCopy) return { primary: seasonCopy, secondary: [] };
    if (legacyCopy) return { primary: legacyCopy, secondary: [] };
    return {
      primary: 'No Cal-game activity is recorded here for this season.',
      secondary: []
    };
  }

  if (seasonCopy) return { primary: currentCopy, secondary: [seasonCopy] };
  if (legacyCopy && season) {
    return {
      primary: currentCopy,
      secondary: [legacyCopy, `Be part of the ${season} season.`]
    };
  }
  return { primary: currentCopy, secondary: [] };
}
