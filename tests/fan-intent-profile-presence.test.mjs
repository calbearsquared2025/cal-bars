import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/fan-intent.js', import.meta.url), 'utf8');

test('Fan Intent presence follows the canonical Venue Profile instead of detailMode', () => {
  const syncPresence = source.match(/function syncDetailPresence\(venueId, isSelected\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.doesNotMatch(syncPresence, /appState\.detailMode/);
  assert.match(syncPresence, /appState\.selectedVenueId !== venueId/);
  assert.match(syncPresence, /document\.querySelector\('#venue-detail'\)/);
  assert.match(syncPresence, /detail\.dataset\.venueId !== venueId/);
  assert.match(syncPresence, /detail\.querySelector\(':scope > \.activity-card'\)/);
  assert.match(syncPresence, /presence\.textContent = detailPresenceCopy\(count\)/);
});
