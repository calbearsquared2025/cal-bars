import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('css/mobile-first-paint.css', root), 'utf8');
const commandCss = await readFile(new URL('css/mobile-command-navigation.css', root), 'utf8');
const mobilePolishCss = await readFile(new URL('css/mobile-polish.css', root), 'utf8');
const mapMobile = await readFile(new URL('js/map-mobile-refinement.mjs', root), 'utf8');
const profileFirstPass = await readFile(new URL('js/map-profile-first-pass.mjs', root), 'utf8');
const mobileTab = await readFile(new URL('js/mobile-tab-location-refinement.mjs', root), 'utf8');

function styleBlock(source) {
  return source.match(/style\.textContent = `([\s\S]*?)`;/)?.[1] || '';
}

test('normal map state and active navigation exist in the initial HTML', () => {
  assert.match(html, /<body data-view="map" data-command-surface="map">/);
  assert.match(html, /id="mobile-map-button"[^>]*data-command="map"[^>]*aria-current="page"/);
  assert.match(html, /id="mobile-search-button"[^>]*data-command="search"/);
  assert.match(html, /id="mobile-add-button"[^>]*data-command="add"/);
  assert.match(html, /id="mobile-list-button"[^>]*data-command="list"/);
});

test('settled portrait map geometry is available from static CSS before modules run', () => {
  assert.match(html, /css\/mobile-first-paint\.css/);
  assert.ok(
    html.indexOf('css/mobile-first-paint.css') < html.indexOf('js/icon-upgrade.mjs'),
    'first-paint CSS should load before the refinement module graph'
  );
  assert.match(css, /@media \(max-width: 899px\)/);
  assert.match(css, /body\[data-view="map"\][\s\S]*position: fixed/);
  assert.match(css, /data-command-surface="map"[\s\S]*--header-height: calc\(94px/);
  assert.match(css, /\.site-header[\s\S]*height: var\(--header-height\) !important/);
  assert.match(css, /tray--peek[\s\S]*width: 100% !important[\s\S]*height: 96px !important/);
  assert.match(css, /tray--peek \.tray-handle[\s\S]*height: 18px !important[\s\S]*display: grid !important/);
  assert.match(css, /tray-summary__chevron[\s\S]*display: none !important/);
  assert.match(css, /maplibregl-ctrl-top-right[\s\S]*display: none !important/);
  assert.match(
    css,
    /maplibregl-ctrl-bottom-right[\s\S]*top: 38px !important[\s\S]*bottom: auto !important[\s\S]*left: max\(8px, env\(safe-area-inset-left, 0px\)\) !important/
  );
  assert.doesNotMatch(css, /:has\(#venue-tray\.tray--selected\)/);
});

test('portrait header makes game selection explicit without crowding the brand', () => {
  assert.match(
    css,
    /data-command-surface="map"[\s\S]*data-view="detail"[\s\S]*data-command-surface="search"[\s\S]*data-command-surface="add"[\s\S]*data-command-surface="list"[\s\S]*--header-height: calc\(94px/
  );
  assert.match(css, /\.site-header__brand-row[\s\S]*min-height: 62px !important[\s\S]*padding-right: min\(42vw, 164px\) !important/);
  assert.match(css, /#header-about-button[\s\S]*display: none !important/);
  assert.match(css, /\.site-header > \.game-button[\s\S]*position: absolute !important/);
  assert.match(css, /\.site-header > \.game-button[\s\S]*width: min\(40vw, 160px\) !important/);
  assert.match(css, /game-button__eyebrow::after[\s\S]*content: "SELECT GAME"/);
  assert.match(css, /#header-game-label[\s\S]*font-size: \.96rem !important/);
  assert.match(css, /#header-kickoff[\s\S]*font-size: \.59rem !important/);
  assert.match(css, /game-button__chevron[\s\S]*width: 14px !important/);
});

test('mobile Detail uses the compact header and a flush white page surface without a navy under-page flash', () => {
  assert.match(html, /<meta name="theme-color" media="\(max-width: 899px\)" content="#eef4fa">/);
  assert.match(css, /body\[data-view="detail"\][\s\S]*--header-height: calc\(94px/);
  assert.match(css, /body\[data-view="detail"\] \.site-header[\s\S]*height: var\(--header-height\) !important/);
  assert.match(css, /body\[data-view="detail"\] \.detail-view \{[\s\S]*padding: 0 !important[\s\S]*background: var\(--cgb-white, #fff\) !important/);
  assert.match(css, /body\[data-view="detail"\] \.detail-shell \{[\s\S]*width: 100% !important[\s\S]*max-width: none !important[\s\S]*padding: 0 !important/);
  assert.match(css, /body\[data-view="detail"\] \.venue-detail \{[\s\S]*border: 0 !important[\s\S]*border-radius: 0 !important[\s\S]*box-shadow: none !important/);
  assert.doesNotMatch(css, /body\[data-view="detail"\] \{[^}]*background-color: var\(--cgb-navy/);
});

test('Search Add and List use the same destination-header component with a dedicated optional List action', () => {
  const sharedHeaders = html.match(/class="[^"]*mobile-destination-header[^"]*"/g) || [];
  const mobileTabStyles = styleBlock(mobileTab);
  assert.equal(sharedHeaders.length, 4);
  assert.match(html, /id="tray-list"[\s\S]*<span class="eyebrow">Browse<\/span>[\s\S]*<h2 id="list-heading">Find your Cal crowd<\/h2>/);
  assert.match(css, /\.mobile-destination-header \{[\s\S]*padding: 0 0 11px !important[\s\S]*border-bottom: 1px solid var\(--cgb-neutral-200\) !important/);
  assert.match(css, /\.mobile-destination-header \.eyebrow[\s\S]*font-size: var\(--text-2xs/);
  assert.match(css, /\.mobile-destination-header h2[\s\S]*font-size: clamp\(1\.45rem, 6\.4vw, 1\.9rem\) !important/);
  assert.match(css, /data-command-surface="list"[\s\S]*tray-list__header\.mobile-destination-header[\s\S]*position: static !important[\s\S]*padding: 16px 16px 11px !important/);
  assert.match(mobileTabStyles, /\.mobile-destination-header[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto !important/);
  assert.match(commandCss, /data-command-surface="list"\] \.list-location-toggle[\s\S]*align-self: end[\s\S]*grid-template-columns: repeat\(2, max-content\)[\s\S]*background: var\(--cgb-navy-50\)[\s\S]*border: 1px solid var\(--cgb-neutral-200\)[\s\S]*border-radius: 999px/);
  assert.match(mobileTabStyles, /tray-list__toolbar[\s\S]*display: none !important/);
  assert.match(html, /id="tray-list"[\s\S]*id="list-location-toggle"[\s\S]*id="list-location-nearby"[\s\S]*id="list-location-all"/);
  assert.doesNotMatch(mobileTab, /list-location-toggle|header\.append\(button\)|toolbar\.prepend\(button\)/);
  assert.doesNotMatch(mobileTab, /event\.target\.closest\?\.\('#clear-search-button'\)/);
});

test('map statistics position the expanded legend card without owning its height', () => {
  assert.match(
    css,
    /data-command-surface="map"[\s\S]*\.opening-stat[\s\S]*bottom: -56px !important/
  );
  assert.doesNotMatch(css, /opening-stat[\s\S]{0,120}height: 56px !important/);
  assert.match(css, /opening-stat__item[\s\S]*padding: 3px 8px !important/);
  assert.match(css, /data-command-surface="search"[\s\S]*opening-stat[\s\S]*display: none !important/);
});

test('initial map and destination title typography avoid competing style owners', () => {
  const mapMobileStyles = styleBlock(mapMobile);
  const profileStyles = styleBlock(profileFirstPass);
  const mobileTabStyles = styleBlock(mobileTab);

  assert.doesNotMatch(mapMobileStyles, /body\[data-view="map"\]/);
  assert.doesNotMatch(mapMobileStyles, /maplibregl-ctrl-top-right/);
  assert.doesNotMatch(mapMobileStyles, /tray--peek/);
  assert.doesNotMatch(profileStyles, /#map-view > #venue-tray\.venue-tray::before/);
  assert.doesNotMatch(profileStyles, /tray--peek \.tray-handle/);
  assert.doesNotMatch(profileStyles, /data-command-surface="search"[\s\S]*site-header/);
  assert.doesNotMatch(profileStyles, /header-game-label/);
  assert.doesNotMatch(mobileTabStyles, /tray--peek/);
  assert.doesNotMatch(mobileTabStyles, /command-surface__header/);
  assert.doesNotMatch(mobileTabStyles, /tray-list__header h2|tray-list__header \.eyebrow/);
  assert.doesNotMatch(mobilePolishCss, /data-command-surface="list"\] \.tray-list__header/);
  assert.doesNotMatch(mobilePolishCss, /data-command-surface="search"\][\s\S]*--header-height: calc\(82px/);
});

test('detail routing still overrides the safe initial map state synchronously', () => {
  assert.match(html, /new URLSearchParams\(window\.location\.search\)\.has\('venue'\)/);
  assert.match(html, /document\.body\.dataset\.view = 'detail'/);
});
