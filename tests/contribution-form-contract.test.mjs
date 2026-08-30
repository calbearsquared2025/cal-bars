import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps-script/ContributionFormConfig.gs', import.meta.url), 'utf8');
const context = vm.createContext({ JSON, Object, Array, String, Set, Error, console: { log() {} } });
vm.runInContext(`${source}\nglobalThis.__contracts = getContributionFormContractsForReview();\nglobalThis.__plan = planContributionFormQuestionsForReview;`, context);
const contracts = JSON.parse(JSON.stringify(context.__contracts));

function question(contract, key) {
  return contract.questions.find((item) => item.key === key);
}

function nonPrefillQuestions(contract) {
  return contract.questions
    .filter((item) => !item.prefill)
    .map((item, index) => ({ id: `existing-${index}`, title: item.title, kind: item.kind }));
}

const venueTags = [
  '21+',
  'AUDIO ON — game sound is usually on',
  'FOOD AVAILABLE',
  "Serves Cal beer (Oski's Gold, Coach Ron Golden Ale)",
  'LARGE CROWD — typically 10+ Cal fans',
  'CAL MEMORABILIA — Cal flags, signs, memorabilia, or similar'
];
const partyTags = [
  '21+',
  'AUDIO ON — game sound is expected/on',
  'FOOD AVAILABLE',
  "Serves Cal beer (Oski's Gold, Coach Ron Golden Ale)",
  'LARGE CROWD — typically 10+ Cal fans',
  'CAL MEMORABILIA — Cal flags, signs, memorabilia, or similar',
  'RSVP REQUESTED',
  'CAL SPECIALS — special food, drink, or pricing for the Cal group'
];

test('venue contribution Forms share the exact approved optional tag block', () => {
  assert.deepEqual(question(contracts.venue_details, 'structured_tags').choices, venueTags);
  assert.deepEqual(question(contracts.venue_update, 'structured_tags').choices, venueTags);
  assert.equal(question(contracts.venue_details, 'structured_tags').required, false);
  assert.equal(question(contracts.venue_update, 'structured_tags').required, false);
});

test('Watch Party Forms share the exact approved combined structured block', () => {
  assert.deepEqual(question(contracts.watch_party_submission, 'structured_tags').choices, partyTags);
  assert.deepEqual(question(contracts.watch_party_update, 'structured_tags').choices, partyTags);
  assert.equal(question(contracts.watch_party_submission, 'structured_tags').required, false);
  assert.equal(question(contracts.watch_party_update, 'structured_tags').required, false);
});

test('rejected tag concepts do not appear anywhere in the structured Form choices', () => {
  const allChoices = [
    ...question(contracts.venue_details, 'structured_tags').choices,
    ...question(contracts.watch_party_submission, 'structured_tags').choices
  ].join('\n').toUpperCase();
  for (const rejected of ['ALL AGES', 'RSVP REQUIRED', 'CAL AREA', 'OUTDOOR', 'ARRIVE EARLY', 'ALUMNI OWNED', 'ALUMNI GROUP']) {
    assert.equal(allChoices.includes(rejected), false, rejected);
  }
});

test('Tell us about this location keeps only the approved required context and has no public-name field', () => {
  const contract = contracts.venue_details;
  assert.equal(contract.title, 'Tell us about this location');
  assert.equal(question(contract, 'relationship').required, true);
  assert.deepEqual(question(contract, 'relationship').choices, ['Venue owner or staff', 'Alumni group organizer', 'Attendee', 'Other']);
  assert.equal(question(contract, 'frequency').required, true);
  assert.deepEqual(question(contract, 'frequency').choices, ['Most Cal football games', 'Several times per season', 'At least once per season', 'Other']);
  assert.equal(question(contract, 'freeform').required, false);
  assert.equal(contract.questions.some((item) => item.key === 'name'), false);
  assert.equal(question(contract, 'email').required, false);
});

test('location maintenance Form is Venue-only and leaves destructive changes for review', () => {
  const contract = contracts.venue_update;
  assert.equal(contract.title, 'Add or update location details');
  assert.deepEqual(question(contract, 'update_category').choices, [
    'Add missing information', 'Correct existing information', 'Location closed or moved', 'Other'
  ]);
  assert.equal(contract.questions.some((item) => item.key === 'watch_party_id'), false);
  assert.equal(question(contract, 'freeform').required, false);
  assert.equal(question(contract, 'name').required, false);
  assert.equal(question(contract, 'email').required, false);
});

test('Watch Party creation and update Forms include optional zoned start time and preserve distinct prefill keys', () => {
  assert.equal(contracts.watch_party_submission.title, 'Add a Watch Party');
  assert.equal(contracts.watch_party_update.title, 'Add or update Watch Party details');
  assert.equal(question(contracts.watch_party_submission, 'event_start').required, false);
  assert.match(question(contracts.watch_party_submission, 'event_start').help, /time zone/i);
  assert.equal(question(contracts.watch_party_update, 'event_start').required, false);
  assert.deepEqual(contracts.watch_party_submission.prefill.map((item) => item.key), ['venue_name', 'games', 'venue_id']);
  assert.deepEqual(contracts.watch_party_update.prefill.map((item) => item.key), ['venue_name', 'game', 'watch_party_id']);
});

test('repository public Form URLs and prefill IDs stay locked to the existing live endpoints', () => {
  assert.equal(contracts.venue_details.prefill.find((item) => item.key === 'venue_id').expectedEntry, 'entry.272269917');
  assert.equal(contracts.venue_update.prefill.find((item) => item.key === 'venue_id').expectedEntry, 'entry.1316297830');
  assert.equal(contracts.watch_party_submission.prefill.find((item) => item.key === 'venue_id').expectedEntry, 'entry.1451856849');
  assert.equal(contracts.watch_party_update.prefill.find((item) => item.key === 'watch_party_id').expectedEntry, 'entry.703629381');
  assert.match(contracts.venue_details.publicUrl, /docs\.google\.com\/forms/);
  assert.match(contracts.watch_party_update.publicUrl, /docs\.google\.com\/forms/);
});

test('a successfully synchronized Form plans zero question additions or removals on the next run', () => {
  for (const key of Object.keys(contracts)) {
    const plan = JSON.parse(JSON.stringify(context.__plan(nonPrefillQuestions(contracts[key]), key)));
    assert.deepEqual(plan.added, [], key);
    assert.deepEqual(plan.removed, [], key);
    assert.equal(plan.retained.length, nonPrefillQuestions(contracts[key]).length, key);
  }
});

test('known legacy headings are retained when their item type matches the approved question', () => {
  const existing = nonPrefillQuestions(contracts.watch_party_submission);
  const structured = existing.find((item) => item.title === 'Which of these details apply?');
  structured.title = 'What should Bears know about this Watch Party?';
  const plan = JSON.parse(JSON.stringify(context.__plan(existing, 'watch_party_submission')));
  assert.deepEqual(plan.added, []);
  assert.deepEqual(plan.removed, []);
  assert.equal(plan.retained.some((item) => item.key === 'structured_tags' && item.id === structured.id), true);
});

test('wrong-type or unapproved questions are replaced or removed instead of creating duplicate approved headings', () => {
  const existing = nonPrefillQuestions(contracts.venue_update);
  existing.push({ id: 'obsolete', title: 'Old venue question', kind: 'text' });
  const structured = existing.find((item) => item.title === 'Which of these describe this location?');
  structured.kind = 'text';
  const plan = JSON.parse(JSON.stringify(context.__plan(existing, 'venue_update')));
  assert.deepEqual(plan.added, ['structured_tags']);
  assert.equal(plan.removed.includes(structured.id), true);
  assert.equal(plan.removed.includes('obsolete'), true);
});
