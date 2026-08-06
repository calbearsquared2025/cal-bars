import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const polishSource = await readFile(new URL('js/final-ui-polish.mjs', root), 'utf8');
const finalPassSource = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');
const iconUpgradeSource = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('Milestone 8C remains the final presentation layer', () => {
  const polishImport = iconUpgradeSource.indexOf("import './final-ui-polish.mjs';");
  const previousVisualImport = iconUpgradeSource.indexOf("import './map-profile-final-pass.mjs';");
  const iconImport = iconUpgradeSource.indexOf("import { createIcon");
  assert.ok(polishImport > previousVisualImport);
  assert.ok(polishImport < iconImport);
});

test('oversized Details CTA remains absent without changing the route', () => {
  assert.match(finalPassSource, /details\?\.remove\(\)/);
  assert.doesNotMatch(finalPassSource, /createIcon\('details'/);
  assert.doesNotMatch(polishSource, /history\.|location\.assign|pushState|replaceState/);
});

test('keeps the minimum tray compact and restores neutral initial guidance', () => {
  assert.match(polishSource, /height:\s*84px\s*!important/);
  assert.match(polishSource, /max-height:\s*min\(39dvh, 320px\)\s*!important/);
  assert.match(polishSource, /Join a local watch party or plan your own!/);
  assert.match(polishSource, /state\.origin\s*\|\|\s*tray\?\.dataset\.state\s*!==\s*'peek'/);
  assert.match(polishSource, /removeAttribute\('data-direct-venue-id'\)/);
});

test('uses lighter labels and a clearer venue hierarchy', () => {
  assert.match(polishSource, /#map-view \.badge,[\s\S]*?font-size:\s*\.58rem/);
  assert.match(polishSource, /\.bear-count[\s\S]*?background:\s*transparent\s*!important/);
  assert.match(polishSource, /\.selected-card h2[\s\S]*?line-height:\s*1\.08/);
  assert.match(polishSource, /\.venue-location[\s\S]*?font-size:\s*\.77rem/);
});

test('standardizes typography, buttons, list cards, and Add spacing', () => {
  assert.match(polishSource, /padding-bottom:\s*\.04em/);
  assert.match(polishSource, /\.location-card[\s\S]*?padding:\s*12px 13px/);
  assert.match(polishSource, /\.add-action[\s\S]*?min-height:\s*70px/);
  assert.match(polishSource, /\.primary-button,[\s\S]*?border-radius:\s*11px/);
});

test('final polish remains presentation-only', () => {
  assert.doesNotMatch(polishSource, /selectedVenueId\s*=/);
  assert.doesNotMatch(polishSource, /gameId\s*=/);
  assert.doesNotMatch(polishSource, /fetch\s*\(/);
  assert.doesNotMatch(polishSource, /XMLHttpRequest|localStorage|sessionStorage/);
  assert.doesNotMatch(polishSource, /\.click\s*\(/);
});
