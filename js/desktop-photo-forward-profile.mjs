import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';
import { venueTagsForVenue } from './fan-experiences.mjs';
import { createIcon } from './icons.mjs';
import { selectedAttendanceViewModel } from './selected-profile-renderer.mjs';

const DESKTOP_QUERY = '(min-width: 900px)';
const PHOTO_FORWARD_QUERY = '(min-width: 1180px)';
const STYLE_ID = 'cgb-desktop-photo-forward-profile';
const PHOTO_FORWARD_PANEL_WIDTH = 'clamp(580px, 42vw, 620px)';

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
      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know {
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
        color: var(--cgb-ink-500);
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

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 3px !important;
        padding: 6px 18px 10px !important;
        border-top: 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count:not(.bear-count--empty) {
        width: fit-content;
        min-height: 32px;
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 4px;
        margin: 0;
        color: var(--cgb-navy-950);
        font-family: var(--font-ui);
        line-height: 1;
        text-align: left;
        white-space: nowrap;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__number {
        flex: 0 0 auto;
        align-self: center;
        margin-right: 1px;
        font-size: 1.9rem !important;
        font-weight: 850 !important;
        letter-spacing: -.05em;
        line-height: .84 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__label,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__attending,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__context {
        flex: 0 0 auto;
        align-self: center;
        padding: 0;
        margin: 0;
        font-weight: 800 !important;
        line-height: 1 !important;
        white-space: nowrap;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__label {
        font-size: .68rem !important;
        letter-spacing: .025em;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__attending,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count .bear-count__context {
        font-size: .61rem !important;
        letter-spacing: .035em;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count.bear-count--empty {
        min-height: 32px;
        display: inline-flex !important;
        align-items: center;
        justify-content: flex-start;
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
    }

    @media (min-width: 1180px) {
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

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] {
        display: block !important;
        background: var(--cgb-white);
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-desktop-opening {
        display: grid !important;
        grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr) !important;
        align-items: start;
        width: 100%;
        background: var(--cgb-white);
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__left,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__right {
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-self: start;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__left > .detail-hero.detail-hero--has-photo {
        position: static !important;
        top: auto !important;
        z-index: auto !important;
        min-height: 0 !important;
        display: block !important;
        padding: 14px 14px 8px 18px !important;
        color: var(--cgb-ink-900) !important;
        background: var(--cgb-white) !important;
        overflow: visible !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__left > .detail-what-to-know {
        margin-top: 2px !important;
        padding: 12px 14px 12px 18px !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__right > .detail-photo.detail-photo--desktop-opening {
        align-self: stretch;
        width: auto !important;
        max-width: none !important;
        margin: 12px 18px 0 8px !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__right > .detail-photo.detail-photo--desktop-opening .detail-photo__frame {
        aspect-ratio: 3 / 2 !important;
        background: var(--cgb-neutral-100);
        border-radius: 12px;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__right > .detail-photo.detail-photo--desktop-opening .detail-photo__image {
        object-fit: cover !important;
        object-position: center !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__right > .detail-photo.detail-photo--desktop-opening .detail-photo__metadata {
        padding-top: 5px;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__left > .detail-editorial {
        position: relative !important;
        top: auto !important;
        z-index: auto !important;
        align-self: stretch !important;
        display: block !important;
        margin: 0 !important;
        padding: 10px 14px 12px 34px !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__left > .detail-editorial::before {
        position: absolute !important;
        top: 10px !important;
        right: auto !important;
        bottom: 12px !important;
        left: 18px !important;
        width: 3px !important;
        height: auto !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__left > .detail-editorial > h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__left > .detail-editorial > .detail-editorial__copy {
        display: block !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening__right > .activity-card {
        align-self: stretch !important;
        padding: 4px 18px 10px 34px !important;
        background: var(--cgb-white) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] {
        display: grid !important;
        grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr) !important;
        grid-auto-rows: auto;
        column-gap: 0 !important;
        row-gap: 0 !important;
        align-content: start;
        background: var(--cgb-white);
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > * {
        grid-column: 1 / -1;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > .detail-hero.detail-hero--no-photo {
        position: static !important;
        top: auto !important;
        z-index: auto !important;
        grid-column: 1 !important;
        grid-row: 1 / span 2 !important;
        align-self: start;
        min-height: 0 !important;
        display: block !important;
        padding: 14px 14px 12px 18px !important;
        color: var(--cgb-ink-900) !important;
        background: var(--cgb-white) !important;
        overflow: visible !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > .detail-editorial {
        position: relative !important;
        top: auto !important;
        z-index: auto !important;
        grid-column: 2 !important;
        grid-row: 1 !important;
        align-self: start !important;
        display: block !important;
        padding: 14px 18px 4px 34px !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > .detail-editorial::before {
        position: absolute !important;
        top: 14px !important;
        right: auto !important;
        bottom: 6px !important;
        left: 18px !important;
        width: 3px !important;
        height: auto !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > .detail-editorial > h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > .detail-editorial > .detail-editorial__copy {
        display: block !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > .activity-card {
        grid-column: 2 !important;
        grid-row: 2 !important;
        align-self: start !important;
        padding: 4px 18px 10px 34px !important;
        background: var(--cgb-white) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"] > .detail-what-to-know {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        margin-top: 2px !important;
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

function restoreDefaultPhotoPresentation(photo) {
  if (!photo) return;
  photo.classList.remove('detail-photo--desktop-opening');
  const frame = photo.querySelector(':scope > .detail-photo__frame');
  const image = frame?.querySelector(':scope > .detail-photo__image');
  frame?.style?.setProperty('aspect-ratio', '4 / 3', 'important');
  image?.style?.setProperty('object-fit', 'contain', 'important');
  image?.style?.setProperty('object-position', 'center', 'important');
}

function setPhotoForwardPresentation(photo) {
  if (!photo) return;
  photo.classList.add('detail-photo--desktop-opening');
  photo.classList.add('detail-profile-media--desktop');
  const frame = photo.querySelector(':scope > .detail-photo__frame');
  const image = frame?.querySelector(':scope > .detail-photo__image');
  frame?.style?.setProperty('aspect-ratio', '3 / 2', 'important');
  image?.style?.setProperty('object-fit', 'cover', 'important');
  image?.style?.setProperty('object-position', 'center', 'important');
}

function placeAfter(cursor, node) {
  if (!cursor || !node) return cursor;
  cursor.after(node);
  return node;
}

function unwrapDesktopOpening(detail) {
  const opening = detail?.querySelector(':scope > [data-desktop-opening]');
  if (!opening) return false;
  const left = opening.querySelector(':scope > .detail-desktop-opening__left');
  const right = opening.querySelector(':scope > .detail-desktop-opening__right');
  const nodes = [
    ...(left ? [...left.children] : []),
    ...(right ? [...right.children] : [])
  ];
  opening.replaceWith(...nodes);
  return true;
}

function createDesktopOpening(documentObject) {
  const opening = documentObject.createElement('div');
  opening.className = 'detail-desktop-opening';
  opening.dataset.desktopOpening = 'true';

  const left = documentObject.createElement('div');
  left.className = 'detail-desktop-opening__left';
  const right = documentObject.createElement('div');
  right.className = 'detail-desktop-opening__right';
  opening.append(left, right);
  return { opening, left, right };
}

function arrangeStandardHierarchy({ hero, editorial, activity, whatToKnow, parties, community, localMap, contribution }) {
  let cursor = hero;
  cursor = placeAfter(cursor, editorial);
  cursor = placeAfter(cursor, activity);
  cursor = placeAfter(cursor, whatToKnow);
  parties.forEach((party) => { cursor = placeAfter(cursor, party); });
  cursor = placeAfter(cursor, community);
  if (localMap) {
    localMap.classList.add('detail-profile-media--desktop');
    cursor = placeAfter(cursor, localMap);
  }
  if (contribution) placeAfter(cursor, contribution);
}

function arrangeHierarchy({ detail, whatToKnow, windowObject, documentObject }) {
  const hero = detail.querySelector(':scope > .detail-hero');
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const parties = [...detail.querySelectorAll(':scope > .party-module')];
  const activity = detail.querySelector(':scope > .activity-card');
  const community = detail.querySelector(':scope > .detail-fan-experiences');
  const photo = detail.querySelector(':scope > .detail-photo') || hero?.querySelector(':scope > .detail-photo');
  const localMap = detail.querySelector(':scope > .detail-local-map') || hero?.querySelector(':scope > .detail-local-map');
  const contribution = detail.querySelector(':scope > .detail-contribution');
  const wideOpening = windowObject?.matchMedia?.(PHOTO_FORWARD_QUERY)?.matches === true;
  const photoForward = Boolean(photo && wideOpening);
  if (!hero) return;

  detail.dataset.desktopPhotoForward = photoForward ? 'true' : 'false';
  detail.dataset.desktopBalancedOpening = photoForward ? 'true' : 'false';

  if (!photoForward) {
    detail.dataset.desktopProfileArrangement = wideOpening
      ? 'identity-editorial-attendance-what-to-know-party-community-media-contribution'
      : 'identity-editorial-attendance-what-to-know-party-community-media-contribution';
    if (photo) {
      restoreDefaultPhotoPresentation(photo);
      photo.classList.remove('detail-profile-media--desktop');
      if (photo.parentElement !== hero) hero.prepend(photo);
    }
    arrangeStandardHierarchy({ hero, editorial, activity, whatToKnow, parties, community, localMap, contribution });
    return;
  }

  detail.dataset.desktopProfileArrangement = 'identity-what-to-know-editorial__photo-attendance__party-community-contribution';
  setPhotoForwardPresentation(photo);

  const { opening, left, right } = createDesktopOpening(documentObject);
  detail.insertBefore(opening, hero);
  left.append(hero, whatToKnow);
  if (editorial) left.append(editorial);
  right.append(photo);
  if (activity) right.append(activity);

  let cursor = opening;
  parties.forEach((party) => { cursor = placeAfter(cursor, party); });
  cursor = placeAfter(cursor, community);
  if (localMap) {
    localMap.classList.add('detail-profile-media--desktop');
    cursor = placeAfter(cursor, localMap);
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
  arrangeHierarchy({ detail, whatToKnow, windowObject, documentObject });
  return true;
}
