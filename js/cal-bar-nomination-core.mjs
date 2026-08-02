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
  const addressEntry = entry(config.addressEntry);
  const cityEntry = entry(config.cityEntry);
  const regionEntry = entry(config.regionEntry);
  const postalCodeEntry = entry(config.postalCodeEntry);
  const entries = [venueIdEntry, venueNameEntry, addressEntry, cityEntry, regionEntry, postalCodeEntry];
  if (entries.some((value) => !value) || new Set(entries).size !== entries.length) return null;
  return Object.freeze({
    formUrl: formUrl.toString(), venueIdEntry, venueNameEntry,
    addressEntry, cityEntry, regionEntry, postalCodeEntry
  });
}

export function resolveCalBarNominationVenue(snapshot, venueId) {
  if (!snapshot || !Array.isArray(snapshot.venues)) return null;
  const venue = snapshot.venues.find((item) => clean(item?.venue_id) === clean(venueId));
  if (!venue) return null;
  return Object.freeze({
    venueId: clean(venue.venue_id),
    venueName: clean(venue.name),
    address: [venue.address_line_1, venue.address_line_2].filter(Boolean).join(', '),
    city: clean(venue.city),
    region: clean(venue.region),
    postalCode: clean(venue.postal_code)
  });
}

export function buildCalBarNominationPrefillUrl(config, venueContext = null) {
  const normalized = normalizeCalBarNominationConfig(config);
  if (!normalized) return '';
  const url = new URL(normalized.formUrl);
  if (!url.searchParams.has('usp')) url.searchParams.set('usp', 'pp_url');
  if (venueContext) {
    url.searchParams.set(normalized.venueIdEntry, clean(venueContext.venueId));
    url.searchParams.set(normalized.venueNameEntry, clean(venueContext.venueName));
    url.searchParams.set(normalized.addressEntry, clean(venueContext.address));
    url.searchParams.set(normalized.cityEntry, clean(venueContext.city));
    url.searchParams.set(normalized.regionEntry, clean(venueContext.region));
    url.searchParams.set(normalized.postalCodeEntry, clean(venueContext.postalCode));
  }
  return url.toString();
}
