import {
  setActiveCommand,
  setCommandSurface,
  setPrimarySurfaceVisibility
} from './command-surface.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-first-pass';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek {
        position: absolute !important;
        z-index: 46 !important;
        inset: auto 0 0 0 !important;
        width: 100% !important;
        max-width: none !important;
        height: 96px !important;
        margin: 0 !important;
        overflow: hidden !important;
        border-radius: 22px 22px 0 0 !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek:not(.tray--draggable) {
        height: 96px !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle {
        height: 18px !important;
        display: none !important;
        pointer-events: none !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek.tray--draggable .tray-handle {
        display: grid !important;
        pointer-events: auto !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span {
        width: 34px !important;
        height: 4px !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-peek {
        padding: 0 10px 7px !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-summary {
        min-height: 70px !important;
        grid-template-columns: 26px minmax(0, 1fr) auto !important;
        gap: 9px !important;
        padding: 2px 12px 8px !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__marker {
        width: 20px !important;
        height: 20px !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy strong {
        font-size: .96rem !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy small {
        overflow: visible !important;
        font-size: .64rem !important;
        line-height: 1.22 !important;
        text-overflow: clip !important;
        white-space: normal !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__chevron {
        display: none !important;
      }

      body[data-command-surface="add"] #map-view > #venue-tray.venue-tray {
        display: none !important;
      }

      body[data-command-surface="list"] #map {
        visibility: hidden !important;
      }

      body[data-command-surface="list"] #map-view {
        background: var(--cgb-warm-50) !important;
      }

      body[data-command-surface="list"] #map-view > #venue-tray.venue-tray.tray--full {
        position: fixed !important;
        z-index: 47 !important;
        inset: var(--header-height) 0 var(--footer-height) 0 !important;
        width: 100vw !important;
        height: auto !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        background: var(--cgb-warm-50) !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        transform: none !important;
      }

      body[data-command-surface="list"] #map-view > #venue-tray.venue-tray.tray--full .tray-handle {
        display: none !important;
      }

      body[data-command-surface="list"] #tray-list {
        height: 100% !important;
        max-height: none !important;
        display: block !important;
        overflow-y: auto !important;
        background: var(--cgb-warm-50) !important;
      }
    }
  `;
  document.head.append(style);
}


function setCommandActive(command) {
  setCommandSurface(document, command);
  setActiveCommand(document, command);
}

function openListSurface(event) {
  if (!isMobile()) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  setPrimarySurfaceVisibility(document, 'list');
  window.CGBApp?.setTrayState?.('full', { animate: true });
  setCommandActive('list');
}

function initialize() {
  installStyles();
  document.querySelector('#mobile-list-button')?.addEventListener('click', openListSurface, { capture: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
