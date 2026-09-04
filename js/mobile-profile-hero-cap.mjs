const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-profile-hero-cap';
const PASSED_ATTR = 'profileHeroPassed';
const EDGE_TOLERANCE_PX = 1;
const EXIT_TOLERANCE_PX = 6;

let appConnected = false;
let syncFrame = 0;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function heroHasPassedTrayCap({
  heroBottom = Number.NaN,
  capBottom = Number.NaN,
  tolerance = EDGE_TOLERANCE_PX
} = {}) {
  const hero = Number(heroBottom);
  const cap = Number(capBottom);
  const slack = Math.max(0, finite(tolerance));
  if (!Number.isFinite(hero) || !Number.isFinite(cap) || cap <= 0) return false;
  return hero <= cap + slack;
}

export function nextHeroCapPassedState({
  heroBottom = Number.NaN,
  capBottom = Number.NaN,
  wasPassed = false,
  enterTolerance = EDGE_TOLERANCE_PX,
  exitTolerance = EXIT_TOLERANCE_PX
} = {}) {
  const hero = Number(heroBottom);
  const cap = Number(capBottom);
  if (!Number.isFinite(hero) || !Number.isFinite(cap) || cap <= 0) return Boolean(wasPassed);

  const enterSlack = Math.max(0, finite(enterTolerance));
  const exitSlack = Math.max(enterSlack, finite(exitTolerance));
  return Boolean(wasPassed)
    ? hero <= cap + exitSlack
    : hero <= cap + enterSlack;
}

function isMobile(windowObject = window) {
  return windowObject.matchMedia?.(MOBILE_QUERY)?.matches === true;
}

function installStyles(documentObject = document) {
  if (documentObject.getElementById(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek {
        height: 126px !important;
        background: var(--cgb-navy-950) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle,
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle {
        background: var(--cgb-navy-950) !important;
        transition: background-color 140ms ease;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span,
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle span {
        background: var(--cgb-gold-400) !important;
        transition: background-color 140ms ease;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-peek,
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button {
        color: var(--cgb-white) !important;
        background: var(--cgb-navy-950) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button {
        min-height: 92px !important;
        grid-template-columns: 22px minmax(0, 1fr) max-content !important;
        gap: 8px !important;
        padding: 11px 13px 15px !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__copy {
        gap: 3px !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__copy .eyebrow {
        color: var(--cgb-gold-300) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__copy strong {
        color: var(--cgb-white) !important;
        font-family: var(--font-condensed, "Barlow Condensed", "Arial Narrow", sans-serif) !important;
        font-size: 1.05rem !important;
        font-weight: 900 !important;
        letter-spacing: -.015em !important;
        line-height: 1 !important;
        text-transform: uppercase !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__copy small {
        color: rgba(255, 255, 255, .78) !important;
      }

      /* Match the full profile's oversized attendance numeral while keeping the mini card narrow. */
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__count {
        width: max-content !important;
        max-width: 64px !important;
        display: grid !important;
        grid-template-columns: auto auto !important;
        align-items: center !important;
        justify-self: end !important;
        gap: 3px !important;
        color: var(--cgb-white) !important;
        font-family: var(--font-ui) !important;
        white-space: normal !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__count-number {
        color: var(--cgb-gold-300) !important;
        font-family: var(--font-ui) !important;
        font-size: 2.15rem !important;
        font-weight: 850 !important;
        letter-spacing: -.055em !important;
        line-height: .84 !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__count-label {
        display: grid !important;
        gap: 0 !important;
        color: var(--cgb-white) !important;
        font-family: var(--font-ui) !important;
        font-size: .47rem !important;
        font-weight: 850 !important;
        letter-spacing: .025em !important;
        line-height: .95 !important;
        text-align: left !important;
        text-transform: uppercase !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__count-label > span {
        display: block !important;
        white-space: nowrap !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__chevron {
        color: var(--cgb-gold-300) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__marker[data-kind="fan-added"],
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__marker[data-kind="cal-bar"] {
        background: var(--cgb-white) !important;
        border-color: var(--cgb-white) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__marker[data-kind="fan-added"]::after,
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek #browse-locations-button .tray-summary__marker[data-kind="cal-bar"]::after {
        background: var(--cgb-navy-950) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-profile-hero-passed="true"] .tray-handle {
        background: var(--cgb-gold-400) !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-profile-hero-passed="true"] .tray-handle span {
        background: var(--cgb-navy-950) !important;
      }
    }

    @media (max-width: 899px) and (orientation: portrait) {
      body[data-view="map"][data-command-surface="map"]:has(#map-view > #venue-tray.venue-tray.tray--selected) {
        --header-height: calc(82px + env(safe-area-inset-top, 0px));
      }
    }

    @media (max-width: 899px) and (prefers-reduced-motion: reduce) {
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle,
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span,
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle,
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle span {
        transition: none !important;
      }
    }
  `;
  documentObject.head.append(style);
}

function clearPassedState(tray) {
  if (!tray?.dataset) return;
  delete tray.dataset[PASSED_ATTR];
}

export function syncMobileProfileHeroCap({
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!documentObject || !windowObject) return false;
  const tray = documentObject.querySelector?.('#venue-tray');
  const eligible = Boolean(
    tray &&
    isMobile(windowObject) &&
    documentObject.body?.dataset.view === 'map' &&
    documentObject.body?.dataset.commandSurface === 'map' &&
    tray.dataset?.state === 'selected'
  );

  if (!eligible) {
    clearPassedState(tray);
    return false;
  }

  const selectedCard = tray.querySelector?.('#tray-selected > .selected-card');
  const handle = tray.querySelector?.(':scope > .tray-handle');
  const hero = selectedCard?.querySelector?.(':scope > .selected-card__header');
  const heroRect = hero?.getBoundingClientRect?.();
  const handleRect = handle?.getBoundingClientRect?.();
  const wasPassed = tray.dataset[PASSED_ATTR] === 'true';
  const passed = nextHeroCapPassedState({
    heroBottom: heroRect?.bottom,
    capBottom: handleRect?.bottom,
    wasPassed
  });

  if (passed) tray.dataset[PASSED_ATTR] = 'true';
  else clearPassedState(tray);
  return passed;
}

function scheduleSync(documentObject = document, windowObject = window) {
  if (syncFrame) windowObject.cancelAnimationFrame?.(syncFrame);
  syncFrame = windowObject.requestAnimationFrame?.(() => {
    syncFrame = 0;
    syncMobileProfileHeroCap({ documentObject, windowObject });
  }) || 0;
}

function connect() {
  if (appConnected || typeof window === 'undefined' || typeof document === 'undefined') return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connect, 25);
    return;
  }

  appConnected = true;
  installStyles(document);
  document.querySelector('#tray-selected')?.addEventListener('scroll', () => scheduleSync(document, window), { passive: true });
  window.addEventListener('resize', () => scheduleSync(document, window));
  window.visualViewport?.addEventListener?.('resize', () => scheduleSync(document, window));
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', () => scheduleSync(document, window));
  app.subscribe('rendered', () => scheduleSync(document, window));
  app.subscribe('ready', () => scheduleSync(document, window));
  scheduleSync(document, window);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.setTimeout(connect, 0);
}
