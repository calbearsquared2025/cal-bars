import assert from 'node:assert/strict';
import test from 'node:test';
import { installMobilePlanPartyAlignmentStyles } from '../js/venue-profile-enhancement.mjs';

test('mobile no-Watch-Party prompt forces both lines to the left edge', () => {
  let appended = null;
  const documentObject = {
    getElementById: () => null,
    createElement: () => ({}),
    head: {
      append(node) {
        appended = node;
      }
    }
  };

  assert.equal(installMobilePlanPartyAlignmentStyles(documentObject), true);
  assert.ok(appended);
  assert.match(appended.textContent, /\.selected-card__plan-party\s*\{[\s\S]*?justify-items:\s*stretch\s*!important;[\s\S]*?text-align:\s*left\s*!important;/);
  assert.match(appended.textContent, /\.selected-card__plan-party-status,[\s\S]*?\.selected-card__plan-party-action\s*\{[\s\S]*?width:\s*100%\s*!important;[\s\S]*?justify-self:\s*stretch\s*!important;[\s\S]*?text-align:\s*left\s*!important;/);
});
