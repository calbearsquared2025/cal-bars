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
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .party-module,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row {
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
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 0 !important;
        margin-top: 0 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button {
        grid-column: 1 / -1 !important;
        margin-bottom: 8px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button {
        min-height: 46px !important;
        padding: 0 8px !important;
        color: var(--cgb-navy-900) !important;
        background: var(--cgb-navy-50) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
        border-bottom: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        clip-path: none !important;
        font-family: var(--font-ui) !important;
        font-size: .72rem !important;
        font-weight: 750 !important;
        letter-spacing: .01em !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button + .secondary-button {
        border-left: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 10px 0 0 10px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button + .secondary-button {
        border-left: 1px solid var(--cgb-neutral-300) !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button:last-child {
        border-right: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 0 10px 10px 0 !important;
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
  button.setAttribute('aria-label', 'No listed Watch Party for this game. Add a Watch Party');

  const status = document.createElement('span');
  status.className = 'selected-card__plan-party-status';
  status.textContent = 'No listed Watch Party for this game.';

  const action = document.createElement('span');
  action.className = 'selected-card__plan-party-action';
  action.textContent = '+ Add a Watch Party';

  button.replaceChildren(status, action);
}

function refine() {
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
