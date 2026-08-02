function clean(value) {
  return String(value ?? '').trim();
}

const ENTRY_PATTERN = /^(?:entry\.)?(\d+)$/;

function entry(value) {
  const match = clean(value).match(ENTRY_PATTERN);
  return match ? `entry.${match[1]}` : '';
}

export function normalizeCalBarNominationConfig(config = {}) {
  let formUrl;
  try { formUrl = new URL(clean(config.formUrl)); } catch (_) { return null; }
  if (formUrl.protocol !== 'https:' || formUrl.hostname !== 'docs.google.com' || !formUrl.pathname.startsWith('/forms/')) {
    return null;
  }
  const venueIdEntry = entry(config.venueIdEntry);
  const venueNameEntry = entry(config.venueNameEntry);
  if (!venueIdEntry || !venueNameEntry || venueIdEntry === venueNameEntry) return null;
  return Object.freeze({ formUrl: formUrl.toString(), venueIdEntry, venueNameEntry });
}

export function resolveCalBarNominationVenue(snapshot, venueId) {
  if (!snapshot || !Array.isArray(snapshot.venues)) return null;
  const venue = snapshot.venues.find((item) => clean(item?.venue_id) === clean(venueId));
  if (!venue) return null;
  return Object.freeze({
    venueId: clean(venue.venue_id),
    venueName: clean(venue.name)
  });
}

export function buildCalBarNominationPrefillUrl(config, venueContext = null) {
  const normalized = normalizeCalBarNominationConfig(config);
  if (!normalized) return '';
  const url = new URL(normalized.formUrl);
  if (!url.searchParams.has('usp')) url.searchParams.set('usp', 'pp_url');
  if (venueContext) {
    url.searchParams.set(normalized.venueNameEntry, clean(venueContext.venueName));
    url.searchParams.set(normalized.venueIdEntry, clean(venueContext.venueId));
  }
  return url.toString();
}
