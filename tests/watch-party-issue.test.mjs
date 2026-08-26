import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getWatchPartiesForVenueGame } from '../js/watch-party-display-core.mjs';
import {
  buildWatchPartyIssueUrl,
  normalizeWatchPartyIssueConfig,
  resolveWatchPartyIssueContext
} from '../js/watch-party-issue-core.mjs';

const CONFIG = {
  formUrl: 'https://docs.google.com/forms/d/e/example/viewform',
  venueNameEntry: 'entry.11',
  gameEntry: 'entry.22',
  watchPartyIdEntry: 'entry.33'
};
const games = [
  { game_id: 'game_1', game_date: '2026-09-05', opponent_name: 'UCLA', home_away: 'home' },
  { game_id: 'game_2', game_date: '2026-09-12', opponent_name: 'Syracuse', home_away: 'away' }
];
const base = {
  venue_id: 'venue_1', game_id: 'game_1', event_status: 'active',
  publication_status: 'published', organizer_name: 'Cal Alumni'
};
const snapshot = {
  venues: [{ venue_id: 'venue_1', name: "O'Neill & Sons – Café" }],
  games,
  watchParties: []
};

function urlFor(party) {
  return new URL(buildWatchPartyIssueUrl(CONFIG, resolveWatchPartyIssueContext(snapshot, party)));
}

test('one Watch Party produces its own complete report context', () => {
  const party = { ...base, watch_party_id: 'wp_1' };
  const url = urlFor(party);
  assert.equal(url.searchParams.get('entry.11'), "O'Neill & Sons – Café");
  assert.equal(url.searchParams.get('entry.22'), 'Sep 5 — Cal vs. UCLA');
  assert.equal(url.searchParams.get('entry.33'), 'wp_1');
});

test('multiple Watch Parties retain the correct watch_party_id association', () => {
  const parties = [
    { ...base, watch_party_id: 'wp_alpha' },
    { ...base, watch_party_id: 'wp_beta' }
  ];
  const ids = parties.map((party) => urlFor(party).searchParams.get('entry.33'));
  assert.deepEqual(ids, ['wp_alpha', 'wp_beta']);
  assert.equal(new Set(ids).size, parties.length);
});

test('duplicate Watch Party records produce no duplicate report CTA context', () => {
  const party = { ...base, watch_party_id: 'wp_1' };
  const filtered = getWatchPartiesForVenueGame({ ...snapshot, watchParties: [party, { ...party }] }, 'game_1', 'venue_1');
  assert.equal(filtered.length, 1);
  assert.equal(urlFor(filtered[0]).searchParams.get('entry.33'), 'wp_1');
});

test('selected-Game changes produce independent Game and Watch Party context', () => {
  const first = { ...base, watch_party_id: 'wp_1' };
  const second = { ...base, game_id: 'game_2', watch_party_id: 'wp_2' };
  const secondUrl = urlFor(second);
  assert.equal(urlFor(first).searchParams.get('entry.22'), 'Sep 5 — Cal vs. UCLA');
  assert.equal(secondUrl.searchParams.get('entry.22'), 'Sep 12 — Cal at Syracuse');
  assert.equal(secondUrl.searchParams.get('entry.33'), 'wp_2');
});

test('inactive and unpublished Watch Parties are excluded before report links render', () => {
  const active = { ...base, watch_party_id: 'active' };
  const parties = [
    active,
    { ...base, watch_party_id: 'cancelled', event_status: 'cancelled' },
    { ...base, watch_party_id: 'draft', publication_status: 'draft' }
  ];
  assert.deepEqual(
    getWatchPartiesForVenueGame({ ...snapshot, watchParties: parties }, 'game_1', 'venue_1').map((party) => party.watch_party_id),
    ['active']
  );
});

test('Form URL encoding preserves punctuation and non-ASCII text', () => {
  const href = buildWatchPartyIssueUrl(CONFIG, resolveWatchPartyIssueContext(snapshot, { ...base, watch_party_id: 'wp_1&two' }));
  assert.match(href, /O%27Neill\+%26\+Sons\+%E2%80%93\+Caf%C3%A9/);
  assert.match(href, /wp_1%26two/);
});

test('generated URL contains no report, submitter, Fan Intent, or other private values', () => {
  const href = urlFor({ ...base, watch_party_id: 'wp_1' }).toString();
  for (const forbidden of ['name=', 'email', 'report', 'browser', 'fan_intent', 'processing_status', 'source_submission']) {
    assert.doesNotMatch(href, new RegExp(forbidden, 'i'));
  }
});

test('configuration rejects unsafe URLs, missing IDs, and duplicate entry IDs', () => {
  assert.deepEqual(normalizeWatchPartyIssueConfig(CONFIG), CONFIG);
  assert.equal(normalizeWatchPartyIssueConfig({ ...CONFIG, formUrl: 'http://docs.google.com/forms/test' }), null);
  assert.equal(normalizeWatchPartyIssueConfig({ ...CONFIG, formUrl: 'https://example.com/forms/test' }), null);
  assert.equal(normalizeWatchPartyIssueConfig({ ...CONFIG, gameEntry: '' }), null);
  assert.equal(normalizeWatchPartyIssueConfig({ ...CONFIG, gameEntry: 'entry.11' }), null);
});

test('direct-route refresh and renders use the canonical party cards without a second report control', async () => {
  const client = await readFile(new URL('../js/watch-party-display.js', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../js/watch-party-renderer.mjs', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(renderer, /module\.dataset\.watchPartyId = party\.watch_party_id/);
  assert.match(renderer, /report\.dataset\.watchPartyIssueEntry = party\.watch_party_id/);
  assert.match(client, /app\.subscribe\('rendered', render\)/);
  assert.match(client, /app\.subscribe\('ready', render\)/);
  assert.equal((renderer.match(/Report an Issue/g) || []).length, 1);
  assert.doesNotMatch(renderer, /Report a problem with this Watch Party/);
  assert.doesNotMatch(html, /data-watch-party-issue-entry/);
});

test('report links perform no automatic Watch Party or Venue mutation', async () => {
  const client = await readFile(new URL('../js/watch-party-display.js', import.meta.url), 'utf8');
  const block = client.slice(client.indexOf('const reportUrl'), client.indexOf('return module'));
  assert.doesNotMatch(block, /fetch\(|XMLHttpRequest|doPost|delete|unpublish|merge|snapshot\.(?:watchParties|venues)\s*=/i);
});
