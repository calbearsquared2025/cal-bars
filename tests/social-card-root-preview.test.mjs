import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildSocialManifest } from '../scripts/generate-social-cards.mjs';
import { selectRootPreviewEntry } from '../scripts/update-root-social-preview.mjs';

const updaterSource = readFileSync(new URL('../scripts/update-root-social-preview.mjs', import.meta.url), 'utf8');

const snapshot = {
  games: [
    {
      game_id: 'game_ucla',
      season: 2026,
      schedule_order: 1,
      opponent_name: 'UCLA',
      home_away: 'home',
      game_date: '2026-09-05',
      game_status: 'upcoming'
    },
    {
      game_id: 'game_syracuse',
      season: 2026,
      schedule_order: 2,
      opponent_name: 'Syracuse',
      home_away: 'away',
      game_date: '2026-09-12',
      game_status: 'upcoming'
    }
  ]
};

const models = [
  {
    gameId: 'game_ucla',
    slug: 'ucla',
    title: 'Cal vs. UCLA',
    locationCount: 42,
    watchPartyCount: 15
  },
  {
    gameId: 'game_syracuse',
    slug: 'syracuse',
    title: 'Cal at Syracuse',
    locationCount: 42,
    watchPartyCount: 11
  }
];

test('social manifest records the default game using the Pacific calendar date', () => {
  const latePacific = new Date('2026-09-06T06:30:00Z');
  const manifest = buildSocialManifest(snapshot, models, latePacific);

  assert.equal(manifest.default_game_slug, 'ucla');
  assert.equal(selectRootPreviewEntry(manifest).slug, 'ucla');
});

test('root social preview updater reuses the generated manifest without a second snapshot request', () => {
  assert.doesNotMatch(updaterSource, /fetchSnapshot/);
  assert.doesNotMatch(updaterSource, /endpointFromIndex/);
  assert.doesNotMatch(updaterSource, /script\.google\.com/);
  assert.match(updaterSource, /selectRootPreviewEntry\(manifest\)/);
});
