import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIVE_INSTANCE_CONFIG } from '../js/instance-config.mjs';

const localRenderer = readFileSync(new URL('../js/selected-profile-renderer.mjs', import.meta.url), 'utf8');
const localFanIntentCss = readFileSync(new URL('../css/fan-intent.css', import.meta.url), 'utf8');

test('diagnostic: report live Syracuse attendance and deployed asset parity', { timeout: 20000 }, async () => {
  const [dataResponse, rendererResponse, cssResponse] = await Promise.all([
    fetch(ACTIVE_INSTANCE_CONFIG.integrations.dataEndpoint, { redirect: 'follow' }),
    fetch('https://calgoldenbars.com/js/selected-profile-renderer.mjs', { redirect: 'follow', cache: 'no-store' }),
    fetch('https://calgoldenbars.com/css/fan-intent.css', { redirect: 'follow', cache: 'no-store' })
  ]);
  assert.equal(dataResponse.ok, true, `Live endpoint returned ${dataResponse.status}`);
  assert.equal(rendererResponse.ok, true, `Live renderer returned ${rendererResponse.status}`);
  assert.equal(cssResponse.ok, true, `Live fan-intent CSS returned ${cssResponse.status}`);

  const snapshot = await dataResponse.json();
  const [liveRenderer, liveFanIntentCss] = await Promise.all([rendererResponse.text(), cssResponse.text()]);
  const game = (snapshot.games || []).find((row) => String(row.opponent_name || '').toLowerCase() === 'syracuse');
  assert.ok(game, 'Syracuse game missing from live snapshot');
  const counts = (snapshot.fanCounts || []).filter((row) => row.game_id === game.game_id);
  const venuesById = new Map((snapshot.venues || []).map((venue) => [venue.venue_id, venue.name]));

  assert.fail(JSON.stringify({
    generatedAt: snapshot.generatedAt || '',
    gameId: game.game_id,
    gameStatus: game.game_status,
    fanCounts: counts.map((row) => ({ ...row, venueName: venuesById.get(row.venue_id) || '' })),
    rendererMatchesCurrentSource: liveRenderer === localRenderer,
    fanIntentCssMatchesCurrentSource: liveFanIntentCss === localFanIntentCss,
    rendererCacheControl: rendererResponse.headers.get('cache-control') || '',
    cssCacheControl: cssResponse.headers.get('cache-control') || ''
  }));
});
