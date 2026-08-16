import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('desktop venue detail layout keeps navigation and hierarchy desktop-specific', async () => {
  const [css, unifiedCss, loader, enhancement] = await Promise.all([
    source('css/desktop-venue-detail.css'),
    source('css/desktop-venue-detail-unified.css'),
    source('css/watch-party-form.css'),
    source('js/venue-profile-enhancement.mjs')
  ]);
  assert.ok(loader.includes("@import url('./desktop-venue-detail.css')"));
  assert.ok(loader.includes("@import url('./desktop-venue-detail-unified.css')"));
  assert.ok(css.includes('html body[data-view="detail"] .detail-view'));
  assert.ok(unifiedCss.includes('padding-top: 8px !important'));
  assert.ok(css.includes('html body[data-view="detail"] .back-link'));
  assert.ok(css.includes('position: absolute !important'));
  assert.ok(unifiedCss.includes('top: 8px !important'));
  assert.ok(unifiedCss.includes('left: 46px !important'));
  assert.ok(unifiedCss.includes('padding: 42px 28px 28px !important'));
  assert.ok(css.includes('display: flow-root !important'));
  assert.ok(css.includes('float: left !important'));
  assert.ok(css.includes('width: 56% !important'));
  assert.ok(css.includes('order: 1'));
  assert.ok(css.includes('order: 7'));
  assert.ok(css.includes('.detail-desktop-editorial'));
  assert.ok(enhancement.includes("heading.textContent = 'CGB SAYS'"));
});

test('desktop Venue Detail is one white surface instead of independent column cards', async () => {
  const css = await source('css/desktop-venue-detail-unified.css');
  assert.ok(css.includes('.venue-detail'));
  assert.ok(css.includes('background: var(--cgb-white) !important'));
  assert.ok(css.includes('border: 1px solid var(--cgb-neutral-200) !important'));
  assert.ok(css.includes('border-radius: 18px !important'));
  assert.ok(css.includes('box-shadow: 0 12px 30px rgba(1, 1, 51, .06) !important'));
  assert.match(css, /detail-hero\.detail-hero--has-photo[\s\S]*background: transparent !important[\s\S]*border: 0 !important[\s\S]*box-shadow: none !important/);
  assert.match(css, /detail-desktop-game-context,[\s\S]*activity-card,[\s\S]*action-row\.detail-primary-actions[\s\S]*background: transparent !important/);
  assert.match(css, /detail-desktop-game-context[\s\S]*border-left: 1px solid var\(--cgb-neutral-200\) !important/);
  assert.match(css, /detail-contribution[\s\S]*margin-top: 0 !important[\s\S]*padding: 14px 22px 20px !important/);
});

test('desktop selected-game activity is grouped and contribution actions are tertiary', async () => {
  const [css, enhancement] = await Promise.all([
    source('css/desktop-venue-detail.css'),
    source('js/venue-profile-enhancement.mjs')
  ]);
  assert.ok(enhancement.includes("context.className = 'detail-desktop-game-context'"));
  assert.ok(enhancement.includes("eyebrow.textContent = 'Selected game'"));
  assert.ok(enhancement.includes("documentObject.querySelector('#header-game-label')"));
  assert.ok(enhancement.includes("documentObject.querySelector('#header-kickoff')"));
  assert.ok(enhancement.includes('activity.before(context)'));
  assert.ok(enhancement.includes('actions.after(contribution)'));
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, max-content)) !important'));
  assert.ok(css.includes('text-decoration: underline !important'));
});

test('mobile detail behavior remains on the existing media-first and fixed-action path', async () => {
  const [enhancement, detailCss, desktopCss, unifiedCss] = await Promise.all([
    source('js/venue-profile-enhancement.mjs'),
    source('css/venue-detail.css'),
    source('css/desktop-venue-detail.css'),
    source('css/desktop-venue-detail-unified.css')
  ]);
  assert.ok(enhancement.includes('hero.prepend(photo)'));
  assert.ok(enhancement.includes('hero.prepend(localMap)'));
  assert.ok(enhancement.includes("section.className = 'detail-editorial'"));
  assert.ok(desktopCss.includes('body[data-view="detail"] .detail-desktop-editorial'));
  assert.ok(desktopCss.includes('body[data-view="detail"] .detail-desktop-game-context'));
  assert.ok(unifiedCss.startsWith('@media (min-width: 900px)'));
  assert.ok(detailCss.includes('body[data-view="detail"] .detail-game-context'));
  assert.ok(detailCss.includes('display: none !important'));
  assert.ok(detailCss.includes('position: fixed !important'));
  assert.ok(detailCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
});
