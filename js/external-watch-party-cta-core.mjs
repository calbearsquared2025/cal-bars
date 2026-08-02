import {
  buildWatchPartyFormGameLabel,
  buildWatchPartyPrefillUrl
} from './watch-party-form-core.mjs';

function clean(value) {
  return String(value ?? '').trim();
}

export function resolveCommittedExternalVenueContext({ snapshot, gameId, venueId } = {}) {
  if (!snapshot || !Array.isArray(snapshot.venues) || !Array.isArray(snapshot.games)) return null;

  const venue = snapshot.venues.find((item) => clean(item?.venue_id) === clean(venueId));
  const game = snapshot.games.find((item) => clean(item?.game_id) === clean(gameId));
  if (!venue || !game || clean(game.game_status).toLowerCase() !== 'upcoming') return null;

  const context = {
    venueId: clean(venue.venue_id),
    venueName: clean(venue.name),
    gameId: clean(game.game_id),
    gameLabel: buildWatchPartyFormGameLabel(game)
  };

  if (!context.venueId || !context.venueName || !context.gameId || !context.gameLabel) return null;
  return Object.freeze(context);
}

export function buildCommittedExternalVenueWatchPartyUrl({ config, snapshot, gameId, venueId } = {}) {
  const context = resolveCommittedExternalVenueContext({ snapshot, gameId, venueId });
  return context ? buildWatchPartyPrefillUrl(config, context) : '';
}
