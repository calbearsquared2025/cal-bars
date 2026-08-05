const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-aesthetic-refinement';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      /* Restore asymmetry without returning to cramped icon-only controls. */
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .selected-card {
        grid-template-columns: minmax(0, 1fr) minmax(112px, 34%) !important;
        gap: 7px 14px !important;
        padding: 0 14px 10px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .selected-card__header {
        grid-column: 1 !important;
        grid-row: 1 !important;
        margin: 0 !important;
        padding: 7px 0 8px 12px !important;
        background: transparent !important;
        border-left: 3px solid var(--cgb-navy-900) !important;
        border-bottom: 0 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .selected-card h2 {
        margin-top: 3px !important;
        margin-bottom: 2px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .bear-count {
        grid-column: 2 !important;
        grid-row: 1 !important;
        align-self: start !important;
        justify-self: stretch !important;
        margin: 0 !important;
        padding: 30px 2px 0 0 !important;
        font-size: .74rem !important;
        line-height: 1.16 !important;
        text-align: right !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .bear-count--empty strong {
        margin-top: 2px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .party-module,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .selected-card__plan-party,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .action-row {
        grid-column: 1 / -1 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party {
        min-height: 54px !important;
        display: grid !important;
        justify-items: start !important;
        gap: 2px !important;
        padding: 8px 12px !important;
        text-align: left !important;
      }

      .selected-card__plan-party-status {
        color: var(--cgb-navy-950) !important;
        font-family: var(--font-ui) !important;
        font-size: .7rem !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
      }

      .selected-card__plan-party-action {
        color: var(--cgb-gold-600) !important;
        font-family: var(--font-condensed) !important;
        font-size: .8rem !important;
        font-weight: 900 !important;
        line-height: 1.15 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        gap: 0 !important;
        margin-top: 0 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button {
        margin-bottom: 6px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button {
        min-height: 44px !important;
        padding: 0 8px !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        clip-path: none !important;
        font-family: var(--font-condensed) !important;
        font-size: .72rem !important;
        font-weight: 800 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button + .secondary-button {
        border-left: 1px solid var(--cgb-neutral-300) !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button .ui-icon {
        display: none !important;
      }

      .mobile-command-bar {
        background: color-mix(in srgb, var(--cgb-navy-50) 92%, white 8%) !important;
      }

      @supports not (background: color-mix(in srgb, white, black)) {
        .mobile-command-bar {
          background: #f4f7ff !important;
        }
      }

      @media (max-width: 359px) {
        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .selected-card {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .selected-card__header,
        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .bear-count {
          grid-column: 1 !important;
        }

        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected:not([data-selected-density="compact"]) .bear-count {
          grid-row: auto !important;
          padding: 0 2px !important;
          text-align: left !important;
        }
      }
    }
  `;
  document.head.append(style);
}

function refinePlanWatchPartyAction(root = document) {
  const button = root.querySelector(
    '#map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party'
  );
  if (!button || button.dataset.aestheticRefined === 'true') return;

  button.dataset.aestheticRefined = 'true';
  button.setAttribute('aria-label', 'No Watch Party for this game. Plan a Watch Party');

  const status = document.createElement('span');
  status.className = 'selected-card__plan-party-status';
  status.textContent = 'No Watch Party for this game.';

  const action = document.createElement('span');
  action.className = 'selected-card__plan-party-action';
  action.textContent = '+ Plan a Watch Party';

  button.replaceChildren(status, action);
}

function refine() {
  if (!isMobile()) return;
  refinePlanWatchPartyAction();
}

function scheduleRefinement() {
  requestAnimationFrame(() => {
    refine();
    requestAnimationFrame(refine);
  });
}

function initialize() {
  installStyles();
  scheduleRefinement();
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', scheduleRefinement);
  window.CGBApp?.subscribe?.('rendered', scheduleRefinement);
  window.CGBApp?.subscribe?.('ready', scheduleRefinement);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
