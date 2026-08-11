import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const moduleSource = await readFile(new URL('js/watch-party-attendance-commitment.mjs', root), 'utf8');
const bootstrapSource = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');
const stabilizationSource = await readFile(new URL('js/final-functional-stabilization.mjs', root), 'utf8');
const profileSource = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const shellSource = await readFile(new URL('js/shell-controls.mjs', root), 'utf8');

test('selected venue Watch Party action keeps one navigation owner', () => {
  assert.match(profileSource, /\.selected-card__plan-party/);
  assert.match(profileSource, /#add-watch-party-button/);
  assert.doesNotMatch(stabilizationSource, /routeSelectedVenuePlanThroughAdd/);
  assert.doesNotMatch(stabilizationSource, /\.selected-card__plan-party/);
  assert.match(shellSource, /function beginContribution\(intent\)/);
  assert.match(shellSource, /if \(href\) \{[\s\S]*openExternalUrl\(href\)/);
});

test('Watch Party attendance coupling observes form launch without owning navigation', () => {
  assert.match(bootstrapSource, /import '\.\/watch-party-attendance-commitment\.mjs'/);
  assert.match(moduleSource, /cgb-watch-party-form-url/);
  assert.match(moduleSource, /cgb-watch-party-venue-id-entry/);
  assert.match(moduleSource, /cgb-watch-party-game-id-entry/);
  assert.match(moduleSource, /\.intent-button\[data-venue-id=/);
  assert.match(moduleSource, /button\.click\(\)/);
  assert.doesNotMatch(moduleSource, /preventDefault|stopImmediatePropagation|window\.open|openExternalUrl|navigatePreparedWindow/);
});

test('Watch Party attendance coupling does not expose or transport browser identity', () => {
  assert.doesNotMatch(moduleSource, /browserId|browser_id|BROWSER_ID_STORAGE_KEY/);
  assert.doesNotMatch(moduleSource, /fetch\(|XMLHttpRequest|postIntent/);
});
