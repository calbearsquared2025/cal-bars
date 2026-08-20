const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-tab-location-refinement';

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      /* Add and List are opaque peer tab surfaces; Search first-paint rules are static CSS. */
      body[data-command-surface="add"] #map,
      body[data-command-surface="list"] #map {
        visibility: hidden !important;
      }

      body[data-command-surface="add"] #map-view,
      body[data-command-surface="list"] #map-view {
        background: var(--cgb-warm-50) !important;
      }

      body[data-command-surface="add"] .command-surface:not([hidden]) {
        z-index: 47 !important;
        inset: var(--header-height) 0 var(--footer-height) 0 !important;
        background: var(--cgb-warm-50) !important;
      }

      body[data-command-surface="add"] #map-view > #venue-tray {
        display: none !important;
      }

      body[data-command-surface="list"] #map-view > #venue-tray.venue-tray.tray--full {
        inset: var(--header-height) 0 var(--footer-height) 0 !important;
      }

      /* All destination headers use the same optional-action grid. */
      .mobile-destination-header {
        grid-template-columns: minmax(0, 1fr) auto !important;
      }

      /* Mobile List uses its header action and does not reserve the legacy
         search-reset toolbar band below the title. */
      body[data-command-surface="list"] .tray-list__toolbar {
        display: none !important;
      }
    }

  `;
  document.head.append(style);
}

function selectedVenue(state = appState()) {
  if (!state?.snapshot?.venues || !state.selectedVenueId) return null;
  return state.snapshot.venues.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function syncCalBarNominationAction() {
  const button = document.querySelector('#add-cal-bar-button');
  if (!button) return;
  const label = button.querySelector('strong');
  const copy = button.querySelector('small');
  const iconUse = button.querySelector('.add-action__icon use');
  if (!label || !copy) return;

  if (iconUse) iconUse.setAttribute('href', 'assets/icons.svg#icon-cal-bar');

  const venue = selectedVenue();
  const canNominate = !venue || venue.venue_type === 'community_location';
  button.hidden = !canNominate;

  if (!venue) {
    label.textContent = 'Nominate a Cal Bar';
    copy.textContent = 'Find a Community Location that is a regular Cal gathering place.';
    return;
  }

  label.textContent = 'Nominate as a Cal Bar';
  copy.textContent = 'Think Cal fans gather here regularly? Tell us why it should be recognized.';
}

function syncCorrectionLanguage() {
  const listingUpdate = document.querySelector('#add-report-listing-button');
  if (listingUpdate) listingUpdate.textContent = 'Suggest an Update';
}

function sync() {
  installStyles();
  syncCalBarNominationAction();
  syncCorrectionLanguage();
}

function initialize() {
  installStyles();
  document.querySelector('#mobile-add-button')?.addEventListener('click', () => requestAnimationFrame(syncCalBarNominationAction));
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', sync);
  window.CGBApp?.subscribe?.('rendered', sync);
  window.CGBApp?.subscribe?.('ready', sync);
  sync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
