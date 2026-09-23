function normalizedLabel(party) {
  return String(party?.organizer_name || party?.event_label || '')
    .trim()
    .toLocaleLowerCase();
}

function confirmedStartTime(party) {
  if (!party?.event_start_at) return null;
  const timestamp = new Date(party.event_start_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizedIdentityValue(value) {
  return String(value ?? '').trim();
}

function watchPartyRenderVersions(parties) {
  const versions = [];
  for (const party of parties || []) {
    const id = normalizedIdentityValue(party?.watch_party_id);
    const updatedAt = normalizedIdentityValue(party?.updated_at);
    if (!id || !updatedAt) return null;
    versions.push([id, updatedAt]);
  }
  return versions;
}

export function getWatchPartiesForVenueGame(snapshot, gameId, venueId) {
  const seen = new Set();

  return (snapshot?.watchParties || [])
    .filter((party) =>
      party?.game_id === gameId &&
      party?.venue_id === venueId &&
      party?.event_status === 'active' &&
      (!party?.publication_status || party.publication_status === 'published')
    )
    .filter((party) => {
      const id = String(party?.watch_party_id || '').trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((left, right) => {
      const leftStart = confirmedStartTime(left);
      const rightStart = confirmedStartTime(right);
      if (leftStart !== null && rightStart !== null && leftStart !== rightStart) {
        return leftStart - rightStart;
      }
      if (leftStart !== null) return -1;
      if (rightStart !== null) return 1;

      const labelOrder = normalizedLabel(left).localeCompare(normalizedLabel(right));
      if (labelOrder !== 0) return labelOrder;
      return String(left.watch_party_id).localeCompare(String(right.watch_party_id));
    });
}

export function watchPartyTrayRenderKey({ venueId, gameId, parties } = {}) {
  const normalizedVenueId = normalizedIdentityValue(venueId);
  const normalizedGameId = normalizedIdentityValue(gameId);
  const versions = watchPartyRenderVersions(parties);
  if (!normalizedVenueId || !normalizedGameId || versions === null) return '';
  return JSON.stringify([normalizedVenueId, normalizedGameId, versions]);
}

export function markWatchPartyTrayRenderCurrent(container, context) {
  const key = watchPartyTrayRenderKey(context);
  if (!container?.dataset || !key) return false;
  container.dataset.watchPartyRenderKey = key;
  return true;
}

export function isWatchPartyTrayRenderCurrent(container, context) {
  const key = watchPartyTrayRenderKey(context);
  if (!container?.dataset || !key || container.dataset.watchPartyRenderKey !== key) return false;

  const expectedIds = (context?.parties || []).map((party) => normalizedIdentityValue(party?.watch_party_id));
  if (expectedIds.some((id) => !id)) return false;

  const moduleSelector = ':scope > .party-module, :scope > .selected-card__scroll-region > .party-module';
  const modules = Array.from(container.querySelectorAll?.(moduleSelector) || []);
  if (modules.length !== expectedIds.length) return false;
  if (modules.some((module, index) => normalizedIdentityValue(module?.dataset?.watchPartyId) !== expectedIds[index])) {
    return false;
  }

  const noPartySelector = ':scope > .selected-card__plan-party, :scope > .selected-card__scroll-region > .selected-card__plan-party';
  const noPartyAction = container.querySelector?.(noPartySelector) || null;
  return expectedIds.length === 0 ? Boolean(noPartyAction) : !noPartyAction;
}
