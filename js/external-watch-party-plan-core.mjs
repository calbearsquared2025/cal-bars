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
