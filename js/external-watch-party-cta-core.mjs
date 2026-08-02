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

export function observeExternalVenueCommit(previousPending, state = {}) {
  const external = state.externalSearch || {};
  const pendingAction = state.fanIntent?.pending?.action;
  const selectedExternal = external.selected || external.retry;

  if (external.pending && pendingAction === 'joinExternalVenue' && selectedExternal?.gameId) {
    return {
      pending: Object.freeze({
        gameId: clean(selectedExternal.gameId),
        externalPlaceId: clean(selectedExternal.placeId)
      }),
      committed: null
    };
  }

  const pending = previousPending && clean(previousPending.gameId)
    ? previousPending
    : null;
  const venueId = clean(state.selectedVenueId);
  const gameId = clean(state.gameId);
  const successfulLocalCommit = Boolean(
    pending &&
    !external.pending &&
    !external.selected &&
    !external.retry &&
    venueId &&
    gameId === clean(pending.gameId)
  );

  return {
    pending: successfulLocalCommit || (!external.pending && external.retry) ? null : pending,
    committed: successfulLocalCommit ? Object.freeze({ venueId, gameId }) : null
  };
}

export function buildCommittedExternalVenueWatchPartyUrl({ config, snapshot, gameId, venueId } = {}) {
  const context = resolveCommittedExternalVenueContext({ snapshot, gameId, venueId });
  return context ? buildWatchPartyPrefillUrl(config, context) : '';
}
