import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [html, baseCss, ...rest] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/design-system.css', import.meta.url), 'utf8'),
  ...[1, 2, 3, 4].map((part) => readFile(new URL(`../css/design-board-${part}.css`, import.meta.url), 'utf8')),
  readFile(new URL('../css/mobile-command-navigation.css', import.meta.url), 'utf8'),
  readFile(new URL('../assets/cgb-mark.svg', import.meta.url), 'utf8'),
  readFile(new URL('../assets/icons.svg', import.meta.url), 'utf8'),
  readFile(new URL('../js/icon-upgrade.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../js/shell-controls.mjs', import.meta.url), 'utf8')
]);

const [boardCss1, boardCss2, boardCss3, boardCss4, mobileCss, mark, icons, iconUpgrade, shellControls] = rest;
const css = [baseCss, boardCss1, boardCss2, boardCss3, boardCss4, mobileCss].join('\n');

test('design-board layer loads last while preserving application contracts', () => {
  const baseIndex = html.indexOf('css/styles.css');
  const designIndex = html.indexOf('css/design-system.css');
  const mobileIndex = html.indexOf('css/mobile-command-navigation.css');
  const appIndex = html.indexOf('js/app.js');
  const iconUpgradeIndex = html.indexOf('js/icon-upgrade.mjs');
  const shellControlsIndex = html.indexOf('js/shell-controls.mjs');

  assert.ok(baseIndex >= 0);
  assert.ok(designIndex > baseIndex);
  assert.ok(mobileIndex > designIndex);
  assert.ok(iconUpgradeIndex > appIndex);
  assert.ok(shellControlsIndex > appIndex);
  assert.match(html, /id="game-button"/);
  assert.match(html, /id="venue-tray"/);
  assert.match(html, /id="external-venue-dialog"/);
  assert.match(html, /name="cgb-data-endpoint"/);
  assert.doesNotMatch(html, /saved|favorites|attendee avatars|create account/i);
});

test('visual tokens follow the supplied design-board palette, typography, and restrained geometry', () => {
  for (const token of [
    '--cgb-navy-950', '--cgb-navy-900', '--cgb-gold-400', '--cgb-neutral-50',
    '--font-ui', '--font-display', '--font-condensed', '--chamfer-md',
    '--shadow-md', '--motion-fast', '--focus-ring'
  ]) {
    assert.match(css, new RegExp(token));
  }

  assert.match(css, /--cgb-navy-950:\s*#010133/i);
  assert.match(css, /--cgb-navy-900:\s*#002676/i);
  assert.match(css, /--cgb-gold-400:\s*#fdb515/i);
  assert.match(css, /--cgb-neutral-50:\s*#f2f2f2/i);
  assert.match(css, /--font-condensed:[^;]*Barlow Condensed/i);
  assert.match(css, /--radius-xl:\s*\.875rem/);
  assert.match(css, /clip-path:\s*polygon/);
  assert.match(css, /:focus-visible[\s\S]*--cgb-gold-400/);
});

test('mobile shell uses Map, Search, Add, List with dedicated contribution surfaces', () => {
  const headerEnd = html.indexOf('</header>');
  const openingStat = html.indexOf('class="opening-stat"');
  const mainStart = html.indexOf('<main');

  assert.ok(openingStat > 0 && openingStat < headerEnd && headerEnd < mainStart);
  assert.match(html, /class="site-header__brand-row"/);
  assert.match(html, /game-button__chevron/);
  assert.match(html, /class="mobile-command-bar"/);
  for (const id of ['mobile-map-button', 'mobile-search-button', 'mobile-add-button', 'mobile-list-button']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /id="mobile-game-button"/);
  assert.match(html, /id="search-surface"/);
  assert.match(html, /id="add-surface"/);

  assert.match(css, /\.opening-stat\s*\{[\s\S]*position:\s*absolute[\s\S]*bottom:\s*-27px/);
  assert.match(mobileCss, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.map-toolbar \.location-search\s*\{\s*display:\s*none/);
  assert.match(mobileCss, /calc\(var\(--header-height\) \+ 27px\)/);
  assert.match(shellControls, /mobile-map-button/);
  assert.match(shellControls, /mobile-search-button/);
  assert.match(shellControls, /mobile-add-button/);
  assert.match(shellControls, /mobile-list-button/);
  assert.match(shellControls, /buildWatchPartyPrefillUrl/);
  assert.match(shellControls, /buildCalBarNominationPrefillUrl/);
  assert.doesNotMatch(shellControls, /MutationObserver/);
});

test('layered map and venue surfaces use different widths instead of repeated rounded cards', () => {
  assert.match(css, /\.location-search\s*\{[\s\S]*width:\s*calc\(100% - 54px\)/);
  assert.match(css, /\.venue-tray\s*\{[\s\S]*left:\s*max\(10px[\s\S]*right:\s*max\(10px[\s\S]*bottom:\s*calc\(var\(--footer-height\) \+ 9px\)/);
  assert.match(css, /\.selected-card > \.party-module\s*\{[\s\S]*margin:\s*1px 5px 0[\s\S]*clip-path:/);
  assert.match(css, /\.action-row\s*\{[\s\S]*margin:\s*1px 9px 0/);
  assert.match(css, /\.location-card\s*\{[\s\S]*border-radius:\s*0[\s\S]*border-bottom:/);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.venue-tray\s*\{[\s\S]*right:\s*24px[\s\S]*width:\s*min\(390px, 34vw\)/);
});

test('venue detail remains unchanged in this navigation pass', () => {
  assert.match(css, /\.detail-hero\s*\{[\s\S]*min-height:\s*336px[\s\S]*padding:\s*198px 30px 24px/);
  assert.match(css, /\.detail-hero::after\s*\{[\s\S]*left:\s*10px[\s\S]*right:\s*10px[\s\S]*clip-path:/);
  assert.match(css, /\.detail-game-context\s*\{[\s\S]*margin:\s*-2px 16px 0[\s\S]*clip-path:/);
  assert.match(css, /\.activity-card\s*\{[\s\S]*margin:\s*12px 28px 0[\s\S]*clip-path:/);
  assert.match(css, /\.venue-detail > \.action-row\s*\{[\s\S]*position:\s*sticky[\s\S]*bottom:\s*0/);
  assert.match(css, /body\[data-view="detail"\] \.site-header/);
});

test('marker selectors preserve locked Watch Party, Cal Bar, and Community Location semantics', () => {
  assert.match(css, /\.marker-star\s*\{[\s\S]*background:\s*var\(--cgb-gold-400\)[\s\S]*border:\s*3px solid var\(--cgb-gold-400\)/);
  assert.match(css, /\.marker-star::before\s*\{[\s\S]*background:\s*var\(--cgb-navy-950\)/);
  assert.match(css, /\.marker--cal-bar \.marker-pin\s*\{[\s\S]*background:\s*var\(--cgb-navy-900\)/);
  assert.match(css, /\.marker--cal-bar \.marker-pin::after\s*\{[\s\S]*background:\s*var\(--cgb-white\)/);
  assert.match(css, /\.marker--community-location \.marker-pin\s*\{[\s\S]*background:\s*var\(--cgb-white\)[\s\S]*border-color:\s*var\(--cgb-navy-950\)/);
  assert.match(css, /\.marker--community-location \.marker-pin::after\s*\{[\s\S]*background:\s*var\(--cgb-navy-950\)/);
  assert.match(css, /\.cgb-marker\.is-selected/);
  assert.match(css, /\.marker-count/);
});

test('existing landscape and desktop rules remain available for later refinement', () => {
  assert.match(css, /@media \(max-width: 899px\) and \(orientation: landscape\) and \(max-height: 500px\)/);
  assert.match(css, /--selected-tray-max-height:\s*calc\(100% - 16px\)/);
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /body\[data-view="detail"\] \.venue-detail\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1\.15fr\) minmax\(360px, \.85fr\)/);
  assert.doesNotMatch(`${html}\n${css}`, /rotate to portrait|portrait only|orientation blocker/i);
});

test('placeholder mark and shared icon system remain temporary-compatible and dependency-free', () => {
  assert.match(html, /assets\/cgb-mark\.svg/);
  assert.match(mark, /fill="#FDB515"/i);
  assert.match(mark, /fill="#071E41"/i);

  for (const symbol of [
    'icon-search', 'icon-location', 'icon-map', 'icon-calendar', 'icon-near-me',
    'icon-fullscreen', 'icon-directions', 'icon-share', 'icon-star', 'icon-details'
  ]) {
    assert.match(icons, new RegExp(`id="${symbol}"`));
  }

  assert.doesNotMatch(iconUpgrade, /(?:createIcon|setIcon)\([^)]*['"]details['"]/);
  assert.match(iconUpgrade, /upgradeRenderedIcons/);
  assert.match(iconUpgrade, /CGBApp\?\.subscribe/);
  assert.doesNotMatch(`${iconUpgrade}\n${shellControls}`, /MutationObserver/);
});
