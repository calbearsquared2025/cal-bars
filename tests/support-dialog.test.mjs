import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/support-dialog.mjs', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../css/support-dialog.css', import.meta.url), 'utf8');

test('support entry points use the CGB Ko-fi panel without loading it at first paint', () => {
  assert.match(html, /data-support-open>supporting CGB<\/button>/);
  assert.match(html, /id="support-dialog-title">Support Cal Golden Bars<\/h2>/);
  assert.doesNotMatch(html, /Buy me a beer/i);
  assert.match(html, /id="kofiframe"/);
  assert.match(html, /data-src="https:\/\/ko-fi\.com\/calgoldenbars\/\?hidefeed=true&amp;widget=true&amp;embed=true&amp;preview=true"/);
  assert.doesNotMatch(html, /id="kofiframe"[^>]*\ssrc=/s);
  assert.match(html, /href="https:\/\/ko-fi\.com\/calgoldenbars"/);
});

test('support dialog loads Ko-fi only after an explicit open action', () => {
  assert.match(script, /frame\.hasAttribute\('src'\)/);
  assert.match(script, /frame\.setAttribute\('src', frame\.dataset\.src\)/);
  assert.match(script, /button\.addEventListener\('click', openDialog\)/);
  assert.match(script, /dialog\.showModal\(\)/);
});

test('support dialog stays compact and viewport-bounded', () => {
  assert.match(styles, /width: min\(92vw, 480px\)/);
  assert.match(styles, /max-height: 80dvh/);
  assert.match(styles, /height: min\(600px, calc\(80dvh - 108px\)\)/);
  assert.match(styles, /background: rgba\(1, 1, 51, \.5\)/);
});

test('desktop footer About uses the consolidated anchored popover treatment', () => {
  assert.match(html, /class="game-button__eyebrow"[^>]*>SELECT GAME<\/span>/);
  assert.match(html, /id="about-button"[^>]*>About<\/button>\s*<\/footer>/);
  assert.match(html, /Cal Golden Bars is powered by CrowdMapped/);
  assert.match(script, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.match(script, /footerAboutButton\?\.addEventListener\('click', openFooterAboutPopover, \{ capture: true \}\)/);
  assert.match(script, /aboutDialog\.classList\.add\('about-dialog--footer-popover'\)[\s\S]*aboutDialog\.show\(\)/);
  assert.match(styles, /@media \(min-width: 900px\)[\s\S]*\.about-dialog\.about-dialog--footer-popover[\s\S]*position: fixed/);
  assert.match(styles, /\.about-dialog\.about-dialog--footer-popover p \{[\s\S]*font-size: \.84rem;[\s\S]*line-height: 1\.4;/);
});

test('About surfaces explain the product model and keep support secondary', () => {
  const aboutMarkup = html.match(/<dialog id="about-dialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.doesNotMatch(aboutMarkup, /<h2>About Cal Golden Bars<\/h2>\s*<button[^>]*aria-label="Close"/);
  assert.match(aboutMarkup, /Find <strong>Cal Bars<\/strong> — locations with persistent Cal communities —/);
  assert.doesNotMatch(aboutMarkup, /<strong>Cal Bars — locations with persistent Cal communities —<\/strong>/);
  assert.match(aboutMarkup, /Planning to watch at your local bar\? Mark <strong>“I’ll be here”<\/strong>/);
  assert.doesNotMatch(aboutMarkup, /<strong>Mark “I’ll be here”<\/strong>/);
  assert.match(aboutMarkup, /Organizing a gathering for a specific game\?[\s\S]*Add a Watch Party/);
  assert.match(aboutMarkup, /class="about-contact-line">[\s\S]*Contact Cal Golden Bars\./);
  assert.match(aboutMarkup, /class="about-subsection about-crowdmapped"[\s\S]*About CrowdMapped/);
  assert.match(aboutMarkup, /a platform for mapping fan communities and game-day gatherings/);
  assert.match(aboutMarkup, /Support Cal Golden Bars/);
  assert.match(aboutMarkup, /helped you find your Cal crowd, consider[\s\S]*supporting CGB/);
  assert.doesNotMatch(aboutMarkup, /does not collect names or attendee lists/i);
  assert.doesNotMatch(aboutMarkup, /Buy me a beer/i);
  assert.match(script, /venueTray\?\.getBoundingClientRect\(\)/);
  assert.match(script, /trayRect \? trayRect\.left - width - ABOUT_POPOVER_GAP/);
  assert.match(script, /const bottom = 16;/);
  assert.doesNotMatch(script, /window\.innerHeight - trayRect\.bottom/);
  assert.match(script, /--about-popover-bottom/);
  assert.match(styles, /width: min\(440px, calc\(100vw - 32px\)\)/);
  assert.match(styles, /overflow: visible/);
  assert.match(styles, /\.about-contact-line \{[\s\S]*display: block;/);
  assert.match(styles, /\.text-button \{[\s\S]*min-height: 0;[\s\S]*display: inline;[\s\S]*line-height: inherit;/);
});
