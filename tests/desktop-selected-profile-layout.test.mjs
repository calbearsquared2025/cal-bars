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

test('wide desktop leads with venue identity and compact attendance', async () => {
  const [css, source] = await Promise.all([
    read('css/venue-profile.css'),
    read('js/icon-upgrade.mjs')
  ]);

  assert.match(css, /grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(css, /:has\(> \.activity-card--desktop-attendance\) > \.detail-hero\.detail-hero--has-photo,[\s\S]*?grid-column:\s*1 \/ 10\s*!important;/);
  assert.match(css, /> \.activity-card--desktop-attendance\s*\{[\s\S]*?grid-column:\s*10 \/ 13\s*!important;[\s\S]*?grid-row:\s*1\s*!important;/);
  assert.match(source, /function syncDesktopProfileAttendance\(state\)/);
  assert.match(source, /getFanCount\(state\.snapshot, state\.gameId, venue\.venue_id\)/);
  assert.match(source, /createIcon\('users'/);
  assert.match(source, /prompt\.textContent = 'Be the first\.'/);
});

test('wide desktop watch party uses structured two-column metadata and full-width supporting content', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /> \.party-module\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(150px, \.82fr\)\s*!important;[\s\S]*?column-gap:\s*26px\s*!important;/);
  assert.match(css, /> \.party-module > \.party-game-context::before\s*\{[\s\S]*?content:\s*'GAME';/);
  assert.match(css, /> \.party-module > \.party-module__host\s*\{[\s\S]*?text-transform:\s*uppercase;/);
  assert.match(css, /> \.party-module > \.party-module__host strong\s*\{[\s\S]*?text-transform:\s*none;/);
  assert.match(css, /> \.party-module > \.party-module__title,[\s\S]*?> \.party-module > \.party-module__report\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important;/);
});

test('wide desktop editorial columns meet cleanly with continuous borders', async () => {
  const css = await read('css/venue-profile.css');

  assert.match(css, /#venue-detail\[data-profile-presentation="desktop"\]\s*\{[\s\S]*?column-gap:\s*0\s*!important;[\s\S]*?row-gap:\s*0\s*!important;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-editorial,[\s\S]*?> \.detail-fan-experiences\s*\{[\s\S]*?border-top:\s*1px solid var\(--cgb-neutral-200\)\s*!important;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-editorial\s*\{[\s\S]*?grid-column:\s*1 \/ 7\s*!important;[\s\S]*?border-right:\s*1px solid var\(--cgb-neutral-200\)\s*!important;/);
  assert.match(css, /:has\(> \.detail-editorial\):has\(> \.detail-fan-experiences\) > \.detail-fan-experiences\s*\{[\s\S]*?grid-column:\s*7 \/ 13\s*!important;/);
});

test('wide desktop places full-width venue media after editorial content', async () => {
  const [css, source] = await Promise.all([
    read('css/venue-profile.css'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(source, /export function arrangeDesktopVenueMedia/);
  assert.match(source, /const anchor = fanExperiences \|\| editorial \|\| detail\.querySelector\(':scope > \.activity-card'\) \|\| hero;/);
  assert.match(source, /media\.classList\.add\('detail-profile-media--desktop'\)/);
  assert.match(source, /anchor\.after\(media\)/);
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
