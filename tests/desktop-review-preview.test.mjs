import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DESKTOP_REVIEW_PREVIEW_WIDTH,
  DESKTOP_REVIEW_VIEWPORT_CONTENT,
  applyDesktopReviewPreview,
  desktopReviewPreviewRequested,
  desktopReviewPreviewUrl
} from '../js/desktop-review-preview.mjs';

test('desktop review preview is opt-in through preview=desktop', () => {
  assert.equal(desktopReviewPreviewRequested('?preview=desktop'), true);
  assert.equal(desktopReviewPreviewRequested('?preview=mobile'), false);
  assert.equal(desktopReviewPreviewRequested(''), false);
});

test('desktop review preview uses a fixed desktop viewport without disabling zoom', () => {
  assert.equal(DESKTOP_REVIEW_PREVIEW_WIDTH, 1024);
  assert.equal(DESKTOP_REVIEW_VIEWPORT_CONTENT, 'width=1024, viewport-fit=cover');
  assert.doesNotMatch(DESKTOP_REVIEW_VIEWPORT_CONTENT, /user-scalable|maximum-scale|minimum-scale/i);
});

test('desktop review preview updates only the viewport and review marker when requested', () => {
  const attributes = new Map();
  const viewport = {
    setAttribute(name, value) {
      attributes.set(name, value);
    }
  };
  const rootAttributes = new Map();
  const documentObject = {
    querySelector(selector) {
      return selector === 'meta[name="viewport"]' ? viewport : null;
    },
    documentElement: {
      setAttribute(name, value) {
        rootAttributes.set(name, value);
      }
    }
  };

  assert.equal(applyDesktopReviewPreview({
    windowObject: { location: { search: '?preview=desktop' } },
    documentObject
  }), true);
  assert.equal(attributes.get('content'), 'width=1024, viewport-fit=cover');
  assert.equal(rootAttributes.get('data-preview'), 'desktop');
});

test('normal responsive mode is untouched when preview is absent', () => {
  let touched = false;
  const documentObject = {
    querySelector() {
      touched = true;
      return null;
    }
  };

  assert.equal(applyDesktopReviewPreview({
    windowObject: { location: { search: '' } },
    documentObject
  }), false);
  assert.equal(touched, false);
});

test('desktop review URL survives internal route changes without contaminating share URLs', () => {
  assert.equal(
    desktopReviewPreviewUrl('https://calgoldenbars.com/?venue=busbys-west&game=ucla'),
    '/?venue=busbys-west&game=ucla&preview=desktop'
  );
});
