import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const app = await readFile(new URL('js/app.js', root), 'utf8');
const selected = await readFile(new URL('js/selected-profile-renderer.mjs', root), 'utf8');
const finalPass = await readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8');
const firstPass = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const aesthetic = await readFile(new URL('js/map-profile-aesthetic-refinement.mjs', root), 'utf8');
const stabilization = await readFile(new URL('js/final-functional-stabilization.mjs', root), 'utf8');

test('renderSelectedCard invokes the authoritative semantic renderer immediately', () => {
  assert.match(app, /import \{ createSelectedVenueCard \} from '\.\/selected-profile-renderer\.mjs';/);
  assert.match(app, /function renderSelectedCard\(\)[\s\S]*createSelectedVenueCard\(\{[\s\S]*dom\.traySelected\.append\(card\)/);
  assert.match(selected, /className = 'selected-card'/);
  assert.match(selected, /className = 'bear-count'/);
  assert.match(selected, /className = 'action-row'/);
});

test('the obsolete generic selected-card state is no longer executable', () => {
  assert.doesNotMatch(app, /function appendWatchParty|function createActionRow\(/);
  assert.doesNotMatch(finalPass, /refineAttendance|refinePartyModules|refineActions|scheduleRefinement/);
  assert.doesNotMatch(firstPass, /addPlanWatchPartyAction|normalizeActionLabels|enhanceSelectedCard/);
  assert.doesNotMatch(aesthetic, /refinePlanWatchPartyAction/);
  assert.doesNotMatch(stabilization, /fixDirectionsSeparator/);
});

test('PR 152 timing workaround is obsolete because there is no semantic final-pass schedule', () => {
  assert.doesNotMatch(finalPass, /queueMicrotask|requestAnimationFrame|scheduleRefinement|CGBApp\?\.subscribe/);
  assert.match(finalPass, /installStyles/);
});
