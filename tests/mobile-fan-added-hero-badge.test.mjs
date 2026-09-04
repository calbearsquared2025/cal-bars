import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mobileProfileCss = await readFile(new URL('../css/watch-party-display.css', import.meta.url), 'utf8');

test('mobile selected Fan-Added badge remains legible on the navy hero', () => {
  assert.match(
    mobileProfileCss,
    /\.selected-card__header \.venue-badge \{[\s\S]*?color: var\(--cgb-gold-300, #ffd15a\) !important;/,
    'Mobile hero badges must use a valid gold fallback instead of inheriting white text.'
  );
  assert.match(
    mobileProfileCss,
    /\.selected-card__header \.venue-badge\.badge--fan-added::before \{[\s\S]*?content: none !important;/,
    'The legacy Fan-Added white inset must not cover the mobile hero badge.'
  );
});
