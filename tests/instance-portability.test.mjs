import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ACTIVE_INSTANCE_CONFIG,
  CAL_INSTANCE_CONFIG,
  TEST_INSTANCE_CONFIG,
  resolveInstanceConfig
} from '../js/instance-config.mjs';
import { CONFIG_META_NAMES, readMetaContentFromHtml } from '../js/config.mjs';
import { materializeTestInstance } from '../scripts/materialize-instance.mjs';

const repositoryRoot = new URL('../', import.meta.url);
const buildPath = new URL('../.instance-build/portability-test/', import.meta.url);
const buildFsPath = decodeURIComponent(buildPath.pathname);

const readRoot = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readBuild = (path) => readFile(new URL(path, buildPath), 'utf8');

function allBrandColors(config) {
  return [
    ...Object.values(config.brand.semanticColors),
    ...Object.values(config.brand.legacyColors)
  ].map((value) => value.toLowerCase());
}

test('production remains hard-wired to the Cal instance', () => {
  assert.equal(ACTIVE_INSTANCE_CONFIG, CAL_INSTANCE_CONFIG);
  assert.equal(resolveInstanceConfig('cal'), CAL_INSTANCE_CONFIG);
  assert.equal(CAL_INSTANCE_CONFIG.site.canonicalUrl, 'https://calgoldenbars.com/');
  assert.equal(CAL_INSTANCE_CONFIG.storage.browserId, 'cgb_v2_browser_id');
  assert.equal(CAL_INSTANCE_CONFIG.storage.fanIntentSelections, 'cgb_v2_fan_intent_selections');
  assert.equal(CAL_INSTANCE_CONFIG.storage.lastGoodSnapshot, 'cgb_v2_last_good_snapshot');
  assert.deepEqual(CAL_INSTANCE_CONFIG.geography.defaultMap, { center: [-98.5795, 39.8283], zoom: 3.2 });
});

test('fictional fixture materially differs from Cal without a real-school identity', () => {
  const testInstance = resolveInstanceConfig('test');
  assert.equal(testInstance, TEST_INSTANCE_CONFIG);
  assert.equal(testInstance.id, 'test');
  assert.equal(testInstance.identity.institutionName, 'Test University');
  assert.equal(testInstance.identity.schoolShortName, 'Test U');
  assert.equal(testInstance.identity.teamName, 'Test Foxes');
  assert.equal(testInstance.identity.fanSingular, 'Fox');
  assert.equal(testInstance.identity.fanPlural, 'Foxes');
  assert.equal(testInstance.identity.productName, 'Test Fox Bars');
  assert.equal(testInstance.terminology.designatedVenueSingular, 'Fox Den');
  assert.equal(testInstance.site.canonicalUrl, 'https://test-school.invalid/');
  assert.notDeepEqual(testInstance.geography.defaultMap, CAL_INSTANCE_CONFIG.geography.defaultMap);
  assert.notEqual(testInstance.schedule.homeTimeZone, CAL_INSTANCE_CONFIG.schedule.homeTimeZone);
  assert.notEqual(testInstance.brand.semanticColors.primary, CAL_INSTANCE_CONFIG.brand.semanticColors.primary);
  assert.notEqual(testInstance.brand.semanticColors.secondary, CAL_INSTANCE_CONFIG.brand.semanticColors.secondary);
});

test('fictional fixture cannot use Cal production writes, Forms, analytics, or storage', () => {
  assert.equal(TEST_INSTANCE_CONFIG.integrations.dataEndpoint, '');
  assert.equal(TEST_INSTANCE_CONFIG.integrations.analytics.measurementId, '');
  for (const form of Object.values(TEST_INSTANCE_CONFIG.integrations.forms)) {
    assert.equal(form.formUrl, '');
  }
  for (const [key, testValue] of Object.entries(TEST_INSTANCE_CONFIG.storage)) {
    assert.notEqual(testValue, CAL_INSTANCE_CONFIG.storage[key], `storage key ${key} must be isolated`);
    assert.match(testValue, /^test_fox_bars_/);
  }
});

test('materializer refuses to overwrite the repository root', async () => {
  await assert.rejects(
    materializeTestInstance({ outputPath: decodeURIComponent(repositoryRoot.pathname) }),
    /Refusing output outside/
  );
});

test('fictional instance materializes into a disposable coherent local output', async (t) => {
  await rm(buildFsPath, { recursive: true, force: true });
  t.after(async () => rm(buildFsPath, { recursive: true, force: true }));
  await materializeTestInstance({ outputPath: buildFsPath });

  const [rootIndex, index, designSystem, fallback, materializedConfigSource] = await Promise.all([
    readRoot('index.html'),
    readBuild('index.html'),
    readBuild('css/design-system.css'),
    readBuild('data/fallback-v2.json'),
    readBuild('js/instance-config.mjs')
  ]);

  assert.match(rootIndex, /<span class="brand-name">CAL GOLDEN BARS<\/span>/);
  assert.match(rootIndex, /https:\/\/calgoldenbars\.com\//);
  assert.match(materializedConfigSource, /export const ACTIVE_INSTANCE_CONFIG = TEST_INSTANCE_CONFIG;/);
  assert.doesNotMatch(materializedConfigSource, /export const ACTIVE_INSTANCE_CONFIG = CAL_INSTANCE_CONFIG;/);

  assert.match(index, /<span class="brand-name">TEST FOX BARS<\/span>/);
  assert.match(index, /Test Fox Bars \| Find Fox Dens &amp; Watch Parties/);
  assert.match(index, /https:\/\/test-school\.invalid\//);
  assert.match(index, /assets\/test-fox-mark\.svg/);
  assert.match(index, /Find your Test U crowd/);
  assert.match(index, /FOX DEN/);
  assert.match(index, /COMMUNITY SPOT/);
  assert.match(index, /Foxes/);
  assert.doesNotMatch(index, /https:\/\/script\.google\.com\//i);
  assert.doesNotMatch(index, /https:\/\/docs\.google\.com\/forms\//i);
  assert.doesNotMatch(index, /G-CZV3JSBNJK/);
  assert.doesNotMatch(index, /calgoldenbars\.com/i);
  assert.doesNotMatch(index, /\bCal(?:ifornia)?\b|\bBears?\b|Cal Golden Bars/i);

  assert.equal(readMetaContentFromHtml(index, CONFIG_META_NAMES.dataEndpoint), '');
  assert.equal(readMetaContentFromHtml(index, CONFIG_META_NAMES.analyticsMeasurementId), '');
  assert.equal(readMetaContentFromHtml(index, CONFIG_META_NAMES.watchPartyFormUrl), '');
  assert.equal(readMetaContentFromHtml(index, CONFIG_META_NAMES.calBarNominationFormUrl), '');

  const snapshot = JSON.parse(fallback);
  assert.equal(snapshot.venues[0].city, 'Test City');
  assert.equal(snapshot.games[0].opponent_name, 'Sample Tech');
  const compatibilityValuesRemoved = fallback
    .replaceAll('cal_bar', '')
    .replaceAll('cgb_reviewed', '')
    .replaceAll('cgb_added', '');
  assert.doesNotMatch(compatibilityValuesRemoved, /\bCal(?:ifornia)?\b|\bBears?\b|\bCGB\b|Cal Golden Bars|calgoldenbars\.com/i);

  for (const color of allBrandColors(CAL_INSTANCE_CONFIG)) {
    if (allBrandColors(TEST_INSTANCE_CONFIG).includes(color)) continue;
    assert.ok(!designSystem.toLowerCase().includes(color), `materialized CSS still contains Cal brand color ${color}`);
  }
  assert.match(designSystem, /--brand-primary:\s*#6b1d3a/);
  assert.match(designSystem, /--brand-secondary:\s*#2bb3a3/);

  await access(join(buildFsPath, 'styles', 'dataviz-test-instance.json'));
  await access(join(buildFsPath, 'assets', 'social-cards', 'test-sample-tech.svg'));
  await access(join(buildFsPath, 'share', 'sample-tech', 'index.html'));

  const materializedModule = await import(`${pathToFileURL(join(buildFsPath, 'js', 'instance-config.mjs')).href}?test=${Date.now()}`);
  assert.equal(materializedModule.ACTIVE_INSTANCE_CONFIG.id, 'test');
  assert.equal(materializedModule.ACTIVE_INSTANCE_CONFIG.storage.browserId, 'test_fox_bars_browser_id');
  assert.deepEqual(materializedModule.ACTIVE_INSTANCE_CONFIG.geography.defaultMap, { center: [-105.012, 39.742], zoom: 9.1 });
  assert.equal(materializedModule.ACTIVE_INSTANCE_CONFIG.integrations.dataEndpoint, '');
  assert.equal(materializedModule.ACTIVE_INSTANCE_CONFIG.integrations.analytics.measurementId, '');
});
