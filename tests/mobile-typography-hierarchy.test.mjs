import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [typography, support] = await Promise.all([
  readFile(new URL('../css/mobile-typography.css', import.meta.url), 'utf8'),
  readFile(new URL('../css/support-dialog.css', import.meta.url), 'utf8')
]);

test('mobile typography is loaded from the final static stylesheet layer', () => {
  assert.match(support, /^@import url\('\.\/mobile-typography\.css'\);/);
});

test('mobile typography uses a small semantic weight scale', () => {
  assert.match(typography, /--cgb-mobile-weight-primary:\s*750/);
  assert.match(typography, /--cgb-mobile-weight-selected:\s*700/);
  assert.match(typography, /--cgb-mobile-weight-interactive:\s*650/);
  assert.match(typography, /--cgb-mobile-weight-body-emphasis:\s*500/);
  assert.match(typography, /--cgb-mobile-weight-body:\s*400/);
});

test('Venue Profile maps ordinary interaction labels to the shared interactive tier', () => {
  assert.match(typography, /\.detail-directions-inline/);
  assert.match(typography, /\.detail-local-map__photo-action/);
  assert.match(typography, /\.detail-fan-experiences__prompt/);
  assert.match(typography, /\.detail-fan-experiences__share/);
  assert.match(typography, /\.bear-count__label/);
  assert.match(typography, /\.detail-contribution__action/);
  assert.match(typography, /\.detail-share/);
  assert.match(typography, /font-weight:\s*var\(--cgb-mobile-weight-interactive\)\s*!important/);
});

test('primary actions remain stronger than secondary actions', () => {
  assert.match(typography, /\.detail-watch-party-cta__action[\s\S]*font-weight:\s*var\(--cgb-mobile-weight-primary\)/);
  assert.match(typography, /detail-primary-actions > \.intent-button/);
});

test('compact map Profile separates status, action, and navigation emphasis', () => {
  assert.match(typography, /\.selected-card__plan-party-status[\s\S]*--cgb-mobile-weight-body-emphasis/);
  assert.match(typography, /\.selected-card__plan-party-action[\s\S]*--cgb-mobile-weight-selected/);
  assert.match(typography, /\.selected-card__directions-inline/);
  assert.match(typography, /\.selected-card__share/);
  assert.match(typography, /\.selected-card__details/);
});

test('bottom navigation uses interactive weight with a modest selected-state step up', () => {
  assert.match(typography, /\.mobile-command > span:last-child/);
  assert.match(typography, /\.mobile-command\[aria-current="page"\] > span:last-child/);
});
