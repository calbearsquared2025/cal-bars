const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-first-pass';
const HEADER_OVERHANG = 31;

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
      :root {
        --header-height: calc(176px + env(safe-area-inset-top, 0px)) !important;
      }

      .site-header,
      body[data-command-surface="search"] .site-header,
      body[data-command-surface="add"] .site-header,
      body[data-command-surface="list"] .site-header {
        height: var(--header-height) !important;
        min-height: var(--header-height) !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        align-content: start !important;
        gap: 12px !important;
        padding: calc(env(safe-area-inset-top, 0px) + 10px) max(16px, env(safe-area-inset-right, 0px)) 25px max(16px, env(safe-area-inset-left, 0px)) !important;
      }

      body[data-command-surface="search"] .site-header__brand-row,
      body[data-command-surface="add"] .site-header__brand-row,
      body[data-command-surface="list"] .site-header__brand-row {
        min-height: 38px !important;
        display: flex !important;
      }

      body[data-command-surface="search"] .opening-stat,
      body[data-command-surface="add"] .opening-stat,
      body[data-command-surface="list"] .opening-stat {
        display: grid !important;
      }

      body[data-command-surface="search"] .game-button,
      body[data-command-surface="add"] .game-button,
      body[data-command-surface="list"] .game-button {
        min-height: 66px !important;
        grid-template-columns: minmax(0, 1fr) 22px !important;
        grid-template-rows: auto auto auto !important;
        padding: 8px 34px 9px 0 !important;
        border-bottom: 1px solid rgba(255, 255, 255, .19) !important;
      }

      body[data-command-surface="search"] .game-button__eyebrow,
      body[data-command-surface="add"] .game-button__eyebrow,
      body[data-command-surface="list"] .game-button__eyebrow {
        display: block !important;
      }

      body[data-command-surface="search"] #header-game-label,
      body[data-command-surface="add"] #header-game-label,
      body[data-command-surface="list"] #header-game-label {
        font-size: clamp(1.48rem, 7.5vw, 2.05rem) !important;
      }

      body[data-command-surface="search"] #header-kickoff,
      body[data-command-surface="add"] #header-kickoff,
      body[data-command-surface="list"] #header-kickoff {
        font-size: .78rem !important;
      }

      body[data-command-surface="search"] .command-surface:not([hidden]),
      body[data-command-surface="add"] .command-surface:not([hidden]) {
        inset: calc(var(--header-height) + ${HEADER_OVERHANG}px) 0 var(--footer-height) 0 !important;
      }

      .command-surface .search-field {
        border-color: var(--cgb-neutral-300) !important;
        box-shadow: var(--shadow-xs) !important;
      }

      .command-surface .search-field:focus-within {
        border-color: var(--cgb-gold-400) !important;
        box-shadow: 0 0 0 2px rgba(253, 181, 21, .34), var(--shadow-sm) !important;
      }

      .command-surface .search-field input,
      .command-surface .search-field input:focus,
      .command-surface .search-field input:focus-visible {
        outline: 0 !important;
        border: 0 !important;
        box-shadow: none !important;
      }

      #map-view > #venue-tray.venue-tray::before {
        content: none !important;
        display: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle,
      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__chevron {
        display: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek {
        height: 78px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-peek {
        padding: 5px 10px 7px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary {
        min-height: 66px !important;
        grid-template-columns: 24px minmax(0, 1fr) auto !important;
        padding: 4px 12px !important;
      }

      body[data-command-surface="search"] #map-view > #venue-tray.venue-tray.tray--peek,
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
        padding: 10px 14px 11px 18px !important;
        background: linear-gradient(90deg, var(--cgb-navy-50), var(--cgb-white) 78%) !important;
        border-left: 4px solid var(--cgb-navy-900) !important;
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

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party {
        width: 100% !important;
        min-height: 40px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 7px 12px !important;
        color: var(--cgb-navy-950) !important;
        background: var(--cgb-gold-50) !important;
        border: 1px solid var(--cgb-gold-500) !important;
        border-radius: var(--radius-md) !important;
        font-size: .76rem !important;
        font-weight: 850 !important;
        box-shadow: none !important;
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
        inset: calc(var(--header-height) + ${HEADER_OVERHANG}px) 0 var(--footer-height) 0 !important;
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

      body[data-command-surface="list"] .tray-list__header {
        min-height: 74px !important;
        padding: 15px 16px 13px !important;
        background: var(--cgb-warm-50) !important;
        border-bottom: 1px solid var(--cgb-neutral-200) !important;
      }

      body[data-command-surface="list"] .tray-list__header h2 {
        font-size: clamp(1.45rem, 6.4vw, 1.9rem) !important;
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
  setTrayState('full');
  setCommandActive('list');
}

function setSearchLanguage() {
  const intro = document.querySelector('#search-surface .command-surface__intro');
  if (intro) intro.textContent = 'Search Cal Golden Bars or add another location to the map.';
}

function addPlanWatchPartyAction(card) {
  card.querySelector('.selected-card__party-empty')?.remove();
  const existing = card.querySelector('.selected-card__plan-party');
  if (card.querySelector('.party-module')) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'selected-card__plan-party';
  button.textContent = 'Plan a Watch Party';

  const attendance = card.querySelector('.bear-count');
  if (attendance) attendance.after(button);
  else card.append(button);
}

function normalizeActionLabels(card) {
  const detail = Array.from(card.querySelectorAll('.action-row .secondary-button'))
    .find((action) => /view details|details/i.test(action.textContent));
  if (!detail) return;

  Array.from(detail.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && /view details|details/i.test(node.textContent || '')) {
      node.textContent = 'Details';
    }
  });
  detail.setAttribute('aria-label', 'Details');
}

function enhanceSelectedCard() {
  const card = document.querySelector('#map-view > #venue-tray.venue-tray.tray--selected .selected-card');
  if (!card) return;
  addPlanWatchPartyAction(card);
  normalizeActionLabels(card);
}

function scheduleEnhancement() {
  requestAnimationFrame(() => {
    setSearchLanguage();
    enhanceSelectedCard();
    requestAnimationFrame(enhanceSelectedCard);
  });
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
