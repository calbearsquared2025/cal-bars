import {
  buildWatchPartyFormGameLabel,
  normalizeGoogleFormsEntryId
} from './watch-party-form-core.mjs';

function clean(value) {
  return String(value ?? '').trim();
}

export function normalizeWatchPartyIssueConfig(config = {}) {
  let formUrl;
  try { formUrl = new URL(clean(config.formUrl)); } catch (_) { return null; }
  if (
    formUrl.protocol !== 'https:' ||
    formUrl.hostname !== 'docs.google.com' ||
    !formUrl.pathname.startsWith('/forms/')
  ) return null;

  const venueNameEntry = normalizeGoogleFormsEntryId(config.venueNameEntry);
  const gameEntry = normalizeGoogleFormsEntryId(config.gameEntry);
  const watchPartyIdEntry = normalizeGoogleFormsEntryId(config.watchPartyIdEntry);
  const entries = [venueNameEntry, gameEntry, watchPartyIdEntry];
  if (entries.some((entry) => !entry) || new Set(entries).size !== entries.length) return null;

  return Object.freeze({
    formUrl: formUrl.toString(),
    venueNameEntry,
    gameEntry,
    watchPartyIdEntry
  });
}

export function resolveWatchPartyIssueContext(snapshot, party) {
  if (!snapshot || !party) return null;
  const watchPartyId = clean(party.watch_party_id);
  const venue = snapshot.venues?.find((item) => clean(item?.venue_id) === clean(party.venue_id));
  const game = snapshot.games?.find((item) => clean(item?.game_id) === clean(party.game_id));
  const venueName = clean(venue?.name);
  const gameLabel = buildWatchPartyFormGameLabel(game);
  if (!watchPartyId || !venueName || !gameLabel) return null;
  return Object.freeze({ venueName, gameLabel, watchPartyId });
}

export function buildWatchPartyIssueUrl(config, context) {
  const normalized = normalizeWatchPartyIssueConfig(config);
  const venueName = clean(context?.venueName);
  const gameLabel = clean(context?.gameLabel);
  const watchPartyId = clean(context?.watchPartyId);
  if (!normalized || !venueName || !gameLabel || !watchPartyId) return '';

  const url = new URL(normalized.formUrl);
  if (!url.searchParams.has('usp')) url.searchParams.set('usp', 'pp_url');
  url.searchParams.set(normalized.venueNameEntry, venueName);
  url.searchParams.set(normalized.gameEntry, gameLabel);
  url.searchParams.set(normalized.watchPartyIdEntry, watchPartyId);
  return url.toString();
}
