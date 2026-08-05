const MOBILE_QUERY = '(max-width: 899px)';
const FOCUS_ZOOM = 11;
const STYLE_ID = 'cgb-map-mobile-refinement';

let lastAutoFocusedVenueId = '';
let trayObserver = null;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      .maplibregl-ctrl-top-right {
        display: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek {
        position: absolute !important;
        z-index: 46 !important;
        inset: auto 0 0 0 !important;
        width: 100% !important;
        max-width: none !important;
        height: 92px !important;
        margin: 0 !important;
        background: var(--cgb-white, #fff) !important;
        border: 0 !important;
        border-radius: 22px 22px 0 0 !important;
        box-shadow: 0 -12px 30px rgba(1, 1, 51, .2) !important;
        overflow: hidden !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle {
        height: 18px !important;
        background: var(--cgb-white, #fff) !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span {
        width: 34px !important;
        height: 4px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-peek {
        padding: 0 10px 7px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary {
        min-height: 66px !important;
        grid-template-columns: 26px minmax(0, 1fr) auto 16px !important;
        gap: 9px !important;
        padding: 2px 12px 7px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__marker {
        width: 20px !important;
        height: 20px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy strong {
        font-size: .96rem !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy small {
        font-size: .64rem !important;
      }
    }
  `;
  document.head.append(style);
}

function removeZoomControls() {
  document.querySelectorAll('.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out').forEach((button) => {
    const group = button.closest('.maplibregl-ctrl-group');
    button.remove();
    if (group && !group.querySelector('button')) group.remove();
  });
}

function selectedVenue(venueId, state = appState()) {
  return state?.snapshot?.venues?.find((venue) => venue.venue_id === venueId) || null;
}

function previewVenueCard(venueId = '') {
  const cards = Array.from(document.querySelectorAll('#location-list .location-card[data-venue-id]'));
  return cards.find((card) => card.dataset.venueId === venueId) || cards[0] || null;
}

function updatePreviewIntent() {
  const button = document.querySelector('#browse-locations-button');
  const copy = document.querySelector('#tray-summary-copy');
  const title = document.querySelector('#tray-summary-title');
  const card = previewVenueCard();
  if (!button || !copy || !title || !card) {
    button?.removeAttribute('data-direct-venue-id');
    return;
  }

  button.dataset.directVenueId = card.dataset.venueId;
  copy.textContent = copy.textContent.replace(/\s*·\s*View list\s*$/i, '');
  button.setAttribute('aria-label', `Open ${title.textContent}`);
}

function openPreviewVenue(event) {
  const button = event.target.closest?.('#browse-locations-button[data-direct-venue-id]');
  if (!button || !isMobile()) return;
  const card = previewVenueCard(button.dataset.directVenueId);
  if (!card) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  card.click();
}

function focusVenue(venueId, { force = false } = {}) {
  if (!isMobile()) return;
  const state = appState();
  const venue = selectedVenue(venueId, state);
  if (!state?.map || !venue) return;
  if (!force && lastAutoFocusedVenueId === venueId) return;
  lastAutoFocusedVenueId = venueId;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const tray = document.querySelector('#venue-tray.tray--selected');
      const trayHeight = tray && getComputedStyle(tray).display !== 'none'
        ? tray.getBoundingClientRect().height
        : 0;
      const verticalOffset = -Math.min(170, Math.max(82, trayHeight * .34));
      const currentZoom = Number(state.map.getZoom?.()) || 0;
      state.map.easeTo({
        center: [Number(venue.longitude), Number(venue.latitude)],
        zoom: Math.max(currentZoom, FOCUS_ZOOM),
        offset: [0, verticalOffset],
        duration: reducedMotion() ? 0 : 420,
        essential: true
      });
    });
  });
}

function positionAttribution() {
  if (!isMobile()) return;
  const map = document.querySelector('#map');
  const tray = document.querySelector('#venue-tray');
  const attribution = document.querySelector('.maplibregl-ctrl-bottom-right');
  if (!map || !tray || !attribution) return;

  const mapRect = map.getBoundingClientRect();
  const trayRect = tray.getBoundingClientRect();
  const trayVisible = getComputedStyle(tray).display !== 'none' && trayRect.top < mapRect.bottom;
  const overlap = trayVisible ? Math.max(0, mapRect.bottom - trayRect.top) : 0;
  attribution.style.bottom = `${Math.round(overlap + 6)}px`;
}

function observeTray() {
  const tray = document.querySelector('#venue-tray');
  if (!tray || typeof ResizeObserver !== 'function') return;
  trayObserver?.disconnect();
  trayObserver = new ResizeObserver(() => requestAnimationFrame(positionAttribution));
  trayObserver.observe(tray);
}

function sync() {
  installStyles();
  removeZoomControls();
  updatePreviewIntent();
  positionAttribution();

  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (!isMobile() || !state?.selectedVenueId || tray?.dataset.state !== 'selected') return;
  focusVenue(state.selectedVenueId);
}

function initialize() {
  installStyles();
  observeTray();

  document.addEventListener('click', openPreviewVenue, { capture: true });
  document.addEventListener('click', (event) => {
    const marker = event.target.closest?.('.cgb-marker[data-venue-id]');
    if (!marker) return;
    lastAutoFocusedVenueId = '';
    requestAnimationFrame(() => focusVenue(marker.dataset.venueId, { force: true }));
  });

  window.addEventListener('resize', () => requestAnimationFrame(positionAttribution));
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
