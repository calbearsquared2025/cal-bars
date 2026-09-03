import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop uses one full-width identity hero without a split media opening', async () => {
  const [source, enhancement, balance] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/venue-profile-enhancement.mjs'),
    read('js/desktop-profile-final-balance.mjs')
  ]);

  assert.match(enhancement, /hero\.classList\.add\('detail-hero--identity'\)/);
  assert.match(enhancement, /background:\s*var\(--cgb-navy-950\)\s*!important;/);
  assert.match(enhancement, /border-bottom:\s*3px solid var\(--cgb-gold-400\)\s*!important;/);
  assert.match(enhancement, /font-family:\s*var\(--font-condensed/);
  assert.match(enhancement, /font-weight:\s*900\s*!important;/);
  assert.match(enhancement, /fonts\.googleapis\.com\/css2\?family=Barlow\+Condensed/);
  assert.doesNotMatch(source, /createDesktopOpening/);
  assert.doesNotMatch(source, /detail-desktop-opening__left/);
  assert.doesNotMatch(source, /grid-template-columns:\s*minmax\(0, \.9fr\) minmax\(0, 1\.1fr\)/);
  assert.match(balance, /delete detail\.dataset\.desktopFallbackMap/);
  assert.doesNotMatch(balance, /desktopFallbackMap\s*=\s*'true'/);
});

test('desktop approved photo remains 3:2 cover but is supporting content below community voices', async () => {
  const [source, enhancement, balance] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/venue-profile-enhancement.mjs'),
    read('js/desktop-profile-final-balance.mjs')
  ]);

  assert.match(enhancement, /const VENUE_PHOTO_ASPECT_RATIO = '3 \/ 2'/);
  assert.match(enhancement, /const VENUE_PHOTO_OBJECT_FIT = 'cover'/);
  assert.match(enhancement, /figure\.className = 'detail-photo detail-photo--supporting'/);
  assert.match(enhancement, /image\.loading = 'lazy'/);
  assert.match(source, /cursor = placeAfter\(cursor, community\);[\s\S]*?cursor = placeAfter\(cursor, photo\);[\s\S]*?placeAfter\(cursor, contribution\)/);
  assert.match(balance, /cursor = placeAfter\(cursor, community\);[\s\S]*?cursor = placeAfter\(cursor, photo\);[\s\S]*?placeAfter\(cursor, contribution\)/);
  assert.match(source, /photo\.classList\.remove\('detail-photo--desktop-opening'\)/);
  assert.doesNotMatch(source, /classList\.add\([^\n]*detail-photo--desktop-opening/);
});

test('desktop no-photo state has no reserved map or media fallback', async () => {
  const [source, enhancement, balance] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/venue-profile-enhancement.mjs'),
    read('js/desktop-profile-final-balance.mjs')
  ]);

  assert.doesNotMatch(enhancement, /createLocalMapFallback/);
  assert.doesNotMatch(enhancement, /ensureLocalMapFallback/);
  assert.match(enhancement, /querySelectorAll\(':scope > \.detail-local-map, :scope > \.detail-hero > \.detail-local-map'\)\.forEach\(\(map\) => map\.remove\(\)\)/);
  assert.match(source, /querySelectorAll\(':scope > \.detail-local-map, :scope > \.detail-hero > \.detail-local-map'\)\.forEach\(\(map\) => map\.remove\(\)\)/);
  assert.match(balance, /querySelectorAll\(':scope > \.detail-local-map, :scope > \.detail-hero > \.detail-local-map'\)\.forEach\(\(map\) => map\.remove\(\)\)/);
  assert.doesNotMatch(balance, /aspect-ratio:\s*3 \/ 2/);
});

test('desktop keeps What to know, attendance, Watch Party, editorial, community and contribution order', async () => {
  const [source, balance, watchPartyForm] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('js/desktop-profile-final-balance.mjs'),
    read('js/watch-party-form.js')
  ]);

  assert.match(source, /title\.textContent = 'WHAT TO KNOW'/);
  assert.match(source, /venueTagsForVenue\(venue\)/);
  assert.match(source, /link\.textContent = 'Add info →'/);
  assert.match(source, /selectedAttendanceViewModel\(\{ state, game, venue \}\)/);
  assert.match(source, /desktopProfileArrangement = 'identity-what-to-know-attendance-party-editorial-community-photo-contribution'/);
  assert.match(balance, /cursor = placeAfter\(cursor, whatToKnow\);[\s\S]*?cursor = placeAfter\(cursor, activity\);[\s\S]*?partySections\.forEach/);
  assert.match(balance, /cursor = placeAfter\(cursor, editorial\);[\s\S]*?cursor = placeAfter\(cursor, community\);/);
  assert.match(watchPartyForm, /syncDesktopProfileFinalBalance\(\{ detail, documentObject, windowObject \}\)/);
});

test('desktop selected panel and map controls retain the existing responsive width', async () => {
  const [source, profileCss, mobilePolish] = await Promise.all([
    read('js/desktop-photo-forward-profile.mjs'),
    read('css/venue-profile.css'),
    read('css/mobile-polish.css')
  ]);

  assert.match(source, /const PHOTO_FORWARD_PANEL_WIDTH = 'clamp\(500px, 52vw, 620px\)'/);
  assert.match(source, /#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*\$\{PHOTO_FORWARD_PANEL_WIDTH\}\s*!important;/);
  assert.match(source, /\.mobile-command-bar\s*\{[\s\S]*?width:\s*\$\{PHOTO_FORWARD_PANEL_WIDTH\}\s*!important;/);
  assert.match(source, /\.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(\$\{PHOTO_FORWARD_PANEL_WIDTH\} \+ 26px\)\s*!important;/);
  assert.match(profileCss, /width:\s*clamp\(500px, 52vw, 620px\)\s*!important;/);
  assert.match(mobilePolish, /right:\s*calc\(clamp\(500px, 52vw, 620px\) \+ 36px\);/);
});
