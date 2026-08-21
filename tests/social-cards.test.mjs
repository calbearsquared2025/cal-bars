import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildCardHtml,
  buildSharePage,
  socialCardModel,
  validateSocialSnapshot
} from '../scripts/generate-social-cards.mjs';

const snapshot = JSON.parse(
  await readFile(new URL('./fixtures/public-snapshot.synthetic.json', import.meta.url), 'utf8')
);
const game = snapshot.games.find((item) => item.opponent_name === 'UCLA');

test('social-card data uses shared game naming and snapshot counts', () => {
  validateSocialSnapshot(snapshot);
  const model = socialCardModel(snapshot, game);
  assert.equal(model.slug, 'ucla');
  assert.equal(model.title, 'Cal vs. UCLA');
  assert.equal(model.locationCount, snapshot.venues.length);
  assert.equal(
    model.watchPartyCount,
    snapshot.watchParties.filter((party) => party.game_id === game.game_id).length
  );
});

test('card HTML is fixed-size, uses design-system colors, and references the paw-pin mark', () => {
  const html = buildCardHtml(socialCardModel(snapshot, game));
  assert.match(html, /width: 1200px; height: 630px/);
  assert.match(html, /#06152f/i);
  assert.match(html, /#fdb515/i);
  assert.match(html, /font-family: "Avenir Next", Avenir, "Segoe UI", Arial, sans-serif/);
  assert.match(html, /grid-template-columns: 260px minmax\(0, 1fr\)/);
  assert.match(html, /CAL GOLDEN BARS/);
  assert.match(html, /Cal vs\. UCLA/);
  assert.match(html, /game-title--default/);
  assert.match(html, /<span>LOCATIONS<\/span><span>MAPPED<\/span>/);
  assert.match(html, /<span>WATCH<\/span><span>PARTIES<\/span>/);
  assert.match(html, /cgb-mark\.svg/);
  assert.match(html, /metric-icon--location/);
  assert.match(html, /metric-icon--people/);
  assert.doesNotMatch(html, /scale\(/);
  assert.doesNotMatch(html, /<text/);
});

test('share page has static Open Graph and Twitter metadata and routes to the selected game', () => {
  const html = buildSharePage(socialCardModel(snapshot, game));
  for (const attribute of [
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'property="og:url"',
    'name="twitter:card" content="summary_large_image"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"'
  ]) assert.match(html, new RegExp(attribute));
  assert.match(html, /Cal vs\. UCLA · \d+ locations mapped · \d+ Watch Parties/);
  assert.match(html, /window\.location\.replace\("\.\.\/\.\.\/\?game=ucla"\)/);
});

test('social snapshot validation rejects duplicate public game routes', () => {
  const duplicate = {
    ...snapshot,
    games: [...snapshot.games, { ...snapshot.games[0], game_id: 'duplicate_game' }]
  };
  assert.throws(() => validateSocialSnapshot(duplicate), /Duplicate game route slug/);
});

test('social snapshot validation surfaces public endpoint errors clearly', () => {
  assert.throws(
    () => validateSocialSnapshot({ ok: false, error: 'snapshot_unavailable' }),
    /Public snapshot endpoint reported snapshot_unavailable/
  );
});
