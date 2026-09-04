import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mobileProfileCss = await readFile(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');

test('mobile selected Fan-Added badge is white hollow on the navy hero', () => {
  assert.match(
    mobileProfileCss,
    /\.selected-card__header \.venue-badge\.badge--fan-added \{[\s\S]*?color: var\(--cgb-white, #fff\) !important;[\s\S]*?background: transparent !important;[\s\S]*?border: 1px solid var\(--cgb-white, #fff\) !important;/,
    'Fan-Added should use white text and a white outline with no fill in the mobile navy hero.'
  );
  assert.match(
    mobileProfileCss,
    /\.selected-card__header \.venue-badge\.badge--fan-added::before \{[\s\S]*?content: none !important;/,
    'The legacy Fan-Added inset must not cover the mobile hero badge.'
  );
});
