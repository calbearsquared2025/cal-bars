import { ACTIVE_INSTANCE_CONFIG } from './instance-config.mjs';

export const DATA_ENDPOINT_OVERRIDE_STORAGE_KEY = ACTIVE_INSTANCE_CONFIG.storage.dataEndpointOverride;

export const CONFIG_META_NAMES = Object.freeze({
  dataEndpoint: 'cgb-data-endpoint',
  mapTilerKey: 'cgb-maptiler-key',
  analyticsMeasurementId: 'cgb-analytics-measurement-id',
  watchPartyFormUrl: 'cgb-watch-party-form-url',
  watchPartyVenueIdEntry: 'cgb-watch-party-venue-id-entry',
  watchPartyVenueNameEntry: 'cgb-watch-party-venue-name-entry',
  watchPartyGameIdEntry: 'cgb-watch-party-game-id-entry',
  calBarNominationFormUrl: 'cgb-cal-bar-nomination-form-url',
  calBarNominationVenueIdEntry: 'cgb-cal-bar-nomination-venue-id-entry',
  calBarNominationVenueNameEntry: 'cgb-cal-bar-nomination-venue-name-entry',
  listingUpdateFormUrl: 'cgb-listing-update-form-url',
  listingUpdateVenueIdEntry: 'cgb-listing-update-venue-id-entry',
  listingUpdateVenueNameEntry: 'cgb-listing-update-venue-name-entry',
  watchPartyIssueFormUrl: 'cgb-watch-party-issue-form-url',
  watchPartyIssueVenueNameEntry: 'cgb-watch-party-issue-venue-name-entry',
  watchPartyIssueGameEntry: 'cgb-watch-party-issue-game-entry',
  watchPartyIssueIdEntry: 'cgb-watch-party-issue-id-entry',
  fanExperienceFormUrl: 'cgb-fan-experience-form-url',
  fanExperienceVenueIdEntry: 'cgb-fan-experience-venue-id-entry',
  fanExperienceVenueNameEntry: 'cgb-fan-experience-venue-name-entry',
  photoFormUrl: 'cgb-photo-form-url',
  photoVenueIdEntry: 'cgb-photo-venue-id-entry',
  photoVenueNameEntry: 'cgb-photo-venue-name-entry'
});

const DEFAULTS = Object.freeze({
  dataEndpoint: ACTIVE_INSTANCE_CONFIG.integrations.dataEndpoint,
  mapTilerKey: ACTIVE_INSTANCE_CONFIG.integrations.mapTiler.apiKey,
  analyticsMeasurementId: ACTIVE_INSTANCE_CONFIG.integrations.analytics.measurementId,
  canonicalSiteUrl: ACTIVE_INSTANCE_CONFIG.site.canonicalUrl,
  mapStyleUrl: ACTIVE_INSTANCE_CONFIG.integrations.mapTiler.styleUrl,
  detailMapStyleId: ACTIVE_INSTANCE_CONFIG.integrations.mapTiler.detailStyleId,
  defaultGeography: ACTIVE_INSTANCE_CONFIG.geography.defaultMap,
  forms: ACTIVE_INSTANCE_CONFIG.integrations.forms
});

function clean(value) {
  return String(value ?? '').trim();
}

export function readMetaContent(name, documentObject = globalThis.document) {
  return clean(documentObject?.querySelector?.(`meta[name="${name}"]`)?.content);
}

export function readMetaContentFromHtml(html, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = String(html ?? '').match(new RegExp(`<meta\\b[^>]*\\bname=["']${escaped}["'][^>]*>`, 'i'))?.[0];
  return clean(tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1]);
}

function readCanonicalUrlFromHtml(html) {
  const tag = String(html ?? '').match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0];
  return clean(tag?.match(/\bhref=["']([^"']*)["']/i)?.[1]) || DEFAULTS.canonicalSiteUrl;
}

function readCanonicalUrl(documentObject) {
  return clean(documentObject?.querySelector?.('link[rel="canonical"]')?.href) || DEFAULTS.canonicalSiteUrl;
}

function safeStorageGet(windowObject, key) {
  try { return windowObject?.localStorage?.getItem?.(key); } catch (_) { return null; }
}

function formConfig(documentObject, names, fallback = {}) {
  return Object.freeze({
    formUrl: readMetaContent(names.formUrl, documentObject) || fallback.formUrl || '',
    venueIdEntry: readMetaContent(names.venueIdEntry, documentObject) || fallback.venueIdEntry || '',
    venueNameEntry: readMetaContent(names.venueNameEntry, documentObject) || fallback.venueNameEntry || '',
    ...(names.gameIdEntry ? { gameIdEntry: readMetaContent(names.gameIdEntry, documentObject) || fallback.gameIdEntry || '' } : {}),
    ...(names.gameEntry ? { gameEntry: readMetaContent(names.gameEntry, documentObject) || fallback.gameEntry || '' } : {}),
    ...(names.watchPartyIdEntry ? { watchPartyIdEntry: readMetaContent(names.watchPartyIdEntry, documentObject) || fallback.watchPartyIdEntry || '' } : {})
  });
}

function watchPartyIssueConfig(documentObject) {
  return Object.freeze({
    formUrl: readMetaContent(CONFIG_META_NAMES.watchPartyIssueFormUrl, documentObject) || DEFAULTS.forms.watchPartyIssue.formUrl,
    venueNameEntry: readMetaContent(CONFIG_META_NAMES.watchPartyIssueVenueNameEntry, documentObject) || DEFAULTS.forms.watchPartyIssue.venueNameEntry,
    gameEntry: readMetaContent(CONFIG_META_NAMES.watchPartyIssueGameEntry, documentObject) || DEFAULTS.forms.watchPartyIssue.gameEntry,
    watchPartyIdEntry: readMetaContent(CONFIG_META_NAMES.watchPartyIssueIdEntry, documentObject) || DEFAULTS.forms.watchPartyIssue.watchPartyIdEntry
  });
}

export function readRuntimeConfig({
  documentObject = globalThis.document,
  windowObject = documentObject?.defaultView || globalThis.window
} = {}) {
  const storedEndpoint = safeStorageGet(windowObject, DATA_ENDPOINT_OVERRIDE_STORAGE_KEY);
  const endpoint = clean(storedEndpoint) || readMetaContent(CONFIG_META_NAMES.dataEndpoint, documentObject) || DEFAULTS.dataEndpoint;

  return Object.freeze({
    dataEndpoint: endpoint,
    dataEndpointOverride: storedEndpoint,
    canonicalSiteUrl: readCanonicalUrl(documentObject),
    analyticsMeasurementId: readMetaContent(CONFIG_META_NAMES.analyticsMeasurementId, documentObject) || DEFAULTS.analyticsMeasurementId,
    mapTiler: Object.freeze({
      apiKey: readMetaContent(CONFIG_META_NAMES.mapTilerKey, documentObject) || DEFAULTS.mapTilerKey,
      styleUrl: DEFAULTS.mapStyleUrl,
      detailStyleId: DEFAULTS.detailMapStyleId
    }),
    defaultGeography: DEFAULTS.defaultGeography,
    forms: Object.freeze({
      watchParty: formConfig(documentObject, {
        formUrl: CONFIG_META_NAMES.watchPartyFormUrl,
        venueIdEntry: CONFIG_META_NAMES.watchPartyVenueIdEntry,
        venueNameEntry: CONFIG_META_NAMES.watchPartyVenueNameEntry,
        gameIdEntry: CONFIG_META_NAMES.watchPartyGameIdEntry
      }, DEFAULTS.forms.watchParty),
      calBarNomination: formConfig(documentObject, {
        formUrl: CONFIG_META_NAMES.calBarNominationFormUrl,
        venueIdEntry: CONFIG_META_NAMES.calBarNominationVenueIdEntry,
        venueNameEntry: CONFIG_META_NAMES.calBarNominationVenueNameEntry
      }, DEFAULTS.forms.calBarNomination),
      listingUpdate: formConfig(documentObject, {
        formUrl: CONFIG_META_NAMES.listingUpdateFormUrl,
        venueIdEntry: CONFIG_META_NAMES.listingUpdateVenueIdEntry,
        venueNameEntry: CONFIG_META_NAMES.listingUpdateVenueNameEntry
      }, DEFAULTS.forms.listingUpdate),
      watchPartyIssue: watchPartyIssueConfig(documentObject),
      fanExperience: formConfig(documentObject, {
        formUrl: CONFIG_META_NAMES.fanExperienceFormUrl,
        venueIdEntry: CONFIG_META_NAMES.fanExperienceVenueIdEntry,
        venueNameEntry: CONFIG_META_NAMES.fanExperienceVenueNameEntry
      }, DEFAULTS.forms.fanExperience),
      photo: formConfig(documentObject, {
        formUrl: CONFIG_META_NAMES.photoFormUrl,
        venueIdEntry: CONFIG_META_NAMES.photoVenueIdEntry,
        venueNameEntry: CONFIG_META_NAMES.photoVenueNameEntry
      }, DEFAULTS.forms.photo)
    })
  });
}

export function readBuildConfigFromHtml(html) {
  return Object.freeze({
    dataEndpoint: readMetaContentFromHtml(html, CONFIG_META_NAMES.dataEndpoint) || DEFAULTS.dataEndpoint,
    canonicalSiteUrl: readCanonicalUrlFromHtml(html)
  });
}
