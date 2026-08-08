export const NEARBY_RADIUS_MILES = 25;

export function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function selectDefaultGame(games, now = new Date()) {
  const sorted = [...(games || [])].sort((a, b) => {
    const dateA = parseDateOnly(a.game_date)?.getTime() || 0;
    const dateB = parseDateOnly(b.game_date)?.getTime() || 0;
    return dateA - dateB || Number(a.schedule_order || 0) - Number(b.schedule_order || 0);
  });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return sorted.find((game) => {
    const date = parseDateOnly(game.game_date);
    return game.game_status === 'upcoming' && date && date.getTime() >= today;
  }) || sorted.find((game) => game.game_status === 'upcoming') || sorted.at(-1) || null;
}

export function formatGameDate(game, locale) {
  const date = parseDateOnly(game?.game_date);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short', month: 'short', day: 'numeric'
  }).format(date);
}

export function formatKickoff(game, locale) {
  const dateLabel = formatGameDate(game, locale);
  if (!game) return '';
  if (game.kickoff_status === 'tbd' || !game.kickoff_at) {
    return [dateLabel, 'Time TBD'].filter(Boolean).join(' · ');
  }
  const kickoff = new Date(game.kickoff_at);
  if (Number.isNaN(kickoff.getTime())) return dateLabel;
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(kickoff);
  return [dateLabel, timeLabel].filter(Boolean).join(' · ');
}

export function gameTitle(game) {
  if (!game) return 'Cal football';
  const opponent = game.opponent_name || 'Opponent';
  if (game.home_away === 'home') return `vs. ${opponent}`;
  if (game.home_away === 'away') return `at ${opponent}`;
  return `vs. ${opponent}`;
}

export function venueTypeLabel(venue) {
  return venue?.venue_type === 'cal_bar' ? 'CAL BAR' : 'COMMUNITY LOCATION';
}

export function venueBadgeDescriptors(venue, party) {
  const badges = [];
  if (party) badges.push({ text: 'WATCH PARTY', kind: 'party' });
  if (venue?.venue_type === 'cal_bar') badges.push({ text: 'CAL BAR', kind: 'cal' });
  return badges;
}

export function haversineMiles(lat1, lon1, lat2, lon2) {
  const values = [lat1, lon1, lat2, lon2].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [aLat, aLon, bLat, bLon] = values;
  const radius = 3958.7613;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

export function getWatchPartiesForGame(snapshot, gameId) {
  return (snapshot?.watchParties || []).filter((party) => party.game_id === gameId && party.event_status === 'active');
}

export function getWatchParty(snapshot, gameId, venueId) {
  return getWatchPartiesForGame(snapshot, gameId).find((party) => party.venue_id === venueId) || null;
}

export function getFanCount(snapshot, gameId, venueId) {
  return Number((snapshot?.fanCounts || []).find((row) => row.game_id === gameId && row.venue_id === venueId)?.count || 0);
}

export function getHistoryCount(snapshot, venueId) {
  return Number((snapshot?.venueHistoryCounts || []).find((row) => row.venue_id === venueId)?.past_game_count || 0);
}

export function bearCountCopy(count) {
  const total = Number(count);
  if (total === 1) return '1 Bear watching here';
  if (total > 1) return `${total} Bears watching here`;
  return 'No Bears are watching here yet. Be the first.';
}

export function historyCountCopy(count) {
  if (count === 1) return 'Bears have watched 1 Cal game here.';
  if (count > 1) return `Bears have watched ${count} Cal games here.`;
  return 'No prior Cal-game activity is recorded here yet.';
}

export function markerKind(snapshot, gameId, venue) {
  if (getWatchParty(snapshot, gameId, venue?.venue_id)) return 'watch-party';
  return venue?.venue_type === 'cal_bar' ? 'cal-bar' : 'community-location';
}

export function normalizeSearchText(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

export function findExactVenueMatch(venues, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;
  return (venues || []).find((venue) => normalizeSearchText(venue?.name) === normalizedQuery) || null;
}

export function rankVenues(snapshot, gameId, origin = null, query = '') {
  const normalizedQuery = normalizeSearchText(query);
  return (snapshot?.venues || [])
    .filter((venue) => {
      if (!normalizedQuery) return true;
      return [venue.name, venue.city, venue.region, venue.postal_code, venue.address_line_1]
        .some((value) => normalizeSearchText(value).includes(normalizedQuery));
    })
    .map((venue) => {
      const party = getWatchParty(snapshot, gameId, venue.venue_id);
      const category = party ? 0 : venue.venue_type === 'cal_bar' ? 1 : 2;
      const distance = origin
        ? haversineMiles(origin.lat, origin.lon, venue.latitude, venue.longitude)
        : null;
      return {
        venue,
        party,
        fanCount: getFanCount(snapshot, gameId, venue.venue_id),
        category,
        distance
      };
    })
    .sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category;
      if (a.distance !== null && b.distance !== null && a.distance !== b.distance) return a.distance - b.distance;
      if (b.fanCount !== a.fanCount) return b.fanCount - a.fanCount;
      return String(a.venue.name).localeCompare(String(b.venue.name));
    });
}

export function rankNearbyVenues(snapshot, gameId, origin, radiusMiles = NEARBY_RADIUS_MILES) {
  const radius = Number(radiusMiles);
  if (!origin || !Number.isFinite(radius) || radius < 0) return [];
  return rankVenues(snapshot, gameId, origin)
    .filter(({ distance }) => Number.isFinite(distance) && distance <= radius);
}

export function resolveTrayState(current, action, hasSelection = false) {
  const state = ['peek', 'selected', 'full'].includes(current) ? current : 'peek';
  const selected = Boolean(hasSelection);

  if (action === 'up') {
    if (state === 'peek') return selected ? 'selected' : 'full';
    return 'full';
  }

  if (action === 'down') {
    if (state === 'full') return selected ? 'selected' : 'peek';
    return 'peek';
  }

  if (action === 'toggle') {
    if (state === 'peek') return selected ? 'selected' : 'full';
    if (state === 'selected') return 'full';
    return selected ? 'selected' : 'peek';
  }

  return state;
}

export function buildGameUrl(gameId, baseHref) {
  const url = new URL(baseHref);
  url.search = '';
  if (gameId) url.searchParams.set('game', gameId);
  return url.toString();
}

export function buildVenueUrl(slug, gameId, baseHref) {
  const url = new URL(baseHref);
  url.search = '';
  if (slug) url.searchParams.set('venue', slug);
  if (gameId) url.searchParams.set('game', gameId);
  return url.toString();
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function calculateMinimalPan({
  point,
  viewport,
  insets = {},
  marker = { width: 38, height: 48 },
  gap = 12
} = {}) {
  const width = Number(viewport?.width);
  const height = Number(viewport?.height);
  const pointX = Number(point?.x);
  const pointY = Number(point?.y);
  if (![width, height, pointX, pointY].every(Number.isFinite) || width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }

  const left = Math.max(0, Number(insets.left) || 0);
  const right = Math.max(0, Number(insets.right) || 0);
  const top = Math.max(0, Number(insets.top) || 0);
  const bottom = Math.max(0, Number(insets.bottom) || 0);
  const markerWidth = Math.max(0, Number(marker.width) || 0);
  const markerHeight = Math.max(0, Number(marker.height) || 0);
  const safeGap = Math.max(0, Number(gap) || 0);

  let minimumX = left + markerWidth / 2 + safeGap;
  let maximumX = width - right - markerWidth / 2 - safeGap;
  let minimumY = top + markerHeight + safeGap;
  let maximumY = height - bottom - safeGap;

  if (maximumX < minimumX) minimumX = maximumX = width / 2;
  if (maximumY < minimumY) minimumY = maximumY;

  return {
    x: clamp(pointX, minimumX, maximumX) - pointX,
    y: clamp(pointY, minimumY, maximumY) - pointY
  };
}

export async function shareOrCopy({ payload, url, share, writeClipboard, legacyCopy } = {}) {
  if (typeof share === 'function') {
    try {
      await share(payload);
      return { method: 'share' };
    } catch (error) {
      if (error?.name === 'AbortError') return { method: 'cancelled' };
    }
  }

  if (typeof writeClipboard === 'function') {
    try {
      await writeClipboard(url);
      return { method: 'clipboard' };
    } catch (_) {}
  }

  if (typeof legacyCopy === 'function') {
    try {
      if (await legacyCopy(url)) return { method: 'legacy-copy' };
    } catch (_) {}
  }

  return { method: 'manual', url };
}

export function hasValidVenueCoordinates(venue) {
  const latitudeValue = venue?.latitude;
  const longitudeValue = venue?.longitude;
  if (latitudeValue === null || latitudeValue === undefined || String(latitudeValue).trim() === '') return false;
  if (longitudeValue === null || longitudeValue === undefined || String(longitudeValue).trim() === '') return false;

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function validateSnapshotShape(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const arraysPresent = ['venues', 'games', 'watchParties', 'fanCounts', 'venueHistoryCounts']
    .every((key) => Array.isArray(snapshot[key]));
  return arraysPresent && snapshot.venues.every(hasValidVenueCoordinates);
}
