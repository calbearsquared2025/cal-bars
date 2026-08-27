import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile keeps MapLibre zoom controls in the DOM and hides them through the responsive CSS owner', async () => {
  const [mobileRefinement, firstPaint] = await Promise.all([
    read('js/map-mobile-refinement.mjs'),
    read('css/mobile-first-paint.css')
  ]);
  assert.doesNotMatch(mobileRefinement, /removeZoomControls/);
  assert.match(firstPaint, /\.maplibregl-ctrl-top-right\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('floating MapLibre controls use the shared 44px control treatment', async () => {
  const css = await read('css/design-board-2.css');
  assert.match(css, /\.maplibregl-ctrl-group button\s*\{[\s\S]*?width:\s*44px\s*!important;[\s\S]*?height:\s*44px\s*!important;/);
  assert.match(css, /\.maplibregl-ctrl-group button:focus-visible/);
  assert.doesNotMatch(css, /\.maplibregl-ctrl-attrib\s*\{/);
  assert.match(css, /\.map-toolbar \.search-field\s*\{/);
});

test('desktop Locate me and zoom controls share one aligned stack beside the venue tray', async () => {
  const [board4, mobilePolish] = await Promise.all([
    read('css/design-board-4.css'),
    read('css/mobile-polish.css')
  ]);
  assert.match(board4, /\.maplibregl-ctrl-top-right\s*\{[\s\S]*?right:\s*calc\(min\(390px, 34vw\) \+ 26px\);[\s\S]*?bottom:\s*24px;/);
  assert.match(mobilePolish, /@media \(min-width: 900px\)[\s\S]*?\.map-actions[\s\S]*?right:\s*calc\(min\(390px, 34vw\) \+ 36px\);[\s\S]*?bottom:\s*122px;/);
  assert.match(mobilePolish, /\.map-actions #near-me-button[\s\S]*?width:\s*44px;/);
});

test('marker states use the Bootstrap geo-alt-fill silhouette with distinct selected and nearby hierarchy', async () => {
  const css = await read('css/mobile-polish.css');
  assert.match(css, /--marker-shape:\s*url\("data:image\/svg\+xml/);
  assert.match(css, /Bootstrap Icons geo-alt-fill/);
  assert.match(css, /viewBox='0 0 12 16'/);
  assert.match(css, /M6 16s6-5\.686 6-10A6 6 0 0 0 0 6c0 4\.314 6 10 6 10Z/);
  assert.match(css, /\.cgb-marker \.marker-pin,[\s\S]*?width:\s*32px;[\s\S]*?height:\s*43px;/);
  assert.match(css, /\.cgb-marker \.marker-star::after[\s\S]*?top:\s*7\.5px;[\s\S]*?width:\s*17px;[\s\S]*?height:\s*17px;/);
  assert.match(css, /\.cgb-marker \.marker-star__icon[\s\S]*?top:\s*9\.5px;[\s\S]*?width:\s*13px;[\s\S]*?height:\s*13px;/);
  assert.match(css, /\.cgb-marker \.marker-pin::before,[\s\S]*?inset:\s*1\.25px;/);
  assert.match(css, /\.cgb-marker \.marker-pin,[\s\S]*?mask:\s*var\(--marker-shape\)/);
  assert.match(css, /\.cgb-marker\.marker--cal-bar \.marker-pin/);
  assert.match(css, /\.cgb-marker\.is-selected \.marker-pin,[\s\S]*?scale:\s*1\.12;/);
  assert.match(css, /\.cgb-marker\.is-nearby-preview:not\(\.is-selected\)[\s\S]*?scale:\s*1\.06;/);
});

test('map attendance badges explain Bear counts while the marker retains its full accessible label', async () => {
  const app = await read('js/app.js');
  assert.match(app, /button\.setAttribute\('aria-label', `\$\{venue\.name\}[^\n]+bearCountCopy\(count\)/);
  assert.match(app, /badge\.textContent = count === 1 \? '1 Bear' : `\$\{count\} Bears`;/);
  assert.match(app, /badge\.setAttribute\('aria-hidden', 'true'\);/);
});

test('Locate me preserves a selected mobile profile and leaves control placement to CSS', async () => {
  const [app, mobilePolish, firstPaint] = await Promise.all([
    read('js/app.js'),
    read('js/mobile-polish.mjs'),
    read('css/mobile-first-paint.css')
  ]);
  assert.doesNotMatch(app, /function locateOnMap\(\) \{\s*if \(!isMobileLayout\(\)\) return;/);
  assert.match(app, /const mobile = isMobileLayout\(\);/);
  assert.match(app, /const preserveSelectedProfile = mobile && Boolean\(state\.selectedVenueId\) && state\.trayState === 'selected';/);
  assert.match(app, /const nextTrayState = preserveSelectedProfile \? 'selected' : mobile \? 'peek' : 'full';/);
  assert.match(app, /showNearbyLocations\(\{ trayState: nextTrayState, focus: true \}\)/);
  assert.match(app, /setTrayState\(nextTrayState\);/);
  assert.doesNotMatch(mobilePolish, /--map-action-top/);
  assert.match(firstPaint, /\.map-actions\s*\{[\s\S]*?top:\s*var\(--map-action-top,\s*calc\(100dvh - var\(--footer-height\) - 156px\)\)\s*!important;/);
});

test('mobile legend has a little more white breathing room below the labels', async () => {
  const css = await read('css/mobile-polish.css');
  assert.match(css, /\.opening-stat\s*\{[\s\S]*?height:\s*82px;[\s\S]*?grid-template-rows:\s*54px 26px;/);
  assert.match(css, /\.map-legend\s*\{[\s\S]*?padding-bottom:\s*4px;/);
});

test('Bootstrap marker geometry retains the required MIT notice', async () => {
  const notice = await read('LICENSES/bootstrap-icons-MIT.txt');
  assert.match(notice, /Copyright \(c\) 2019-2024 The Bootstrap Authors/);
  assert.match(notice, /MIT License/);
});


test('MapTiler Free logo is official, linked, and deliberately unobtrusive', async () => {
  const [html, controls, mobile, logo] = await Promise.all([
    read('index.html'),
    read('css/design-board-2.css'),
    read('css/mobile-first-paint.css'),
    read('assets/maptiler-logo.svg')
  ]);
  assert.match(html, /class="maptiler-logo"[\s\S]*?href="https:\/\/www\.maptiler\.com"[\s\S]*?src="assets\/maptiler-logo\.svg"/);
  assert.match(controls, /\.maptiler-logo img[\s\S]*?width:\s*56px/);
  assert.match(mobile, /\.maptiler-logo img[\s\S]*?width:\s*50px/);
  assert.match(mobile, /\.maptiler-logo[\s\S]*?top:\s*100px/);
  assert.match(logo, /<svg/);
});


test('Locate icon is centered in its circular mobile control', async () => {
  const css = await read('css/mobile-polish.css');
  assert.match(css, /\.map-actions #near-me-button \.ui-icon\s*\{[\s\S]*?width:\s*19px;[\s\S]*?height:\s*19px;[\s\S]*?transform:\s*none;/);
});
