import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  WATCH_PARTY_ATTENDANCE_CHOICES,
  closeWaitingFormWindow,
  navigateWaitingFormWindow,
  openWaitingFormWindow
} from '../js/watch-party-attendance-handoff.mjs';

const source = await readFile(new URL('../js/watch-party-attendance-handoff.mjs', import.meta.url), 'utf8');

test('handoff exposes one explicit attendance choice and one sharing choice', () => {
  assert.deepEqual(WATCH_PARTY_ATTENDANCE_CHOICES, {
    attend: 'attend',
    share: 'share'
  });
  assert.match(source, /Yes, I’ll be there/);
  assert.match(source, /No, I’m sharing it/);
  assert.match(source, /Before we open it, will you be at this Watch Party\?/);
});

test('choice click can synchronously reserve a child window for the Google Form transfer', () => {
  const child = {
    closed: false,
    document: { title: '', body: { textContent: '' } },
    location: { href: '' }
  };
  const fakeWindow = {
    open(target, name) {
      assert.equal(target, '');
      assert.equal(name, '_blank');
      return child;
    }
  };

  assert.equal(openWaitingFormWindow(fakeWindow), child);
  assert.equal(child.document.title, 'Loading Watch Party submission form');
  assert.equal(child.document.body.textContent, 'Loading Watch Party submission form…');
});

test('form transfer reuses the reserved child window when it remains available', () => {
  const child = { closed: false, location: { href: '' } };
  const fakeWindow = { location: { assign() { assert.fail('same-tab fallback should not run'); } } };
  const href = 'https://docs.google.com/forms/d/e/example/viewform';

  assert.equal(navigateWaitingFormWindow(child, href, fakeWindow), true);
  assert.equal(child.location.href, href);
});

test('form transfer falls back to same-tab navigation when a child window is unavailable', () => {
  let assigned = '';
  const fakeWindow = { location: { assign(href) { assigned = href; } } };
  const href = 'https://docs.google.com/forms/d/e/example/viewform';

  assert.equal(navigateWaitingFormWindow(null, href, fakeWindow), true);
  assert.equal(assigned, href);
});

test('waiting child can be closed when attendance cannot be saved', () => {
  let closed = false;
  closeWaitingFormWindow({ close() { closed = true; } });
  assert.equal(closed, true);
});
