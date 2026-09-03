const DESKTOP_QUERY = '(min-width: 900px)';
const STYLE_ID = 'cgb-desktop-visual-cohesion';
let gameDropdownWired = false;

function isDesktop(windowObject = globalThis.window) {
  return windowObject?.matchMedia?.(DESKTOP_QUERY)?.matches === true;
}

export function installDesktopVisualCohesionStyles(documentObject = globalThis.document) {
  if (!documentObject?.head || documentObject.getElementById?.(STYLE_ID)) return false;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (min-width: 900px) {
      .mobile-command-bar .mobile-command {
        text-transform: uppercase;
      }

      #add-surface > .command-surface__shell {
        background: var(--cgb-warm-50, #f7f6f2) !important;
      }

      .map-toolbar .search-field {
        background: var(--cgb-white, #fff) !important;
      }

      .maptiler-logo {
        left: 24px !important;
        bottom: 16px !important;
      }

      .maplibregl-ctrl-top-right {
        bottom: 44px !important;
      }

      .map-actions {
        bottom: 142px !important;
      }

      .maplibregl-ctrl-bottom-right {
        right: calc(min(390px, 34vw) + 26px) !important;
        bottom: 16px !important;
        left: auto !important;
      }

      body[data-view="map"] .map-view:has(> #venue-tray.venue-tray.tray--selected) .maplibregl-ctrl-bottom-right {
        right: calc(clamp(500px, 52vw, 620px) + 26px) !important;
      }

      .mobile-command-bar #mobile-add-button {
        width: 100% !important;
        min-width: 0 !important;
        justify-self: stretch !important;
        padding-inline: 10px !important;
        background: var(--cgb-white, #fff) !important;
        border: 1px solid var(--cgb-neutral-300, #cbd0d6) !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      .mobile-command-bar #mobile-add-button:hover,
      .mobile-command-bar #mobile-add-button:focus-visible {
        background: var(--cgb-gold-50, #fff8e6) !important;
        border-color: var(--cgb-gold-400, #fdb515) !important;
        text-decoration: none !important;
      }

      #tray-selected #venue-detail .detail-local-map {
        position: relative !important;
      }

      #tray-selected #venue-detail .detail-local-map__photo-action {
        position: absolute !important;
        z-index: 8 !important;
        top: 12px !important;
        right: auto !important;
        bottom: auto !important;
        left: 12px !important;
        min-height: 30px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 6px 9px !important;
        color: var(--cgb-navy-950, #010133) !important;
        background: rgba(255, 255, 255, .94) !important;
        border: 1px solid var(--cgb-gold-400, #fdb515) !important;
        border-radius: 8px !important;
        box-shadow: 0 2px 8px rgba(1, 1, 51, .12) !important;
        font-family: var(--font-condensed, sans-serif) !important;
        font-size: .64rem !important;
        font-weight: 850 !important;
        letter-spacing: .08em !important;
        line-height: 1 !important;
        text-decoration: none !important;
        text-transform: uppercase !important;
      }

      #tray-selected #venue-detail .detail-local-map__photo-action:hover,
      #tray-selected #venue-detail .detail-local-map__photo-action:focus-visible {
        background: var(--cgb-gold-50, #fff8e6) !important;
      }

      .game-dialog.game-dialog--dropdown {
        position: fixed;
        z-index: 3000;
        inset: auto;
        margin: 0;
        padding: 0;
        overflow: hidden;
        color: var(--cgb-ink-900);
        background: var(--cgb-white, #fff);
        border: 1px solid rgba(1, 1, 51, .14);
        border-radius: 12px;
        box-shadow: 0 16px 34px rgba(1, 1, 51, .18);
      }

      .game-dialog.game-dialog--dropdown .dialog-shell {
        max-height: inherit;
        padding: 0;
        overflow: hidden;
        background: var(--cgb-white, #fff);
      }

      .game-dialog.game-dialog--dropdown .dialog-header {
        display: none;
      }

      .game-dialog.game-dialog--dropdown .game-list {
        max-height: inherit;
        overflow-y: auto;
        border-top: 0;
      }

      .game-dialog.game-dialog--dropdown .game-option:last-child {
        border-bottom: 0;
      }

      #add-surface .add-context {
        color: var(--cgb-navy-950, #010133) !important;
        background: #fbfaf5 !important;
        border: 1px solid var(--cgb-neutral-200, #dfe2e6) !important;
        border-left: 4px solid var(--cgb-gold-400, #fdb515) !important;
        border-radius: 14px !important;
        clip-path: none !important;
        box-shadow: none !important;
      }

      #add-surface .add-context .eyebrow {
        color: var(--cgb-ink-500, #687280) !important;
      }

      #add-surface .add-context strong,
      #add-surface .add-context p {
        color: var(--cgb-navy-950, #010133) !important;
      }

      #add-surface .add-context .add-actions {
        background: transparent !important;
        border: 0 !important;
      }

      #add-surface .add-context .add-action {
        background: var(--cgb-white, #fff) !important;
      }

      #add-surface .add-context .add-action:hover,
      #add-surface .add-context .add-action:focus-visible {
        background: var(--cgb-gold-50, #fff8e6) !important;
      }

      .site-footer {
        min-height: var(--footer-height, 30px);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        padding: 0 18px;
        color: var(--cgb-ink-500, #687280);
        background: var(--cgb-warm-50, #f7f6f2);
        border-top: 1px solid rgba(1, 1, 51, .08);
        border-radius: 0 !important;
        clip-path: none !important;
        font-size: var(--text-2xs, .625rem);
        white-space: nowrap;
      }

      .site-footer a,
      .site-footer .text-button {
        margin: 0;
        padding: 0;
        color: var(--cgb-navy-900, #002676);
        background: transparent;
        border: 0;
        font: inherit;
        font-weight: 750;
        line-height: 1;
        text-decoration: none;
      }

      .site-footer a:hover,
      .site-footer a:focus-visible,
      .site-footer .text-button:hover,
      .site-footer .text-button:focus-visible {
        color: var(--cgb-navy-950, #010133);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
    }
  `;
  documentObject.head.append(style);
  return true;
}

function closeDesktopGameDropdown({ documentObject = globalThis.document } = {}) {
  const dialog = documentObject?.querySelector?.('#game-dialog');
  const button = documentObject?.querySelector?.('#game-button');
  if (!dialog?.open) return false;
  dialog.close();
  button?.setAttribute('aria-expanded', 'false');
  return true;
}

function positionDesktopGameDropdown({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  const dialog = documentObject?.querySelector?.('#game-dialog');
  const button = documentObject?.querySelector?.('#game-button');
  if (!dialog?.open || !button || !isDesktop(windowObject)) return false;
  const rect = button.getBoundingClientRect();
  const maxHeight = Math.max(180, windowObject.innerHeight - rect.bottom - 18);
  dialog.style.top = `${Math.round(rect.bottom + 6)}px`;
  dialog.style.left = `${Math.round(rect.left)}px`;
  dialog.style.width = `${Math.round(rect.width)}px`;
  dialog.style.maxHeight = `${Math.round(maxHeight)}px`;
  return true;
}

function openDesktopGameDropdown({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  const dialog = documentObject?.querySelector?.('#game-dialog');
  const button = documentObject?.querySelector?.('#game-button');
  if (!dialog || !button || !isDesktop(windowObject) || typeof dialog.show !== 'function') return false;
  if (dialog.open) return closeDesktopGameDropdown({ documentObject });
  dialog.classList.add('game-dialog--dropdown');
  dialog.show();
  button.setAttribute('aria-expanded', 'true');
  positionDesktopGameDropdown({ documentObject, windowObject });
  return true;
}

function wireDesktopGameDropdown({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (gameDropdownWired || !documentObject || !windowObject) return false;
  const button = documentObject.querySelector('#game-button');
  const dialog = documentObject.querySelector('#game-dialog');
  if (!button || !dialog) return false;
  gameDropdownWired = true;
  button.setAttribute('aria-expanded', 'false');

  button.addEventListener('click', (event) => {
    if (!isDesktop(windowObject)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openDesktopGameDropdown({ documentObject, windowObject });
  }, { capture: true });

  documentObject.addEventListener('click', (event) => {
    if (!isDesktop(windowObject) || !dialog.open) return;
    if (event.target.closest?.('#game-button, #game-dialog')) return;
    closeDesktopGameDropdown({ documentObject });
  });

  documentObject.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isDesktop(windowObject) || !dialog.open) return;
    event.preventDefault();
    closeDesktopGameDropdown({ documentObject });
    button.focus();
  });

  dialog.addEventListener('close', () => {
    button.setAttribute('aria-expanded', 'false');
  });

  windowObject.addEventListener('resize', () => {
    if (!dialog.open) return;
    if (!isDesktop(windowObject)) {
      closeDesktopGameDropdown({ documentObject });
      dialog.classList.remove('game-dialog--dropdown');
      return;
    }
    positionDesktopGameDropdown({ documentObject, windowObject });
  });
  return true;
}

export function syncDesktopAddLanguage({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!documentObject || !isDesktop(windowObject)) return false;
  const context = documentObject.querySelector('#add-context');
  const title = documentObject.querySelector('#add-somewhere-else-title');
  if (!context || context.hidden || !title) return false;
  if (title.textContent === 'Add somewhere else') return false;
  title.textContent = 'Add somewhere else';
  return true;
}

function initializeDesktopVisualCohesion({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!documentObject || !windowObject) return;
  installDesktopVisualCohesionStyles(documentObject);

  const sync = () => {
    syncDesktopAddLanguage({ documentObject, windowObject });
  };

  const start = () => {
    sync();
    wireDesktopGameDropdown({ documentObject, windowObject });
    const addSurface = documentObject.querySelector('#add-surface');
    if (addSurface && typeof MutationObserver === 'function') {
      const observer = new MutationObserver(() => windowObject.requestAnimationFrame(sync));
      observer.observe(addSurface, {
        attributes: true,
        attributeFilter: ['hidden'],
        childList: true,
        subtree: true
      });
    }
    windowObject.matchMedia?.(DESKTOP_QUERY)?.addEventListener?.('change', sync);
  };

  if (documentObject.readyState === 'loading') {
    documentObject.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

initializeDesktopVisualCohesion();