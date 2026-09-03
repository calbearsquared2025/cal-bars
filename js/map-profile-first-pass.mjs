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

function setTrayState(next) {
  const state = appState();
  const tray = document.querySelector('#venue-tray');
  if (!state || !tray) return false;

  state.trayState = next;
  tray.dataset.state = next;
  tray.className = `venue-tray tray--${next}`;

  const handle = document.querySelector('#tray-handle');
  const peek = document.querySelector('#tray-peek');
  const selected = document.querySelector('#tray-selected');
  const list = document.querySelector('#tray-list');

  handle?.setAttribute('aria-expanded', String(next !== 'peek'));
  if (peek) peek.hidden = next !== 'peek';
  if (selected) selected.hidden = next !== 'selected';
  if (list) list.hidden = next !== 'full';
  requestAnimationFrame(() => state.map?.resize?.());
  return true;
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
  document.querySelector('#about-surface')?.setAttribute('hidden', '');
  setTrayState('full');
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
