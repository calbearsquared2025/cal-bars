import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';
import { venueTagsForVenue } from './fan-experiences.mjs';
import { createIcon } from './icons.mjs';
import { selectedAttendanceViewModel } from './selected-profile-renderer.mjs';

const DESKTOP_QUERY = '(min-width: 900px)';
const STYLE_ID = 'cgb-desktop-photo-forward-profile';
const PHOTO_FORWARD_PANEL_WIDTH = 'clamp(500px, 52vw, 620px)';

function clean(value) {
  return String(value ?? '').trim();
}

function meta(name, documentObject) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function contributionConfig(documentObject) {
  return {
    formUrl: meta('cgb-cal-bar-nomination-form-url', documentObject),
    venueIdEntry: meta('cgb-cal-bar-nomination-venue-id-entry', documentObject),
    venueNameEntry: meta('cgb-cal-bar-nomination-venue-name-entry', documentObject)
  };
}

function refreshProfileOnReturn(link, documentObject) {
  const windowObject = documentObject?.defaultView || globalThis.window;
  if (!link || !windowObject?.addEventListener) return;
  link.addEventListener('click', () => {
    windowObject.addEventListener('focus', () => {
      windowObject.CGBSnapshotRefresh?.refresh?.();
    }, { once: true });
  });
}

function isDesktopProfile(detail, windowObject) {
  return detail?.dataset?.profilePresentation === 'desktop' &&
    windowObject?.matchMedia?.(DESKTOP_QUERY)?.matches === true;
}

function installStyles(documentObject) {
  if (!documentObject?.head || documentObject.getElementById?.(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (min-width: 900px) {
      html body[data-view="map"] #map-view > #venue-tray.venue-tray.tray--selected {
        width: ${PHOTO_FORWARD_PANEL_WIDTH} !important;
      }

      html body[data-view="map"]:has(#map-view > #venue-tray.venue-tray.tray--selected) .mobile-command-bar {
        width: ${PHOTO_FORWARD_PANEL_WIDTH} !important;
      }

      html body[data-view="map"] .map-view:has(> #venue-tray.venue-tray.tray--selected) .maplibregl-ctrl-top-right {
        right: calc(${PHOTO_FORWARD_PANEL_WIDTH} + 26px) !important;
      }

      html body[data-view="map"] .map-view:has(> #venue-tray.venue-tray.tray--selected) > .map-actions {
        right: calc(${PHOTO_FORWARD_PANEL_WIDTH} + 36px) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] {
        display: grid !important;
        grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
        column-gap: 0 !important;
        row-gap: 0 !important;
        align-content: start !important;
        background: var(--cgb-white) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero {
        position: static !important;
        top: auto !important;
        z-index: auto !important;
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        width: 100% !important;
        min-height: 0 !important;
        display: block !important;
        margin: 0 !important;
        padding: 18px 20px 17px !important;
        color: var(--cgb-white) !important;
        background: var(--cgb-navy-950) !important;
        border: 0 !important;
        border-bottom: 3px solid var(--cgb-gold-400) !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero h1 {
        margin: 8px 0 0 !important;
        color: var(--cgb-white) !important;
        font-family: var(--font-condensed, "Barlow Condensed", "Arial Narrow", sans-serif) !important;
        font-size: clamp(2.35rem, 4.3vw, 3.15rem) !important;
        font-weight: 900 !important;
        letter-spacing: -.025em !important;
        line-height: .9 !important;
        overflow-wrap: break-word !important;
        word-break: normal !important;
        hyphens: none !important;
        text-wrap: balance;
        text-transform: uppercase !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .venue-badges {
        position: static !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin: 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .venue-badge {
        color: var(--cgb-gold-300) !important;
        background: transparent !important;
        border-color: var(--cgb-gold-400) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .detail-address {
        display: block !important;
        margin: 12px 0 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .detail-address__location,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .detail-address__street,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .detail-address__locality,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .detail-address__distance {
        color: rgba(255, 255, 255, .88) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .detail-address__separator {
        color: rgba(255, 255, 255, .5) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero .detail-directions-inline--desktop,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero a {
        color: var(--cgb-gold-300) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        align-self: stretch !important;
        margin: 0 !important;
        padding: 12px 18px 10px !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__title {
        margin: 0;
        color: var(--cgb-ink-700);
        font-family: var(--font-ui);
        font-size: .68rem;
        font-weight: 800;
        letter-spacing: .055em;
        line-height: 1.15;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__link {
        flex: 0 0 auto;
        padding: 0;
        color: var(--cgb-ink-500);
        font-family: var(--font-ui);
        font-size: .62rem;
        font-weight: 700;
        line-height: 1.2;
        text-decoration: none;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__tags {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        margin: 7px 0 0;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__tag {
        min-height: 22px;
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        color: var(--cgb-navy-900);
        background: var(--cgb-gold-50);
        border-radius: var(--radius-pill);
        font-family: var(--font-ui);
        font-size: .64rem;
        font-weight: 700;
        line-height: 1.1;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__empty {
        margin: 5px 0 0;
        color: var(--cgb-ink-500);
        font-size: .66rem;
        line-height: 1.25;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-fan-experiences > [data-venue-tags] {
        display: none !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        align-self: stretch !important;
        min-height: 56px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0 !important;
        padding: 0 18px !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count:not(.bear-count--empty) {
        width: 100% !important;
        min-height: 56px !important;
        display: grid !important;
        grid-template-columns: auto auto !important;
        grid-template-rows: auto auto auto !important;
        align-content: center !important;
        align-items: start !important;
        justify-content: center !important;
        justify-items: start !important;
        column-gap: 6px !important;
        row-gap: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--cgb-navy-950) !important;
        background: transparent !important;
        border: 0 !important;
        font-family: var(--font-ui) !important;
        text-align: left !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__number {
        grid-column: 1 !important;
        grid-row: 1 / 4 !important;
        align-self: start !important;
        justify-self: end !important;
        font-family: var(--font-ui) !important;
        font-size: 2.15rem !important;
        font-weight: 850 !important;
        letter-spacing: -.055em !important;
        line-height: .84 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__label {
        grid-column: 2 !important;
        grid-row: 1 !important;
        align-self: start !important;
        justify-self: start !important;
        padding-top: 0 !important;
        margin: 0 !important;
        font-family: var(--font-ui) !important;
        font-size: .75rem !important;
        font-weight: 850 !important;
        letter-spacing: .025em !important;
        line-height: .95 !important;
        white-space: nowrap !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__attending,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__context {
        grid-column: 2 !important;
        justify-self: start !important;
        margin: 0 !important;
        font-family: var(--font-ui) !important;
        font-weight: 800 !important;
        letter-spacing: .045em !important;
        line-height: .98 !important;
        text-align: left !important;
        white-space: nowrap !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__attending {
        grid-row: 2 !important;
        margin-top: 0 !important;
        font-size: .62rem !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__context {
        grid-row: 3 !important;
        font-size: .6rem !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count.bear-count--empty {
        min-height: 56px;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        gap: 5px;
        margin: 0;
        text-align: left;
        white-space: nowrap;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count.bear-count--empty .bear-count__icon {
        width: 20px;
        height: 20px;
        color: var(--cgb-gold-500);
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count.bear-count--empty .bear-count__prompt {
        color: var(--cgb-navy-950);
        font-size: .7rem;
        font-weight: 750;
        line-height: 1.16;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > p {
        display: none !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .party-module,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > [data-watch-party-form-section],
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-editorial,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-fan-experiences,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-photo.detail-photo--supporting,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-contribution {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-editorial {
        position: relative !important;
        top: auto !important;
        z-index: auto !important;
        display: block !important;
        width: auto !important;
        margin: 0 !important;
        padding: 16px 18px 16px 40px !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-editorial::before {
        position: absolute !important;
        top: 10px !important;
        bottom: 10px !important;
        left: 18px !important;
        width: 3px !important;
        height: auto !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-editorial > h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-editorial > .detail-editorial__copy {
        display: block !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-photo.detail-photo--supporting {
        width: calc(100% - 36px) !important;
        max-width: none !important;
        margin: 14px 18px 4px !important;
      }
    }
  `;
  documentObject.head.append(style);
}

function createWhatToKnow({ state, venue, documentObject }) {
  const section = documentObject.createElement('section');
  section.className = 'detail-what-to-know';
  section.dataset.desktopWhatToKnow = 'true';

  const header = documentObject.createElement('div');
  header.className = 'detail-what-to-know__header';
  const title = documentObject.createElement('h2');
  title.className = 'detail-what-to-know__title';
  title.textContent = 'WHAT TO KNOW';
  header.append(title);

  const venueContext = resolveCalBarNominationVenue(state.snapshot, state.selectedVenueId);
  const href = buildCalBarNominationPrefillUrl(contributionConfig(documentObject), venueContext);
  if (href) {
    const link = documentObject.createElement('a');
    link.className = 'detail-what-to-know__link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Add info →';
    refreshProfileOnReturn(link, documentObject);
    header.append(link);
  }
  section.append(header);

  const tags = venueTagsForVenue(venue);
  if (tags.length) {
    const list = documentObject.createElement('div');
    list.className = 'detail-what-to-know__tags';
    list.setAttribute('aria-label', 'Community venue details');
    tags.forEach((item) => {
      const tag = documentObject.createElement('span');
      tag.className = 'detail-what-to-know__tag';
      tag.dataset.venueTag = item.value;
      tag.textContent = item.label;
      list.append(tag);
    });
    section.append(list);
  } else {
    const empty = documentObject.createElement('p');
    empty.className = 'detail-what-to-know__empty';
    empty.textContent = 'Nothing shared yet.';
    section.append(empty);
  }

  return section;
}

function syncWhatToKnow({ detail, state, venue, documentObject }) {
  detail.querySelector('[data-desktop-what-to-know]')?.remove();
  return createWhatToKnow({ state, venue, documentObject });
}

function syncAttendance({ detail, state, venue, documentObject }) {
  const current = detail.querySelector(':scope > .activity-card > strong');
  const game = state.snapshot?.games?.find((item) => clean(item?.game_id) === clean(state.gameId));
  if (!current || !game) return;

  const view = selectedAttendanceViewModel({ state, game, venue });
  current.classList.add('bear-count');
  current.classList.toggle('bear-count--empty', view.kind === 'empty');
  current.setAttribute('aria-label', view.ariaLabel);

  if (view.kind === 'completed') {
    current.classList.remove('bear-count--empty');
    current.textContent = view.primary;
    return;
  }

  if (view.kind === 'empty') {
    const icon = createIcon('users', { className: 'ui-icon bear-count__icon', documentObject });
    const prompt = documentObject.createElement('span');
    prompt.className = 'bear-count__prompt';
    prompt.textContent = 'Be the first.';
    current.replaceChildren(icon, prompt);
    return;
  }

  const numeral = documentObject.createElement('span');
  numeral.className = 'bear-count__number';
  numeral.textContent = String(view.number);
  const label = documentObject.createElement('span');
  label.className = 'bear-count__label';
  label.textContent = view.number === 1 ? 'BEAR' : 'BEARS';
  const attending = documentObject.createElement('span');
  attending.className = 'bear-count__attending';
  attending.textContent = 'ATTENDING';
  const context = documentObject.createElement('span');
  context.className = 'bear-count__context';
  context.textContent = 'ON CGB';
  current.replaceChildren(numeral, label, attending, context);
}

function placeAfter(cursor, node) {
  if (!cursor || !node) return cursor;
  cursor.after(node);
  return node;
}

function unwrapDesktopOpening(detail) {
  const opening = detail?.querySelector(':scope > [data-desktop-opening]');
  if (!opening) return false;
  const nodes = [...opening.children].flatMap((column) => [...column.children]);
  opening.replaceWith(...nodes);
  return true;
}

function arrangeHierarchy({ detail, whatToKnow }) {
  const hero = detail.querySelector(':scope > .detail-hero');
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const parties = [...detail.querySelectorAll(':scope > .party-module, :scope > [data-watch-party-form-section]')];
  const activity = detail.querySelector(':scope > .activity-card');
  const community = detail.querySelector(':scope > .detail-fan-experiences');
  const photo = detail.querySelector(':scope > .detail-photo');
  const contribution = detail.querySelector(':scope > .detail-contribution');
  if (!hero) return;

  detail.querySelectorAll(':scope > .detail-local-map, :scope > .detail-hero > .detail-local-map').forEach((map) => map.remove());
  delete detail.dataset.desktopPhotoForward;
  delete detail.dataset.desktopBalancedOpening;
  delete detail.dataset.desktopFallbackMap;
  detail.dataset.desktopProfileArrangement = 'identity-what-to-know-party-attendance-editorial-community-photo-contribution';

  let cursor = hero;
  cursor = placeAfter(cursor, whatToKnow);
  parties.forEach((party) => { cursor = placeAfter(cursor, party); });
  cursor = placeAfter(cursor, activity);
  cursor = placeAfter(cursor, editorial);
  cursor = placeAfter(cursor, community);
  if (photo) {
    photo.classList.remove('detail-photo--desktop-opening');
    photo.classList.add('detail-profile-media--desktop', 'detail-photo--supporting');
    cursor = placeAfter(cursor, photo);
  }
  if (contribution) placeAfter(cursor, contribution);
}

export function syncDesktopPhotoForwardProfile({
  state = globalThis.window?.CGBApp?.getState?.(),
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!state?.detailMode || !documentObject) return false;
  const detail = documentObject.querySelector('#venue-detail');
  const venue = state.snapshot?.venues?.find((item) => clean(item?.venue_id) === clean(state.selectedVenueId));
  if (!detail || !venue) return false;
  unwrapDesktopOpening(detail);
  if (!isDesktopProfile(detail, windowObject)) return false;

  installStyles(documentObject);
  const whatToKnow = syncWhatToKnow({ detail, state, venue, documentObject });
  syncAttendance({ detail, state, venue, documentObject });
  arrangeHierarchy({ detail, whatToKnow });
  return true;
}
