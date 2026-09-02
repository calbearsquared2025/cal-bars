import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function desktopBlock(css) {
  const match = css.match(/\/\* ---------- Desktop: map remains dominant, tray floats as a separate plane ---------- \*\/\s*@media \(min-width: 900px\) \{([\s\S]*?)\n\}\n\n@supports not \(height: 100dvh\)/);
  assert.ok(match, 'desktop responsive block should remain in design-board-4.css');
  return match[1];
}

test('desktop header puts opening stats before the game selector without changing markup order', async () => {
  const css = desktopBlock(await read('css/design-board-4.css'));
  assert.match(css, /\.opening-stat\s*\{[\s\S]*?grid-column:\s*2;/);
  assert.match(css, /\.game-button\s*\{[\s\S]*?grid-column:\s*3;/);
  assert.match(css, /--header-height:\s*96px;/);
});

test('desktop selected profile uses the current two-action renderer without a stale third action column', async () => {
  const [css, renderer] = await Promise.all([
    read('css/design-board-4.css'),
    read('js/selected-profile-renderer.mjs')
  ]);
  const desktop = desktopBlock(css);
  assert.match(desktop, /\.selected-card\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/);
  assert.match(desktop, /\.selected-card \.action-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) 112px;/);
  assert.doesNotMatch(desktop, /\.action-row > \.selected-card__directions-inline/);
  assert.match(renderer, /row\.append\(createIntentButton/);
  assert.match(renderer, /row\.append\(share\);/);
  assert.match(renderer, /location\.append\([\s\S]*createDirectionsLink/);
});

test('desktop attendance remains compact while the shared mobile attendance treatment is tightened', async () => {
  const [desktopCss, fanIntentCss] = await Promise.all([
    read('css/design-board-4.css'),
    read('css/fan-intent.css')
  ]);
  const desktop = desktopBlock(desktopCss);
  assert.match(desktop, /\.bear-count:not\(\.bear-count--empty\)\s*\{[\s\S]*?min-height:\s*48px\s*!important;[\s\S]*?display:\s*flex\s*!important;/);
  assert.match(desktop, /\.bear-count__number\s*\{[\s\S]*?font-size:\s*1\.9rem\s*!important;/);
  assert.match(fanIntentCss, /min-height:\s*52px\s*!important;/);
  assert.match(fanIntentCss, /font-size:\s*1\.8rem\s*!important;/);
  assert.match(fanIntentCss, /margin-top:\s*0\s*!important;/);
  assert.doesNotMatch(fanIntentCss, /min-height:\s*94px\s*!important;/);
  assert.doesNotMatch(fanIntentCss, /font-size:\s*2\.5rem\s*!important;/);
});
