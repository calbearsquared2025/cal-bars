import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const finalPass = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');
const selected = await readFile(new URL('js/selected-profile-renderer.mjs', root), 'utf8');
const party = await readFile(new URL('js/watch-party-renderer.mjs', root), 'utf8');
const app = await readFile(new URL('js/app.js', root), 'utf8');
const firstPass = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const aesthetic = await readFile(new URL('js/map-profile-aesthetic-refinement.mjs', root), 'utf8');
const stabilization = await readFile(new URL('js/final-functional-stabilization.mjs', root), 'utf8');
const loader = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');

test('selected-profile styles remain loaded in their established cascade position', () => {
  assert.match(loader, /import '\.\/search-map-refinement\.mjs';[\s\S]*import '\.\/map-profile-final-pass\.mjs';/);
  assert.match(finalPass, /grid-template-columns: minmax\(0, 1fr\) 98px/);
  assert.match(finalPass, /bear-count__number/);
  assert.match(finalPass, /selected-card__share/);
});

test('final pass is styling-only and performs no selected-profile semantic refinement', () => {
  assert.doesNotMatch(finalPass, /refineAttendance|refinePartyModules|refineActions|selectedAttendanceContext|scheduleRefinement|queueMicrotask|getFanCount|compactVenueLocation/);
  assert.doesNotMatch(finalPass, /CGBApp\?\.subscribe|matchMedia/);
  assert.match(finalPass, /function initialize\(\) \{\s*installStyles\(\);\s*\}/);
});

test('canonical renderer directly owns attendance, proximity, and accepted actions', () => {
  assert.match(selected, /selectedAttendanceViewModel/);
  assert.match(selected, /bear-count__prompt[\s\S]*Be the first\./);
  assert.match(selected, /bear-count__number/);
  assert.match(selected, /selected-card__proximity-row/);
  assert.match(selected, /selected-card__distance/);
  assert.match(selected, /selected-card__directions-inline/);
  assert.doesNotMatch(selected, /selected-card__location-separator/);
  assert.match(selected, /selected-card__share/);
  assert.match(selected, /selected-card__details/);
  assert.match(selected, /More About This Location/);
  assert.doesNotMatch(app, /function appendWatchParty|function createActionRow\(/);
});

test('Watch Party renderer emits accepted semantic content without a classification pass', () => {
  assert.match(party, /party-module__host/);
  assert.match(party, /party-module__time/);
  assert.match(party, /party-module__note/);
  assert.match(party, /party-module__event/);
  assert.match(party, /Event information/);
  assert.match(party, /Report an Issue/);
  assert.doesNotMatch(finalPass, /party-module__host|Event information|Report an Issue/);
});

test('no-Watch-Party CTA and Directions spacing are canonical instead of late mutations', () => {
  assert.match(selected, /No listed Watch Party for this game\./);
  assert.match(selected, /\+ Add a Watch Party/);
  assert.doesNotMatch(firstPass, /addPlanWatchPartyAction|normalizeActionLabels|enhanceSelectedCard|scheduleEnhancement/);
  assert.doesNotMatch(aesthetic, /refinePlanWatchPartyAction|scheduleRefinement|aestheticRefined/);
  assert.doesNotMatch(stabilization, /fixDirectionsSeparator|link\.before\(separator\)/);
});
