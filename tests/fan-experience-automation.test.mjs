import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const publicSnapshotCode = await readFile(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const fanExperienceAutomationCode = await readFile(new URL('../apps-script/FanExperienceAutomation.gs', import.meta.url), 'utf8');
const context = vm.createContext({
  Date,
  String,
  Number,
  Object,
  Array,
  RegExp,
  Set,
  Map,
  JSON,
  console: { log() {}, warn() {}, error() {} }
});
vm.runInContext(publicSnapshotCode, context);
vm.runInContext(fanExperienceAutomationCode, context);

const venueId = 'venue_5977e35a58d8b18f22a51f1e';
const otherVenueId = 'venue_aaaaaaaaaaaaaaaaaaaaaaaa';

function call(expression) {
  return vm.runInContext(expression, context);
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

test('Fan Experience cleanup removes control characters, normalizes whitespace, trims, and caps at 500', () => {
  context.__value = `  Great\u0000 crowd\n\twith   Bears  ${'x'.repeat(600)}  `;
  const cleaned = call('cleanFanExperienceText_(__value)');
  assert.equal(cleaned.includes('\u0000'), false);
  assert.equal(cleaned.includes('\n'), false);
  assert.equal(cleaned.includes('  '), false);
  assert.equal(cleaned.length, 500);
  assert.equal(cleaned, cleaned.trim());
});

test('useful negative feedback publishes when it does not trigger a safety hold', () => {
  context.__value = 'Service was slow, but the Cal crowd was lively and the game-day atmosphere was worth it.';
  assert.deepEqual(json(call('moderateFanExperienceText_(__value)')), {
    status: 'published',
    reason: ''
  });
});

test('obvious URL, contact information, threat, and junk cases are held', () => {
  const cases = [
    'See my offer at https://example.com for a discount code.',
    'Email me at bear@example.com for details.',
    'I will hurt the bartender next time.',
    'go go go go go go'
  ];
  for (const value of cases) {
    context.__value = value;
    assert.equal(call('moderateFanExperienceText_(__value).status'), 'held');
  }
});

test('public Fan Experiences include only published rows for public canonical Venues, newest first', () => {
  context.__rows = [
    {
      Timestamp: '2026-08-20T10:00:00Z',
      'Venue ID': venueId,
      'What should other Bears know about watching a Cal game here?': 'RAW PRIVATE ONE',
      public_text: 'Older published experience',
      moderation_status: 'published',
      moderation_reason: '',
      respondent_email: 'private@example.com'
    },
    {
      Timestamp: '2026-08-22T10:00:00Z',
      'Venue ID': venueId,
      experience_text: 'RAW PRIVATE TWO',
      public_text: '<b>Newest</b> stays plain text',
      moderation_status: 'published',
      moderation_reason: '',
      reviewer_note: 'private'
    },
    {
      Timestamp: '2026-08-23T10:00:00Z',
      'Venue ID': venueId,
      public_text: 'Held should never publish',
      moderation_status: 'held',
      moderation_reason: 'url_or_solicitation'
    },
    {
      Timestamp: '2026-08-24T10:00:00Z',
      'Venue ID': otherVenueId,
      public_text: 'Unknown venue should never publish',
      moderation_status: 'published',
      moderation_reason: ''
    }
  ];
  context.__venueId = venueId;
  const output = json(call('buildPublishedFanExperiences_(__rows, new Set([__venueId]))'));
  assert.deepEqual(output, [
    { venue_id: venueId, text: '<b>Newest</b> stays plain text' },
    { venue_id: venueId, text: 'Older published experience' }
  ]);
  const serialized = JSON.stringify(output);
  for (const privateValue of ['RAW PRIVATE', 'private@example.com', 'moderation_status', 'moderation_reason', 'reviewer_note', 'Timestamp']) {
    assert.equal(serialized.includes(privateValue), false);
  }
});
