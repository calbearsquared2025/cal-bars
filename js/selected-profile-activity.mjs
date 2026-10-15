import { selectedAttendanceViewModel } from './selected-profile-renderer.mjs';

const STYLE_ID = 'cgb-selected-profile-activity';

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles(documentObject) {
  if (!documentObject?.head || documentObject.getElementById?.(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body[data-view="map"] #tray-selected > #venue-detail > .detail-cgb-activity {
      min-width: 0;
      margin: 0;
      padding: 12px 18px 13px;
      background: var(--cgb-white);
      border-top: 1px solid var(--cgb-neutral-200);
    }

    body[data-view="map"] #tray-selected > #venue-detail > .detail-cgb-activity > h2 {
      margin: 0 0 4px;
      color: var(--cgb-ink-500);
      font-family: var(--font-ui);
      font-size: var(--text-2xs);
      font-weight: 800;
      letter-spacing: .055em;
      line-height: 1.15;
    }

    body[data-view="map"] #tray-selected > #venue-detail > .detail-cgb-activity > p {
      margin: 0;
      color: var(--cgb-ink-700);
      font-size: .72rem;
      line-height: 1.35;
    }

    @media (max-width: 899px) {
      /* Reuse the desktop CGB Activity block beneath current attendance in the navy column. */
      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card .selected-card__attendance-hero > .detail-cgb-activity {
        min-width: 0;
        width: 100%;
        margin: 3px 0 0;
        padding: 7px 0 0;
        color: var(--cgb-white);
        background: transparent;
        border: 0;
        border-top: 1px solid rgba(255, 255, 255, .18);
        text-align: left;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card .selected-card__attendance-hero > .detail-cgb-activity > h2 {
        margin: 0 0 4px;
        color: rgba(255, 255, 255, .7);
        font-size: var(--text-2xs);
        font-weight: 700;
        letter-spacing: .035em;
        line-height: 1.15;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card .selected-card__attendance-hero > .detail-cgb-activity > p {
        margin: 0;
        color: rgba(255, 255, 255, .82);
        font-size: .72rem;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
    }

    @media (min-width: 900px) {
      body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-cgb-activity {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
      }
    }
  `;
  documentObject.head.append(style);
}

export function selectedProfileHistoricalActivity({ state, venue, includeEmptyHistory = false } = {}) {
  const game = state?.snapshot?.games?.find((item) => clean(item?.game_id) === clean(state?.gameId));
  if (!game || !venue) return null;
  const view = selectedAttendanceViewModel({ state, game, venue });
  if (!view.secondary?.length || (view.kind !== 'positive' && !(includeEmptyHistory && view.kind === 'empty'))) return null;
  return Object.freeze({
    lines: Object.freeze(view.secondary.slice())
  });
}

export function createSelectedProfileActivitySection({ state, venue, includeEmptyHistory = false, documentObject = document } = {}) {
  const presentation = selectedProfileHistoricalActivity({ state, venue, includeEmptyHistory });
  if (!presentation) return null;
  installStyles(documentObject);

  const section = documentObject.createElement('section');
  section.className = 'detail-cgb-activity';
  section.dataset.cgbActivity = 'true';

  const heading = documentObject.createElement('h2');
  heading.textContent = 'CGB ACTIVITY';
  const copy = documentObject.createElement('p');
  presentation.lines.forEach((line, index) => {
    if (index > 0) copy.append(documentObject.createElement('br'));
    copy.append(documentObject.createTextNode(line));
  });
  section.append(heading, copy);
  return section;
}

export function syncSelectedProfileActivitySection({ detail, state, venue, documentObject = document } = {}) {
  // One history owner at a time: desktop hero, mobile attendance column, or no section.
  detail?.querySelector?.('[data-cgb-activity]')?.remove();
  const selectedCard = documentObject?.querySelector?.('#tray-selected > .selected-card[data-venue-id]');
  const mobileColumn = selectedCard?.dataset?.venueId === venue?.venue_id
    ? selectedCard.querySelector('.selected-card__attendance-hero')
    : null;
  mobileColumn?.querySelector?.(':scope > [data-cgb-activity]')?.remove();
  if (documentObject?.body?.dataset?.view !== 'map') return null;
  // Preserve the existing zero-attendance mobile history prompt; completed games are unchanged.
  const includeEmptyHistory = detail?.dataset?.profilePresentation === 'desktop';
  const section = createSelectedProfileActivitySection({ state, venue, includeEmptyHistory, documentObject });
  if (!detail || !section) return null;
  if (detail.dataset.profilePresentation === 'mobile-continuation' && mobileColumn) {
    const count = mobileColumn.querySelector(':scope > .bear-count--hero');
    if (count) count.after(section);
    else mobileColumn.prepend(section);
    return section;
  }
  if (includeEmptyHistory) {
    // Place history with the desktop game count immediately, including after
    // asynchronous activity refreshes that run after hierarchy normalization.
    const attendance = detail.querySelector(':scope > .detail-hero > .activity-card') ||
      detail.querySelector(':scope > .activity-card');
    if (attendance) {
      attendance.append(section);
      return section;
    }
  }
  const community = detail.querySelector(':scope > .detail-fan-experiences');
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const hero = detail.querySelector(':scope > .detail-hero');
  const anchor = community || editorial || hero;
  if (anchor) anchor.after(section);
  else detail.prepend(section);
  return section;
}
