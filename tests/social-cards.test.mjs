import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildCardSvg,
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

test('card SVG is fixed-size, uses design-system colors, and includes the paw-pin mark', () => {
  const svg = buildCardSvg(socialCardModel(snapshot, game));
  assert.match(svg, /width="1200" height="630"/);
  assert.match(svg, /#06152f/i);
  assert.match(svg, /#fdb515/i);
  assert.match(svg, /CAL GOLDEN BARS/);
  assert.match(svg, /Cal vs\. UCLA/);
  assert.match(svg, />LOCATIONS<\/text>/);
  assert.match(svg, />MAPPED<\/text>/);
  assert.match(svg, />WATCH<\/text>/);
  assert.match(svg, />PARTIES<\/text>/);
  assert.match(svg, /five-toed gold bear paw/);
  assert.match(svg, /<ellipse[^>]+cx="32" cy="22\.7"/);
  assert.match(svg, /id="metric-location-icon"/);
  assert.match(svg, /id="metric-people-icon"/);
  assert.match(svg, /M350 426h728/);
  assert.doesNotMatch(svg, /M230 130h890/);
  assert.doesNotMatch(svg, /M0 622h1200/);
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
