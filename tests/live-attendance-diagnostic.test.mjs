import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_INSTANCE_CONFIG } from '../js/instance-config.mjs';

test('diagnostic: report live Syracuse attendance snapshot', { timeout: 20000 }, async () => {
  const response = await fetch(ACTIVE_INSTANCE_CONFIG.integrations.dataEndpoint, { redirect: 'follow' });
  assert.equal(response.ok, true, `Live endpoint returned ${response.status}`);
  const snapshot = await response.json();
  const game = (snapshot.games || []).find((row) => String(row.opponent_name || '').toLowerCase() === 'syracuse');
  assert.ok(game, 'Syracuse game missing from live snapshot');
  const counts = (snapshot.fanCounts || []).filter((row) => row.game_id === game.game_id);
  assert.fail(JSON.stringify({
    generatedAt: snapshot.generatedAt || '',
    gameId: game.game_id,
    gameStatus: game.game_status,
    fanCounts: counts
  }));
});
