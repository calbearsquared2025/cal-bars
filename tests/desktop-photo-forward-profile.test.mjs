import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop with a photo keeps the opening balanced and continues with Watch Party before CGB Says', async () => {
  const [source, enhancement, balance] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/venue-profile-enhancement.mjs'),
    read('js/desktop-profile-final-balance.mjs')
  ]);

  assert.match(enhancement, /import \{ syncDesktopPhotoForwardProfile \} from '\.\/desktop-photo-forward-profile\.mjs'/);
  assert.match(enhancement, /syncDesktopPhotoForwardProfile\(\{ state, documentObject, windowObject \}\)/);
  assert.match(source, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.doesNotMatch(source, /PHOTO_FORWARD_QUERY/);
  assert.match(source, /> \.detail-desktop-opening\s*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-columns:\s*minmax\(0, \.9fr\) minmax\(0, 1\.1fr\)/);
  assert.match(source, /left\.append\(hero, whatToKnow\);[\s\S]*?if \(editorial\) left\.append\(editorial\);[\s\S]*?right\.append\(photo\);[\s\S]*?if \(activity\) right\.append\(activity\);/);
  assert.match(balance, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.match(balance, /\.detail-desktop-opening > \.detail-desktop-opening__left,[\s\S]*?\.detail-desktop-opening > \.detail-desktop-opening__right\s*\{[\s\S]*?display:\s*contents\s*!important;/);
  assert.match(balance, /\.detail-desktop-opening > \.detail-desktop-opening__left > \.detail-hero\s*\{[\s\S]*?grid-row:\s*1\s*!important;[\s\S]*?align-self:\s*stretch\s*!important;/);
  assert.match(balance, /\[data-desktop-photo-forward="true"\] > \.detail-editorial\s*\{[\s\S]*?width:\s*100%\s*!important;[\s\S]*?border-top:\s*1px solid var\(--cgb-neutral-200\)\s*!important;/);
  assert.match(balance, /desktopProfileArrangement = 'identity-what-to-know__photo-attendance__party-editorial-community-contribution'/);
});

test('desktop photo reuses the shared 3:2 cover presentation instead of redefining the crop', async () => {
  const [source, enhancement] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(enhancement, /const VENUE_PHOTO_ASPECT_RATIO = 'var\(--cgb-venue-media-aspect, 3 \/ 2\)'/);
  assert.match(enhancement, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.match(enhancement, /frame\.style\.setProperty\('aspect-ratio', VENUE_PHOTO_ASPECT_RATIO, 'important'\)/);
  assert.match(enhancement, /image\.style\.setProperty\('object-fit', VENUE_PHOTO_OBJECT_FIT, 'important'\)/);
  assert.doesNotMatch(source, /setProperty\('aspect-ratio'/);
  assert.doesNotMatch(source, /setProperty\('object-fit'/);
});

test('all desktop widths use the expanded profile while mobile aligns its media-forward placement', async () => {
  const [source, enhancement, mobileSource, mobileContinuation] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/venue-profile-enhancement.mjs'),
    read('js/fan-experiences.mjs'),
    read('js/mobile-selected-profile-continuation.mjs')
  ]);

  assert.match(source, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.match(enhancement, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.doesNotMatch(enhancement, /WIDE_DESKTOP_QUERY/);
  assert.doesNotMatch(source, /1180px/);
  assert.doesNotMatch(source, /@media \(max-width: 899px\)/);
  assert.match(enhancement, /const VENUE_PHOTO_ASPECT_RATIO = 'var\(--cgb-venue-media-aspect, 3 \/ 2\)'/);
  assert.match(enhancement, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.doesNotMatch(source, /'4 \/ 3'/);
  assert.doesNotMatch(source, /'contain'/);
  assert.match(source, /unwrapDesktopOpening\(detail\);[\s\S]*?if \(!isDesktopProfile\(detail, windowObject\)\) return false;/);
  assert.match(source, /const photoForward = Boolean\(photo\);/);
  assert.match(mobileSource, /section\.dataset\.mobileWhatToKnow = 'true'/);
  assert.doesNotMatch(mobileSource, /placeMobileDeferredPhoto/);
  assert.match(mobileContinuation, /media\.classList\.add\(isPhoto \? 'detail-photo--mobile-opening' : 'detail-local-map--mobile-opening'\)/);
  assert.match(mobileContinuation, /card\.dataset\.mobileMediaForward = 'true'/);
});

test('desktop with no photo uses the existing local map as the photo-slot fallback without DOM reparenting', async () => {
  const [source, balance] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/desktop-profile-final-balance.mjs')
  ]);

  assert.match(source, /const photoForward = Boolean\(photo\);/);
  assert.match(source, /if \(!photoForward\) \{[\s\S]*?arrangeStandardHierarchy\(/);
  assert.match(balance, /const localMap = detail\.querySelector\(':scope > \.detail-local-map'\)/);
  assert.match(balance, /detail\.dataset\.desktopFallbackMap = 'true'/);
  assert.match(balance, /\[data-desktop-fallback-map="true"\] > \.detail-hero\.detail-hero--no-photo\s*\{[\s\S]*?grid-row:\s*1\s*!important;[\s\S]*?align-self:\s*stretch\s*!important;/);
  assert.match(balance, /\[data-desktop-fallback-map="true"\] > \.detail-local-map\s*\{[\s\S]*?grid-column:\s*2\s*!important;[\s\S]*?grid-row:\s*1\s*!important;[\s\S]*?aspect-ratio:\s*3 \/ 2\s*!important;[\s\S]*?margin:\s*0\s*!important;/);
  assert.match(balance, /\[data-desktop-fallback-map="true"\] > \.detail-what-to-know\s*\{[\s\S]*?grid-column:\s*1\s*!important;[\s\S]*?grid-row:\s*2\s*!important;/);
  assert.match(balance, /desktopProfileArrangement = 'identity-what-to-know__map-attendance__party-editorial-community-contribution'/);
  assert.doesNotMatch(balance, /append\(hero|append\(localMap|insertBefore\(/);
});

test('desktop photo is not duplicated below the opening area', async () => {
  const source = await read('js/desktop-photo-forward-profile.mjs');
  const arrange = source.match(/function arrangeHierarchy\([\s\S]*?\n\}/)?.[0] || '';

  assert.match(arrange, /right\.append\(photo\)/);
  assert.match(arrange, /let cursor = opening;[\s\S]*?parties\.forEach/);
  assert.doesNotMatch(arrange, /let cursor = opening;[\s\S]*?placeAfter\(cursor, photo\)/);
  assert.match(arrange, /if \(localMap\) \{[\s\S]*?cursor = placeAfter\(cursor, localMap\);/);
});

test('desktop final hierarchy matches mobile for both real and empty Watch Party states', async () => {
  const [source, balance, watchPartyForm] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/desktop-profile-final-balance.mjs'),
    read('js/watch-party-form.js')
  ]);

  assert.match(source, /title\.textContent = 'WHAT TO KNOW'/);
  assert.match(source, /venueTagsForVenue\(venue\)/);
  assert.match(source, /link\.textContent = 'Add info →'/);
  assert.match(source, /CGBSnapshotRefresh\?\.refresh\?\.\(\)/);
  assert.match(source, /> \.detail-fan-experiences > \[data-venue-tags\]\s*\{[\s\S]*?display:\s*none\s*!important;/);
  assert.match(balance, /querySelectorAll\(':scope > \.party-module, :scope > \[data-watch-party-form-section\]'\)/);
  assert.match(balance, /function syncDesktopProfileOrder\(detail\)[\s\S]*?partySections\.forEach\(\(partySection\) => \{ cursor = placeAfter\(cursor, partySection\); \}\);[\s\S]*?cursor = placeAfter\(cursor, editorial\);[\s\S]*?placeAfter\(cursor, community\);/);
  assert.match(balance, /opening\?\.querySelector\(':scope > \.detail-desktop-opening__left > \.detail-editorial'\)/);
  assert.match(balance, /\[data-desktop-fallback-map="true"\] > \.detail-editorial\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;[\s\S]*?grid-row:\s*auto\s*!important;/);
  assert.match(watchPartyForm, /import \{ syncDesktopProfileFinalBalance \} from '\.\/desktop-profile-final-balance\.mjs'/);
  assert.match(watchPartyForm, /maintenance\.before\(section\);[\s\S]*?syncDesktopProfileFinalBalance\(\{ detail, documentObject, windowObject \}\);/);
});

test('desktop attendance uses a large count with stacked supporting copy opposite What to know', async () => {
  const [source, balance] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/desktop-profile-final-balance.mjs')
  ]);

  assert.match(source, /selectedAttendanceViewModel\(\{ state, game, venue \}\)/);
  assert.match(source, /label\.textContent = view\.number === 1 \? 'BEAR' : 'BEARS'/);
  assert.match(source, /attending\.textContent = 'ATTENDING'/);
  assert.match(source, /context\.textContent = 'ON CGB'/);
  assert.match(source, /\.bear-count__number\s*\{[\s\S]*?font-size:\s*1\.9rem\s*!important;/);
  assert.match(balance, /\[data-desktop-photo-forward="true"\][\s\S]*?> \.activity-card\s*\{[\s\S]*?grid-row:\s*2\s*!important;[\s\S]*?align-self:\s*stretch\s*!important;[\s\S]*?padding:\s*12px 18px 12px 32px\s*!important;/);
  assert.match(balance, /\[data-desktop-fallback-map="true"\] > \.activity-card\s*\{[\s\S]*?grid-row:\s*2\s*!important;[\s\S]*?align-self:\s*stretch\s*!important;[\s\S]*?padding:\s*12px 18px 12px 32px\s*!important;/);
  assert.match(balance, /\.activity-card > strong\.bear-count:not\(\.bear-count--empty\)\s*\{[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-rows:\s*repeat\(3, auto\)/);
});

test('desktop bold hybrid uses a navy identity hero, edge-to-edge 3:2 media, and a subtle photo feather', async () => {
  const balance = await read('js/desktop-profile-final-balance.mjs');

  assert.match(balance, /\.detail-desktop-opening\s*\{[\s\S]*?background:\s*var\(--cgb-navy-950\)/);
  assert.match(balance, /\.detail-hero h1\s*\{[\s\S]*?font-size:\s*clamp\(2rem, 3\.15vw, 2\.8rem\)[\s\S]*?overflow-wrap:\s*break-word\s*!important;[\s\S]*?word-break:\s*normal\s*!important;[\s\S]*?text-transform:\s*uppercase/);
  assert.match(balance, /> \.detail-photo::before\s*\{[\s\S]*?width:\s*14%;[\s\S]*?linear-gradient\(90deg, var\(--cgb-navy-950\), rgba\(1, 1, 51, 0\)\)/);
  assert.match(balance, /> \.detail-photo \.detail-photo__frame\s*\{[\s\S]*?border-radius:\s*0\s*!important;/);
});

test('desktop selected panel and map controls share one responsive width from 900px up', async () => {
  const [source, profileCss, mobilePolish] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('css/venue-profile.css'),
    read('css/mobile-polish.css')
  ]);

  assert.match(source, /const PHOTO_FORWARD_PANEL_WIDTH = 'clamp\(500px, 52vw, 620px\)'/);
  assert.match(source, /@media \(min-width: 900px\)[\s\S]*?#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*\$\{PHOTO_FORWARD_PANEL_WIDTH\}\s*!important;/);
  assert.match(source, /\.mobile-command-bar\s*\{[\s\S]*?width:\s*\$\{PHOTO_FORWARD_PANEL_WIDTH\}\s*!important;/);
  assert.match(source, /\.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(\$\{PHOTO_FORWARD_PANEL_WIDTH\} \+ 26px\)\s*!important;/);
  assert.match(source, /> \.map-actions\s*\{[\s\S]*?right:\s*calc\(\$\{PHOTO_FORWARD_PANEL_WIDTH\} \+ 36px\)\s*!important;/);
  assert.match(profileCss, /@media \(min-width: 900px\)[\s\S]*?#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*clamp\(500px, 52vw, 620px\)\s*!important;/);
  assert.doesNotMatch(profileCss, /@media \(min-width: 1100px\)/);
  assert.match(mobilePolish, /@media \(min-width: 900px\)[\s\S]*?\.map-view:has\(> #venue-tray\.venue-tray\.tray--selected\) > \.map-actions\s*\{[\s\S]*?right:\s*calc\(clamp\(500px, 52vw, 620px\) \+ 36px\);/);
  assert.doesNotMatch(mobilePolish, /@media \(min-width: 1100px\)/);
});
