import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const privacySource = await readFile(new URL('../js/privacy-dialog.mjs', import.meta.url), 'utf8');
const supportCss = await readFile(new URL('../css/support-dialog.css', import.meta.url), 'utf8');

test('mobile About gets Privacy as an inline section instead of a Privacy button', () => {
  assert.match(privacySource, /#about-surface \.about-surface__content/);
  assert.match(privacySource, /section\.className = 'about-subsection about-privacy-section'/);
  assert.match(privacySource, /heading\.textContent = 'Privacy'/);
  assert.match(privacySource, /dialog\.querySelectorAll\('\.dialog-shell > p'\)/);
  assert.doesNotMatch(privacySource, /data-privacy-open|dataset\.privacyOpen/);
});

test('desktop Privacy reuses the existing About footer popover presentation', () => {
  assert.match(privacySource, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.match(privacySource, /dialog\.classList\.add\('about-dialog--footer-popover'\)/);
  assert.match(privacySource, /dialog\.show\(\)/);
  assert.doesNotMatch(privacySource, /showModal\(/);
  assert.match(supportCss, /\.about-dialog\.about-dialog--footer-popover/);
});
