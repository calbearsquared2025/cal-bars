import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('wide desktop expands only the selected profile and keeps browse width unchanged', async () => {
  const [shellCss, profileCss] = await Promise.all([
    read('css/design-board-4.css'),
    read('css/venue-profile.css')
  ]);

  assert.match(shellCss, /\.venue-tray\s*\{[\s\S]*?width:\s*min\(390px, 34vw\);/);
  assert.match(profileCss, /@media \(min-width: 1100px\)[\s\S]*?#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*clamp\(500px, 36vw, 520px\)\s*!important;/);
  assert.match(profileCss, /\.map-view:has\(> #venue-tray\.venue-tray\.tray--selected\) \.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(clamp\(500px, 36vw, 520px\) \+ 26px\)\s*!important;/);
});

test('wide desktop tray width and map controls animate together with reduced-motion support', async () => {
  const source = await read('js/icon-upgrade.mjs');

  assert.match(source, /const REDUCED_MOTION_QUERY = '\(prefers-reduced-motion: reduce\)'/);
  assert.match(source, /const DESKTOP_TRAY_MOTION_DURATION = '210ms'/);
  assert.match(source, /const DESKTOP_TRAY_MOTION_EASING = 'cubic-bezier\(\.16, 1, \.3, 1\)'/);
  assert.match(source, /function syncDesktopTrayMotion\(\)/);
  assert.match(source, /setDesktopTransition\(tray, 'width', wideDesktop, reduceMotion\)/);
  assert.match(source, /setDesktopTransition\(controls, 'right', wideDesktop, reduceMotion\)/);
  assert.match(source, /element\.style\.transitionProperty = reduceMotion \? 'none' : property/);
  assert.match(source, /window\.matchMedia\?\.\(REDUCED_MOTION_QUERY\)\?\.addEventListener\?\.\('change', scheduleUpgrade\)/);
  assert.doesNotMatch(source, /document\.createElement\('style'\)/);
});

test('wide desktop pairs venue identity evenly with CGB Says and keeps the editorial accent content-height', async () => {
  const [css, iconSource, profileSource] = await Promise.all([
    read('css/venue-profile.css'),
    read('js/icon-upgrade.mjs'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(css, /grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(css, /:has\(> \.detail-editorial\) > \.detail-hero\.detail-hero--has-photo,[\s\S]*?grid-column:\s*1 \/ 7\s*!important;[\s\S]*?grid-row:\s*1\s*!important;/);
  assert.match(css, /> \.detail-editorial\s*\{[\s\S]*?grid-column:\s*7 \/ 13\s*!important;[\s\S]*?grid-row:\s*1\s*!important;[\s\S]*?align-self:\s*start;[\s\S]*?border-left:\s*0\s*!important;/);
  assert.match(css, /> \.detail-editorial::before\s*\{[\s\S]*?top:\s*12px;[\s\S]*?bottom:\s*12px;/);
  assert.match(profileSource, /function arrangeDesktopVenueIdentity/);
  assert.doesNotMatch(iconSource, /syncDesktopProfileAttendance/);
  assert.doesNotMatch(iconSource, /detail-attendance-compact/);
  assert.doesNotMatch(css, /activity-card--desktop-attendance/);
});

test('wide desktop address keeps Directions with locality and allows the row to wrap', async () => {
  const [css, source] = await Promise.all([
    read('css/venue-profile.css'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(source, /detail-address__street/);
  assert.match(source, /detail-address__locality-row/);
  assert.match(source, /detail-address__directions-group/);
  assert.match(source, /separator\.textContent = '·'/);
  assert.match(source, /directionsGroup\.append\(directions\)/);
  assert.match(source, /address\.replaceChildren\(location\)/);
  assert.match(css, /\.detail-address__locality-row\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(css, /\.detail-address__directions-group\s*\{[\s\S]*?white-space:\s*nowrap;/);
});

test('wide desktop watch party uses structured two-column metadata and full-width supporting content', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /> \.party-module\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(150px, \.82fr\)\s*!important;[\s\S]*?column-gap:\s*26px\s*!important;/);
  assert.match(css, /> \.party-module > \.party-game-context::before\s*\{[\s\S]*?content:\s*'GAME';/);
  assert.match(css, /> \.party-module > \.party-module__host\s*\{[\s\S]*?text-transform:\s*uppercase;/);
  assert.match(css, /> \.party-module > \.party-module__host strong\s*\{[\s\S]*?text-transform:\s*none;/);
  assert.match(css, /> \.party-module > \.party-module__title,[\s\S]*?> \.party-module > \.party-module__report\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;/);
});

test('wide desktop keeps attendance horizontal and community voices below the watch party', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /> \.activity-card\s*\{[\s\S]*?padding:\s*11px 18px\s*!important;/);
  assert.match(css, /> \.activity-card > strong\s*\{[\s\S]*?display:\s*block\s*!important;[\s\S]*?font-size:\s*\.8rem\s*!important;/);
  assert.match(css, /> \.activity-card > \.activity-card__presence\s*\{[\s\S]*?display:\s*none\s*!important;/);
  assert.match(css, /> \.detail-fan-experiences\s*\{[\s\S]*?border-top:\s*1px solid var\(--cgb-neutral-200\)\s*!important;/);
});

test('wide desktop order is identity, CGB Says, watch party, attendance, Bears Say, then media', async () => {
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

test('additional Watch Party and listing maintenance use sentence case with secondary styling', async () => {
  const [watchPartySource, listingSource, watchPartyCss] = await Promise.all([
    read('js/watch-party-form.js'),
    read('js/listing-update.js'),
    read('css/watch-party-form.css')
  ]);

  assert.match(watchPartySource, /detail-watch-party-cta--additional/);
  assert.match(watchPartySource, /'Another watch party\?'/);
  assert.match(watchPartySource, /'Add another watch party'/);
  assert.match(listingSource, /'Suggest an update or report an issue'/);
  assert.match(watchPartyCss, /\.detail-watch-party-cta--additional \.detail-watch-party-cta__action\s*\{[\s\S]*?width:\s*fit-content;[\s\S]*?min-height:\s*36px;[\s\S]*?background:\s*var\(--cgb-white\);/);
  assert.match(watchPartyCss, /@media \(max-width: 599px\)[\s\S]*?\.detail-watch-party-cta:not\(\.detail-watch-party-cta--additional\) \.detail-watch-party-cta__action\s*\{[\s\S]*?width:\s*100%;/);
});