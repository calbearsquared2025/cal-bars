import test from 'node:test';
import assert from 'node:assert/strict';

import { stableListQueryAfterTyping } from '../js/external-search-state-guard-core.mjs';

test('typing an external query does not replace the mapped list query', () => {
  assert.equal(stableListQueryAfterTyping({
    inputValue: 'Salt lak',
    renderedListQuery: 'Salt lak',
    stableListQuery: ''
  }), '');

  assert.equal(stableListQueryAfterTyping({
    inputValue: 'Salt lak',
    renderedListQuery: 'Salt lak',
    stableListQuery: 'Berkeley'
  }), 'Berkeley');
});

test('submitted or unrelated mapped queries remain unchanged', () => {
  assert.equal(stableListQueryAfterTyping({
    inputValue: 'Salt Lake City',
    renderedListQuery: 'Berkeley',
    stableListQuery: 'Berkeley'
  }), 'Berkeley');

  assert.equal(stableListQueryAfterTyping({
    inputValue: '',
    renderedListQuery: '',
    stableListQuery: 'Berkeley'
  }), '');
});
