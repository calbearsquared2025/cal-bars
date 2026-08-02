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
