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
      font-size: .68rem;
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
      body[data-view="map"][data-command-surface="map"] #tray-selected > #venue-detail.venue-detail--selected-continuation > .detail-cgb-activity {
        grid-column: 1 / -1 !important;
        grid-row: 3 !important;
        padding: 12px 16px 13px !important;
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

export function selectedProfileHistoricalActivity({ state, venue } = {}) {
  const game = state?.snapshot?.games?.find((item) => clean(item?.game_id) === clean(state?.gameId));
  if (!game || !venue) return null;
  const view = selectedAttendanceViewModel({ state, game, venue });
  if (view.kind !== 'positive' || view.number <= 0 || !view.secondary?.length) return null;
  return Object.freeze({
    lines: Object.freeze(view.secondary.slice())
  });
}

export function createSelectedProfileActivitySection({ state, venue, documentObject = document } = {}) {
  const presentation = selectedProfileHistoricalActivity({ state, venue });
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
  detail?.querySelector?.(':scope > [data-cgb-activity]')?.remove();
  if (documentObject?.body?.dataset?.view !== 'map') return null;
  const section = createSelectedProfileActivitySection({ state, venue, documentObject });
  if (!detail || !section) return null;
  const community = detail.querySelector(':scope > .detail-fan-experiences');
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const hero = detail.querySelector(':scope > .detail-hero');
  const anchor = community || editorial || hero;
  if (anchor) anchor.after(section);
  else detail.prepend(section);
  return section;
}
