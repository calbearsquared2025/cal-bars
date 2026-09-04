import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../js/desktop-photo-forward-profile.mjs', import.meta.url), 'utf8');
const fanExperiencesSource = await readFile(new URL('../js/fan-experiences.mjs', import.meta.url), 'utf8');
const fanIntentCss = await readFile(new URL('../css/fan-intent.css', import.meta.url), 'utf8');
const firstPaintCss = await readFile(new URL('../css/profile-first-paint.css', import.meta.url), 'utf8');
const watchPartyFormCss = await readFile(new URL('../css/watch-party-form.css', import.meta.url), 'utf8');
const watchPartyFormSource = await readFile(new URL('../js/watch-party-form.js', import.meta.url), 'utf8');

test('desktop selected profiles always use the universal hero treatment', () => {
  assert.match(
    firstPaintCss,
    /#venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero \{/,
    'Desktop hero styling should target every direct detail hero.'
  );
  assert.doesNotMatch(
    `${source}\n${firstPaintCss}`,
    /\.detail-hero\.detail-hero--identity/,
    'Desktop hero styling must not depend on an extra identity-state class.'
  );
});

test('desktop hero mirrors the mobile 60/40 identity and attendance hierarchy', () => {
  assert.match(
    source,
    /desktopProfileArrangement = 'identity-attendance-party-what-to-know-editorial-community-photo-contribution'/,
    'Desktop profile arrangement should keep attendance with venue identity before selected-game content.'
  );
  assert.match(
    source,
    /if \(activity && activity\.parentElement !== hero\) hero\.append\(activity\);[\s\S]*?let cursor = hero;\s*parties\.forEach[\s\S]*?cursor = placeAfter\(cursor, whatToKnow\);/,
    'Attendance should move into the hero before Watch Party and What to Know are placed below it.'
  );
  assert.match(
    firstPaintCss,
    /> \.detail-hero \{[\s\S]*?grid-template-columns: minmax\(0, 3fr\) minmax\(170px, 2fr\) !important;/,
    'Desktop hero should use the same approximate 60/40 identity/attendance split as mobile.'
  );
  assert.match(
    firstPaintCss,
    /> \.detail-hero > \.activity-card \{[\s\S]*?grid-column: 2 !important;[\s\S]*?grid-row: 1 \/ 5 !important;/,
    'Desktop attendance should occupy the centered right side of the navy hero.'
  );
  assert.match(
    firstPaintCss,
    /\.detail-what-to-know \{\s*grid-column: 1 \/ -1 !important;/,
    'What to Know should return to full width now that attendance lives in the hero.'
  );
});

test('desktop CGB Says and You Say share a row when both exist', () => {
  assert.match(
    firstPaintCss,
    /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-editorial \{[\s\S]*?grid-column: 1 \/ 6 !important;/,
    'CGB Says should use the narrower left column when both voice sections exist.'
  );
  assert.match(
    firstPaintCss,
    /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-fan-experiences \{[\s\S]*?grid-column: 6 \/ 13 !important;/,
    'You Say should use the broader right column when both voice sections exist.'
  );
  assert.match(
    firstPaintCss,
    /\.detail-fan-experiences \{[\s\S]*?align-self: stretch !important;[\s\S]*?margin: 0 !important;[\s\S]*?border-top: 1px solid var\(--cgb-neutral-200\) !important;/,
    'The paired You Say column should align cleanly with CGB Says without the stacked-section offset.'
  );
});

test('fan experience quotes do not publish name or year attribution in the profile', () => {
  const createQuoteSource = fanExperiencesSource.match(/function createQuote\([\s\S]*?\n}\n\nfunction placeSection/)?.[0] || '';
  assert.ok(createQuoteSource, 'Expected createQuote renderer to be present.');
  assert.doesNotMatch(createQuoteSource, /display_name|\.year|detail-fan-experiences__attribution/);
  assert.doesNotMatch(fanExperiencesSource, /fanExperienceYear|display_name:|year:/);
});

test('desktop Bear attendance matches the mobile compact hero treatment', () => {
  assert.match(firstPaintCss, /> \.detail-hero > \.activity-card > strong\.bear-count:not\(\.bear-count--empty\) \{[\s\S]*?grid-template-columns: auto auto !important;[\s\S]*?grid-template-rows: auto auto auto !important;[\s\S]*?color: var\(--cgb-white\) !important;/);
  assert.match(firstPaintCss, /> \.detail-hero > \.activity-card > strong\.bear-count \.bear-count__number \{[\s\S]*?grid-row: 1 \/ 4 !important;[\s\S]*?font-size: 2\.25rem !important;/);
  assert.match(firstPaintCss, /> \.detail-hero > \.activity-card > strong\.bear-count \.bear-count__label \{[\s\S]*?grid-row: 1 !important;[\s\S]*?font-size: \.72rem !important;/);
  assert.match(firstPaintCss, /> \.detail-hero > \.activity-card > strong\.bear-count \.bear-count__attending \{[\s\S]*?grid-row: 2 !important;[\s\S]*?font-size: \.6rem !important;/);
  assert.match(firstPaintCss, /> \.detail-hero > \.activity-card > strong\.bear-count \.bear-count__context \{[\s\S]*?grid-row: 3 !important;[\s\S]*?font-size: \.58rem !important;/);
});

test('desktop zero attendance mirrors the text-only mobile hero state', () => {
  assert.match(source, /if \(view\.kind === 'empty'\) \{[\s\S]*?prompt\.textContent = 'BE THE FIRST\.';[\s\S]*?current\.replaceChildren\(prompt\);/);
  assert.doesNotMatch(source, /createIcon\('users'/);
  assert.match(
    firstPaintCss,
    /> \.detail-hero > \.activity-card > strong\.bear-count\.bear-count--empty \.bear-count__prompt \{[\s\S]*?color: var\(--cgb-gold-300\) !important;[\s\S]*?font-size: \.76rem !important;[\s\S]*?font-weight: 900 !important;/,
    'Zero attendance should use the same bold gold invitation as the mobile hero.'
  );
});

test('desktop first paint never exposes a partial enriched profile', () => {
  assert.match(
    watchPartyFormCss,
    /@import url\('\.\/profile-first-paint\.css'\);/,
    'Profile styles must load through a render-blocking stylesheet.'
  );
  assert.match(
    firstPaintCss,
    /#venue-detail\[data-profile-presentation="desktop"\] > \.detail-hero \{[\s\S]*?background: var\(--cgb-navy-950\) !important;[\s\S]*?border-bottom: 3px solid var\(--cgb-gold-400\) !important;/,
    'The universal navy hero must be available in the static profile stylesheet.'
  );
  assert.match(
    firstPaintCss,
    /:not\(:has\(> \.detail-what-to-know\)\) > \* \{[\s\S]*?visibility: hidden !important;/,
    'The hero and body must remain in the same paint boundary until What to Know and its tags exist.'
  );
});

test('desktop profile styling has one static owner', () => {
  assert.doesNotMatch(
    source,
    /installStyles|createElement\('style'\)|cgb-desktop-photo-forward-profile/,
    'Desktop profile styling must not be injected again after first paint.'
  );
  assert.doesNotMatch(
    watchPartyFormSource,
    /syncDesktopProfileFinalBalance|desktop-profile-final-balance/,
    'Watch Party rendering must not trigger a second desktop attendance restyle pass.'
  );
});

test('desktop action buttons gain subtle depth without changing the game selector', () => {
  assert.match(
    fanIntentCss,
    /@media \(min-width: 900px\) \{[\s\S]*?#tray-selected \.action-row > \.primary-button,[\s\S]*?#tray-selected \.action-row > \.secondary-button \{[\s\S]*?0 2px 5px rgba\(1, 1, 51, \.11\);/,
    'Desktop selected-profile actions should have restrained tactile depth.'
  );
  assert.doesNotMatch(
    fanIntentCss,
    /\.game-button/,
    'Fan Intent button styling must not alter the header game selector.'
  );
});

test('What to Know action and profile badges match the approved guide', () => {
  assert.match(
    firstPaintCss,
    /\.detail-what-to-know__header \{[\s\S]*?justify-content: flex-start !important;[\s\S]*?gap: 8px !important;/,
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
  assert.match(
    firstPaintCss,
    /> \.detail-hero \.venue-badge \{[\s\S]*?color: var\(--cgb-gold-300, #ffd15a\) !important;/,
    'Desktop hero badges keep the existing gold treatment unless a badge type overrides it.'
  );
  assert.match(
    firstPaintCss,
    /> \.detail-hero \.venue-badge\.badge--fan-added \{[\s\S]*?color: var\(--cgb-white, #fff\) !important;[\s\S]*?background: transparent !important;[\s\S]*?border: 1px solid var\(--cgb-white, #fff\) !important;/,
    'Fan-Added should be white hollow in the desktop navy hero.'
  );
  assert.match(
    firstPaintCss,
    /\.venue-badge\.badge--fan-added::before \{[\s\S]*?content: none !important;/,
    'The legacy Fan-Added inset pseudo-element must not cover the desktop hero badge.'
  );
});
