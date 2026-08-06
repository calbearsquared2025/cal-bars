import { createIcon } from './icons.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-map-profile-final-pass';

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function installStyles() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
  }
  style.textContent = `
    @media (max-width: 899px) {
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        padding: 0 var(--mobile-content-gutter) 16px;
        background: var(--cgb-white);
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > * {
        min-width: 0;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header {
        display: block;
        min-width: 0;
        margin: 0;
        padding: 0;
        background: transparent;
        border: 0;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header > div {
        min-width: 0;
        display: grid;
        gap: 4px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__header > .icon-button {
        display: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-badges {
        min-height: 20px;
        gap: 6px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-badge {
        min-height: 20px;
        padding: 3px 7px 2px;
        border-radius: 999px;
        font-family: var(--font-condensed);
        font-size: .61rem;
        font-weight: 750;
        letter-spacing: .055em;
        line-height: 1.15;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__title-link {
        min-width: 0;
        min-height: 44px;
        display: flex;
        align-items: center;
        color: var(--cgb-navy-950);
        text-decoration: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card h2 {
        width: 100%;
        margin: 0;
        padding: .02em 0 .08em;
        color: inherit;
        font-family: var(--font-display);
        font-size: clamp(1.36rem, 6vw, 1.72rem);
        font-weight: 700;
        line-height: 1.12;
        overflow-wrap: anywhere;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-location {
        min-height: 30px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0;
        margin: 0;
        color: var(--cgb-ink-600);
        font-family: var(--font-ui);
        font-size: .78rem;
        line-height: 1.35;
      }

      .selected-card__location-separator,
      .selected-card__directions-separator {
        flex: 0 0 auto;
        margin: 0 6px;
        color: var(--cgb-neutral-400);
      }

      .selected-card__directions-inline {
        min-width: 44px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        margin: -7px -8px;
        padding: 7px 8px;
        color: var(--cgb-navy-900);
        font-family: var(--font-ui);
        font-size: .78rem;
        font-weight: 750;
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-description {
        display: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .bear-count,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-activity-history {
        max-width: none;
        margin: 0;
        color: var(--cgb-ink-700);
        background: transparent;
        border: 0;
        border-radius: 0;
        font-family: var(--font-ui);
        font-size: .82rem;
        font-weight: 650;
        letter-spacing: 0;
        line-height: 1.35;
        text-align: left;
        text-transform: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .bear-count {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .bear-count--empty {
        color: var(--cgb-ink-600);
        font-weight: 550;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .venue-activity-history {
        margin-top: -5px;
        color: var(--cgb-ink-500);
        font-size: .72rem;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module {
        display: grid;
        gap: 3px;
        margin: 0;
        padding: 0;
        color: var(--cgb-ink-700);
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__title,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module > :not(.party-module__host):not(.party-module__critical) {
        display: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__host,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__critical {
        margin: 0;
        color: var(--cgb-ink-700);
        font-family: var(--font-ui);
        font-size: .75rem;
        line-height: 1.3;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card > .party-module .party-module__critical {
        color: var(--cgb-navy-900);
        font-weight: 700;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .selected-card__plan-party {
        display: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px 10px;
        margin: 0;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button {
        grid-column: 1 / -1;
        grid-row: 1;
        width: 100%;
        min-height: 50px;
        margin: 0;
        padding: 0 16px;
        color: var(--cgb-navy-950);
        background: var(--cgb-gold-400);
        border: 1px solid var(--cgb-gold-500);
        border-radius: 12px;
        box-shadow: none;
        font-family: var(--font-ui);
        font-size: 1rem;
        font-weight: 800;
        line-height: 1.2;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .intent-button[data-intent-state="selected"] {
        grid-column: 1;
      }

      .intent-button__main {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .intent-button__main .ui-icon {
        width: 18px;
        height: 18px;
      }

      .intent-undo {
        grid-column: 2;
        grid-row: 1;
        min-width: 44px;
        min-height: 50px;
        padding: 0 10px;
        color: var(--cgb-ink-600);
        background: transparent;
        border: 0;
        border-radius: 10px;
        font-family: var(--font-ui);
        font-size: .72rem;
        font-weight: 650;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__share {
        grid-column: 1;
        grid-row: 2;
        justify-self: start;
        min-width: 88px;
        min-height: 44px;
        padding: 0 10px;
        color: var(--cgb-navy-900);
        background: var(--cgb-white);
        border: 1px solid var(--cgb-neutral-300);
        border-radius: 11px;
        font-family: var(--font-ui);
        font-size: .76rem;
        font-weight: 750;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__share .ui-icon {
        width: 17px;
        height: 17px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .action-row > .selected-card__details {
        grid-column: 2;
        grid-row: 2;
        justify-self: end;
        min-width: 44px;
        min-height: 44px;
        padding: 0 4px;
        color: var(--cgb-ink-600);
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        font-family: var(--font-ui);
        font-size: .72rem;
        font-weight: 650;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card {
        gap: 4px;
        padding-top: 0;
        padding-bottom: 10px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card__header > div {
        gap: 2px;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .venue-badges {
        flex-wrap: nowrap;
        overflow: hidden;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card h2 {
        display: block;
        overflow: hidden;
        padding-bottom: .08em;
        font-size: 1.08rem;
        line-height: 1.12;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .venue-location {
        min-height: 22px;
        overflow: hidden;
        font-size: .72rem;
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card__directions-inline,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card__location-separator,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card__directions-separator,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .venue-description,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .venue-activity-history,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .party-module,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .selected-card__plan-party,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .action-row {
        display: none;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="compact"] .bear-count {
        display: block;
        overflow: hidden;
        color: var(--cgb-ink-600);
        font-size: .72rem;
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="expanded"] .selected-card__title-link:focus-visible,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="expanded"] .selected-card__details:focus-visible,
      body[data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected[data-selected-density="expanded"] .intent-undo:focus-visible {
        outline: 2px solid var(--cgb-gold-400);
        outline-offset: 2px;
      }
    }
  `;
  document.head.append(style);
}

function classifyPartyLines(module) {
  Array.from(module.querySelectorAll(':scope > p')).forEach((paragraph, index) => {
    paragraph.classList.remove('party-module__host', 'party-module__critical');
    const copy = paragraph.textContent.trim();
    if (index === 0 || copy.startsWith('Hosted by ')) {
      paragraph.classList.add('party-module__host');
      return;
    }
    if (paragraph.classList.contains('party-meta') ||
        /\b(21\+|all ages|audio|restriction|reservation|required|ticket|cover)\b/i.test(copy)) {
      paragraph.classList.add('party-module__critical');
    }
  });
}

function refinePartyModules(card) {
  card.querySelectorAll(':scope > .party-module').forEach(classifyPartyLines);
}

function refineAttendance(card) {
  const count = card.querySelector('.bear-count');
  if (!count) return;
  const copy = count.textContent.replace(/\s+/g, ' ').trim();
  count.classList.toggle('bear-count--empty', /^No Bears\b/i.test(copy) || /^0 Bears?\b/i.test(copy));
  if (copy) count.setAttribute('aria-label', copy);
}

function ensureDirections(location, directions) {
  if (!location || !directions) return;
  directions.className = 'selected-card__directions-inline';
  directions.querySelectorAll('.ui-icon').forEach((icon) => icon.remove());
  directions.textContent = 'Directions';

  if (directions.parentElement !== location) {
    const separator = document.createElement('span');
    separator.className = 'selected-card__location-separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '·';
    location.append(separator, directions);
  }
}

function ensureTitleLink(card, details) {
  const title = card.querySelector('.selected-card__header h2');
  if (!title || !details) return;
  let link = title.closest('.selected-card__title-link');
  if (!link) {
    link = document.createElement('a');
    link.className = 'selected-card__title-link';
    title.replaceWith(link);
    link.append(title);
  }
  link.href = details.href;
  link.setAttribute('aria-label', `Open details for ${title.textContent.trim()}`);
}

function refineIntent(intent, row) {
  const raw = intent.textContent.replace(/\s+/g, ' ').trim();
  const selected = intent.dataset.intentState === 'selected' || /you[’']ll be here/i.test(raw);
  const pending = /saving/i.test(raw);
  const closed = /selections closed/i.test(raw);

  row.querySelector('.intent-undo')?.remove();

  const main = document.createElement('span');
  main.className = 'intent-button__main';
  if (pending) {
    main.textContent = 'Saving…';
  } else if (selected) {
    main.append(createIcon('check'), document.createTextNode('You’ll be here'));
  } else if (closed) {
    main.textContent = 'Selections closed';
  } else {
    main.textContent = 'I’ll be here';
  }
  intent.replaceChildren(main);
  intent.setAttribute('aria-label', selected ? 'You’ll be here' : main.textContent);

  if (!selected || pending || closed) return;
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'intent-undo';
  undo.dataset.venueId = intent.dataset.venueId || '';
  undo.textContent = 'Undo';
  undo.setAttribute('aria-label', 'Undo attendance selection');
  intent.after(undo);
}

function refineActions(card) {
  const row = card.querySelector('.action-row');
  const location = card.querySelector('.venue-location');
  if (!row || !location) return;

  const actions = Array.from(row.querySelectorAll(':scope > a, :scope > button'));
  const intent = actions.find((action) => action.classList.contains('intent-button'));
  const directions = actions.find((action) => /^Directions$/i.test(action.textContent.trim()));
  const details = actions.find((action) => /details/i.test(action.textContent.trim()));
  const share = actions.find((action) => /^Share$/i.test(action.textContent.trim()));

  ensureDirections(location, directions);

  if (details) {
    details.className = 'selected-card__details';
    details.textContent = 'Details';
    details.setAttribute('aria-label', 'Open venue details');
  }

  if (share) {
    share.className = 'secondary-button selected-card__share';
    const icon = share.querySelector('.ui-icon') || createIcon('share');
    share.replaceChildren(icon, document.createTextNode('Share'));
  }

  if (intent) refineIntent(intent, row);
  ensureTitleLink(card, details);
}

function refineSelectedCard(root = document) {
  if (!isMobile()) return;
  const card = root.querySelector('#map-view > #venue-tray.venue-tray.tray--selected .selected-card');
  if (!card) return;
  refineAttendance(card);
  refinePartyModules(card);
  refineActions(card);
}

function handleIntentControls(event) {
  const undo = event.target.closest?.('.intent-undo');
  if (undo) {
    const row = undo.closest('.action-row');
    const intent = row?.querySelector('.intent-button[data-venue-id]');
    if (!intent) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    intent.dataset.undoProxy = 'true';
    intent.click();
    delete intent.dataset.undoProxy;
    return;
  }

  const selectedIntent = event.target.closest?.('.intent-button[data-intent-state="selected"]');
  if (!selectedIntent || selectedIntent.dataset.undoProxy === 'true') return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function scheduleRefinement() {
  requestAnimationFrame(() => {
    refineSelectedCard();
    requestAnimationFrame(refineSelectedCard);
  });
}

function initialize() {
  installStyles();
  document.addEventListener('click', handleIntentControls, { capture: true });
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
