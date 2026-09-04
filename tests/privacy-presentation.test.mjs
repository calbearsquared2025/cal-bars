import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
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

test('desktop footer begins with the affiliation disclaimer', () => {
  const footer = indexSource.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/)?.[1] ?? '';
  const disclaimerIndex = footer.indexOf('Not affiliated with Cal Athletics or the California Alumni Association');
  const socialIndex = footer.indexOf('@CalBearSquared');
  const aboutIndex = footer.indexOf('>About</button>');
  const privacyIndex = footer.indexOf('>Privacy</button>');

  assert.ok(disclaimerIndex >= 0);
  assert.ok(disclaimerIndex < socialIndex);
  assert.ok(socialIndex < aboutIndex);
  assert.ok(aboutIndex < privacyIndex);
});

test('Privacy uses the same close-free footer popover header treatment as About', () => {
  const privacyDialog = indexSource.match(/<dialog id="privacy-dialog"[\s\S]*?<\/dialog>/)?.[0] ?? '';
  assert.match(privacyDialog, /<h2 id="privacy-dialog-title">Privacy<\/h2>/);
  assert.doesNotMatch(privacyDialog, /Close privacy panel|icon-close|class="icon-button"/);
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

test('desktop footer popovers are positioned above the footer', () => {
  assert.match(popoverSource, /button\.closest\?\.\('\.site-footer'\)\?\.getBoundingClientRect\?\.\(\)/);
  assert.match(popoverSource, /window\.innerHeight - footerRect\.top \+ gap/);
  assert.match(popoverSource, /--about-popover-bottom', `\$\{Math\.round\(bottom\)\}px`/);
});
