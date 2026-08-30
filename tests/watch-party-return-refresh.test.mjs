import assert from 'node:assert/strict';
import test from 'node:test';
import { refreshWatchPartyProfileOnReturn } from '../js/watch-party-renderer.mjs';

test('watch party contribution refreshes the live snapshot when the user returns', () => {
  let clickListener = null;
  let focusListener = null;
  let focusOptions = null;
  let refreshCalls = 0;
  const link = {
    addEventListener(name, listener) {
      assert.equal(name, 'click');
      clickListener = listener;
    }
  };
  const windowObject = {
    CGBSnapshotRefresh: {
      refresh() { refreshCalls += 1; }
    },
    addEventListener(name, listener, options) {
      assert.equal(name, 'focus');
      focusListener = listener;
      focusOptions = options;
    }
  };

  assert.equal(refreshWatchPartyProfileOnReturn(link, windowObject), true);
  assert.equal(typeof clickListener, 'function');
  clickListener();
  assert.equal(typeof focusListener, 'function');
  assert.deepEqual(focusOptions, { once: true });
  focusListener();
  assert.equal(refreshCalls, 1);
});
