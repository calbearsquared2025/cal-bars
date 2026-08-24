import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [source, css, mobileCss] = await Promise.all([
  readFile(new URL('../js/fan-intent.js', import.meta.url), 'utf8'),
  readFile(new URL('../css/venue-profile.css', import.meta.url), 'utf8'),
  readFile(new URL('../css/mobile-first-paint.css', import.meta.url), 'utf8')
]);

test('Fan Intent presence follows the canonical Venue Profile instead of detailMode', () => {
  const syncPresence = source.match(/function syncDetailPresence\(venueId, isSelected\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.doesNotMatch(syncPresence, /appState\.detailMode/);
  assert.match(syncPresence, /appState\.selectedVenueId !== venueId/);
  assert.match(syncPresence, /document\.querySelector\('#venue-detail'\)/);
  assert.match(syncPresence, /detail\.dataset\.venueId !== venueId/);
  assert.match(syncPresence, /detail\.querySelector\(':scope > \.activity-card'\)/);
  assert.match(syncPresence, /!isSelected && count <= 0 && !gameAllowsIntent\(\)/);
  assert.match(syncPresence, /detailPresenceCopy\(count\)/);
  assert.ok(source.includes('Tap “I’ll be here” to let other Bears know you’re coming.'));
  assert.ok(source.includes("Click \"I\\'ll be here\" below to join them."));
});

test('Venue Profile attendance stacks its supporting copy below the label', () => {
  assert.match(
    css,
    /\.activity-card:has\(\.bear-count__number\) > \.activity-card__presence \{[\s\S]*grid-row: 2;/
  );
});

test('mobile attendance copy does not inject a generic leading bullet into activity paragraphs', () => {
  assert.doesNotMatch(
    mobileCss,
    /body\[data-view="detail"\] \.activity-card p::before\s*\{/
  );
});
