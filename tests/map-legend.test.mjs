import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const mobilePolish = await readFile(new URL('js/mobile-polish.mjs', root), 'utf8');
const core = await readFile(new URL('js/core.mjs', root), 'utf8');

test('map legend spans the current two-column statistics grid', () => {
  assert.match(mobilePolish, /gridTemplateRows = '54px 22px'/);
  assert.match(mobilePolish, /grid-column:1\/-1/);
  assert.match(mobilePolish, /aria-label', 'Map key'/);
  assert.match(mobilePolish, /\['★', 'Watch Party'/);
  assert.match(mobilePolish, /\['●', 'Cal Bar'/);
  assert.match(mobilePolish, /\['○', 'Fan-Added'/);
});

test('legend work does not rewrite venue taxonomy', () => {
  assert.match(core, /'CAL BAR' : 'COMMUNITY LOCATION'/);
  assert.match(core, /verification_status === 'user_added'/);
});
