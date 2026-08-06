const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-final-ui-polish';
const APP_CONNECT_MAX_ATTEMPTS = 1200;

let appConnected = false;
let appConnectAttempts = 0;

function installStyles() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
  }
  style.textContent = `
    .game-button strong,
    .tray-summary__copy strong,
    .selected-card h2,
    .location-card h3,
    .command-surface h2,
    .add-action strong,
    .add-context strong {
      line-height: 1.16;
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
      box-shadow: none;
    }

    @media (max-width: 899px) {
      #location-list.location-list {
        gap: 8px;
        padding-bottom: 14px;
      }

      #location-list .location-card {
        gap: 7px;
        padding: 12px 13px;
        border-radius: 13px;
        box-shadow: 0 1px 5px rgba(1, 1, 51, .06);
      }

      #location-list .location-card h3 {
        margin-bottom: 3px;
        font-size: 1rem;
        line-height: 1.18;
      }

      #location-list .location-card p,
      #location-list .location-card small {
        line-height: 1.35;
      }

      #location-list .location-card__count {
        align-self: center;
        color: var(--cgb-ink-600);
        font-size: .68rem;
        font-weight: 700;
      }

      .command-surface__shell {
        padding-inline: var(--mobile-content-gutter);
      }

      .command-surface__header {
        gap: 10px;
      }

      .command-surface__header h2 {
        margin-top: 2px;
        line-height: 1.14;
      }

      .command-surface__intro {
        margin: 7px 0 14px;
        line-height: 1.42;
      }

      .add-context {
        margin-bottom: 10px;
        padding: 11px 12px;
        background: var(--cgb-neutral-50, #f7f8fa);
        border-color: var(--cgb-neutral-200);
        border-radius: 12px;
      }

      .add-context p {
        margin-top: 3px;
        line-height: 1.36;
      }

      .add-actions {
        gap: 9px;
      }

      .add-action {
        min-height: 70px;
        gap: 11px;
        padding: 12px 13px;
        border-radius: 12px;
      }

      .add-action strong {
        margin-bottom: 3px;
        font-size: .92rem;
      }

      .add-action small {
        font-size: .72rem;
        line-height: 1.34;
      }

      .add-action__icon {
        width: 22px;
        height: 22px;
      }

      .primary-button,
      .secondary-button,
      .search-submit,
      .add-action,
      .mobile-command,
      .intent-button {
        border-radius: 11px;
      }
    }
  `;
  document.head.append(style);
}

function polish() {
  installStyles();
}

function connectApp() {
  if (appConnected) return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    appConnectAttempts += 1;
    if (appConnectAttempts <= APP_CONNECT_MAX_ATTEMPTS) window.setTimeout(connectApp, 25);
    return;
  }

  appConnected = true;
  app.subscribe('rendered', polish);
  app.subscribe('ready', polish);
  polish();
}

function initialize() {
  installStyles();
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
