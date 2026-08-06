const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-first-pass';
const MAP_HEADER_HEIGHT = 124;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function installStyles() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
  }
  style.textContent = `
    @media (max-width: 899px) {
      body[data-command-surface="map"] {
        --header-height: calc(${MAP_HEADER_HEIGHT}px + env(safe-area-inset-top, 0px));
      }

      body[data-command-surface="map"] .site-header {
        height: var(--header-height);
        min-height: var(--header-height);
        display: grid;
        grid-template-rows: 38px minmax(0, 1fr);
        align-content: start;
        gap: 4px;
        padding-top: calc(env(safe-area-inset-top, 0px) + 8px);
        padding-bottom: 8px;
      }

      body[data-command-surface="map"] .site-header__brand-row {
        min-height: 38px;
      }

      body[data-command-surface="map"] .game-button {
        width: 100%;
        max-width: none;
        min-height: 62px;
        grid-template-columns: minmax(0, 1fr) 22px;
        grid-template-rows: auto auto auto;
        padding: 5px 34px 7px 0;
        text-align: left;
        background: transparent;
        border: 0;
        border-radius: 0;
      }

      body[data-command-surface="search"],
      body[data-command-surface="add"],
      body[data-command-surface="list"] {
        --header-height: calc(82px + env(safe-area-inset-top, 0px));
      }

      body[data-command-surface="search"] .opening-stat,
      body[data-command-surface="add"] .opening-stat,
      body[data-command-surface="list"] .opening-stat,
      body[data-view="detail"] .opening-stat {
        display: none;
      }

      .command-surface .search-field {
        border-color: var(--cgb-neutral-300);
        box-shadow: var(--shadow-xs);
      }

      .command-surface .search-field:focus-within {
        border-color: var(--cgb-gold-400);
        box-shadow: 0 0 0 2px rgba(253, 181, 21, .34), var(--shadow-sm);
      }

      .command-surface .search-field input,
      .command-surface .search-field input:focus,
      .command-surface .search-field input:focus-visible {
        outline: 0;
        border: 0;
        box-shadow: none;
      }

      body[data-command-surface="list"] #map {
        visibility: hidden;
      }

      body[data-command-surface="list"] #map-view {
        background: var(--cgb-warm-50);
      }

      body[data-command-surface="list"] #map-view > #venue-tray.venue-tray.tray--full {
        position: fixed;
        z-index: 47;
        inset: var(--header-height) 0 var(--footer-height) 0;
        width: 100vw;
        height: auto;
        max-width: none;
        max-height: none;
        margin: 0;
        background: var(--cgb-warm-50);
        border: 0;
        border-radius: 0;
        box-shadow: none;
        transform: none;
      }

      body[data-command-surface="list"] #map-view > #venue-tray.venue-tray.tray--full .tray-handle {
        display: none;
      }

      body[data-command-surface="list"] #tray-list {
        height: 100%;
        max-height: none;
        display: block;
        overflow-y: auto;
        background: var(--cgb-warm-50);
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
    const active = button.dataset.command === command || button.id === `mobile-${command}-button`;
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
  setTrayState('full');
  setCommandActive('list');
}

function setSearchLanguage() {
  const intro = document.querySelector('#search-surface .command-surface__intro');
  if (intro) intro.textContent = 'Search Cal Golden Bars or add another location to the map.';
}

function scheduleEnhancement() {
  requestAnimationFrame(setSearchLanguage);
}

function initialize() {
  installStyles();
  setSearchLanguage();
  document.querySelector('#mobile-list-button')?.addEventListener('click', openListSurface, { capture: true });
  scheduleEnhancement();
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', scheduleEnhancement);
  window.CGBApp?.subscribe?.('rendered', scheduleEnhancement);
  window.CGBApp?.subscribe?.('ready', scheduleEnhancement);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
