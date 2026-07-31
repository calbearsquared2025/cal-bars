import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildWatchPartyPrefillUrl,
  normalizeGoogleFormsEntryId,
  normalizeWatchPartyFormConfig,
  resolveWatchPartyFormContext
} from '../js/watch-party-form-core.mjs';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const browserAdapter = await readFile(new URL('../js/watch-party-form.js', import.meta.url), 'utf8');

const CONFIG = Object.freeze({
  formUrl: 'https://docs.google.com/forms/d/e/test-form/viewform?embedded=true#form',
  venueIdEntry: 'entry.101',
  venueNameEntry: '202',
  gameIdEntry: 'entry.303'
});

const CONTEXT = Object.freeze({
  venueId: 'venue_oakland_01',
  venueName: "O'Neill & Sons – Café",
  gameId: 'game_2026_ucla'
});

function parsedPrefill(config = CONFIG, context = CONTEXT) {
  const href = buildWatchPartyPrefillUrl(config, context);
  return { href, url: new URL(href) };
}

test('normalizes numeric and prefixed Google Forms entry IDs', () => {
  assert.equal(normalizeGoogleFormsEntryId('12345'), 'entry.12345');
  assert.equal(normalizeGoogleFormsEntryId(' entry.67890 '), 'entry.67890');
  assert.equal(normalizeGoogleFormsEntryId('field.123'), '');
});

test('builds a prefilled Google Form URL with all required public context', () => {
  const { url } = parsedPrefill();
  assert.equal(url.searchParams.get('entry.101'), CONTEXT.venueId);
  assert.equal(url.searchParams.get('entry.202'), CONTEXT.venueName);
  assert.equal(url.searchParams.get('entry.303'), CONTEXT.gameId);
  assert.equal(url.searchParams.get('usp'), 'pp_url');
});

test('preserves the configured base Form URL path, existing query, and hash', () => {
  const { url } = parsedPrefill();
  assert.equal(url.origin, 'https://docs.google.com');
  assert.equal(url.pathname, '/forms/d/e/test-form/viewform');
  assert.equal(url.searchParams.get('embedded'), 'true');
  assert.equal(url.hash, '#form');
});

test('uses standards-based URL encoding for spaces, punctuation, ampersands, apostrophes, and non-ASCII text', () => {
  const { href, url } = parsedPrefill();
  assert.equal(url.searchParams.get('entry.202'), "O'Neill & Sons – Café");
  assert.match(href, /O%27Neill\+%26\+Sons\+%E2%80%93\+Caf%C3%A9/);
});

test('returns no URL when the Form URL is missing', () => {
  assert.equal(buildWatchPartyPrefillUrl({ ...CONFIG, formUrl: '' }, CONTEXT), '');
});

test('rejects malformed, insecure, and non-Google Form URLs', () => {
  assert.equal(normalizeWatchPartyFormConfig({ ...CONFIG, formUrl: 'not a url' }), null);
  assert.equal(normalizeWatchPartyFormConfig({ ...CONFIG, formUrl: 'http://docs.google.com/forms/test' }), null);
  assert.equal(normalizeWatchPartyFormConfig({ ...CONFIG, formUrl: 'https://example.com/forms/test' }), null);
  assert.equal(normalizeWatchPartyFormConfig({ ...CONFIG, formUrl: 'https://docs.google.com/spreadsheets/test' }), null);
});

test('returns no URL when any entry ID is missing or only partially configured', () => {
  assert.equal(buildWatchPartyPrefillUrl({ ...CONFIG, venueIdEntry: '' }, CONTEXT), '');
  assert.equal(buildWatchPartyPrefillUrl({ ...CONFIG, venueNameEntry: '' }, CONTEXT), '');
  assert.equal(buildWatchPartyPrefillUrl({ ...CONFIG, gameIdEntry: '' }, CONTEXT), '');
});

test('rejects duplicate entry IDs that would overwrite context', () => {
  assert.equal(normalizeWatchPartyFormConfig({ ...CONFIG, venueNameEntry: 'entry.101' }), null);
});

test('resolves direct-entry venue and game route state from the canonical snapshot', () => {
  const context = resolveWatchPartyFormContext({
    detailMode: true,
    selectedVenueId: 'venue_1',
    gameId: 'game_1',
    snapshot: {
      venues: [{ venue_id: 'venue_1', name: 'Two Pitchers Brewing Company' }],
      games: [{ game_id: 'game_1', opponent_name: 'UCLA' }]
    }
  });
  assert.deepEqual(context, {
    venueId: 'venue_1',
    venueName: 'Two Pitchers Brewing Company',
    gameId: 'game_1'
  });
});

test('selected-game changes produce a new game prefill without changing venue context', () => {
  const snapshot = {
    venues: [{ venue_id: 'venue_1', name: 'Two Pitchers Brewing Company' }],
    games: [{ game_id: 'game_1' }, { game_id: 'game_2' }]
  };
  const first = resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'venue_1', gameId: 'game_1' });
  const second = resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'venue_1', gameId: 'game_2' });
  assert.equal(new URL(buildWatchPartyPrefillUrl(CONFIG, first)).searchParams.get('entry.303'), 'game_1');
  assert.equal(new URL(buildWatchPartyPrefillUrl(CONFIG, second)).searchParams.get('entry.303'), 'game_2');
  assert.equal(first.venueId, second.venueId);
});

test('does not create context when venue, game, or detail-route state is unavailable', () => {
  const snapshot = { venues: [{ venue_id: 'venue_1', name: 'Venue' }], games: [{ game_id: 'game_1' }] };
  assert.equal(resolveWatchPartyFormContext({ snapshot, detailMode: false, selectedVenueId: 'venue_1', gameId: 'game_1' }), null);
  assert.equal(resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'missing', gameId: 'game_1' }), null);
  assert.equal(resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'venue_1', gameId: 'missing' }), null);
});

test('generated URL contains no browser, Fan Intent, contact, or private processing values', () => {
  const { href } = parsedPrefill();
  for (const forbidden of ['browser_id', 'browserId', 'fan_intent', 'email', 'submitter', 'processing_status', 'source_submission_id']) {
    assert.doesNotMatch(href, new RegExp(forbidden, 'i'));
  }
});

test('index uses empty disabled configuration rather than account-specific placeholders', () => {
  for (const name of [
    'cgb-watch-party-form-url',
    'cgb-watch-party-venue-id-entry',
    'cgb-watch-party-venue-name-entry',
    'cgb-watch-party-game-id-entry'
  ]) {
    assert.match(indexHtml, new RegExp(`<meta name="${name}" content="">`));
  }
  assert.match(indexHtml, /js\/watch-party-form\.js/);
  assert.match(indexHtml, /css\/watch-party-form\.css/);
});

test('browser adapter opens a valid Form in a separate secure context and removes the generic preview', () => {
  assert.match(browserAdapter, /link\.target = '_blank'/);
  assert.match(browserAdapter, /link\.rel = 'noopener noreferrer'/);
  assert.match(browserAdapter, /detail\.querySelector\('\.preview-note'\)\?\.remove\(\)/);
  assert.match(browserAdapter, /Is there a watch party going on\?/);
  assert.match(browserAdapter, /Submit a Watch Party/);
});

test('browser adapter subscribes to canonical renders so direct routes and selected-game changes stay synchronized', () => {
  assert.match(browserAdapter, /app\.subscribe\('rendered', render\)/);
  assert.match(browserAdapter, /app\.subscribe\('ready', render\)/);
  assert.match(browserAdapter, /state\?\.gameId/);
  assert.match(browserAdapter, /state\?\.selectedVenueId/);
});
