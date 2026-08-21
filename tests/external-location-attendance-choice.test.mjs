import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/external-watch-party-plan.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/external-watch-party-plan.css', import.meta.url), 'utf8');

function functionBody(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `${name} should exist`);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return source.slice(start, end);
}

test('external place confirmation offers a standalone add-only choice', () => {
  assert.match(source, /const ADD_ONLY_BUTTON_ID = 'external-venue-add-only'/);
  assert.match(source, /button\.textContent = 'Add location only'/);
  assert.match(source, /ensureAddOnlyButton/);
});

test('Add location only uses the no-attendance venue creation path', () => {
  const body = functionBody('ensureAddOnlyButton', 'initializeExternalWatchPartyPlan');
  assert.match(body, /createExternalVenueWithoutAttendance/);
  assert.doesNotMatch(body, /confirm\.click\(\)/);
  assert.doesNotMatch(body, /ensureAttendance|fanIntent|INTENT_SELECTIONS_STORAGE_KEY/);
});

test('attendance and Watch Party contribution remain separate explicit actions', () => {
  assert.match(source, /#external-venue-confirm/);
  assert.match(source, /const ADD_ONLY_BUTTON_ID = 'external-venue-add-only'/);
  assert.match(source, /const BUTTON_ID = 'external-venue-plan-watch-party'/);
  assert.match(source, /button\.textContent = 'Add a Watch Party'/);
});

test('external location actions are disabled together during writes', () => {
  const body = functionBody('syncExternalVenueActions', 'ensurePlanButton');
  assert.match(body, /addOnly\.disabled = pending/);
  assert.match(body, /plan\.disabled = pending/);
  assert.match(body, /confirm\.disabled = pending/);
  assert.match(body, /cancel\.disabled = pending/);
});

test('location choices compare side by side on wider screens and stack on mobile', () => {
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /\.external-venue-plan-button,[\s\S]*#external-venue-cancel[\s\S]*grid-column: 1 \/ -1/);
});
