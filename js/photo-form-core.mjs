function clean(value) {
  return String(value ?? '').trim();
}

const ENTRY_PATTERN = /^(?:entry\.)?(\d+)$/;

function entry(value) {
  const match = clean(value).match(ENTRY_PATTERN);
  return match ? `entry.${match[1]}` : '';
}

function supportedPrefillFormUrl(value) {
  let url;
  try { url = new URL(clean(value)); } catch (_) { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.hostname !== 'docs.google.com' || !url.pathname.startsWith('/forms/')) return null;
  return url;
}

export function normalizePhotoFormConfig(config = {}) {
  const formUrl = supportedPrefillFormUrl(config.formUrl);
  const venueIdEntry = entry(config.venueIdEntry);
  const venueNameEntry = entry(config.venueNameEntry);
  if (!formUrl || !venueIdEntry || !venueNameEntry || venueIdEntry === venueNameEntry) return null;
  return Object.freeze({
    formUrl: formUrl.toString(),
    venueIdEntry,
    venueNameEntry
  });
}

export function resolvePhotoFormVenue(snapshot, venueId) {
  if (!snapshot || !Array.isArray(snapshot.venues)) return null;
  const venue = snapshot.venues.find((item) => clean(item?.venue_id) === clean(venueId));
  if (!venue) return null;
  const resolvedVenueId = clean(venue.venue_id);
  const venueName = clean(venue.name);
  if (!resolvedVenueId || !venueName) return null;
  return Object.freeze({ venueId: resolvedVenueId, venueName });
}

export function buildPhotoFormPrefillUrl(config, venueContext = null) {
  const normalized = normalizePhotoFormConfig(config);
  if (!normalized || !venueContext?.venueId || !venueContext?.venueName) return '';
  const url = new URL(normalized.formUrl);
  if (!url.searchParams.has('usp')) url.searchParams.set('usp', 'pp_url');
  url.searchParams.set(normalized.venueNameEntry, clean(venueContext.venueName));
  url.searchParams.set(normalized.venueIdEntry, clean(venueContext.venueId));
  return url.toString();
}
