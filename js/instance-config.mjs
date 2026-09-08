const freeze = (value) => Object.freeze(value);

const emptyForm = (extra = {}) => freeze({
  formUrl: '',
  venueIdEntry: '',
  venueNameEntry: '',
  ...extra
});

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
    communityLocationSingular: 'Community Spot',
    communityLocationPlural: 'Community Spots',
    communityLocationBadge: 'COMMUNITY SPOT',
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
    social: freeze({
      xHandle: '@TestFoxBars',
      xUrl: 'https://test-school.invalid/social'
    })
  }),

  integrations: freeze({
    dataEndpoint: '',
    mapTiler: freeze({
      apiKey: CAL_INSTANCE_CONFIG.integrations.mapTiler.apiKey,
      styleUrl: new URL('../styles/dataviz-test-instance.json', import.meta.url).href,
      detailStyleId: CAL_INSTANCE_CONFIG.integrations.mapTiler.detailStyleId
    }),
    analytics: freeze({
      measurementId: ''
    }),
    forms: freeze({
      watchParty: emptyForm({ gameIdEntry: '' }),
      calBarNomination: emptyForm(),
      listingUpdate: emptyForm(),
      watchPartyIssue: freeze({ formUrl: '', venueNameEntry: '', gameEntry: '', watchPartyIdEntry: '' }),
      fanExperience: emptyForm(),
      photo: emptyForm()
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

export function resolveInstanceConfig(id) {
  if (id === CAL_INSTANCE_CONFIG.id) return CAL_INSTANCE_CONFIG;
  if (id === TEST_INSTANCE_CONFIG.id) return TEST_INSTANCE_CONFIG;
  throw new Error(`Unknown instance id: ${String(id)}`);
}

// Production is intentionally hard-wired to Cal. The fictional fixture is selected
// only by scripts/materialize-instance.mjs inside a disposable local output tree.
export const ACTIVE_INSTANCE_CONFIG = CAL_INSTANCE_CONFIG;
