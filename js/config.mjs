// Canonical runtime configuration interface. Public instance values may remain in
// index.html, but application modules should resolve them only through this file.

export const DATA_ENDPOINT_OVERRIDE_KEY = 'cgb_v2_public_data_url';
export const BRAND_TOKENS = Object.freeze({
  primary: '#002676',
  primaryDark: '#010133',
  accent: '#fdb515',
  pageBackground: '#f7f6f2',
  surface: '#ffffff',
  text: '#101626',
  mutedText: '#687280',
  eventAccent: '#fdb515'
});

const DEFAULTS = Object.freeze({
  mapTiler: Object.freeze({
    apiKey: 'jNqIsIVa4dP9qv7vQ8fy',
    styleUrl: new URL('../styles/dataviz-with-cgb-states.json', import.meta.url).href,
    detailStyleId: 'dataviz-v4'
  }),
  analytics: Object.freeze({ measurementId: 'G-CZV3JSBNJK' }),
  canonicalSiteUrl: 'https://calgoldenbars.com/',
  homeGeography: Object.freeze({ longitude: -98.5795, latitude: 39.8283, zoom: 3.2 }),
  forms: Object.freeze({
    photo: Object.freeze({
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSecvY5Pm73oPNRe4viSATCWYeERxwyDGYHwGpvPZHzQ03BmDg/viewform',
      venueIdEntry: 'entry.893543394',
      venueNameEntry: 'entry.1077046729'
    }),
    fanExperience: Object.freeze({
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScVyKUUXqR8sqEPQLIMeVV1TtxI9EiVmMDd3ib-CvLuBKRajg/viewform',
      venueIdEntry: 'entry.120767699',
      venueNameEntry: 'entry.202050515'
    })
  })
});

const FORM_META = Object.freeze({
  watchParty: Object.freeze({
    formUrl: 'cgb-watch-party-form-url',
    venueIdEntry: 'cgb-watch-party-venue-id-entry',
    venueNameEntry: 'cgb-watch-party-venue-name-entry',
    gameIdEntry: 'cgb-watch-party-game-id-entry'
  }),
  calBarNomination: Object.freeze({
    formUrl: 'cgb-cal-bar-nomination-form-url',
    venueIdEntry: 'cgb-cal-bar-nomination-venue-id-entry',
    venueNameEntry: 'cgb-cal-bar-nomination-venue-name-entry'
  }),
  listingUpdate: Object.freeze({
    formUrl: 'cgb-listing-update-form-url',
    venueIdEntry: 'cgb-listing-update-venue-id-entry',
    venueNameEntry: 'cgb-listing-update-venue-name-entry'
  }),
  watchPartyIssue: Object.freeze({
    formUrl: 'cgb-watch-party-issue-form-url',
    venueNameEntry: 'cgb-watch-party-issue-venue-name-entry',
    gameEntry: 'cgb-watch-party-issue-game-entry',
    watchPartyIdEntry: 'cgb-watch-party-issue-id-entry'
  }),
  photo: Object.freeze({
    formUrl: 'cgb-photo-form-url',
    venueIdEntry: 'cgb-photo-form-venue-id-entry',
    venueNameEntry: 'cgb-photo-form-venue-name-entry'
  }),
  fanExperience: Object.freeze({
    formUrl: 'cgb-fan-experience-form-url',
    venueIdEntry: 'cgb-fan-experience-form-venue-id-entry',
    venueNameEntry: 'cgb-fan-experience-form-venue-name-entry'
  })
});

function metaContent(name, documentObject) {
  return documentObject?.querySelector?.(`meta[name="${name}"]`)?.content?.trim() || '';
}

function storageValue(windowObject, key) {
  try { return windowObject?.localStorage?.getItem(key)?.trim() || ''; } catch (_) { return ''; }
}

export function readFormConfig(formName, documentObject = globalThis.document) {
  const metaNames = FORM_META[formName];
  if (!metaNames) return Object.freeze({});
  const fallback = DEFAULTS.forms[formName] || {};
  return Object.freeze(Object.fromEntries(Object.entries(metaNames).map(([key, metaName]) => [
    key,
    metaContent(metaName, documentObject) || fallback[key] || ''
  ])));
}

export function metaContentFromHtml(html, name) {
  const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = String(html).match(new RegExp(`<meta\\b[^>]*\\bname=["']${escapedName}["'][^>]*>`, 'i'))?.[0];
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1]?.trim() || '';
}

export function configuredDataEndpoint({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  return storageValue(windowObject, DATA_ENDPOINT_OVERRIDE_KEY) ||
    metaContent('cgb-data-endpoint', documentObject);
}

export function readRuntimeConfig({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  return Object.freeze({
    dataEndpoint: configuredDataEndpoint({ documentObject, windowObject }),
    mapTiler: DEFAULTS.mapTiler,
    analytics: DEFAULTS.analytics,
    canonicalSiteUrl: documentObject?.querySelector?.('link[rel="canonical"]')?.href || DEFAULTS.canonicalSiteUrl,
    homeGeography: DEFAULTS.homeGeography,
    forms: Object.freeze(Object.fromEntries(Object.keys(FORM_META).map((name) => [
      name,
      readFormConfig(name, documentObject)
    ])))
  });
}

export function suspendConfiguredDataEndpoint({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  const meta = documentObject?.querySelector?.('meta[name="cgb-data-endpoint"]');
  const metaValue = meta?.content || '';
  let storedValue = null;
  try { storedValue = windowObject?.localStorage?.getItem(DATA_ENDPOINT_OVERRIDE_KEY); } catch (_) {}
  const endpoint = String(storedValue || '').trim() || metaValue.trim();

  try {
    if (storedValue !== null) windowObject?.localStorage?.removeItem(DATA_ENDPOINT_OVERRIDE_KEY);
  } catch (_) {}
  if (meta) meta.content = '';

  let restored = false;
  return Object.freeze({
    endpoint,
    restore() {
      if (restored) return;
      restored = true;
      try {
        if (storedValue !== null) windowObject?.localStorage?.setItem(DATA_ENDPOINT_OVERRIDE_KEY, storedValue);
      } catch (_) {}
      if (meta) meta.content = metaValue;
    }
  });
}
