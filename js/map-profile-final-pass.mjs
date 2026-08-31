const STYLE_ID = 'cgb-map-profile-final-pass';

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .party-module .party-meta {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 5px !important;
      margin: 2px 0 1px !important;
    }

    .party-module .party-meta__tag {
      min-height: 22px !important;
      display: inline-flex !important;
      align-items: center !important;
      padding: 2px 6px !important;
      color: var(--cgb-navy-900) !important;
      background: var(--cgb-gold-50) !important;
      border-radius: var(--radius-pill) !important;
      font-family: var(--font-ui) !important;
      font-size: .64rem !important;
      font-weight: 700 !important;
      line-height: 1.1 !important;
    }

    #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .bear-count {
      grid-column: 2 !important;
      grid-row: 1 !important;
      align-self: center !important;
      justify-self: stretch !important;
      margin: 2px 0 0 !important;
      color: var(--cgb-navy-950) !important;
      background: transparent !important;
      border: 0 !important;
    }

    .selected-card .bear-count--empty {
      min-height: 64px !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      place-content: center !important;
      justify-items: center !important;
      gap: 1px !important;
      padding: 8px 7px !important;
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      line-height: 1.08 !important;
      text-align: center !important;
    }

    .selected-card .bear-count--empty .bear-count__icon {
      width: 21px !important;
      height: 21px !important;
      color: var(--cgb-gold-500) !important;
    }

    .selected-card .bear-count__prompt {
      display: block !important;
      max-width: 84px !important;
      margin-top: 3px !important;
      font-family: var(--font-ui) !important;
      font-size: .72rem !important;
      font-weight: 750 !important;
      line-height: 1.16 !important;
      text-transform: none !important;
    }

    @media (max-width: 899px) {
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
        grid-template-columns: minmax(0, 1fr) 98px !important;
        gap: 9px 14px !important;
        padding: 0 14px 12px !important;
        border-bottom: 0 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header {
        grid-column: 1 !important;
        grid-row: 1 !important;
        margin: 0 !important;
        padding: 8px 0 0 !important;
        background: transparent !important;
        border-left: 0 !important;
        border-bottom: 0 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card h2 {
        display: block !important;
        margin: 4px 0 3px !important;
        overflow: visible !important;
        font-size: clamp(1.3rem, 6vw, 1.72rem) !important;
        line-height: 1.08 !important;
        -webkit-box-orient: initial !important;
        -webkit-line-clamp: unset !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-location {
        display: block !important;
        margin: 0 !important;
        font-size: .78rem !important;
        line-height: 1.25 !important;
      }

      .selected-card__proximity-row {
        min-height: 24px !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        margin-top: 0 !important;
        color: var(--cgb-ink-500) !important;
        font-size: .78rem !important;
        line-height: 1.2 !important;
      }

      .selected-card__distance {
        white-space: nowrap !important;
      }

      .selected-card__directions-inline {
        min-height: 24px !important;
        display: inline-flex !important;
        align-items: center !important;
        margin: 0 !important;
        padding: 2px 0 !important;
        color: var(--cgb-navy-900) !important;
        font-weight: 800 !important;
        text-decoration: underline !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 3px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .party-module,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        grid-column: 1 / -1 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party {
        min-height: 50px !important;
        display: grid !important;
        justify-items: start !important;
        gap: 3px !important;
        padding: 9px 12px !important;
        color: var(--cgb-navy-950) !important;
        background: var(--cgb-gold-50) !important;
        border: 0 !important;
        border-left: 3px solid var(--cgb-gold-400) !important;
        border-radius: 0 10px 10px 0 !important;
        box-shadow: none !important;
        text-align: left !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party-status {
        color: var(--cgb-ink-700) !important;
        font-size: .7rem !important;
        font-weight: 550 !important;
        line-height: 1.2 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party-action {
        color: var(--cgb-gold-600) !important;
        font-size: .78rem !important;
        font-weight: 800 !important;
        line-height: 1.15 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module {
        display: grid !important;
        gap: 4px !important;
        margin: 0 !important;
        padding: 10px 12px 9px !important;
        color: var(--cgb-navy-950) !important;
        background: linear-gradient(135deg, var(--cgb-gold-50), var(--cgb-white) 78%) !important;
        border: 1px solid var(--cgb-gold-300, #f2cc67) !important;
        border-left: 4px solid var(--cgb-gold-400) !important;
        border-radius: 14px !important;
        clip-path: none !important;
        box-shadow: none !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__title {
        display: flex !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__title strong {
        font-weight: 850 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module p {
        margin: 0 !important;
        color: var(--cgb-ink-700) !important;
        font-size: .74rem !important;
        line-height: 1.27 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__host strong {
        font-weight: 700 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-meta {
        margin: 3px 0 2px -6px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-meta__tag {
        min-height: 21px !important;
        padding: 2px 6px !important;
        font-size: .62rem !important;
        font-weight: 700 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module a:not(.party-module__report) {
        width: fit-content !important;
        color: var(--cgb-navy-900) !important;
        font-size: .74rem !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 3px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module a:not(.party-module__report) .ui-icon {
        display: none !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__report {
        justify-self: start !important;
        margin-top: 5px !important;
        padding-top: 0 !important;
        color: var(--cgb-navy-900) !important;
        border: 0 !important;
        font-size: .67rem !important;
        font-weight: 650 !important;
        line-height: 1.25 !important;
        text-align: left !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 3px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        display: grid !important;
        grid-template-columns: minmax(0, 2fr) minmax(96px, 1fr) !important;
        gap: 8px !important;
        margin-top: 0 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button {
        grid-column: 1 !important;
        grid-row: 1 !important;
        min-height: 50px !important;
        margin: 0 !important;
        color: var(--cgb-navy-950) !important;
        background: linear-gradient(135deg, var(--cgb-gold-400), var(--cgb-gold-300, #ffd15a)) !important;
        border-color: var(--cgb-gold-500) !important;
        font-size: 1rem !important;
      }

      .intent-button__main {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
      }

      .intent-button__main .ui-icon {
        width: 18px !important;
        height: 18px !important;
      }

      .intent-button__undo {
        margin-left: 6px !important;
        font-size: .68rem !important;
        font-weight: 700 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__share {
        grid-column: 2 !important;
        grid-row: 1 !important;
        min-height: 50px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;
        color: var(--cgb-navy-900) !important;
        background: var(--cgb-white) !important;
        border: 1px solid var(--cgb-neutral-300) !important;
        border-radius: 11px !important;
        font-size: .78rem !important;
        font-weight: 700 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__details {
        grid-column: 1 / -1 !important;
        grid-row: 2 !important;
        min-height: 44px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;
        color: var(--cgb-navy-900) !important;
        background: var(--cgb-navy-50) !important;
        border: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 11px !important;
        font-size: .74rem !important;
        font-weight: 800 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__share .ui-icon,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__details .ui-icon {
        width: 17px !important;
        height: 17px !important;
        display: inline-block !important;
      }

      html body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected #tray-selected > .selected-card + #venue-detail.venue-detail--selected-continuation {
        border-top: 0 !important;
      }

      html body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected #tray-selected > #venue-detail.venue-detail--selected-continuation .detail-hero {
        border-top: 0 !important;
      }

      @media (max-width: 359px) {
        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
          grid-template-columns: minmax(0, 1fr) 82px !important;
          gap: 7px 9px !important;
          padding-inline: 10px !important;
        }

        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .bear-count--empty {
          min-height: 58px !important;
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