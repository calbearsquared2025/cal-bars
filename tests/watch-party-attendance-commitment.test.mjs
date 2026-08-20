import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const bootstrapSource = await readFile(new URL('js/icon-upgrade.mjs', root), 'utf8');
const stabilizationSource = await readFile(new URL('js/final-functional-stabilization.mjs', root), 'utf8');
const profileSource = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const shellSource = await readFile(new URL('js/shell-controls.mjs', root), 'utf8');
const handoffSource = await readFile(new URL('js/watch-party-attendance-handoff.mjs', root), 'utf8');
const fanIntentSource = await readFile(new URL('js/fan-intent.js', root), 'utf8');
const fanIntentControllerSource = await readFile(new URL('js/fan-intent-controller.mjs', root), 'utf8');

function functionBody(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `${name} should exist`);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return source.slice(start, end);
}

test('selected venue Watch Party action has one navigation owner and uses the shared handoff', () => {
  const presentation = functionBody(profileSource, 'addPlanWatchPartyAction', 'normalizeActionLabels');
  const contribution = functionBody(shellSource, 'beginContribution', 'handleSelectedVenueWatchParty');
  const selectedAction = functionBody(shellSource, 'handleSelectedVenueWatchParty', 'handleSearchResultClick');

  assert.match(profileSource, /\.selected-card__plan-party/);
  assert.doesNotMatch(presentation, /addEventListener|#add-watch-party-button|\.click\(\)/);
  assert.doesNotMatch(stabilizationSource, /routeSelectedVenuePlanThroughAdd/);
  assert.doesNotMatch(stabilizationSource, /\.selected-card__plan-party/);
  assert.match(selectedAction, /event\.preventDefault\(\)/);
  assert.match(selectedAction, /beginContribution\(CONTRIBUTION_INTENTS\.watchParty/);
  assert.doesNotMatch(selectedAction, /stopPropagation|stopImmediatePropagation|\.click\(\)/);
  assert.match(shellSource, /document\.addEventListener\('click', handleSelectedVenueWatchParty\)/);
  assert.doesNotMatch(shellSource, /handleSelectedVenueWatchParty, \{ capture: true \}/);
  assert.match(contribution, /openWatchPartyUrlWithAttendanceChoice/);
  assert.doesNotMatch(contribution, /ensureAttendance\s*=/);
});

test('Watch Party handoff keeps attendance explicit and delegates yes to the existing Fan Intent owner', () => {
  assert.doesNotMatch(bootstrapSource, /watch-party-attendance-commitment/);
  assert.match(shellSource, /requestWatchPartyAttendance/);
  assert.match(shellSource, /WATCH_PARTY_ATTENDANCE_CHOICES\.attend/);
  assert.match(shellSource, /window\.CGBFanIntent\?\.ensureAttendance/);
  assert.match(handoffSource, /Yes, I’ll be there/);
  assert.match(handoffSource, /No, I’m sharing it/);
  assert.match(fanIntentSource, /export async function ensureFanIntentAttendance/);
  assert.match(fanIntentSource, /return controller\.ensureIntent\(venueId\)/);
  assert.match(fanIntentSource, /ensureAttendance: ensureFanIntentAttendance/);
  assert.match(fanIntentControllerSource, /async function ensureIntent\(venueId\)/);
  assert.match(fanIntentControllerSource, /selections\?\.\[state\.gameId\] === venueId/);
  assert.match(fanIntentControllerSource, /return performIntent\(venueId\)/);
});

test('sharing a Watch Party has no attendance side effect in the handoff owner', () => {
  const handoff = functionBody(shellSource, 'openWatchPartyUrlWithAttendanceChoice', 'watchPartyUrl');
  assert.match(handoff, /handoff\.choice === WATCH_PARTY_ATTENDANCE_CHOICES\.attend/);
  assert.doesNotMatch(handoffSource, /browserId|browser_id|BROWSER_ID_STORAGE_KEY|ensureAttendance/);
  assert.match(handoff, /navigateWaitingFormWindow/);
});

test('selected venue Watch Party ownership adds no polling or identity transport', () => {
  const presentation = functionBody(profileSource, 'addPlanWatchPartyAction', 'normalizeActionLabels');
  const contribution = functionBody(shellSource, 'beginContribution', 'handleSelectedVenueWatchParty');
  const selectedAction = functionBody(shellSource, 'handleSelectedVenueWatchParty', 'handleSearchResultClick');
  const selectedPath = `${presentation}\n${contribution}\n${selectedAction}`;
  assert.doesNotMatch(selectedPath, /browserId|browser_id|BROWSER_ID_STORAGE_KEY/);
  assert.doesNotMatch(selectedPath, /setTimeout|setInterval|POLL_MS|MutationObserver/);
  assert.doesNotMatch(selectedPath, /stopImmediatePropagation|#mobile-add-button/);
});
