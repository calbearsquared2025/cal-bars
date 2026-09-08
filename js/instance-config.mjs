const freeze = (value) => Object.freeze(value);

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

// This milestone intentionally exposes one active production instance only.
// Selecting or generating another instance is a later productization step.
export const ACTIVE_INSTANCE_CONFIG = CAL_INSTANCE_CONFIG;
