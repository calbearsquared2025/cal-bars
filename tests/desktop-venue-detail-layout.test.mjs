import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('desktop venue detail layout keeps navigation and hierarchy desktop-specific', async () => {
  const [css, loader, enhancement] = await Promise.all([
    source('css/desktop-venue-detail.css'),
    source('css/watch-party-form.css'),
    source('js/venue-profile-enhancement.mjs')
  ]);
  assert.ok(loader.includes("@import url('./desktop-venue-detail.css')"));
  assert.ok(css.includes('html body[data-view="detail"] .back-link'));
  assert.ok(css.includes('position: static !important'));
  assert.ok(css.includes('display: flow-root !important'));
  assert.ok(css.includes('float: left !important'));
  assert.ok(css.includes('width: 56% !important'));
  assert.ok(css.includes('order: 1'));
  assert.ok(css.includes('order: 7'));
  assert.ok(css.includes('.detail-desktop-editorial'));
  assert.ok(enhancement.includes("heading.textContent = 'CGB SAYS'"));
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
  assert.ok(css.includes('border-radius: 16px 16px 0 0 !important'));
  assert.ok(css.includes('border-radius: 0 0 16px 16px !important'));
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, max-content)) !important'));
  assert.ok(css.includes('text-decoration: underline !important'));
});

test('mobile detail behavior remains on the existing media-first and fixed-action path', async () => {
  const [enhancement, detailCss, desktopCss] = await Promise.all([
    source('js/venue-profile-enhancement.mjs'),
    source('css/venue-detail.css'),
    source('css/desktop-venue-detail.css')
  ]);
  assert.ok(enhancement.includes('hero.prepend(photo)'));
  assert.ok(enhancement.includes('hero.prepend(localMap)'));
  assert.ok(enhancement.includes("section.className = 'detail-editorial'"));
  assert.ok(desktopCss.includes('body[data-view="detail"] .detail-desktop-editorial'));
  assert.ok(desktopCss.includes('body[data-view="detail"] .detail-desktop-game-context'));
  assert.ok(detailCss.includes('body[data-view="detail"] .detail-game-context'));
  assert.ok(detailCss.includes('display: none !important'));
  assert.ok(detailCss.includes('position: fixed !important'));
  assert.ok(detailCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
});
