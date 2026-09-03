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

test('desktop selected profiles follow the approved information order', () => {
  assert.match(
    source,
    /desktopProfileArrangement = 'identity-what-to-know-party-attendance-editorial-community-photo-contribution'/,
    'Desktop profile arrangement should keep attendance after Watch Party and before CGB Says.'
  );
  assert.match(
    source,
    /cursor = placeAfter\(cursor, whatToKnow\);\s*parties\.forEach\(\(party\) => \{ cursor = placeAfter\(cursor, party\); \}\);\s*cursor = placeAfter\(cursor, activity\);\s*cursor = placeAfter\(cursor, editorial\);/,
    'DOM order should be What to Know, Watch Party, attendance, then CGB Says.'
  );
  assert.match(
    source,
    /\.detail-what-to-know \{\s*grid-column: 1 \/ -1 !important;/,
    'What to Know should occupy its own full-width row.'
  );
  assert.match(
    source,
    /> \.activity-card \{\s*grid-column: 1 \/ -1 !important;/,
    'Attendance should occupy its own full-width row.'
  );
});

test('desktop Bear attendance matches the mobile compact count treatment', () => {
  assert.match(source, /\.activity-card > strong\.bear-count:not\(\.bear-count--empty\) \{[\s\S]*?grid-template-columns: auto auto !important;[\s\S]*?grid-template-rows: auto auto auto !important;[\s\S]*?justify-content: center !important;/);
  assert.match(source, /\.bear-count__number \{[\s\S]*?grid-row: 1 \/ 4 !important;[\s\S]*?font-size: 2\.15rem !important;/);
  assert.match(source, /\.bear-count__label \{[\s\S]*?grid-row: 1 !important;[\s\S]*?font-size: \.75rem !important;/);
  assert.match(source, /\.bear-count__attending \{[\s\S]*?grid-row: 2 !important;[\s\S]*?font-size: \.62rem !important;/);
  assert.match(source, /\.bear-count__context \{[\s\S]*?grid-row: 3 !important;[\s\S]*?font-size: \.6rem !important;/);
});
