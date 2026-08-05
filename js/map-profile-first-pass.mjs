const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-first-pass';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      /* Search, Add, and List keep the same brand/game header as Map. */
      body[data-command-surface="search"],
      body[data-command-surface="add"],
      body[data-command-surface="list"] {
        --header-height: calc(164px + env(safe-area-inset-top, 0px)) !important;
      }

      body[data-command-surface="search"] .site-header,
      body[data-command-surface="add"] .site-header,
      body[data-command-surface="list"] .site-header {
        height: var(--header-height) !important;
        min-height: var(--header-height) !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        align-content: start !important;
        gap: 12px !important;
        padding: calc(env(safe-area-inset-top, 0px) + 10px) max(16px, env(safe-area-inset-right, 0px)) 19px max(16px, env(safe-area-inset-left, 0px)) !important;
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
        display: none !important;
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

      /* The expanded map profile is the primary decision-and-action surface. */
      #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 11px !important;
        padding: 0 16px 16px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header {
        display: block !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header > div {
        min-width: 0;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card h2 {
        margin: 5px 0 3px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .bear-count {
        display: grid !important;
        gap: 1px !important;
        margin: 0 !important;
        color: var(--cgb-navy-950) !important;
        font-family: var(--font-ui) !important;
        font-size: .82rem !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
        text-align: left !important;
        text-transform: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .bear-count--empty strong {
        font-size: .86rem !important;
        font-weight: 850 !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__party-empty {
        display: grid;
        gap: 8px;
        padding: 11px 12px 12px;
        background: var(--cgb-gold-50);
        border-left: 4px solid var(--cgb-gold-400);
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__party-empty span {
        color: var(--cgb-navy-950);
        font-family: var(--font-condensed);
        font-size: .68rem;
        font-weight: 850;
        letter-spacing: .075em;
        text-transform: uppercase;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party {
        width: 100%;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 9px 12px;
        color: var(--cgb-navy-950);
        background: var(--cgb-gold-400);
        border: 0;
        border-radius: var(--radius-md);
        font-size: .82rem;
        font-weight: 850;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 7px !important;
        margin: 1px 0 0 !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button {
        grid-column: 1 / -1 !important;
        min-height: 46px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button {
        width: auto !important;
        min-width: 0 !important;
        min-height: 48px !important;
        display: inline-flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 3px !important;
        padding: 6px 3px !important;
        color: var(--cgb-navy-950) !important;
        background: var(--cgb-white) !important;
        border: 1px solid var(--cgb-neutral-300) !important;
        border-radius: var(--radius-md) !important;
        font-family: var(--font-condensed) !important;
        font-size: .66rem !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-align: center !important;
        text-decoration: none !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected .action-row > .secondary-button .ui-icon {
        width: 17px !important;
        height: 17px !important;
      }

      #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card__party-empty {
        display: none !important;
      }
    }
  `;
  document.head.append(style);
}

function formatEmptyAttendance(card) {
  const count = card.querySelector('.bear-count');
  if (!count) return;
  const text = count.textContent.replace(/\s+/g, ' ').trim();
  if (!/^No Bears (?:are )?watching here yet\. Be the first\.$/i.test(text)) return;

  count.classList.add('bear-count--empty');
  count.setAttribute('aria-label', 'No Bears watching here yet. Be the first.');
  const status = document.createElement('span');
  status.textContent = 'No Bears watching here yet.';
  const invitation = document.createElement('strong');
  invitation.textContent = 'Be the first.';
  count.replaceChildren(status, invitation);
}

function addPlanWatchPartyAction(card) {
  const existing = card.querySelector('.selected-card__party-empty');
  if (card.querySelector('.party-module')) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const panel = document.createElement('section');
  panel.className = 'selected-card__party-empty';
  panel.setAttribute('aria-label', 'No Watch Party listed');
  const label = document.createElement('span');
  label.textContent = 'No Watch Party listed';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'selected-card__plan-party';
  button.textContent = 'Plan a Watch Party';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector('#add-watch-party-button')?.click();
  });
  panel.append(label, button);

  const attendance = card.querySelector('.bear-count');
  if (attendance) attendance.before(panel);
  else card.append(panel);
}

function normalizeActionLabels(card) {
  const detail = Array.from(card.querySelectorAll('.action-row .secondary-button'))
    .find((action) => /view details/i.test(action.textContent));
  if (detail) {
    Array.from(detail.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && /view details/i.test(node.textContent || '')) {
        node.textContent = 'Details';
      }
    });
    detail.setAttribute('aria-label', 'Details');
  }
}

function enhanceSelectedCard() {
  if (!isMobile()) return;
  const card = document.querySelector('#map-view > #venue-tray.venue-tray.tray--selected .selected-card');
  if (!card) return;
  formatEmptyAttendance(card);
  addPlanWatchPartyAction(card);
  normalizeActionLabels(card);
}

function scheduleEnhancement() {
  requestAnimationFrame(() => {
    enhanceSelectedCard();
    requestAnimationFrame(enhanceSelectedCard);
  });
}

function initialize() {
  installStyles();
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
