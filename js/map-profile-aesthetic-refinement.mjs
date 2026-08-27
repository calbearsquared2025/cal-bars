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
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party {
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

      .mobile-command-bar {
        background: var(--cgb-mobile-safe-surface, #eef4fa) !important;
      }

      @supports not (background: color-mix(in srgb, white, black)) {
        .mobile-command-bar {
          background: var(--cgb-mobile-safe-surface, #eef4fa) !important;
        }
      }

    }
  `;
  document.head.append(style);
}

function initialize() {
  installStyles();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
