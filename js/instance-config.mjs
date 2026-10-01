import { ACTIVE_INSTANCE_ID } from './instance-selection.mjs';

const freeze = (value) => Object.freeze(value);

// INSTANCE_DEFINITION:cal:start
export const CAL_INSTANCE_CONFIG = freeze({
  id: 'cal',
  namespace: 'cgb_v2',

  identity: freeze({
    institutionName: 'University of California, Berkeley',
    schoolName: 'California',
    schoolShortName: 'Cal',
    teamName: 'Golden Bears',
    fanSingular: 'Bear',
    fanPlural: 'Bears',
    productName: 'Cal Golden Bars',
    productShortName: 'CGB'
  }),

  terminology: freeze({
    designatedVenueSingular: 'Cal Bar',
    designatedVenuePlural: 'Cal Bars',
    designatedVenueBadge: 'CAL BAR',
    communityLocationSingular: 'Community Location',
    communityLocationPlural: 'Community Locations',
    communityLocationBadge: 'COMMUNITY LOCATION',
    fanAddedBadge: 'FAN-ADDED',
    watchPartySingular: 'Watch Party',
    watchPartyPlural: 'Watch Parties',
    watchPartyBadge: 'WATCH PARTY'
  }),

  brand: freeze({
    semanticColors: freeze({
      primary: '#002676',
      primaryDark: '#010133',
      primaryLight: '#dce6f1',
      secondary: '#fdb515',
      secondaryDark: '#c88600',
      pageBackground: '#f7f6f2',
      mobileSafeSurface: '#eef4fa',
      loadingBackground: '#06152f',
      socialMuted: '#123f73',
      surface: '#ffffff',
      textOnPrimary: '#ffffff',
      text: '#101626',
      textMuted: '#687280',
      watchPartySurface: '#fff8e6'
    }),
    legacyColors: freeze({
      navy800: '#052b67',
      navy700: '#153f78',
      navy50: '#eef3f8',
      gold500: '#e4a100',
      gold200: '#f8d66e',
      gold100: '#ffedb0',
      ink700: '#354052'
    }),
    assets: freeze({
      mark: 'assets/cgb-mark.svg',
      appIcon: 'assets/cgb-app-icon.svg',
      favicon: 'assets/cgbfavicon.svg',
      loadingFallback: 'assets/cgb-loading-fallback.svg',
      socialCardsDirectory: 'assets/social-cards'
    })
  }),

  geography: freeze({
    defaultMap: freeze({ center: freeze([-98.5795, 39.8283]), zoom: 3.2 })
  }),

  site: freeze({
    canonicalUrl: 'https://calgoldenbars.com/',
    title: 'Cal Golden Bars | Find Cal Bars & Watch Parties',
    description: 'Find Cal Bars, Watch Parties, and fan-added places where Cal fans gather on game day. Explore the map and find your Cal crowd.',
    structuredDescription: 'Find Cal Bars, Watch Parties, and fan-added places where Cal fans gather on game day.',
    contactEmail: 'calbearsquared2025@gmail.com',
    affiliationDisclaimer: 'Not affiliated with Cal Athletics or the California Alumni Association',
    about: freeze({
      heading: 'Cal Golden Bars',
      intro: 'Cal Golden Bars helps Cal fans find each other on game day.',
      communityDescription: 'locations with persistent Cal communities — along with fan-added locations where you may find a fellow Bear watching the game.',
      hostPrompt: 'Own or manage a bar hosting a Cal event?',
      ownerLine: 'Cal Golden Bars is built and maintained by Matthew Putzulu.'
    }),
    privacy: freeze({
      lead: 'Cal Golden Bars works without an account.',
      accountSummary: 'If you create a profile, Firebase handles sign-in. You may use Google, a verified email and password, or a no-email profile stored on this browser. No-email profiles cannot be recovered on another device if browser data is cleared. CGB stores the information needed for your profile, favorites, attendance history, and contributions. Passwords are handled by Firebase and are not stored by CGB.',
      visibilitySummary: 'Your profile and attendance are private by default. If you choose to appear publicly, only the profile and attendance information you choose is shown. Email addresses, internal account IDs, browser IDs, favorites, and private attendance history are not published.',
      analyticsSummary: 'We use a random browser ID to remember <strong>I’ll be here</strong> selections and Google Analytics for site analytics. If you share your device location, it is used for location features and is not stored.',
      saleSummary: 'Private user information is not sold.'
    }),
    support: freeze({
      label: 'Support Cal Golden Bars',
      url: 'https://ko-fi.com/calgoldenbars',
      embedUrl: 'https://ko-fi.com/calgoldenbars/?hidefeed=true&widget=true&embed=true&preview=true'
    }),
    social: freeze({
      xHandle: '@CalBearSquared',
      xUrl: 'https://x.com/calbearsquared'
    })
  }),

  integrations: freeze({
    dataEndpoint: 'https://script.google.com/macros/s/AKfycbx5Y4nfnKe7KyaSQHOEvYqpSVtcG7z6KFf1aAnD1NEvIf5y3Xlj1hHUECudo49V4tGlJw/exec',
    mapTiler: freeze({
      apiKey: 'jNqIsIVa4dP9qv7vQ8fy',
      styleUrl: new URL('../styles/dataviz-with-cgb-states.json', import.meta.url).href,
      detailStyleId: 'dataviz-v4'
    }),
    analytics: freeze({
      measurementId: 'G-CZV3JSBNJK'
    }),
    resources: freeze({
      fallbackSnapshotPath: 'data/fallback-v2.json',
      socialManifestPath: 'assets/social-cards/manifest.json',
      socialShareDirectory: 'share'
    }),
    accounts: freeze({
      enabled: true,
      endpoint: 'https://script.google.com/macros/s/AKfycbyIkoxZAXNp36dEXOw5hKltLA8kgK3_07zg899QdEHJ5HSllkQDE_pY2vqOkMIA2nVL/exec'
    }),
    admin: freeze({
      enabled: true,
      endpoint: 'https://script.google.com/macros/s/AKfycbw7dVee2JaiyyzMV7B1MNUMrF2-le4l10QdM1omT5NKYigwE9IMIvRuQGq-btR7VDnbFw/exec'
    }),
    forms: freeze({
      watchParty: freeze({
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdPF2mVRnIaZtyIwgFB2j9LvrHnl6jENkX6u9_dj1Zew5TTiQ/viewform',
        venueIdEntry: 'entry.1451856849',
        venueNameEntry: 'entry.307282250',
        gameIdEntry: 'entry.1519015315'
      }),
      calBarNomination: freeze({
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdlXsf9M0Rzru8F_0orKqSu-rc4HSY8NxzAUQxMlMSEFkmhTQ/viewform',
        venueIdEntry: 'entry.272269917',
        venueNameEntry: 'entry.2017964730'
      }),
      listingUpdate: freeze({
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScmbHEKu6Rz2zvIJhLp4Gs2gniMrqR1vRazHU-EstWFEy7L-A/viewform',
        venueIdEntry: 'entry.1316297830',
        venueNameEntry: 'entry.1985686020'
      }),
      watchPartyIssue: freeze({
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfmI00iDXigPXuNcadbwA8JZf8B5Lr0cWvXYCZGKu9WCSHEDA/viewform',
        venueNameEntry: 'entry.541323117',
        gameEntry: 'entry.456782239',
        watchPartyIdEntry: 'entry.703629381'
      }),
      fanExperience: freeze({
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScVyKUUXqR8sqEPQLIMeVV1TtxI9EiVmMDd3ib-CvLuBKRajg/viewform',
        venueIdEntry: 'entry.120767699',
        venueNameEntry: 'entry.202050515'
      }),
      photo: freeze({
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSecvY5Pm73oPNRe4viSATCWYeERxwyDGYHwGpvPZHzQ03BmDg/viewform',
        venueIdEntry: 'entry.893543394',
        venueNameEntry: 'entry.1077046729'
      })
    })
  }),

  storage: freeze({
    dataEndpointOverride: 'cgb_v2_public_data_url',
    browserId: 'cgb_v2_browser_id',
    fanIntentSelections: 'cgb_v2_fan_intent_selections',
    mapCamera: 'cgb_v2_map_camera',
    lastGoodSnapshot: 'cgb_v2_last_good_snapshot',
    postgameExperience: 'cgb_v2_postgame_experience_v1'
  }),

  analytics: freeze({
    scriptElementId: 'cgb-google-analytics',
    initializedFlag: '__CGB_GA_INITIALIZED__',
    flowInitializedFlag: '__CGB_GA_FLOW_INITIALIZED__'
  }),

  schedule: freeze({
    homeTimeZone: 'America/Los_Angeles'
  }),

  copy: freeze({
    findCrowd: 'Find your Cal crowd'
  }),

  social: freeze({
    brandLabel: 'CAL GOLDEN BARS',
    description: 'Find your Cal crowd. Join a nearby Watch Party, or plan one of your own.',
    headline: 'Find your Cal crowd.',
    support: 'Join a nearby Watch Party, or plan one of your own.'
  })
});
// INSTANCE_DEFINITION:cal:end

// INSTANCE_DEFINITION:test:start
export const TEST_INSTANCE_CONFIG = freeze({
  id: 'test',
  namespace: 'test_fox_bars_v1',

  identity: freeze({
    institutionName: 'Test University',
    schoolName: 'Test University',
    schoolShortName: 'Test U',
    teamName: 'Test Foxes',
    fanSingular: 'Fox',
    fanPlural: 'Foxes',
    productName: 'Test Fox Bars',
    productShortName: 'TFB'
  }),

  terminology: freeze({
    designatedVenueSingular: 'Fox Den',
    designatedVenuePlural: 'Fox Dens',
    designatedVenueBadge: 'FOX DEN',
    communityLocationSingular: 'Community Location',
    communityLocationPlural: 'Community Locations',
    communityLocationBadge: 'COMMUNITY LOCATION',
    fanAddedBadge: 'FAN-ADDED',
    watchPartySingular: 'Watch Party',
    watchPartyPlural: 'Watch Parties',
    watchPartyBadge: 'WATCH PARTY'
  }),

  brand: freeze({
    semanticColors: freeze({
      primary: '#6b1d3a',
      primaryDark: '#32101f',
      primaryLight: '#f3dce5',
      secondary: '#2bb3a3',
      secondaryDark: '#17776d',
      pageBackground: '#fbf7f2',
      mobileSafeSurface: '#f2ebe5',
      loadingBackground: '#24131b',
      socialMuted: '#754458',
      surface: '#ffffff',
      textOnPrimary: '#ffffff',
      text: '#21151a',
      textMuted: '#76656d',
      watchPartySurface: '#edf9f7'
    }),
    legacyColors: freeze({
      navy800: '#552039',
      navy700: '#7a3150',
      navy50: '#f8eef2',
      gold500: '#25998c',
      gold200: '#8ddbd1',
      gold100: '#c8eee9',
      ink700: '#4f3b44'
    }),
    assets: freeze({
      mark: 'assets/test-fox-mark.svg',
      appIcon: 'assets/test-fox-mark.svg',
      favicon: 'assets/test-fox-mark.svg',
      loadingFallback: 'assets/test-fox-mark.svg',
      socialCardsDirectory: 'assets/social-cards'
    })
  }),

  geography: freeze({
    label: 'Test City, TS',
    defaultMap: freeze({ center: freeze([-105.012, 39.742]), zoom: 9.1 })
  }),

  site: freeze({
    canonicalUrl: 'https://test-school.invalid/',
    title: 'Test Fox Bars | Find Fox Dens & Watch Parties',
    description: 'Find Fox Dens, Watch Parties, and fan-added places where Test U fans gather on game day.',
    structuredDescription: 'Find Fox Dens, Watch Parties, and fan-added places where Test U fans gather on game day.',
    contactEmail: '',
    affiliationDisclaimer: 'Fictional local portability fixture — not a real school or public service',
    about: freeze({
      heading: 'Test Fox Bars',
      intro: 'Test Fox Bars helps Test U fans of the Test Foxes find each other on game day.',
      communityDescription: 'locations with persistent Test U communities — along with fan-added locations where you may find a fellow Fox watching the game.',
      hostPrompt: 'Own or manage a bar hosting a Test U event?',
      ownerLine: 'Fictional Test University portability fixture.'
    }),
    privacy: freeze({
      lead: 'Test Fox Bars is a fictional portability fixture and works without an account.',
      accountSummary: 'Account services are disabled for this fictional Test instance. No real profile, sign-in, favorites, attendance history, or contribution data is collected by this fixture.',
      visibilitySummary: 'The Test instance uses synthetic public profile and attendance examples only; it does not publish real user identities or account information.',
      analyticsSummary: 'Production analytics and write integrations are disabled for this fictional Test instance. If device location is shared, it is used only for local location features and is not stored.',
      saleSummary: 'This fictional Test fixture uses synthetic data and does not sell private user information.'
    }),
    support: freeze({
      label: 'Support disabled for Test University',
      url: 'https://test-school.invalid/support',
      embedUrl: ''
    }),
    social: freeze({
      xHandle: '@TestFoxBars',
      xUrl: 'https://test-school.invalid/social'
    })
  }),

  integrations: freeze({
    dataEndpoint: '',
    mapTiler: freeze({
      apiKey: 'jNqIsIVa4dP9qv7vQ8fy',
      styleUrl: new URL('../styles/dataviz-with-cgb-states.json', import.meta.url).href,
      detailStyleId: 'dataviz-v4'
    }),
    analytics: freeze({
      measurementId: ''
    }),
    resources: freeze({
      fallbackSnapshotPath: 'data/test-instance-fallback.synthetic.json',
      socialManifestPath: '',
      socialShareDirectory: ''
    }),
    accounts: freeze({
      enabled: false,
      endpoint: ''
    }),
    admin: freeze({
      enabled: false,
      endpoint: ''
    }),
    forms: freeze({
      watchParty: freeze({
        formUrl: '',
        venueIdEntry: '',
        venueNameEntry: '',
        gameIdEntry: ''
      }),
      calBarNomination: freeze({
        formUrl: '',
        venueIdEntry: '',
        venueNameEntry: ''
      }),
      listingUpdate: freeze({
        formUrl: '',
        venueIdEntry: '',
        venueNameEntry: ''
      }),
      watchPartyIssue: freeze({
        formUrl: '',
        venueNameEntry: '',
        gameEntry: '',
        watchPartyIdEntry: ''
      }),
      fanExperience: freeze({
        formUrl: '',
        venueIdEntry: '',
        venueNameEntry: ''
      }),
      photo: freeze({
        formUrl: '',
        venueIdEntry: '',
        venueNameEntry: ''
      })
    })
  }),

  storage: freeze({
    dataEndpointOverride: 'test_fox_bars_public_data_url',
    browserId: 'test_fox_bars_browser_id',
    fanIntentSelections: 'test_fox_bars_fan_intent_selections',
    mapCamera: 'test_fox_bars_map_camera',
    lastGoodSnapshot: 'test_fox_bars_last_good_snapshot',
    postgameExperience: 'test_fox_bars_postgame_experience_v1'
  }),

  analytics: freeze({
    scriptElementId: 'test-fox-bars-google-analytics',
    initializedFlag: '__TEST_FOX_BARS_GA_INITIALIZED__',
    flowInitializedFlag: '__TEST_FOX_BARS_GA_FLOW_INITIALIZED__'
  }),

  schedule: freeze({
    homeTimeZone: 'America/Denver'
  }),

  copy: freeze({
    findCrowd: 'Find your Fox crowd'
  }),

  social: freeze({
    brandLabel: 'TEST FOX BARS',
    description: 'Find your Fox crowd. Join a nearby Watch Party, or plan one of your own.',
    headline: 'Find your Fox crowd.',
    support: 'Join a nearby Watch Party, or plan one of your own.'
  })
});
// INSTANCE_DEFINITION:test:end

const REQUIRED_NON_EMPTY_STRING_PATHS = freeze([
  'id',
  'namespace',
  'identity.institutionName',
  'identity.schoolName',
  'identity.schoolShortName',
  'identity.teamName',
  'identity.fanSingular',
  'identity.fanPlural',
  'identity.productName',
  'identity.productShortName',
  'terminology.designatedVenueSingular',
  'terminology.designatedVenuePlural',
  'terminology.designatedVenueBadge',
  'terminology.communityLocationSingular',
  'terminology.communityLocationPlural',
  'terminology.communityLocationBadge',
  'terminology.fanAddedBadge',
  'terminology.watchPartySingular',
  'terminology.watchPartyPlural',
  'terminology.watchPartyBadge',
  'brand.assets.mark',
  'brand.assets.appIcon',
  'brand.assets.favicon',
  'brand.assets.loadingFallback',
  'brand.assets.socialCardsDirectory',
  'site.canonicalUrl',
  'site.title',
  'site.description',
  'site.structuredDescription',
  'site.affiliationDisclaimer',
  'site.about.heading',
  'site.about.intro',
  'site.about.communityDescription',
  'site.about.hostPrompt',
  'site.about.ownerLine',
  'site.privacy.lead',
  'site.privacy.accountSummary',
  'site.privacy.visibilitySummary',
  'site.privacy.analyticsSummary',
  'site.privacy.saleSummary',
  'site.support.label',
  'site.support.url',
  'site.social.xHandle',
  'site.social.xUrl',
  'integrations.mapTiler.apiKey',
  'integrations.mapTiler.styleUrl',
  'integrations.mapTiler.detailStyleId',
  'integrations.resources.fallbackSnapshotPath',
  'storage.dataEndpointOverride',
  'storage.browserId',
  'storage.fanIntentSelections',
  'storage.mapCamera',
  'storage.lastGoodSnapshot',
  'storage.postgameExperience',
  'analytics.scriptElementId',
  'analytics.initializedFlag',
  'analytics.flowInitializedFlag',
  'schedule.homeTimeZone',
  'copy.findCrowd',
  'social.brandLabel',
  'social.description',
  'social.headline',
  'social.support'
]);

const REQUIRED_STRING_PATHS = freeze([
  'site.contactEmail',
  'site.support.embedUrl',
  'integrations.dataEndpoint',
  'integrations.analytics.measurementId',
  'integrations.resources.socialManifestPath',
  'integrations.resources.socialShareDirectory',
  'integrations.accounts.endpoint',
  'integrations.admin.endpoint'
]);

const SEMANTIC_COLOR_KEYS = freeze([
  'primary',
  'primaryDark',
  'primaryLight',
  'secondary',
  'secondaryDark',
  'pageBackground',
  'mobileSafeSurface',
  'loadingBackground',
  'socialMuted',
  'surface',
  'textOnPrimary',
  'text',
  'textMuted',
  'watchPartySurface'
]);

const LEGACY_COLOR_KEYS = freeze([
  'navy800',
  'navy700',
  'navy50',
  'gold500',
  'gold200',
  'gold100',
  'ink700'
]);

const REQUIRED_COLOR_PATHS = freeze([
  ...SEMANTIC_COLOR_KEYS.map((key) => `brand.semanticColors.${key}`),
  ...LEGACY_COLOR_KEYS.map((key) => `brand.legacyColors.${key}`)
]);

const FORM_FIELDS = freeze({
  watchParty: freeze(['formUrl', 'venueIdEntry', 'venueNameEntry', 'gameIdEntry']),
  calBarNomination: freeze(['formUrl', 'venueIdEntry', 'venueNameEntry']),
  listingUpdate: freeze(['formUrl', 'venueIdEntry', 'venueNameEntry']),
  watchPartyIssue: freeze(['formUrl', 'venueNameEntry', 'gameEntry', 'watchPartyIdEntry']),
  fanExperience: freeze(['formUrl', 'venueIdEntry', 'venueNameEntry']),
  photo: freeze(['formUrl', 'venueIdEntry', 'venueNameEntry'])
});

function ownPathValue(object, path) {
  let value = object;
  for (const key of String(path).split('.')) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) {
      return { exists: false, value: undefined };
    }
    value = value[key];
  }
  return { exists: true, value };
}

function requireString(config, path, { allowEmpty = false } = {}) {
  const result = ownPathValue(config, path);
  if (!result.exists || typeof result.value !== 'string' || (!allowEmpty && !result.value.trim())) {
    throw new Error(`Invalid school-instance config "${String(config?.id || '<unknown>')}": ${path} must be ${allowEmpty ? 'an explicit string' : 'a non-empty string'}.`);
  }
}

export function validateInstanceConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid school-instance config: expected an object.');
  }

  for (const path of REQUIRED_NON_EMPTY_STRING_PATHS) requireString(config, path);
  for (const path of REQUIRED_STRING_PATHS) requireString(config, path, { allowEmpty: true });

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(config.id)) {
    throw new Error(`Invalid school-instance config "${config.id}": id must use lowercase letters, numbers, underscores, or hyphens.`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(config.namespace)) {
    throw new Error(`Invalid school-instance config "${config.id}": namespace contains unsupported characters.`);
  }

  try {
    const canonicalUrl = new URL(config.site.canonicalUrl);
    if (canonicalUrl.protocol !== 'https:') throw new Error('not https');
  } catch {
    throw new Error(`Invalid school-instance config "${config.id}": site.canonicalUrl must be an absolute HTTPS URL.`);
  }

  for (const path of REQUIRED_COLOR_PATHS) {
    requireString(config, path);
    if (!/^#[0-9a-f]{6}$/i.test(ownPathValue(config, path).value)) {
      throw new Error(`Invalid school-instance config "${config.id}": ${path} must be a six-digit hex color.`);
    }
  }

  const center = ownPathValue(config, 'geography.defaultMap.center');
  const zoom = ownPathValue(config, 'geography.defaultMap.zoom');
  if (!center.exists || !Array.isArray(center.value) || center.value.length !== 2 ||
      !center.value.every((coordinate) => Number.isFinite(coordinate))) {
    throw new Error(`Invalid school-instance config "${config.id}": geography.defaultMap.center must contain two finite coordinates.`);
  }
  if (!zoom.exists || !Number.isFinite(zoom.value)) {
    throw new Error(`Invalid school-instance config "${config.id}": geography.defaultMap.zoom must be finite.`);
  }

  for (const [formName, fields] of Object.entries(FORM_FIELDS)) {
    const values = fields.map((field) => {
      const path = `integrations.forms.${formName}.${field}`;
      requireString(config, path, { allowEmpty: true });
      return ownPathValue(config, path).value.trim();
    });
    const configuredCount = values.filter(Boolean).length;
    if (configuredCount !== 0 && configuredCount !== fields.length) {
      throw new Error(`Invalid school-instance config "${config.id}": integrations.forms.${formName} must be fully configured or fully disabled.`);
    }
  }

  const publicDataEndpoint = config.integrations.dataEndpoint.trim();
  if (publicDataEndpoint) {
    try {
      const url = new URL(publicDataEndpoint);
      if (url.protocol !== 'https:') throw new Error('not https');
    } catch {
      throw new Error(`Invalid school-instance config "${config.id}": integrations.dataEndpoint must be empty or an absolute HTTPS URL.`);
    }
  }

  const measurementId = config.integrations.analytics.measurementId.trim();
  if (measurementId && !/^G-[A-Z0-9]+$/i.test(measurementId)) {
    throw new Error(`Invalid school-instance config "${config.id}": integrations.analytics.measurementId must be empty or a Google Analytics measurement ID.`);
  }

  const fallbackPath = config.integrations.resources.fallbackSnapshotPath.trim();
  if (fallbackPath.startsWith('/') || fallbackPath.includes('..') || /^https?:/i.test(fallbackPath)) {
    throw new Error(`Invalid school-instance config "${config.id}": integrations.resources.fallbackSnapshotPath must be a repository-relative path.`);
  }

  const socialManifestPath = config.integrations.resources.socialManifestPath.trim();
  const socialShareDirectory = config.integrations.resources.socialShareDirectory.trim();
  if (Boolean(socialManifestPath) !== Boolean(socialShareDirectory)) {
    throw new Error(`Invalid school-instance config "${config.id}": social manifest and share resources must be configured together or disabled together.`);
  }
  for (const [name, value] of [
    ['integrations.resources.socialManifestPath', socialManifestPath],
    ['integrations.resources.socialShareDirectory', socialShareDirectory]
  ]) {
    if (value && (value.startsWith('/') || value.includes('..') || /^https?:/i.test(value))) {
      throw new Error(`Invalid school-instance config "${config.id}": ${name} must be a repository-relative path.`);
    }
  }

  for (const integrationName of ['accounts', 'admin']) {
    const enabledPath = `integrations.${integrationName}.enabled`;
    const endpointPath = `integrations.${integrationName}.endpoint`;
    const enabled = ownPathValue(config, enabledPath);
    const endpoint = ownPathValue(config, endpointPath);
    if (!enabled.exists || typeof enabled.value !== 'boolean') {
      throw new Error(`Invalid school-instance config "${config.id}": ${enabledPath} must be an explicit boolean.`);
    }
    const endpointValue = typeof endpoint.value === 'string' ? endpoint.value.trim() : '';
    if (enabled.value && !endpointValue) {
      throw new Error(`Invalid school-instance config "${config.id}": ${endpointPath} is required when ${integrationName} is enabled.`);
    }
    if (!enabled.value && endpointValue) {
      throw new Error(`Invalid school-instance config "${config.id}": disabled ${integrationName} must not retain an endpoint.`);
    }
    if (endpointValue) {
      try {
        const url = new URL(endpointValue);
        if (url.protocol !== 'https:') throw new Error('not https');
      } catch {
        throw new Error(`Invalid school-instance config "${config.id}": ${endpointPath} must be an absolute HTTPS URL.`);
      }
    }
  }

  const storageValues = Object.values(config.storage);
  if (new Set(storageValues).size !== storageValues.length) {
    throw new Error(`Invalid school-instance config "${config.id}": browser-storage keys must be unique within the instance.`);
  }

  return config;
}

const validatedConfigs = [CAL_INSTANCE_CONFIG, TEST_INSTANCE_CONFIG].map(validateInstanceConfig);

export const INSTANCE_CONFIGS = freeze(Object.fromEntries(
  validatedConfigs.map((config) => [config.id, config])
));

export const INSTANCE_IDS = freeze(Object.keys(INSTANCE_CONFIGS));

export function resolveInstanceConfig(id) {
  const normalized = typeof id === 'string' ? id.trim() : '';
  if (!normalized) {
    throw new Error(`School instance id is required. Supported instances: ${INSTANCE_IDS.join(', ')}.`);
  }
  const config = INSTANCE_CONFIGS[normalized];
  if (!config) {
    throw new Error(`Unknown school instance id "${normalized}". Supported instances: ${INSTANCE_IDS.join(', ')}.`);
  }
  return config;
}

export const ACTIVE_INSTANCE_CONFIG = resolveInstanceConfig(ACTIVE_INSTANCE_ID);
