import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { ACTIVE_INSTANCE_CONFIG, CAL_INSTANCE_CONFIG } from '../js/instance-config.mjs';
import {
  CONFIG_META_NAMES,
  DATA_ENDPOINT_OVERRIDE_STORAGE_KEY,
  readMetaContentFromHtml,
  readRuntimeConfig
} from '../js/config.mjs';
import {
  bearCountCopy,
  gameTitle,
  historyCountCopy,
  TRAY_GUIDANCE_COPY,
  venueBadgeDescriptors,
  venueTypeLabel
} from '../js/core.mjs';
import {
  BROWSER_ID_STORAGE_KEY,
  INTENT_SELECTIONS_STORAGE_KEY,
  compactListFanCountCopy,
  detailPresenceCopy
} from '../js/fan-intent-core.mjs';
import { POSTGAME_EXPERIENCE_STORAGE_KEY } from '../js/postgame-experience-prompt.mjs';
import { seasonActivityCopy, venueActivityPresentation } from '../js/venue-activity-core.mjs';
import { GA_MEASUREMENT_ID } from '../js/analytics.mjs';
import { buildSharePage } from '../scripts/generate-social-cards.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const index = await read('index.html');
const designSystem = await read('css/design-system.css');
const mapMobileRefinement = await read('js/map-mobile-refinement.mjs');
const socialManifest = JSON.parse(await read('assets/social-cards/manifest.json'));

function htmlMeta(name) {
  return readMetaContentFromHtml(index, name);
}

function cssToken(name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return designSystem.match(new RegExp(`${escaped}\\s*:\\s*(#[0-9a-f]{6})\\s*;`, 'i'))?.[1]?.toLowerCase() || '';
}

test('Cal is the only active production instance and resolves the current identity and terminology', () => {
  assert.equal(ACTIVE_INSTANCE_CONFIG, CAL_INSTANCE_CONFIG);
  assert.equal(ACTIVE_INSTANCE_CONFIG.id, 'cal');
  assert.equal(ACTIVE_INSTANCE_CONFIG.identity.productName, 'Cal Golden Bars');
  assert.equal(ACTIVE_INSTANCE_CONFIG.identity.productShortName, 'CGB');
  assert.equal(ACTIVE_INSTANCE_CONFIG.identity.schoolShortName, 'Cal');
  assert.equal(ACTIVE_INSTANCE_CONFIG.identity.fanSingular, 'Bear');
  assert.equal(ACTIVE_INSTANCE_CONFIG.identity.fanPlural, 'Bears');
  assert.equal(ACTIVE_INSTANCE_CONFIG.terminology.designatedVenueSingular, 'Cal Bar');
  assert.equal(ACTIVE_INSTANCE_CONFIG.terminology.watchPartySingular, 'Watch Party');
});

test('current production site, endpoint, MapTiler, analytics, geography, and Form defaults are unchanged', () => {
  const config = readRuntimeConfig({ documentObject: undefined, windowObject: undefined });
  assert.equal(config.canonicalSiteUrl, 'https://calgoldenbars.com/');
  assert.equal(config.dataEndpoint, 'https://script.google.com/macros/s/AKfycbx5Y4nfnKe7KyaSQHOEvYqpSVtcG7z6KFf1aAnD1NEvIf5y3Xlj1hHUECudo49V4tGlJw/exec');
  assert.equal(config.analyticsMeasurementId, 'G-CZV3JSBNJK');
  assert.equal(GA_MEASUREMENT_ID, 'G-CZV3JSBNJK');
  assert.equal(config.mapTiler.apiKey, 'jNqIsIVa4dP9qv7vQ8fy');
  assert.match(config.mapTiler.styleUrl, /styles\/dataviz-with-cgb-states\.json$/);
  assert.equal(config.mapTiler.detailStyleId, 'dataviz-v4');
  assert.deepEqual(config.defaultGeography, { center: [-98.5795, 39.8283], zoom: 3.2 });

  assert.deepEqual(config.forms.watchParty, {
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdPF2mVRnIaZtyIwgFB2j9LvrHnl6jENkX6u9_dj1Zew5TTiQ/viewform',
    venueIdEntry: 'entry.1451856849',
    venueNameEntry: 'entry.307282250',
    gameIdEntry: 'entry.1519015315'
  });
  assert.equal(config.forms.calBarNomination.formUrl, 'https://docs.google.com/forms/d/e/1FAIpQLSdlXsf9M0Rzru8F_0orKqSu-rc4HSY8NxzAUQxMlMSEFkmhTQ/viewform');
  assert.equal(config.forms.listingUpdate.formUrl, 'https://docs.google.com/forms/d/e/1FAIpQLScmbHEKu6Rz2zvIJhLp4Gs2gniMrqR1vRazHU-EstWFEy7L-A/viewform');
  assert.equal(config.forms.watchPartyIssue.formUrl, 'https://docs.google.com/forms/d/e/1FAIpQLSfmI00iDXigPXuNcadbwA8JZf8B5Lr0cWvXYCZGKu9WCSHEDA/viewform');
  assert.equal(config.forms.fanExperience.formUrl, 'https://docs.google.com/forms/d/e/1FAIpQLScVyKUUXqR8sqEPQLIMeVV1TtxI9EiVmMDd3ib-CvLuBKRajg/viewform');
  assert.equal(config.forms.photo.formUrl, 'https://docs.google.com/forms/d/e/1FAIpQLSecvY5Pm73oPNRe4viSATCWYeERxwyDGYHwGpvPZHzQ03BmDg/viewform');
});

test('current HTML deployment overrides remain equivalent to the Cal instance defaults', () => {
  assert.equal(htmlMeta(CONFIG_META_NAMES.dataEndpoint), ACTIVE_INSTANCE_CONFIG.integrations.dataEndpoint);
  assert.equal(htmlMeta(CONFIG_META_NAMES.watchPartyFormUrl), ACTIVE_INSTANCE_CONFIG.integrations.forms.watchParty.formUrl);
  assert.equal(htmlMeta(CONFIG_META_NAMES.watchPartyVenueIdEntry), ACTIVE_INSTANCE_CONFIG.integrations.forms.watchParty.venueIdEntry);
  assert.equal(htmlMeta(CONFIG_META_NAMES.watchPartyVenueNameEntry), ACTIVE_INSTANCE_CONFIG.integrations.forms.watchParty.venueNameEntry);
  assert.equal(htmlMeta(CONFIG_META_NAMES.watchPartyGameIdEntry), ACTIVE_INSTANCE_CONFIG.integrations.forms.watchParty.gameIdEntry);
  assert.equal(htmlMeta(CONFIG_META_NAMES.calBarNominationFormUrl), ACTIVE_INSTANCE_CONFIG.integrations.forms.calBarNomination.formUrl);
  assert.equal(htmlMeta(CONFIG_META_NAMES.listingUpdateFormUrl), ACTIVE_INSTANCE_CONFIG.integrations.forms.listingUpdate.formUrl);
  assert.equal(htmlMeta(CONFIG_META_NAMES.watchPartyIssueFormUrl), ACTIVE_INSTANCE_CONFIG.integrations.forms.watchPartyIssue.formUrl);
});

test('production storage keys and analytics runtime namespace are preserved', () => {
  assert.equal(DATA_ENDPOINT_OVERRIDE_STORAGE_KEY, 'cgb_v2_public_data_url');
  assert.equal(BROWSER_ID_STORAGE_KEY, 'cgb_v2_browser_id');
  assert.equal(INTENT_SELECTIONS_STORAGE_KEY, 'cgb_v2_fan_intent_selections');
  assert.equal(POSTGAME_EXPERIENCE_STORAGE_KEY, 'cgb_v2_postgame_experience_v1');
  assert.equal(ACTIVE_INSTANCE_CONFIG.storage.mapCamera, 'cgb_v2_map_camera');
  assert.match(mapMobileRefinement, /const MAP_CAMERA_STORAGE_KEY = 'cgb_v2_map_camera';/);
  assert.deepEqual(ACTIVE_INSTANCE_CONFIG.analytics, {
    scriptElementId: 'cgb-google-analytics',
    initializedFlag: '__CGB_GA_INITIALIZED__',
    flowInitializedFlag: '__CGB_GA_FLOW_INITIALIZED__'
  });
});

test('current Cal terminology helpers render byte-for-byte equivalent copy', () => {
  assert.equal(gameTitle(null), 'Cal football');
  assert.equal(TRAY_GUIDANCE_COPY, 'Explore Watch Parties, Cal Bars, and places where other Bears are planning to watch.');
  assert.equal(venueTypeLabel({ venue_type: 'cal_bar' }), 'CAL BAR');
  assert.equal(venueTypeLabel({ venue_type: 'community_location' }), 'COMMUNITY LOCATION');
  assert.deepEqual(venueBadgeDescriptors({ venue_type: 'cal_bar' }, {}), [
    { text: 'WATCH PARTY', kind: 'party' },
    { text: 'CAL BAR', kind: 'cal' }
  ]);
  assert.equal(bearCountCopy(1), '1 Bear attending on Cal Golden Bars');
  assert.equal(bearCountCopy(2), '2 Bears attending on Cal Golden Bars');
  assert.equal(historyCountCopy(5), 'Bears have watched 5 Cal games here.');
  assert.equal(compactListFanCountCopy(2), '2 Bears on CGB');
  assert.equal(detailPresenceCopy(1), 'You’re the first Bear on CGB.');
  assert.equal(seasonActivityCopy(2), '2 Bears watched Cal games here this season.');
  assert.deepEqual(venueActivityPresentation({ game: { season: 2026, game_status: 'completed' }, venue: { venue_id: 'venue_1' }, snapshot: { venueSeasonCounts: [] } }), {
    primary: 'No Cal-game activity is recorded here for this season.',
    secondary: []
  });
});

test('Cal semantic brand colors remain exactly materialized in the canonical design system', () => {
  const expected = new Map([
    ['--brand-primary', 'primary'],
    ['--brand-primary-dark', 'primaryDark'],
    ['--brand-primary-light', 'primaryLight'],
    ['--brand-secondary', 'secondary'],
    ['--brand-secondary-dark', 'secondaryDark'],
    ['--brand-page-background', 'pageBackground'],
    ['--brand-mobile-safe-surface', 'mobileSafeSurface'],
    ['--brand-loading-background', 'loadingBackground'],
    ['--brand-social-muted', 'socialMuted'],
    ['--brand-surface', 'surface'],
    ['--brand-text-on-primary', 'textOnPrimary'],
    ['--brand-text', 'text'],
    ['--brand-text-muted', 'textMuted'],
    ['--brand-watch-party-surface', 'watchPartySurface']
  ]);
  for (const [token, configKey] of expected) {
    assert.equal(cssToken(token), ACTIVE_INSTANCE_CONFIG.brand.semanticColors[configKey]);
  }
});

test('static first-paint identity and assets remain the Cal materialization', () => {
  assert.match(index, /<title>Cal Golden Bars \| Find Cal Bars &amp; Watch Parties<\/title>/);
  assert.match(index, /<link rel="canonical" href="https:\/\/calgoldenbars\.com\/">/);
  assert.match(index, /src="assets\/cgb-mark\.svg"/);
  assert.match(index, /href="assets\/cgbfavicon\.svg"/);
  assert.match(index, /<span class="brand-name">CAL GOLDEN BARS<\/span>/);
  assert.match(index, /Not affiliated with Cal Athletics or the California Alumni Association/);
  assert.match(index, /@CalBearSquared/);
});

test('social share-page generation remains equivalent to the checked-in Cal output', async () => {
  const entry = socialManifest.games.find((game) => game.slug === socialManifest.default_game_slug);
  assert.ok(entry);
  const origin = ACTIVE_INSTANCE_CONFIG.site.canonicalUrl.replace(/\/$/, '');
  const model = {
    gameId: entry.game_id,
    slug: entry.slug,
    title: entry.title,
    locationCount: entry.locations_mapped,
    watchPartyCount: entry.watch_parties,
    shareUrl: `${origin}/share/${entry.slug}/`,
    imageUrl: `${origin}/${entry.image}`,
    metadataTitle: `${ACTIVE_INSTANCE_CONFIG.identity.productName} · ${entry.title}`,
    metadataDescription: `${entry.locations_mapped} locations mapped · ${entry.watch_parties} Watch ${entry.watch_parties === 1 ? 'Party' : 'Parties'}. ${ACTIVE_INSTANCE_CONFIG.copy.findCrowd}.`
  };
  assert.equal(buildSharePage(model), await read(entry.page));
});

test('instance configuration contains no private workbook, contact-submission, or browser-identity values', () => {
  const serialized = JSON.stringify(ACTIVE_INSTANCE_CONFIG);
  assert.doesNotMatch(serialized, /spreadsheet[_-]?id|workbook[_-]?(id|url)|submitter[_-]?(name|email)|browser_[A-Za-z0-9_-]{16,}/i);
});
