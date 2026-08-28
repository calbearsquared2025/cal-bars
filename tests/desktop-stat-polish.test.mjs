import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../js/mobile-polish.mjs', import.meta.url), 'utf8');

test('desktop summary stats center the number against the full two-line copy block', () => {
  assert.match(source, /function syncStatLayout\(element, number, copy\)/);
  assert.match(source, /element\.style\.alignItems = 'center'/);
  assert.match(source, /element\.style\.gap = '8px'/);
  assert.match(source, /number\.style\.minWidth = '2ch'/);
  assert.match(source, /number\.style\.textAlign = 'right'/);
  assert.match(source, /number\.style\.fontVariantNumeric = 'tabular-nums'/);
  assert.match(source, /copy\.style\.textAlign = 'left'/);
});

test('summary stat polish is desktop-only and clears persistent parent styles on mobile', () => {
  assert.match(
    source,
    /if \(isMobile\(\)\) \{[\s\S]*removeProperty\('align-items'\)[\s\S]*removeProperty\('gap'\)[\s\S]*return;/
  );
  assert.match(source, /syncStatLayout\(element, number, copy\);[\s\S]*element\.replaceChildren\(number, copy\)/);
});
