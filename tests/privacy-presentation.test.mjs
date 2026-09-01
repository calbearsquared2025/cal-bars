import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const privacySource = await readFile(new URL('../js/privacy-dialog.mjs', import.meta.url), 'utf8');
const supportSource = await readFile(new URL('../js/support-dialog.mjs', import.meta.url), 'utf8');
const popoverSource = await readFile(new URL('../js/footer-popover.mjs', import.meta.url), 'utf8');
const supportCss = await readFile(new URL('../css/support-dialog.css', import.meta.url), 'utf8');

test('mobile About gets Privacy as an inline section instead of a Privacy button', () => {
  assert.match(privacySource, /#about-surface \.about-surface__content/);
  assert.match(privacySource, /section\.className = 'about-subsection about-privacy-section'/);
  assert.match(privacySource, /heading\.textContent = 'Privacy'/);
  assert.match(privacySource, /dialog\.querySelectorAll\('\.dialog-shell > p'\)/);
  assert.doesNotMatch(privacySource, /data-privacy-open|dataset\.privacyOpen/);
});

test('About and Privacy share one desktop footer popover controller', () => {
  assert.match(privacySource, /import \{ connectFooterPopover \} from '\.\/footer-popover\.mjs'/);
  assert.match(supportSource, /import \{ connectFooterPopover \} from '\.\/footer-popover\.mjs'/);
  assert.match(privacySource, /connectFooterPopover\(\{[\s\S]*?button: document\.querySelector\('#privacy-button'\)/);
  assert.match(supportSource, /connectFooterPopover\(\{[\s\S]*?button: footerAboutButton/);
  assert.match(popoverSource, /dialog\.classList\.add\('about-dialog--footer-popover'\)/);
  assert.match(popoverSource, /document\.querySelectorAll\('dialog\.about-dialog--footer-popover\[open\]'\)/);
  assert.match(popoverSource, /dialog\.show\(\)/);
  assert.doesNotMatch(privacySource, /showModal\(/);
  assert.match(supportCss, /\.about-dialog\.about-dialog--footer-popover/);
});
