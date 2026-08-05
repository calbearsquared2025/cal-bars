import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [html, css, mark, icons, iconUpgrade] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../css/design-system.css', import.meta.url), 'utf8'),
  readFile(new URL('../assets/cgb-mark.svg', import.meta.url), 'utf8'),
  readFile(new URL('../assets/icons.svg', import.meta.url), 'utf8'),
  readFile(new URL('../js/icon-upgrade.mjs', import.meta.url), 'utf8')
]);

test('professional design layer loads last without replacing application contracts', () => {
  const baseIndex = html.indexOf('css/styles.css');
  const designIndex = html.indexOf('css/design-system.css');
  const appIndex = html.indexOf('js/app.js');
  const iconUpgradeIndex = html.indexOf('js/icon-upgrade.mjs');

  assert.ok(baseIndex >= 0);
  assert.ok(designIndex > baseIndex);
  assert.ok(iconUpgradeIndex > appIndex);
  assert.match(html, /id="game-button"/);
  assert.match(html, /id="venue-tray"/);
  assert.match(html, /id="external-venue-dialog"/);
  assert.match(html, /meta name="cgb-data-endpoint"/);
  assert.doesNotMatch(html, /saved|favorites|attendee avatars|create account/i);
});

test('design tokens define the approved navy, gold, neutral, type, spacing, shape, shadow, and interaction foundations', () => {
  for (const token of [
    '--cgb-navy-900', '--cgb-gold-400', '--cgb-neutral-200',
    '--font-ui', '--font-display', '--space-4', '--radius-md',
    '--shadow-md', '--motion-fast', '--focus-ring'
  ]) {
    assert.match(css, new RegExp(token.replace('--', '--')));
  }

  assert.match(css, /--cgb-navy-900:\s*#071e41/i);
  assert.match(css, /--cgb-gold-400:\s*#fdb515/i);
  assert.match(css, /--cal-blue:\s*var\(--cgb-navy-900\)/);
  assert.match(css, /:focus-visible[\s\S]*--cgb-gold-400/);
});

test('professional mark and shared SVG sprite replace the temporary brand treatment', () => {
  assert.match(html, /assets\/cgb-mark\.svg/);
  assert.doesNotMatch(html, /<svg class="brand-mark"/);
  assert.match(mark, /fill="#FDB515"/i);
  assert.match(mark, /fill="#071E41"/i);
  assert.match(mark, /stroke="#fff"/i);

  for (const symbol of [
    'icon-search', 'icon-near-me', 'icon-fullscreen', 'icon-directions',
    'icon-share', 'icon-details', 'icon-star', 'icon-close'
  ]) {
    assert.match(icons, new RegExp(`id="${symbol}"`));
  }

  assert.match(iconUpgrade, /upgradeRenderedIcons/);
  assert.match(iconUpgrade, /CGBApp\?\.subscribe/);
  assert.doesNotMatch(iconUpgrade, /MutationObserver/);
});

test('marker selectors implement the locked semantic treatments', () => {
  assert.match(css, /\.marker-star\s*\{[\s\S]*border:\s*5px solid var\(--cgb-gold-400\)[\s\S]*background:\s*var\(--cgb-navy-900\)/);
  assert.match(css, /\.marker--cal-bar \.marker-pin\s*\{[\s\S]*background:\s*var\(--cgb-navy-900\)[\s\S]*border-color:\s*var\(--cgb-navy-900\)/);
  assert.match(css, /\.marker--cal-bar \.marker-pin::after\s*\{[\s\S]*background:\s*var\(--cgb-white\)/);
  assert.match(css, /\.marker--community-location \.marker-pin\s*\{[\s\S]*background:\s*var\(--cgb-white\)[\s\S]*border-color:\s*var\(--cgb-navy-900\)/);
  assert.match(css, /\.marker--community-location \.marker-pin::after\s*\{[\s\S]*background:\s*var\(--cgb-navy-900\)/);
  assert.match(css, /\.cgb-marker\.is-selected/);
  assert.match(css, /\.marker-count/);
});

test('responsive foundations cover portrait-first mobile, short landscape, and desktop without an orientation blocker', () => {
  assert.match(css, /@media \(max-width: 899px\) and \(orientation: landscape\) and \(max-height: 500px\)/);
  assert.match(css, /--selected-tray-max-height:\s*min\(50dvh, 230px\)/);
  assert.match(css, /\.action-row\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(400px, 440px\)/);
  assert.doesNotMatch(`${html}\n${css}`, /rotate to portrait|portrait only|orientation blocker/i);
});
