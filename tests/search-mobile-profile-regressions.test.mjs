import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normalizeSearchText, rankVenues } from '../js/core.mjs';

test('full US state names match venues stored with postal abbreviations', () => {
  const snapshot = {
    venues: [
      {
        venue_id: 'ven_honolulu',
        name: 'Pint + Jigger',
        city: 'Honolulu',
        region: 'HI',
        postal_code: '96814',
        address_line_1: '410 Atkinson Dr',
        latitude: 21.2906,
        longitude: -157.8395,
        venue_type: 'community_location'
      }
    ],
    watchParties: [],
    fanCounts: []
  };

  assert.equal(normalizeSearchText('HAWAII'), 'hi');
  assert.equal(normalizeSearchText('HI'), 'hi');
  assert.deepEqual(
    rankVenues(snapshot, 'game_ucla', null, 'HAWAII').map(({ venue }) => venue.venue_id),
    ['ven_honolulu']
  );
});

test('mobile profile refinements rerun when Search returns to the map surface', async () => {
  const source = await readFile(new URL('../js/icon-upgrade.mjs', import.meta.url), 'utf8');

  assert.match(source, /attributeFilter:\s*\['data-command-surface'\]/);
  assert.match(source, /document\.body\.dataset\.commandSurface\s*!==\s*'map'/);
  assert.match(source, /schedulePostRenderUpgrade\(\)/);
  assert.match(source, /renderMobileSelectedProfileContinuation/);
});
