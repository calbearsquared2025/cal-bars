const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-first-pass';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      body[data-command-surface="add"] #map-view > #venue-tray.venue-tray {
        display: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 9px !important;
        padding: 0 14px 14px !important;
        box-sizing: border-box !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card > * {
        grid-column: 1 / -1 !important;
        min-width: 0 !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header {
        display: block !important;
        margin: 0 -14px 1px !important;
        padding: 10px 14px 11px !important;
        background: linear-gradient(90deg, var(--cgb-navy-50), var(--cgb-white) 78%) !important;
        border-left: 0 !important;
        border-bottom: 1px solid var(--cgb-neutral-200) !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header > div {
        min-width: 0 !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card h2 {
        display: -webkit-box !important;
        margin: 4px 0 3px !important;
        overflow: hidden !important;
        font-size: clamp(1.2rem, 5.2vw, 1.48rem) !important;
        line-height: 1.04 !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 2 !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .venue-description {
        display: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        width: 100% !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 7px !important;
        margin: 1px 0 0 !important;
        justify-self: stretch !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        min-height: 44px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button {
        width: 100% !important;
        min-width: 0 !important;
        min-height: 46px !important;
        display: inline-flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 2px !important;
        padding: 5px 2px !important;
        color: var(--cgb-navy-950) !important;
        background: var(--cgb-white) !important;
        border: 1px solid var(--cgb-neutral-300) !important;
        border-radius: var(--radius-md) !important;
        clip-path: none !important;
        font-family: var(--font-condensed) !important;
        font-size: .64rem !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-align: center !important;
        text-decoration: none !important;
        box-sizing: border-box !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button .ui-icon {
        width: 16px !important;
        height: 16px !important;
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
  document.body.dataset.commandSurface = command;
  document.querySelectorAll('.mobile-command').forEach((button) => {
    const active = button.dataset.command === command ||
      (button.id === `mobile-${command}-button`);
    button.classList.toggle('mobile-command--active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function openListSurface(event) {
  if (!isMobile()) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  document.querySelector('#search-surface')?.setAttribute('hidden', '');
  document.querySelector('#add-surface')?.setAttribute('hidden', '');
  window.CGBApp?.showLocations?.();
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
