export const DATA_ENDPOINT_OVERRIDE_STORAGE_KEY = 'cgb_v2_public_data_url';

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
  fanExperienceVenueIdEntry: 'cgb-fan-experience-form-venue-id-entry',
  fanExperienceVenueNameEntry: 'cgb-fan-experience-form-venue-name-entry',
  photoFormUrl: 'cgb-photo-form-url',
  photoVenueIdEntry: 'cgb-photo-form-venue-id-entry',
  photoVenueNameEntry: 'cgb-photo-form-venue-name-entry'
});

const DEFAULTS = Object.freeze({
  mapTilerKey: 'jNqIsIVa4dP9qv7vQ8fy',
  analyticsMeasurementId: 'G-CZV3JSBNJK',
  canonicalSiteUrl: 'https://calgoldenbars.com/',
  mapStyleUrl: new URL('../styles/dataviz-with-cgb-states.json', import.meta.url).href,
  detailMapStyleId: 'dataviz-v4',
  defaultGeography: Object.freeze({ center: Object.freeze([-98.5795, 39.8283]), zoom: 3.2 }),
  forms: Object.freeze({
    fanExperience: Object.freeze({
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScVyKUUXqR8sqEPQLIMeVV1TtxI9EiVmMDd3ib-CvLuBKRajg/viewform',
      venueIdEntry: 'entry.120767699',
      venueNameEntry: 'entry.202050515'
    }),
    photo: Object.freeze({
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSecvY5Pm73oPNRe4viSATCWYeERxwyDGYHwGpvPZHzQ03BmDg/viewform',
      venueIdEntry: 'entry.893543394',
      venueNameEntry: 'entry.1077046729'
    })
  })
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
    formUrl: readMetaContent(CONFIG_META_NAMES.watchPartyIssueFormUrl, documentObject),
    venueNameEntry: readMetaContent(CONFIG_META_NAMES.watchPartyIssueVenueNameEntry, documentObject),
    gameEntry: readMetaContent(CONFIG_META_NAMES.watchPartyIssueGameEntry, documentObject),
    watchPartyIdEntry: readMetaContent(CONFIG_META_NAMES.watchPartyIssueIdEntry, documentObject)
  });
}

export function readRuntimeConfig({
  documentObject = globalThis.document,
  windowObject = documentObject?.defaultView || globalThis.window
} = {}) {
  const storedEndpoint = safeStorageGet(windowObject, DATA_ENDPOINT_OVERRIDE_STORAGE_KEY);
  const endpoint = clean(storedEndpoint) || readMetaContent(CONFIG_META_NAMES.dataEndpoint, documentObject);

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
      }),
      calBarNomination: formConfig(documentObject, {
        formUrl: CONFIG_META_NAMES.calBarNominationFormUrl,
        venueIdEntry: CONFIG_META_NAMES.calBarNominationVenueIdEntry,
        venueNameEntry: CONFIG_META_NAMES.calBarNominationVenueNameEntry
      }),
      listingUpdate: formConfig(documentObject, {
        formUrl: CONFIG_META_NAMES.listingUpdateFormUrl,
        venueIdEntry: CONFIG_META_NAMES.listingUpdateVenueIdEntry,
        venueNameEntry: CONFIG_META_NAMES.listingUpdateVenueNameEntry
      }),
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
    dataEndpoint: readMetaContentFromHtml(html, CONFIG_META_NAMES.dataEndpoint),
    canonicalSiteUrl: readCanonicalUrlFromHtml(html)
  });
}
