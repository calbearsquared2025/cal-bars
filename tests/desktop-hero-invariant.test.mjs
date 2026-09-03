import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/desktop-photo-forward-profile.mjs', import.meta.url), 'utf8');

test('desktop selected profiles always use the universal hero treatment', () => {
  assert.match(
    source,
    /#venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero \{/,
    'Desktop hero styling should target every direct detail hero.'
  );
  assert.doesNotMatch(
    source,
    /\.detail-hero\.detail-hero--identity/,
    'Desktop hero styling must not depend on an extra identity-state class.'
  );
});

test('desktop opening matches the approved guide with attendance beside What to Know', () => {
  assert.match(
    source,
    /\.detail-what-to-know \{[\s\S]*?grid-column:\s*1 \/ 8 !important;/,
    'What to Know should occupy the left side of the opening information row.'
  );
  assert.match(
    source,
    /> \.activity-card \{[\s\S]*?grid-column:\s*8 \/ 13 !important;/,
    'Bear attendance should occupy the right side of the same row.'
  );
  assert.match(
    source,
    /cursor = placeAfter\(cursor, whatToKnow\);\s*cursor = placeAfter\(cursor, activity\);\s*parties\.forEach/,
    'Attendance should remain paired with What to Know before the Watch Party block.'
  );
});
