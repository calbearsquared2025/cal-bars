import { bearCountCopy, compactVenueLocation, getFanCount, haversineMiles } from './core.mjs';
import { createIcon } from './icons.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-final-pass';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .bear-count {
      grid-column: 2 !important;
      grid-row: 1 !important;
      align-self: center !important;
      justify-self: stretch !important;
      min-height: 94px !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      place-content: center !important;
      justify-items: center !important;
      gap: 1px !important;
      margin: 2px 0 0 !important;
      padding: 8px 7px !important;
      color: var(--cgb-navy-950) !important;
      background: linear-gradient(180deg, var(--cgb-gold-50), var(--cgb-white)) !important;
      border: 1px solid var(--cgb-gold-300, #f2cc67) !important;
      border-radius: 14px !important;
      line-height: 1.08 !important;
      text-align: center !important;
    }

    .selected-card .bear-count--empty {
      min-height: 64px !important;
      padding: 8px 7px !important;
    }

    .selected-card .bear-count:not(.bear-count--empty) .bear-count__icon {
      display: none !important;
    }

    .selected-card .bear-count__icon {
      width: 18px !important;
      height: 18px !important;
      color: var(--cgb-gold-500) !important;
    }

    .selected-card .bear-count__number {
      color: var(--cgb-navy-950) !important;
      font-family: var(--font-display) !important;
      font-size: 2rem !important;
      font-weight: 700 !important;
      line-height: .9 !important;
    }

    .selected-card .bear-count__label,
    .selected-card .bear-count__prompt {
      display: block !important;
      max-width: 78px !important;
      font-family: var(--font-ui) !important;
      font-size: .65rem !important;
      font-weight: 750 !important;
      line-height: 1.12 !important;
      text-transform: none !important;
    }

    .selected-card .bear-count__prompt {
      margin-top: 2px !important;
      font-weight: 850 !important;
    }

    @media (max-width: 899px) {
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
        grid-template-columns: minmax(0, 1fr) 98px !important;
        gap: 9px 14px !important;
        padding: 0 14px 12px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header {
        grid-column: 1 !important;
        grid-row: 1 !important;
        margin: 0 !important;
        padding: 8px 0 9px !important;
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
        min-height: 32px !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        margin-top: 0 !important;
        color: var(--cgb-ink-500) !important;
        font-size: .78rem !important;
        line-height: 1.2 !important;
      }

      .selected-card__distance {
        white-space: nowrap !important;
      }

      .selected-card__directions-inline {
        min-height: 32px !important;
        display: inline-flex !important;
        align-items: center !important;
        margin: 0 0 0 -8px !important;
        padding: 6px 8px !important;
        color: var(--cgb-navy-900) !important;
        font-weight: 800 !important;
        text-decoration: underline !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 3px !important;
      }

      .selected-card__proximity-row[data-has-distance="true"] .selected-card__directions-inline {
        margin-left: 2px !important;
      }

      .selected-card__proximity-row[data-has-distance="true"] .selected-card__directions-inline::before {
        content: '·' !important;
        margin-right: 8px !important;
        color: var(--cgb-ink-500) !important;
        text-decoration: none !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .party-module,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        grid-column: 1 / -1 !important;
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

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module p {
        margin: 0 !important;
        color: var(--cgb-ink-700) !important;
        font-size: .74rem !important;
        line-height: 1.27 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-meta {
        color: var(--cgb-navy-900) !important;
        font-weight: 850 !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module a:not(.party-module__report) {
        width: fit-content !important;
        color: var(--cgb-navy-900) !important;
        font-size: .73rem !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 3px !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module a:not(.party-module__report) .ui-icon {
        display: none !important;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__report {
        justify-self: end !important;
        margin-top: 1px !important;
        padding-top: 2px !important;
        color: var(--cgb-ink-500) !important;
        border: 0 !important;
        font-size: .64rem !important;
        font-weight: 650 !important;
        line-height: 1.2 !important;
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
        font-weight: 800 !important;
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

      @media (max-width: 359px) {
        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
          grid-template-columns: minmax(0, 1fr) 82px !important;
          gap: 7px 9px !important;
          padding-inline: 10px !important;
        }

        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .bear-count {
          min-height: 82px !important;
          padding-inline: 4px !important;
        }

        body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .bear-count--empty {
          min-height: 58px !important;
        }

        .bear-count__number {
          font-size: 1.7rem !important;
        }
      }
    }
  `;
  document.head.append(style);
}

function selectedAttendanceContext(count) {
  const state = window.CGBApp?.getState?.();
  const venueId = count.closest('.selected-card[data-venue-id]')?.dataset.venueId || state?.selectedVenueId || '';
  if (!state?.snapshot || !state.gameId || !venueId) return null;
  const game = state.snapshot.games?.find((item) => item.game_id === state.gameId) || null;
  if (!game) return null;
  const publicCount = getFanCount(state.snapshot, state.gameId, venueId);
  const selectedByThisBrowser = state.fanIntent?.selections?.[state.gameId] === venueId;
  return {
    game,
    number: selectedByThisBrowser ? Math.max(publicCount, 1) : publicCount
  };
}

function refineAttendance(root = document) {
  const count = root.querySelector('#map-view .tray--selected .selected-card .bear-count');
  if (!count) return;
  const context = selectedAttendanceContext(count);
  if (!context) return;
  const { game, number } = context;

  if (game.game_status === 'completed') {
    count.classList.remove('bear-count--empty');
    count.setAttribute('aria-label', count.textContent.trim());
    return;
  }

  const raw = bearCountCopy(number);
  const empty = number === 0;
  count.classList.toggle('bear-count--empty', empty);
  count.setAttribute('aria-label', raw);

  const icon = createIcon('users', { className: 'ui-icon bear-count__icon' });
  if (empty) {
    const prompt = document.createElement('strong');
    prompt.className = 'bear-count__prompt';
    prompt.textContent = 'Be the first.';
    count.replaceChildren(icon, prompt);
    return;
  }

  const numeral = document.createElement('span');
  numeral.className = 'bear-count__number';
  numeral.textContent = String(number);
  const label = document.createElement('span');
  label.className = 'bear-count__label';
  label.textContent = number === 1 ? 'Bear watching here' : 'Bears watching here';
  count.replaceChildren(icon, numeral, label);
}

function refinePartyModules(root = document) {
  root.querySelectorAll('#map-view .tray--selected .selected-card > .party-module').forEach((module) => {
    const paragraphs = Array.from(module.querySelectorAll(':scope > p'));
    paragraphs.forEach((paragraph, index) => {
      paragraph.classList.remove('party-module__host', 'party-module__time', 'party-module__note');
      const copy = paragraph.textContent.trim();
      if (index === 0 || copy.startsWith('Hosted by ')) paragraph.classList.add('party-module__host');
      else if (copy.startsWith('Arrive ')) paragraph.classList.add('party-module__time');
      else if (!paragraph.classList.contains('party-meta')) paragraph.classList.add('party-module__note');
    });

    module.querySelectorAll('a:not(.party-module__report)').forEach((link) => {
      link.classList.add('party-module__event');
      link.querySelectorAll('.ui-icon').forEach((icon) => icon.remove());
      if (/open event information/i.test(link.textContent)) link.textContent = 'Event information';
    });

    module.querySelectorAll('.party-module__report').forEach((link) => {
      link.textContent = 'Report an Issue';
    });
  });
}

function formatSelectedDistance(state, venue) {
  if (!state?.origin || !venue) return '';
  const distance = haversineMiles(
    state.origin.lat,
    state.origin.lon,
    venue.latitude,
    venue.longitude
  );
  if (!Number.isFinite(distance)) return '';
  if (distance < 0.1) return 'Nearby';
  return `${distance.toFixed(distance < 10 ? 1 : 0)} mi away`;
}

function refineActions(root = document) {
  const card = root.querySelector('#map-view .tray--selected .selected-card');
  const row = card?.querySelector('.action-row');
  const location = card?.querySelector('.venue-location');
  if (!card || !row || !location) return;

  const mobile = isMobile();
  const state = window.CGBApp?.getState?.();
  const venueId = card.dataset.venueId || state?.selectedVenueId || '';
  const venue = state?.snapshot?.venues?.find((item) => item.venue_id === venueId) || null;
  const distanceCopy = mobile ? formatSelectedDistance(state, venue) : '';
  let proximity = null;

  if (mobile) {
    if (venue) location.textContent = compactVenueLocation(venue);
    proximity = card.querySelector('.selected-card__proximity-row');
    if (!proximity) {
      proximity = document.createElement('div');
      proximity.className = 'selected-card__proximity-row';
      location.after(proximity);
    }
    proximity.dataset.hasDistance = String(Boolean(distanceCopy));

    let distance = proximity.querySelector('.selected-card__distance');
    if (distanceCopy) {
      if (!distance) {
        distance = document.createElement('span');
        distance.className = 'selected-card__distance';
        proximity.prepend(distance);
      }
      distance.textContent = distanceCopy;
    } else {
      distance?.remove();
    }
  }

  const actions = Array.from(row.querySelectorAll(':scope > a, :scope > button'));
  const intent = actions.find((action) => action.classList.contains('intent-button'));
  const directions = actions.find((action) => /^Directions$/i.test(action.textContent.trim())) ||
    card.querySelector('.selected-card__directions-inline');
  const details = actions.find((action) => /details|more about this location/i.test(action.textContent.trim()));
  const share = actions.find((action) => /^Share$/i.test(action.textContent.trim()));

  if (directions) {
    directions.className = 'selected-card__directions-inline';
    directions.querySelectorAll('.ui-icon').forEach((icon) => icon.remove());
    directions.textContent = 'Directions';
    if (mobile) proximity.append(directions);
    else location.append(directions);
  }

  if (mobile && !distanceCopy && !directions) proximity?.remove();

  if (details) {
    details.classList.add('selected-card__details');
    details.replaceChildren(document.createTextNode('More About This Location'));
    details.setAttribute('aria-label', 'More About This Location');
  }

  if (share) {
    share.classList.add('selected-card__share');
    const icon = share.querySelector('.ui-icon') || createIcon('share');
    share.replaceChildren(icon, document.createTextNode('Share'));
  }

  if (intent) {
    const raw = intent.textContent.trim();
    const selected = /you[’']ll be here/i.test(raw);
    const main = document.createElement('span');
    main.className = 'intent-button__main';
    if (selected) main.append(createIcon('check'), document.createTextNode('You’ll be here'));
    else main.textContent = 'I’ll be here';
    intent.replaceChildren(main);

    if (selected) {
      const undo = document.createElement('span');
      undo.className = 'intent-button__undo';
      undo.textContent = 'Undo';
      intent.append(undo);
    }
    intent.setAttribute('aria-label', selected ? 'You’ll be here. Undo selection' : 'I’ll be here');
  }
}

function refine() {
  refineAttendance();
  refinePartyModules();
  refineActions();
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
