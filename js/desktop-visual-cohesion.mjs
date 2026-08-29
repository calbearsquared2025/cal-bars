const DESKTOP_QUERY = '(min-width: 900px)';
const STYLE_ID = 'cgb-desktop-visual-cohesion';
const FOOTER_READY = 'desktopCohesionReady';

function isDesktop(windowObject = globalThis.window) {
  return windowObject?.matchMedia?.(DESKTOP_QUERY)?.matches === true;
}

export function installDesktopVisualCohesionStyles(documentObject = globalThis.document) {
  if (!documentObject?.head || documentObject.getElementById?.(STYLE_ID)) return false;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (min-width: 900px) {
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

      .maplibregl-ctrl-bottom-right {
        right: auto !important;
        bottom: 16px !important;
        left: 90px !important;
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

      .site-footer.site-footer--desktop-cohesion {
        min-height: var(--footer-height, 30px);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 18px;
        color: var(--cgb-ink-500, #687280);
        background: var(--cgb-warm-50, #f7f6f2);
        border-top: 1px solid rgba(1, 1, 51, .08);
        border-radius: 0 !important;
        clip-path: none !important;
        font-size: var(--text-2xs, .625rem);
        white-space: nowrap;
      }

      .site-footer--desktop-cohesion .site-footer__brand,
      .site-footer--desktop-cohesion .site-footer__link,
      .site-footer--desktop-cohesion .text-button {
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

      .site-footer--desktop-cohesion .site-footer__brand {
        color: var(--cgb-navy-950, #010133);
        font-family: var(--font-condensed, sans-serif);
        font-weight: 900;
        letter-spacing: .055em;
      }

      .site-footer--desktop-cohesion .site-footer__link:hover,
      .site-footer--desktop-cohesion .site-footer__link:focus-visible,
      .site-footer--desktop-cohesion .text-button:hover,
      .site-footer--desktop-cohesion .text-button:focus-visible,
      .site-footer--desktop-cohesion .site-footer__brand:hover,
      .site-footer--desktop-cohesion .site-footer__brand:focus-visible {
        color: var(--cgb-navy-950, #010133);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .site-footer--desktop-cohesion .site-footer__separator {
        color: var(--cgb-neutral-300, #cbd0d6);
      }

      .site-footer--desktop-cohesion .site-footer__disclaimer {
        color: var(--cgb-ink-500, #687280);
        font-weight: 500;
      }
    }
  `;
  documentObject.head.append(style);
  return true;
}

function separator(documentObject) {
  const span = documentObject.createElement('span');
  span.className = 'site-footer__separator';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = '·';
  return span;
}

export function syncDesktopFooter({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!documentObject || !isDesktop(windowObject)) return false;
  const footer = documentObject.querySelector('.site-footer');
  if (!footer || footer.dataset[FOOTER_READY] === 'true') return false;

  const aboutButton = footer.querySelector('#about-button');
  const socialLink = footer.querySelector('a[href*="x.com/calbearsquared"]');
  if (!aboutButton || !socialLink) return false;

  const brand = documentObject.createElement('a');
  brand.className = 'site-footer__brand';
  brand.href = './';
  brand.textContent = 'CAL GOLDEN BARS';

  const addButton = documentObject.createElement('button');
  addButton.type = 'button';
  addButton.className = 'text-button site-footer__link site-footer__add';
  addButton.textContent = 'Add to CGB';
  addButton.addEventListener('click', () => {
    documentObject.querySelector('#mobile-add-button')?.click();
  });

  aboutButton.classList.add('site-footer__link');
  socialLink.classList.add('site-footer__link');
  socialLink.textContent = '@calbearsquared';

  const disclaimer = documentObject.createElement('span');
  disclaimer.className = 'site-footer__disclaimer';
  disclaimer.textContent = 'Not affiliated with Cal Athletics or the California Alumni Association';

  footer.replaceChildren(
    brand,
    separator(documentObject),
    addButton,
    separator(documentObject),
    aboutButton,
    separator(documentObject),
    socialLink,
    separator(documentObject),
    disclaimer
  );
  footer.classList.add('site-footer--desktop-cohesion');
  footer.dataset[FOOTER_READY] = 'true';
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
    syncDesktopFooter({ documentObject, windowObject });
    syncDesktopAddLanguage({ documentObject, windowObject });
  };

  const start = () => {
    sync();
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
