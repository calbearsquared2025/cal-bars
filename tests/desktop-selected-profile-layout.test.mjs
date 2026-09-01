import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop expands the selected profile and its navigation together while keeping browse width unchanged', async () => {
  const [shellCss, profileCss] = await Promise.all([
    read('css/design-board-4.css'),
    read('css/venue-profile.css')
  ]);

  assert.match(shellCss, /\.venue-tray\s*\{[\s\S]*?width:\s*min\(390px, 34vw\);/);
  assert.match(profileCss, /@media \(min-width: 900px\)[\s\S]*?#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*clamp\(500px, 52vw, 620px\)\s*!important;/);
  assert.match(profileCss, /body\[data-view="map"\]:has\(#map-view > #venue-tray\.venue-tray\.tray--selected\) \.mobile-command-bar\s*\{[\s\S]*?width:\s*clamp\(500px, 52vw, 620px\)\s*!important;/);
  assert.match(profileCss, /\.map-view:has\(> #venue-tray\.venue-tray\.tray--selected\) \.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(clamp\(500px, 52vw, 620px\) \+ 26px\)\s*!important;/);
  assert.doesNotMatch(profileCss, /@media \(min-width: 1100px\)/);
});

test('desktop tray width and map controls animate together with reduced-motion support', async () => {
  const source = await read('js/icon-upgrade.mjs');
  const motionBlock = source.match(/function syncDesktopTrayMotion\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(source, /const REDUCED_MOTION_QUERY = '\(prefers-reduced-motion: reduce\)'/);
  assert.match(source, /const DESKTOP_TRAY_MOTION_DURATION = '210ms'/);
  assert.match(source, /const DESKTOP_TRAY_MOTION_EASING = 'cubic-bezier\(\.16, 1, \.3, 1\)'/);
  assert.match(source, /function syncDesktopTrayMotion\(\)/);
  assert.match(source, /const locate = document\.querySelector\('#map-view > \.map-actions'\)/);
  assert.match(source, /setDesktopTransition\(tray, 'width', wideDesktop, reduceMotion\)/);
  assert.match(source, /setDesktopTransition\(controls, 'right', wideDesktop, reduceMotion\)/);
  assert.match(source, /setDesktopTransition\(locate, 'right', wideDesktop, reduceMotion\)/);
  assert.match(source, /element\.style\.transitionProperty = reduceMotion \? 'none' : property/);
  assert.match(source, /window\.matchMedia\?\.\(REDUCED_MOTION_QUERY\)\?\.addEventListener\?\.\('change', scheduleUpgrade\)/);
  assert.ok(motionBlock);
  assert.doesNotMatch(motionBlock, /document\.createElement\('style'\)/);
});

test('desktop pairs venue identity evenly with a full-height CGB Says surface while its gold rule tracks only editorial content', async () => {
  const [css, iconSource, profileSource] = await Promise.all([
    read('css/venue-profile.css'),
    read('js/icon-upgrade.mjs'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(css, /grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(css, /:has\(> \.detail-editorial\) > \.detail-hero\.detail-hero--has-photo,[\s\S]*?grid-column:\s*1 \/ 7\s*!important;[\s\S]*?grid-row:\s*1\s*!important;/);
  assert.match(css, /> \.detail-editorial\s*\{[\s\S]*?grid-column:\s*7 \/ 13\s*!important;[\s\S]*?grid-row:\s*1\s*!important;[\s\S]*?align-self:\s*stretch;[\s\S]*?display:\s*grid\s*!important;[\s\S]*?grid-template-rows:\s*auto auto minmax\(0, 1fr\);[\s\S]*?border-left:\s*0\s*!important;/);
  assert.match(css, /> \.detail-editorial::before\s*\{[\s\S]*?position:\s*static;[\s\S]*?grid-row:\s*1 \/ 3;[\s\S]*?align-self:\s*stretch;[\s\S]*?bottom:\s*auto;/);
  assert.match(css, /> \.detail-editorial > h2\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*1;/);
  assert.match(css, /> \.detail-editorial > \.detail-editorial__copy\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*2;/);
  assert.match(css, /:has\(> \.detail-hero > \.venue-badges > \*\) > \.detail-editorial\s*\{[\s\S]*?padding-top:\s*34px\s*!important;/);
  assert.doesNotMatch(css, /:has\(> \.detail-hero > \.venue-badges > \*\) > \.detail-editorial::before/);
  assert.match(profileSource, /function arrangeDesktopVenueIdentity/);
  assert.doesNotMatch(profileSource, /WIDE_DESKTOP_QUERY/);
  assert.doesNotMatch(iconSource, /syncDesktopProfileAttendance/);
  assert.doesNotMatch(iconSource, /detail-attendance-compact/);
  assert.doesNotMatch(css, /activity-card--desktop-attendance/);
});

test('desktop address keeps distance and Directions with locality without extra row spacing', async () => {
  const [css, source] = await Promise.all([
    read('css/venue-profile.css'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(source, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.match(source, /getWatchParty, haversineMiles/);
  assert.match(source, /function desktopDistanceCopy/);
  assert.match(source, /origin\?\.label !== 'your location'/);
  assert.match(source, /haversineMiles\(/);
  assert.match(source, /detail-address__street/);
  assert.match(source, /detail-address__locality-row/);
  assert.match(source, /detail-address__distance-group/);
  assert.match(source, /detail-address__directions-group/);
  assert.match(source, /address\.dataset\.desktopDistance = distanceCopy/);
  assert.match(source, /address\.replaceChildren\(location\)/);
  assert.match(css, /\.detail-address__location\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*0;/);
  assert.match(css, /\.detail-address__locality-row\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?row-gap:\s*0;/);
  assert.match(css, /\.detail-address__distance-group,[\s\S]*?\.detail-address__directions-group\s*\{[\s\S]*?white-space:\s*nowrap;/);
});

test('desktop Locations remains navy when Selected is active without changing tab behavior', async () => {
  const css = await read('css/mobile-polish.css');

  assert.match(css, /@media \(min-width: 900px\)[\s\S]*?#mobile-list-button\s*\{[\s\S]*?color:\s*var\(--cgb-navy-950\)\s*!important;/);
  assert.doesNotMatch(css, /#mobile-list-button\s*\{[\s\S]*?pointer-events:\s*none/);
});

test('desktop keeps Locate me beside the expanded tray', async () => {
  const css = await read('css/mobile-polish.css');

  assert.match(css, /@media \(min-width: 900px\)[\s\S]*?\.map-view:has\(> #venue-tray\.venue-tray\.tray--selected\) > \.map-actions\s*\{[\s\S]*?right:\s*calc\(clamp\(500px, 52vw, 620px\) \+ 36px\);/);
  assert.doesNotMatch(css, /@media \(min-width: 1100px\)/);
});

test('desktop pins venue identity and CGB Says while Watch Party content scrolls normally', async () => {
  const [profileCss, partyCss] = await Promise.all([
    read('css/venue-profile.css'),
    read('css/watch-party-display.css')
  ]);

  assert.match(profileCss, /> \.detail-hero\.detail-hero--has-photo,[\s\S]*?> \.detail-hero\.detail-hero--no-photo\s*\{[\s\S]*?position:\s*sticky\s*!important;[\s\S]*?top:\s*0\s*!important;/);
  assert.match(profileCss, /> \.detail-editorial\s*\{[\s\S]*?position:\s*sticky\s*!important;[\s\S]*?top:\s*0\s*!important;/);
  assert.match(partyCss, /@media \(min-width: 900px\)[\s\S]*?#tray-selected > #venue-detail > \.party-module\.party-module--multiple \.party-module__title\s*\{[\s\S]*?position:\s*static;/);
});

test('desktop watch party uses structured two-column metadata and full-width supporting content', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /> \.party-module\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(150px, \.82fr\)\s*!important;[\s\S]*?column-gap:\s*26px\s*!important;/);
  assert.match(css, /> \.party-module > \.party-game-context::before\s*\{[\s\S]*?content:\s*'GAME';/);
  assert.match(css, /> \.party-module > \.party-module__host\s*\{[\s\S]*?text-transform:\s*uppercase;/);
  assert.match(css, /> \.party-module > \.party-module__host strong\s*\{[\s\S]*?text-transform:\s*none;/);
  assert.match(css, /> \.party-module > \.party-module__title,[\s\S]*?> \.party-module > \.party-module__report\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;/);
});

test('desktop keeps attendance horizontal without divider rules and community voices below it', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /> \.activity-card\s*\{[\s\S]*?padding:\s*11px 18px\s*!important;[\s\S]*?border-top:\s*0\s*!important;/);
  assert.match(css, /> \.activity-card > strong\s*\{[\s\S]*?display:\s*block\s*!important;[\s\S]*?font-size:\s*\.8rem\s*!important;/);
  assert.match(css, /> \.activity-card > \.activity-card__presence\s*\{[\s\S]*?display:\s*none\s*!important;/);
  assert.match(css, /> \.detail-fan-experiences\s*\{[\s\S]*?border-top:\s*0\s*!important;/);
});

test('desktop order is identity, CGB Says, watch party, attendance, Bears Say, then media before final balancing', async () => {
  const [css, source] = await Promise.all([
    read('css/venue-profile.css'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(source, /detail\.dataset\.desktopProfileArrangement = 'identity-editorial-party-attendance-community-media'/);
  assert.match(source, /let cursor = hero;/);
  assert.match(source, /if \(editorial\) \{[\s\S]*?cursor\.after\(editorial\);[\s\S]*?cursor = editorial;/);
  assert.match(source, /parties\.forEach\(\(party\) => \{[\s\S]*?cursor\.after\(party\);[\s\S]*?cursor = party;/);
  assert.match(source, /if \(activity\) \{[\s\S]*?cursor\.after\(activity\);[\s\S]*?cursor = activity;/);
  assert.match(source, /if \(fanExperiences\) \{[\s\S]*?cursor\.after\(fanExperiences\);[\s\S]*?cursor = fanExperiences;/);
  assert.match(source, /media\.classList\.add\('detail-profile-media--desktop'\)/);
  assert.match(source, /cursor\.after\(media\)/);
  assert.match(css, /> \.detail-photo\.detail-profile-media--desktop\s*\{[\s\S]*?width:\s*calc\(100% - 36px\)\s*!important;/);
  assert.match(css, /> \.detail-local-map\.detail-profile-media--desktop\s*\{[\s\S]*?height:\s*220px\s*!important;/);
});

test('existing Watch Party contribution becomes the second Help improve action', async () => {
  const [watchPartySource, listingSource, watchPartyCss] = await Promise.all([
    read('js/watch-party-form.js'),
    read('js/listing-update.js'),
    read('css/watch-party-form.css')
  ]);

  assert.match(watchPartySource, /function createAdditionalWatchPartyAction/);
  assert.match(watchPartySource, /link\.className = 'detail-contribution__action'/);
  assert.match(watchPartySource, /link\.textContent = 'Add another Watch Party'/);
  assert.match(watchPartySource, /const secondAction = actions\.children\[1\] \|\| null/);
  assert.match(watchPartySource, /actions\.insertBefore\(link, secondAction\)/);
  assert.doesNotMatch(watchPartySource, /detail-watch-party-cta--additional/);
  assert.doesNotMatch(watchPartySource, /Another watch party\?/);
  assert.doesNotMatch(watchPartyCss, /detail-watch-party-cta--additional/);
  assert.match(listingSource, /'Add or update location details'/);
});