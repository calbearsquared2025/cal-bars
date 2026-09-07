import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('semantic brand roles own the active Cal palette and legacy variables remain compatibility aliases', async () => {
  const css = await read('css/design-system.css');
  assert.match(css, /--brand-primary:\s*#002676;/);
  assert.match(css, /--brand-primary-dark:\s*#010133;/);
  assert.match(css, /--brand-secondary:\s*#fdb515;/);
  assert.match(css, /--brand-page-background:\s*#f7f6f2;/);
  assert.match(css, /--brand-watch-party-accent:\s*var\(--brand-secondary\);/);
  assert.match(css, /--cgb-navy-900:\s*var\(--brand-primary\);/);
  assert.match(css, /--cgb-gold-400:\s*var\(--brand-secondary\);/);
});

test('the first design-board layer no longer permanently replaces the canonical token block', async () => {
  const css = await read('css/design-board-1.css');
  assert.doesNotMatch(css, /:root\s*\{/);
  assert.doesNotMatch(css, /--cgb-navy-900\s*:/);
  assert.doesNotMatch(css, /--font-ui\s*:/);
});
