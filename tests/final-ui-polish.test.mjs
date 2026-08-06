import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const polishSource = await readFile(new URL('js/final-ui-polish.mjs', root), 'utf8');
const iconUpgradeSource = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('final polish remains loaded after the selected profile owner', () => {
  const polishImport = iconUpgradeSource.indexOf("import './final-ui-polish.mjs';");
  const profileImport = iconUpgradeSource.indexOf("import './map-profile-final-pass.mjs';");
  assert.ok(polishImport > profileImport);
});

test('final polish retains non-Map typography and surface spacing', () => {
  assert.match(polishSource, /padding-bottom: \.04em/);
  assert.match(polishSource, /#location-list \.location-card/);
  assert.match(polishSource, /\.command-surface__shell/);
  assert.match(polishSource, /\.add-action/);
});

test('final polish no longer competes for Map or Tray ownership', () => {
  assert.doesNotMatch(polishSource, /#map-view > #venue-tray|data-selected-density|bear-count|party-module/);
  assert.doesNotMatch(polishSource, /GUIDANCE_TITLE|data-direct-venue-id/);
  assert.doesNotMatch(polishSource, /!important/);
});

test('final polish remains presentation-only', () => {
  assert.doesNotMatch(polishSource, /selectedVenueId\s*=/);
  assert.doesNotMatch(polishSource, /gameId\s*=/);
  assert.doesNotMatch(polishSource, /fetch\s*\(/);
  assert.doesNotMatch(polishSource, /localStorage|sessionStorage|\.click\s*\(/);
});
