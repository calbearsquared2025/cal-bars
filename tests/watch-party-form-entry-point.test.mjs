import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildWatchPartyFormGameLabel,
  buildWatchPartyPrefillUrl,
  normalizeGoogleFormsEntryId,
  normalizeWatchPartyFormConfig,
  resolveWatchPartyFormContext
} from '../js/watch-party-form-core.mjs';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const browserAdapter = await readFile(new URL('../js/watch-party-form.js', import.meta.url), 'utf8');
const watchPartyDisplay = await readFile(new URL('../js/watch-party-display.js', import.meta.url), 'utf8');
const watchPartyCss = await readFile(new URL('../css/watch-party-form.css', import.meta.url), 'utf8');

const CONFIG = Object.freeze({
  formUrl: 'https://docs.google.com/forms/d/e/test-form/viewform?embedded=true#form',
  venueIdEntry: 'entry.101',
  venueNameEntry: '202',
  gameIdEntry: 'entry.303'
});

const CONTEXT = Object.freeze({
  venueId: 'venue_oakland_01',
  venueName: "O'Neill & Sons – Café",
  gameId: 'game_2026_01',
  gameLabel: 'Sep 5 — Cal vs. UCLA'
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

test('builds a prefilled Google Form URL with venue context and the readable game choice', () => {
  const { url } = parsedPrefill();
  assert.equal(url.searchParams.get('entry.101'), CONTEXT.venueId);
  assert.equal(url.searchParams.get('entry.202'), CONTEXT.venueName);
  assert.equal(url.searchParams.get('entry.303'), CONTEXT.gameLabel);
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
  assert.equal(url.searchParams.get('entry.303'), 'Sep 5 — Cal vs. UCLA');
  assert.match(href, /O%27Neill\+%26\+Sons\+%E2%80%93\+Caf%C3%A9/);
});

test('builds stable date-and-matchup labels without kickoff times', () => {
  assert.equal(buildWatchPartyFormGameLabel({
    game_date: '2026-09-05',
    opponent_name: 'UCLA',
    home_away: 'home',
    kickoff_at: '2026-09-06T02:30:00Z'
  }), 'Sep 5 — Cal vs. UCLA');
  assert.equal(buildWatchPartyFormGameLabel({
    game_date: '2026-09-12',
    opponent_name: 'Syracuse',
    home_away: 'away',
    kickoff_at: '2026-09-12T19:30:00Z'
  }), 'Sep 12 — Cal at Syracuse');
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

test('returns no URL when the readable game label cannot be built', () => {
  assert.equal(buildWatchPartyPrefillUrl(CONFIG, { ...CONTEXT, gameLabel: '' }), '');
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
      games: [{
        game_id: 'game_1',
        game_date: '2026-09-05',
        opponent_name: 'UCLA',
        home_away: 'home',
        game_status: 'upcoming'
      }]
    }
  });
  assert.deepEqual(context, {
    venueId: 'venue_1',
    venueName: 'Two Pitchers Brewing Company',
    gameId: 'game_1',
    gameLabel: 'Sep 5 — Cal vs. UCLA'
  });
});

test('selected-game changes produce a new readable prefill without changing venue context', () => {
  const snapshot = {
    venues: [{ venue_id: 'venue_1', name: 'Two Pitchers Brewing Company' }],
    games: [
      {
        game_id: 'game_1', game_date: '2026-09-05', opponent_name: 'UCLA',
        home_away: 'home', game_status: 'upcoming'
      },
      {
        game_id: 'game_2', game_date: '2026-09-12', opponent_name: 'Syracuse',
        home_away: 'away', game_status: 'upcoming'
      }
    ]
  };
  const first = resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'venue_1', gameId: 'game_1' });
  const second = resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'venue_1', gameId: 'game_2' });
  assert.equal(new URL(buildWatchPartyPrefillUrl(CONFIG, first)).searchParams.get('entry.303'), 'Sep 5 — Cal vs. UCLA');
  assert.equal(new URL(buildWatchPartyPrefillUrl(CONFIG, second)).searchParams.get('entry.303'), 'Sep 12 — Cal at Syracuse');
  assert.equal(first.venueId, second.venueId);
});

test('does not create context when venue, game, date, status, or detail-route state is unavailable', () => {
  const snapshot = {
    venues: [{ venue_id: 'venue_1', name: 'Venue' }],
    games: [{
      game_id: 'game_1', game_date: '2026-09-05', opponent_name: 'UCLA',
      home_away: 'home', game_status: 'upcoming'
    }]
  };
  assert.equal(resolveWatchPartyFormContext({ snapshot, detailMode: false, selectedVenueId: 'venue_1', gameId: 'game_1' }), null);
  assert.equal(resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'missing', gameId: 'game_1' }), null);
  assert.equal(resolveWatchPartyFormContext({ snapshot, detailMode: true, selectedVenueId: 'venue_1', gameId: 'missing' }), null);
  assert.equal(resolveWatchPartyFormContext({
    snapshot: { venues: snapshot.venues, games: [{
      game_id: 'game_1', opponent_name: 'UCLA', home_away: 'home', game_status: 'upcoming'
    }] },
    detailMode: true,
    selectedVenueId: 'venue_1',
    gameId: 'game_1'
  }), null);
  assert.equal(resolveWatchPartyFormContext({
    snapshot: { venues: snapshot.venues, games: [{ ...snapshot.games[0], game_status: 'completed' }] },
    detailMode: true,
    selectedVenueId: 'venue_1',
    gameId: 'game_1'
  }), null);
  assert.equal(resolveWatchPartyFormContext({
    snapshot: { venues: snapshot.venues, games: [{ ...snapshot.games[0], game_status: 'cancelled' }] },
    detailMode: true,
    selectedVenueId: 'venue_1',
    gameId: 'game_1'
  }), null);
});

test('generated URL contains no browser, Fan Intent, contact, or private processing values', () => {
  const { href } = parsedPrefill();
  for (const forbidden of ['browser_id', 'browserId', 'fan_intent', 'email', 'submitter', 'processing_status', 'source_submission_id']) {
    assert.doesNotMatch(href, new RegExp(forbidden, 'i'));
  }
});

test('index uses the verified reviewed Form routing configuration', () => {
  assert.match(indexHtml, /name="cgb-watch-party-form-url"[\s\S]*?content="https:\/\/docs\.google\.com\/forms\/d\/e\/1FAIpQLSdPF2mVRnIaZtyIwgFB2j9LvrHnl6jENkX6u9_dj1Zew5TTiQ\/viewform"/);
  assert.match(indexHtml, /<meta name="cgb-watch-party-venue-id-entry" content="entry\.1451856849">/);
  assert.match(indexHtml, /<meta name="cgb-watch-party-venue-name-entry" content="entry\.307282250">/);
  assert.match(indexHtml, /<meta name="cgb-watch-party-game-id-entry" content="entry\.1519015315">/);
  assert.match(indexHtml, /js\/watch-party-form\.js/);
  assert.match(indexHtml, /css\/watch-party-form\.css/);
});

test('browser adapter promotes Watch Party planning ahead of listing-maintenance actions', () => {
  assert.match(browserAdapter, /link\.target = '_blank'/);
  assert.match(browserAdapter, /link\.rel = 'noopener noreferrer'/);
  assert.match(browserAdapter, /detail\.querySelector\('\.preview-note'\)\?\.remove\(\)/);
  assert.match(browserAdapter, /section\.className = 'detail-watch-party-cta'/);
  assert.match(browserAdapter, /section\.dataset\.watchPartyFormSection = 'true'/);
  assert.match(browserAdapter, /maintenance\.before\(section\)/);
  assert.match(browserAdapter, /Plan a Watch Party/);
  assert.doesNotMatch(browserAdapter, /link\.className = 'detail-contribution__action'/);
});

test('existing selected-game Watch Parties preserve the add-another CTA', () => {
  assert.match(browserAdapter, /getWatchParty\(/);
  assert.match(browserAdapter, /Add Another Watch Party/);
  assert.match(browserAdapter, /Hosting another gathering here\?/);
});

test('rendered Watch Party details stay ahead of the promoted profile CTA', () => {
  assert.match(watchPartyDisplay, /:scope > \.detail-watch-party-cta, :scope > \.detail-contribution/);
});

test('empty Watch Party action uses neutral section framing and a gold CTA', () => {
  const contributionRules = watchPartyCss.match(/\.detail-watch-party-cta\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(contributionRules, /background:\s*var\(--cgb-white\)/);
  assert.match(contributionRules, /border-top:\s*1px solid var\(--cgb-neutral-200\)/);
  assert.doesNotMatch(contributionRules, /border-left:/);
  assert.match(contributionRules, /text-align:\s*left/);
  assert.match(watchPartyCss, /\.detail-watch-party-cta__action \{[\s\S]*background: var\(--cgb-gold-400\);/);
  assert.match(watchPartyCss, /#tray-selected > #venue-detail \.detail-watch-party-cta \{[\s\S]*border-radius: 0;/);
});

test('browser adapter subscribes to canonical renders so direct routes and selected-game changes stay synchronized', () => {
  assert.match(browserAdapter, /app\.subscribe\('rendered', render\)/);
  assert.match(browserAdapter, /app\.subscribe\('ready', render\)/);
  assert.match(browserAdapter, /state\?\.gameId/);
  assert.match(browserAdapter, /state\?\.selectedVenueId/);
});
