import { withStoredSelection } from './fan-intent-core.mjs';

function clean(value) {
  return String(value ?? '').trim();
}

export function beginExternalWatchPartyPlan({ selected, gameId } = {}) {
  const placeId = clean(selected?.placeId);
  const selectedGameId = clean(selected?.gameId || gameId);
  if (!placeId || !selectedGameId) return null;
  return Object.freeze({ placeId, gameId: selectedGameId });
}

export function resolveExternalWatchPartyPlan(previousPlan, state = {}) {
  const plan = previousPlan && clean(previousPlan.gameId) && clean(previousPlan.placeId)
    ? previousPlan
    : null;
  if (!plan) return Object.freeze({ pending: null, committed: null, failed: false });

  const external = state.externalSearch || {};
  const gameId = clean(state.gameId);
  const venueId = clean(state.selectedVenueId);

  if (gameId && gameId !== clean(plan.gameId)) {
    return Object.freeze({ pending: null, committed: null, failed: true });
  }

  if (external.pending) {
    return Object.freeze({ pending: plan, committed: null, failed: false });
  }

  if (external.retry || external.error) {
    return Object.freeze({ pending: null, committed: null, failed: true });
  }

  const committed = Boolean(
    !external.selected &&
    venueId &&
    gameId === clean(plan.gameId)
  );

  return Object.freeze({
    pending: committed ? null : plan,
    committed: committed ? Object.freeze({ venueId, gameId }) : null,
    failed: false
  });
}

export function selectionsAfterExternalWatchPartyPlan(selections, committed) {
  const gameId = clean(committed?.gameId);
  const venueId = clean(committed?.venueId);
  if (!gameId || !venueId) return { ...(selections || {}) };
  return withStoredSelection(selections, gameId, venueId);
}
