const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-final-ui-polish';
const GUIDANCE_TITLE = 'Find your Cal crowd';
const GUIDANCE_COPY = 'Join a local watch party or plan your own!';
const APP_CONNECT_MAX_ATTEMPTS = 1200;

let appConnected = false;
let appConnectAttempts = 0;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .game-button strong,
    .tray-summary__copy strong,
    .selected-card h2,
    .location-card h3,
    .command-surface h2,
    .add-action strong,
    .add-context strong {
      line-height: 1.16 !important;
      padding-bottom: .04em;
    }

    button,
    .primary-button,
    .secondary-button,
    .search-submit,
    .add-action,
    .mobile-command,
    .intent-button {
      line-height: 1.2;
    }

    .badge,
    .marker-label {
      box-shadow: none !important;
    }

    @media (max-width: 899px) {
      #map-view > #venue-tray.venue-tray {
        border-radius: 18px 18px 0 0 !important;
        box-shadow: 0 -8px 24px rgba(1, 1, 51, .14) !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek {
        height: 84px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle {
        height: 15px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-handle span {
        width: 32px !important;
        height: 3px !important;
        opacity: .72;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-peek {
        padding: 0 10px 5px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary {
        min-height: 64px !important;
        grid-template-columns: 24px minmax(0, 1fr) auto 15px !important;
        gap: 8px !important;
        padding: 2px 11px 6px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy {
        gap: 1px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy .eyebrow {
        font-size: .57rem !important;
        letter-spacing: .08em !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy strong {
        font-size: 1rem !important;
      }

      #map-view > #venue-tray.venue-tray.tray--peek .tray-summary__copy small {
        font-size: .68rem !important;
        line-height: 1.28 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected {
        max-height: min(47dvh, 396px) !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] {
        height: auto !important;
        max-height: min(39dvh, 320px) !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .tray-selected {
        max-height: calc(min(39dvh, 320px) - 18px) !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle {
        height: 18px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
        grid-template-columns: minmax(0, 1fr) 82px !important;
        gap: 8px 12px !important;
        padding: 0 14px 11px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header {
        padding: 6px 0 7px 10px !important;
        border-left-width: 2px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card h2 {
        margin: 3px 0 4px !important;
        font-size: clamp(1.3rem, 5.8vw, 1.58rem) !important;
        line-height: 1.08 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-location {
        gap: 1px 0 !important;
        color: var(--cgb-ink-600) !important;
        font-size: .77rem !important;
        line-height: 1.34 !important;
      }

      .selected-card__directions-separator {
        margin-inline: 6px !important;
        color: var(--cgb-neutral-400) !important;
      }

      .selected-card__directions-inline {
        min-height: 30px !important;
        margin: -5px -6px -5px 0 !important;
        padding: 5px 6px !important;
        font-size: .76rem !important;
        font-weight: 750 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .bear-count {
        min-height: 72px !important;
        gap: 0 !important;
        margin: 1px 0 0 !important;
        padding: 5px 3px 5px 9px !important;
        background: transparent !important;
        border: 0 !important;
        border-left: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 0 !important;
      }

      .bear-count__icon {
        width: 15px !important;
        height: 15px !important;
        opacity: .8;
      }

      .bear-count__number {
        font-size: 1.65rem !important;
        line-height: 1 !important;
      }

      .bear-count__label,
      .bear-count__prompt {
        max-width: 68px !important;
        color: var(--cgb-ink-600) !important;
        font-size: .61rem !important;
        font-weight: 700 !important;
        line-height: 1.16 !important;
      }

      .bear-count__prompt {
        margin-top: 2px !important;
        color: var(--cgb-navy-900) !important;
        font-weight: 800 !important;
      }

      #map-view .badge,
      #location-list .badge {
        min-height: 20px !important;
        padding: 3px 7px 2px !important;
        border-width: 1px !important;
        border-radius: 999px !important;
        font-size: .58rem !important;
        font-weight: 750 !important;
        letter-spacing: .055em !important;
        line-height: 1.2 !important;
        opacity: .88;
      }

      #map-view .badge--party,
      #location-list .badge--party {
        color: var(--cgb-navy-900) !important;
        background: var(--cgb-gold-50) !important;
        border-color: var(--cgb-gold-200, #f6dc95) !important;
      }

      #map-view .badge--bar,
      #location-list .badge--bar {
        color: var(--cgb-ink-700) !important;
        background: var(--cgb-neutral-50, #f7f8fa) !important;
        border-color: var(--cgb-neutral-200) !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module {
        gap: 3px !important;
        padding: 9px 10px !important;
        background: var(--cgb-gold-50) !important;
        border: 1px solid var(--cgb-gold-200, #f6dc95) !important;
        border-left-width: 1px !important;
        border-radius: 11px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module p {
        font-size: .73rem !important;
        line-height: 1.34 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        grid-template-columns: minmax(0, 1fr) 102px !important;
        gap: 8px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__share {
        min-height: 47px !important;
        border-radius: 11px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button {
        font-size: .94rem !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__share {
        font-size: .75rem !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__details {
        display: none !important;
      }

      #location-list.location-list {
        gap: 8px !important;
        padding-bottom: 14px !important;
      }

      #location-list .location-card {
        gap: 7px !important;
        padding: 12px 13px !important;
        border-radius: 13px !important;
        box-shadow: 0 1px 5px rgba(1, 1, 51, .06) !important;
      }

      #location-list .location-card h3 {
        margin-bottom: 3px !important;
        font-size: 1rem !important;
        line-height: 1.18 !important;
      }

      #location-list .location-card p,
      #location-list .location-card small {
        line-height: 1.35 !important;
      }

      #location-list .location-card__count {
        align-self: center !important;
        color: var(--cgb-ink-600) !important;
        font-size: .68rem !important;
        font-weight: 700 !important;
      }

      .command-surface__shell {
        padding-inline: 16px !important;
      }

      .command-surface__header {
        gap: 10px !important;
      }

      .command-surface__header h2 {
        margin-top: 2px !important;
        line-height: 1.14 !important;
      }

      .command-surface__intro {
        margin: 7px 0 14px !important;
        line-height: 1.42 !important;
      }

      .add-context {
        margin-bottom: 10px !important;
        padding: 11px 12px !important;
        background: var(--cgb-neutral-50, #f7f8fa) !important;
        border-color: var(--cgb-neutral-200) !important;
        border-radius: 12px !important;
      }

      .add-context p {
        margin-top: 3px !important;
        line-height: 1.36 !important;
      }

      .add-actions {
        gap: 9px !important;
      }

      .add-action {
        min-height: 70px !important;
        gap: 11px !important;
        padding: 12px 13px !important;
        border-radius: 12px !important;
      }

      .add-action strong {
        margin-bottom: 3px !important;
        font-size: .92rem !important;
      }

      .add-action small {
        font-size: .72rem !important;
        line-height: 1.34 !important;
      }

      .add-action__icon {
        width: 22px !important;
        height: 22px !important;
      }

      .primary-button,
      .secondary-button,
      .search-submit,
      .add-action,
      .mobile-command,
      .intent-button {
        border-radius: 11px !important;
      }
    }
  `;
  document.head.append(style);
}

function syncMinimumTrayGuidance() {
  if (!window.matchMedia(MOBILE_QUERY).matches) return;

  const state = window.CGBApp?.getState?.();
  const tray = document.querySelector('#venue-tray');
  const button = document.querySelector('#browse-locations-button');
  const title = document.querySelector('#tray-summary-title');
  const copy = document.querySelector('#tray-summary-copy');
  const count = document.querySelector('#tray-summary-count');
  const marker = document.querySelector('#tray-summary-marker');

  if (!state || state.origin || tray?.dataset.state !== 'peek' ||
      !button || !title || !copy || !count || !marker) return;

  title.textContent = GUIDANCE_TITLE;
  copy.textContent = GUIDANCE_COPY;
  count.textContent = '';
  marker.dataset.kind = 'community-location';
  button.dataset.previewMode = 'guidance';
  button.removeAttribute('data-direct-venue-id');
  button.setAttribute('aria-label', `${GUIDANCE_TITLE}. ${GUIDANCE_COPY}`);
}

function polish() {
  installStyles();
  requestAnimationFrame(() => {
    syncMinimumTrayGuidance();
    requestAnimationFrame(syncMinimumTrayGuidance);
  });
}

function connectApp() {
  if (appConnected) return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    appConnectAttempts += 1;
    if (appConnectAttempts <= APP_CONNECT_MAX_ATTEMPTS) {
      window.setTimeout(connectApp, 25);
    }
    return;
  }

  appConnected = true;
  app.subscribe('rendered', polish);
  app.subscribe('ready', polish);
  polish();
}

function initialize() {
  installStyles();
  polish();
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
