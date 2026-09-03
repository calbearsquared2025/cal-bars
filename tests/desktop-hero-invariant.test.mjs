import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/desktop-photo-forward-profile.mjs', import.meta.url), 'utf8');
const firstPaintCss = await readFile(new URL('../css/profile-first-paint.css', import.meta.url), 'utf8');
const watchPartyFormCss = await readFile(new URL('../css/watch-party-form.css', import.meta.url), 'utf8');
const watchPartyFormSource = await readFile(new URL('../js/watch-party-form.js', import.meta.url), 'utf8');

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

test('desktop opening keeps attendance to the right of What to Know', () => {
  assert.match(
    source,
    /desktopProfileArrangement = 'identity-what-to-know-attendance-party-editorial-community-photo-contribution'/,
    'Desktop profile arrangement should pair attendance with What to Know before Watch Party.'
  );
  assert.match(
    source,
    /cursor = placeAfter\(cursor, whatToKnow\);\s*cursor = placeAfter\(cursor, activity\);\s*parties\.forEach/,
    'DOM order should keep What to Know and attendance adjacent before Watch Party.'
  );
  assert.match(
    source,
    /\.detail-what-to-know \{\s*grid-column: 1 \/ 8 !important;/,
    'What to Know should occupy the left side of the opening information row.'
  );
  assert.match(
    source,
    /> \.activity-card \{\s*grid-column: 8 \/ 13 !important;/,
    'Attendance should occupy the right side of the same opening information row.'
  );
});

test('desktop Bear attendance matches the mobile compact count treatment', () => {
  assert.match(source, /\.activity-card > strong\.bear-count:not\(\.bear-count--empty\) \{[\s\S]*?grid-template-columns: auto auto !important;[\s\S]*?grid-template-rows: auto auto auto !important;[\s\S]*?justify-content: center !important;/);
  assert.match(source, /\.bear-count__number \{[\s\S]*?grid-row: 1 \/ 4 !important;[\s\S]*?font-size: 2\.15rem !important;/);
  assert.match(source, /\.bear-count__label \{[\s\S]*?grid-row: 1 !important;[\s\S]*?font-size: \.75rem !important;/);
  assert.match(source, /\.bear-count__attending \{[\s\S]*?grid-row: 2 !important;[\s\S]*?font-size: \.62rem !important;/);
  assert.match(source, /\.bear-count__context \{[\s\S]*?grid-row: 3 !important;[\s\S]*?font-size: \.6rem !important;/);
});

test('desktop first paint never exposes the legacy profile presentation', () => {
  assert.match(
    watchPartyFormCss,
    /@import url\('\.\/profile-first-paint\.css'\);/,
    'Paint-safe profile styles must load through a render-blocking stylesheet.'
  );
  assert.match(
    firstPaintCss,
    /#venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero \{[\s\S]*?background: var\(--cgb-navy-950\) !important;[\s\S]*?border-bottom: 3px solid var\(--cgb-gold-400\) !important;/,
    'The universal navy hero must be available on first paint.'
  );
  assert.match(
    firstPaintCss,
    /:not\(:has\(> \.detail-what-to-know\)\) > :not\(\.detail-hero\) \{\s*visibility: hidden !important;/,
    'Legacy body children must stay out of the paint until the final opening hierarchy exists.'
  );
});

test('attendance has one formatting owner after profile enrichment', () => {
  assert.doesNotMatch(
    watchPartyFormSource,
    /syncDesktopProfileFinalBalance|desktop-profile-final-balance/,
    'Watch Party rendering must not trigger a second desktop attendance restyle pass.'
  );
});

test('What to Know action and profile badges match the approved guide', () => {
  assert.match(
    firstPaintCss,
    /\.detail-what-to-know__header \{\s*justify-content: flex-start !important;\s*gap: 8px !important;/,
    'Add info should sit immediately to the right of WHAT TO KNOW.'
  );
  assert.match(
    firstPaintCss,
    /\.venue-badge[^{]*\{[\s\S]*?clip-path: none !important;/,
    'Venue badges must not use clipped/chamfered sides.'
  );
  assert.match(
    firstPaintCss,
    /\.venue-badge\.badge--party[^{]*\{[\s\S]*?color: var\(--cgb-navy-950[\s\S]*?background: var\(--cgb-gold-400/,
    'Watch Party badges should be filled gold with navy text.'
  );
});