import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('wide desktop with a photo uses independent opening columns so What to know can rise under venue identity', async () => {
  const [source, enhancement] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(enhancement, /import \{ syncDesktopPhotoForwardProfile \} from '\.\/desktop-photo-forward-profile\.mjs'/);
  assert.match(enhancement, /syncDesktopPhotoForwardProfile\(\{ state, documentObject, windowObject \}\)/);
  assert.match(source, /const PHOTO_FORWARD_QUERY = '\(min-width: 1180px\)'/);
  assert.match(source, /> \.detail-desktop-opening\s*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*minmax\(0, \.9fr\) minmax\(0, 1\.1fr\)/);
  assert.match(source, /left\.append\(hero, whatToKnow\);[\s\S]*?right\.append\(photo\);[\s\S]*?right\.append\(editorial\);[\s\S]*?right\.append\(activity\);/);
  assert.match(source, /desktopProfileArrangement = 'identity-what-to-know__photo-editorial-attendance__party-community-contribution'/);
});

test('wide desktop photo keeps a fixed 3:2 presentation frame with a sensible crop', async () => {
  const source = await read('js/desktop-photo-forward-profile.mjs');

  assert.match(source, /detail-photo--desktop-opening \.detail-photo__frame\s*\{[\s\S]*?aspect-ratio:\s*3 \/ 2\s*!important;/);
  assert.match(source, /detail-photo--desktop-opening \.detail-photo__image\s*\{[\s\S]*?object-fit:\s*cover\s*!important;[\s\S]*?object-position:\s*center\s*!important;/);
  assert.match(source, /frame\?\.style\?\.setProperty\('aspect-ratio', '3 \/ 2', 'important'\)/);
  assert.match(source, /image\?\.style\?\.setProperty\('object-fit', 'cover', 'important'\)/);
});

test('narrow desktop and mobile retain the existing photo presentation contract', async () => {
  const [source, mobileSource] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/fan-experiences.mjs')
  ]);

  assert.match(source, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.doesNotMatch(source, /@media \(max-width: 899px\)/);
  assert.match(source, /frame\?\.style\?\.setProperty\('aspect-ratio', '4 \/ 3', 'important'\)/);
  assert.match(source, /image\?\.style\?\.setProperty\('object-fit', 'contain', 'important'\)/);
  assert.match(source, /unwrapDesktopOpening\(detail\);[\s\S]*?if \(!isDesktopProfile\(detail, windowObject\)\) return false;/);
  assert.match(mobileSource, /section\.dataset\.mobileWhatToKnow = 'true'/);
  assert.match(mobileSource, /placeMobileDeferredPhoto\(detail, section\)/);
});

test('wide desktop with no photo retains the compact grid and reserves no photo slot', async () => {
  const source = await read('js/desktop-photo-forward-profile.mjs');

  assert.match(source, /const photoForward = Boolean\(photo && wideOpening\);/);
  assert.match(source, /if \(!photoForward\) \{[\s\S]*?arrangeStandardHierarchy\(/);
  assert.match(source, /\[data-desktop-photo-forward="false"\]\s*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:/);
  assert.match(source, /\[data-desktop-photo-forward="false"\] > \.detail-hero\.detail-hero--no-photo\s*\{[\s\S]*?grid-column:\s*1\s*!important;[\s\S]*?grid-row:\s*1 \/ span 2\s*!important;/);
  assert.match(source, /\[data-desktop-photo-forward="false"\] > \.detail-what-to-know\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;/);
  assert.doesNotMatch(source, /detail-desktop-opening__right[^\n]*min-height:/);
});

test('desktop photo is not duplicated below the opening area', async () => {
  const source = await read('js/desktop-photo-forward-profile.mjs');
  const arrange = source.match(/function arrangeHierarchy\([\s\S]*?\n\}/)?.[0] || '';

  assert.match(arrange, /right\.append\(photo\)/);
  assert.match(arrange, /let cursor = opening;[\s\S]*?parties\.forEach/);
  assert.doesNotMatch(arrange, /let cursor = opening;[\s\S]*?placeAfter\(cursor, photo\)/);
  assert.match(arrange, /if \(localMap\) \{[\s\S]*?cursor = placeAfter\(cursor, localMap\);/);
});

test('desktop What to know stays before Watch Party and keeps persistent tags out of You Say visually', async () => {
  const source = await read('js/desktop-photo-forward-profile.mjs');

  assert.match(source, /title\.textContent = 'WHAT TO KNOW'/);
  assert.match(source, /venueTagsForVenue\(venue\)/);
  assert.match(source, /link\.textContent = 'Add info →'/);
  assert.match(source, /CGBSnapshotRefresh\?\.refresh\?\.\(\)/);
  assert.match(source, /> \.detail-fan-experiences > \[data-venue-tags\]\s*\{[\s\S]*?display:\s*none\s*!important;/);
  assert.match(source, /left\.append\(hero, whatToKnow\);[\s\S]*?let cursor = opening;[\s\S]*?parties\.forEach/);
  assert.match(source, /arrangeStandardHierarchy\([\s\S]*?cursor = placeAfter\(cursor, whatToKnow\);[\s\S]*?parties\.forEach/);
});

test('desktop attendance reuses the approved large-number BEAR(S) ATTENDING ON CGB treatment', async () => {
  const source = await read('js/desktop-photo-forward-profile.mjs');

  assert.match(source, /selectedAttendanceViewModel\(\{ state, game, venue \}\)/);
  assert.match(source, /label\.textContent = view\.number === 1 \? 'BEAR' : 'BEARS'/);
  assert.match(source, /attending\.textContent = 'ATTENDING'/);
  assert.match(source, /context\.textContent = 'ON CGB'/);
  assert.match(source, /\.bear-count__number\s*\{[\s\S]*?font-size:\s*1\.9rem\s*!important;/);
});

test('photo-forward desktop keeps the selected panel width and map controls aligned', async () => {
  const source = await read('js/desktop-photo-forward-profile.mjs');

  assert.match(source, /const PHOTO_FORWARD_PANEL_WIDTH = 'clamp\(580px, 42vw, 620px\)'/);
  assert.match(source, /@media \(min-width: 1180px\)[\s\S]*?#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*\$\{PHOTO_FORWARD_PANEL_WIDTH\}\s*!important;/);
  assert.match(source, /\.mobile-command-bar\s*\{[\s\S]*?width:\s*\$\{PHOTO_FORWARD_PANEL_WIDTH\}\s*!important;/);
  assert.match(source, /\.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(\$\{PHOTO_FORWARD_PANEL_WIDTH\} \+ 26px\)\s*!important;/);
  assert.match(source, /> \.map-actions\s*\{[\s\S]*?right:\s*calc\(\$\{PHOTO_FORWARD_PANEL_WIDTH\} \+ 36px\)\s*!important;/);
});
