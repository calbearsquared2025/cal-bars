/*
 * Historical Milestone 8C presentation layer.
 *
 * Visual Compliance Work Package B retires this module's Map/Tray overrides.
 * Canonical Map composition and tray state now belong to map-mobile-refinement.mjs;
 * selected-venue hierarchy belongs to map-profile-final-pass.mjs.
 */

const MOBILE_QUERY = '(max-width: 899px)';

function sync() {
  if (!window.matchMedia(MOBILE_QUERY).matches) return;
  document.querySelector('.mobile-command-bar')?.setAttribute('data-visual-foundation', 'shared');
}

function initialize() {
  sync();
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', sync);
  window.CGBApp?.subscribe?.('rendered', sync);
  window.CGBApp?.subscribe?.('ready', sync);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
