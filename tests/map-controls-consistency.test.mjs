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

test('marker states use equal-size category colors while ranking yellow over blue over white', async () => {
  const css = await read('css/mobile-polish.css');
  assert.doesNotMatch(css, /--marker-shape:\s*url\("data:image\/svg\+xml/);
  assert.match(css, /\.maplibregl-marker\.cgb-marker,[\s\S]*?\.cgb-marker\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*54px;/);
  assert.match(css, /\.cgb-marker \.marker-pin,[\s\S]*?\.cgb-marker \.marker-star\s*\{[\s\S]*?transform:\s*rotate\(-45deg\);/);
  assert.match(css, /\.cgb-marker\.marker--fan-added\s*\{[\s\S]*?z-index:\s*10;/);
  assert.match(css, /\.cgb-marker\.marker--cal-bar\s*\{[\s\S]*?z-index:\s*20;/);
  assert.match(css, /\.cgb-marker\.marker--watch-party\s*\{[\s\S]*?z-index:\s*30;/);
  assert.match(css, /\.cgb-marker \.marker-pin\s*\{[\s\S]*?left:\s*8px;[\s\S]*?top:\s*6px;[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;[\s\S]*?border-width:\s*3px;[\s\S]*?box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.96\), 0 6px 14px rgba\(1,1,51,\.28\);/);
  assert.match(css, /\.cgb-marker \.marker-pin::after\s*\{[\s\S]*?left:\s*8px;[\s\S]*?top:\s*8px;[\s\S]*?width:\s*10px;[\s\S]*?height:\s*10px;/);
  assert.match(css, /\.cgb-marker\.marker--cal-bar \.marker-pin\s*\{[\s\S]*?background:\s*var\(--cgb-navy-900\);[\s\S]*?border-color:\s*var\(--cgb-navy-900\);/);
  assert.doesNotMatch(css, /\.cgb-marker\.marker--cal-bar \.marker-pin\s*\{[^}]*\b(?:left|top|width|height|border-width|box-shadow)\s*:/);
  assert.match(css, /\.cgb-marker \.marker-star\s*\{[\s\S]*?left:\s*8px;[\s\S]*?top:\s*6px;[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;[\s\S]*?background:\s*var\(--cgb-gold-400\);[\s\S]*?border:\s*3px solid var\(--cgb-gold-400\);[\s\S]*?box-shadow:\s*0 0 0 2px rgba\(255,255,255,\.96\), 0 6px 14px rgba\(1,1,51,\.28\);/);
  assert.match(css, /\.cgb-marker \.marker-star::before\s*\{[\s\S]*?left:\s*8px;[\s\S]*?top:\s*8px;[\s\S]*?width:\s*10px;[\s\S]*?height:\s*10px;[\s\S]*?background:\s*var\(--cgb-navy-950\);/);
  assert.match(css, /\.cgb-marker \.marker-star__icon\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /\.cgb-marker\.is-selected \.marker-pin,[\s\S]*?scale:\s*1\.1;/);
  assert.match(css, /\.cgb-marker\.is-selected\s*\{[\s\S]*?z-index:\s*40;/);
  assert.match(css, /\.cgb-marker \.marker-count[\s\S]*?top:\s*-6px;[\s\S]*?right:\s*-27px;/);
});

test('map attendance badges explain Bear counts while the marker retains its full accessible label', async () => {
  const app = await read('js/app.js');
  assert.match(app, /button\.setAttribute\('aria-label', `\$\{venue\.name\}[^\n]+bearCountCopy\(count\)/);
  assert.match(app, /badge\.textContent = count === 1 \? '1 Bear' : `\$\{count\} Bears`;/);
  assert.match(app, /badge\.setAttribute\('aria-hidden', 'true'\);/);
});

test('Locate me preserves a selected profile while retaining mobile tray-edge placement', async () => {
  const [app, mobilePolish, mobileRefinement, firstPaint] = await Promise.all([
    read('js/app.js'),
    read('js/mobile-polish.mjs'),
    read('js/map-mobile-refinement.mjs'),
    read('css/mobile-first-paint.css')
  ]);
  assert.doesNotMatch(app, /function locateOnMap\(\) \{\s*if \(!isMobileLayout\(\)\) return;/);
  assert.match(app, /const mobile = isMobileLayout\(\);/);
  assert.match(app, /const preserveSelectedProfile = Boolean\(state\.selectedVenueId\) &&[\s\S]*?\(mobile \? state\.trayState === 'selected' : state\.detailMode\);/);
  assert.match(app, /const nextTrayState = preserveSelectedProfile \? 'selected' : mobile \? 'peek' : 'full';/);
  assert.match(app, /showNearbyLocations\(\{[\s\S]*?trayState: nextTrayState,[\s\S]*?focus: true,[\s\S]*?preserveSelectedProfile[\s\S]*?\}\)/);
  assert.match(app, /setTrayState\(nextTrayState\);/);
  assert.doesNotMatch(mobilePolish, /--map-action-top/);
  assert.match(mobileRefinement, /function syncLocateControlPosition\(\)[\s\S]*?const preferredTop = trayRect\.top - controlHeight - MAP_ACTION_GAP;/);
  assert.match(firstPaint, /\.map-actions\s*\{[\s\S]*?top:\s*var\(--map-action-top,\s*calc\(100dvh - var\(--footer-height\) - 156px\)\)\s*!important;/);
  assert.match(firstPaint, /\.map-actions:has\(~ #venue-tray\.venue-tray\.tray--selected\)\s*\{[\s\S]*?top:\s*calc\(var\(--header-height\) \+ 138px\)\s*!important;/);
});

test('mobile tray collapse does not recenter a retained selected venue over an explicit map viewport', async () => {
  const app = await read('js/app.js');
  assert.match(app, /function scheduleSelectedVenueVisibility\(\)[\s\S]*?isMobileLayout\(\) && \(state\.detailMode \|\| state\.trayState !== 'selected'\)/);
  assert.match(app, /if \(delta > 0\) \{[\s\S]*?setTrayState\('peek', \{ animate: true \}\);/);
});

test('mobile legend has a little more white breathing room below the labels', async () => {
  const css = await read('css/mobile-polish.css');
  assert.match(css, /\.opening-stat\s*\{[\s\S]*?height:\s*82px;[\s\S]*?grid-template-rows:\s*54px 26px;/);
  assert.match(css, /\.map-legend\s*\{[\s\S]*?padding-bottom:\s*4px;/);
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
