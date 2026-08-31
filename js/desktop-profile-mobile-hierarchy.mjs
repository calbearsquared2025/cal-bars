import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';
import { venueTagsForVenue } from './fan-experiences.mjs';
import { createIcon } from './icons.mjs';
import { selectedAttendanceViewModel } from './selected-profile-renderer.mjs';

const DESKTOP_QUERY = '(min-width: 900px)';
const STYLE_ID = 'cgb-desktop-profile-mobile-hierarchy';

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
      html body[data-view="map"] .mobile-command-bar .mobile-command > span:last-child {
        text-transform: uppercase;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-what-to-know {
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

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card {
        display: grid !important;
        justify-items: start !important;
        gap: 3px !important;
        padding: 8px 18px 12px 40px !important;
        border-top: 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count:not(.bear-count--empty) {
        width: fit-content;
        min-height: 50px;
        display: grid !important;
        grid-template-columns: auto auto;
        grid-template-rows: auto auto auto;
        align-content: center;
        align-items: start;
        justify-content: start;
        justify-items: start;
        column-gap: 5px;
        row-gap: 0;
        margin: 0;
        color: var(--cgb-navy-950);
        font-family: var(--font-ui);
        text-align: left;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count .bear-count__number {
        grid-column: 1;
        grid-row: 1 / 4;
        align-self: start;
        justify-self: end;
        font-size: 1.95rem !important;
        font-weight: 850 !important;
        letter-spacing: -.05em;
        line-height: .84 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count .bear-count__label {
        grid-column: 2;
        grid-row: 1;
        align-self: start;
        justify-self: start;
        padding-top: 1px;
        font-size: .7rem !important;
        font-weight: 850 !important;
        letter-spacing: .03em;
        line-height: 1 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count .bear-count__attending,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count .bear-count__context {
        grid-column: 2;
        justify-self: start;
        font-weight: 800 !important;
        letter-spacing: .05em;
        line-height: 1.05 !important;
        text-align: left;
        white-space: nowrap;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count .bear-count__attending {
        grid-row: 2;
        margin-top: 2px;
        font-size: .58rem !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count .bear-count__context {
        grid-row: 3;
        font-size: .56rem !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count.bear-count--empty {
        min-height: 50px;
        display: grid !important;
        place-content: center start;
        justify-items: start;
        gap: 2px;
        margin: 0;
        text-align: left;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count.bear-count--empty .bear-count__icon {
        width: 20px;
        height: 20px;
        color: var(--cgb-gold-500);
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > strong.bear-count.bear-count--empty .bear-count__prompt {
        color: var(--cgb-navy-950);
        font-size: .7rem;
        font-weight: 750;
        line-height: 1.16;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > p:not(.activity-card__presence) {
        margin: 0 !important;
        color: var(--cgb-ink-500) !important;
        font-size: .72rem !important;
        line-height: 1.25 !important;
        text-align: left;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card > .activity-card__presence {
        display: none !important;
      }
    }

    @media (min-width: 1100px) {
      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] {
        grid-template-rows: auto auto;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero.detail-hero--has-photo,
      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-hero.detail-hero--no-photo {
        position: static !important;
        top: auto !important;
        z-index: auto !important;
        grid-column: 1 / 7 !important;
        grid-row: 1 / 3 !important;
      }

      html #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-editorial {
        position: static !important;
        top: auto !important;
        z-index: auto !important;
        grid-column: 7 / 13 !important;
        grid-row: 1 !important;
        align-self: start;
        padding: 12px 18px 6px 16px !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .activity-card {
        grid-column: 7 / 13 !important;
        grid-row: 2 !important;
        align-self: start;
        padding: 6px 18px 12px 37px !important;
        background: var(--cgb-white) !important;
        border-top: 0 !important;
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
  detail.querySelector(':scope > [data-desktop-what-to-know]')?.remove();
  const section = createWhatToKnow({ state, venue, documentObject });
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const hero = detail.querySelector(':scope > .detail-hero');
  (editorial || hero)?.after(section);

  detail.querySelector(':scope > .detail-fan-experiences > [data-venue-tags]')?.remove();
  return section;
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

function arrangeHierarchy(detail, whatToKnow) {
  const hero = detail.querySelector(':scope > .detail-hero');
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const parties = [...detail.querySelectorAll(':scope > .party-module')];
  const activity = detail.querySelector(':scope > .activity-card');
  const community = detail.querySelector(':scope > .detail-fan-experiences');
  const media = detail.querySelector(':scope > .detail-photo, :scope > .detail-local-map') ||
    hero?.querySelector(':scope > .detail-photo, :scope > .detail-local-map');
  const contribution = detail.querySelector(':scope > .detail-contribution');
  if (!hero) return;

  let cursor = hero;
  if (editorial) {
    cursor.after(editorial);
    cursor = editorial;
  }
  if (activity) {
    cursor.after(activity);
    cursor = activity;
  }
  if (whatToKnow) {
    cursor.after(whatToKnow);
    cursor = whatToKnow;
  }
  parties.forEach((party) => {
    cursor.after(party);
    cursor = party;
  });
  if (community) {
    cursor.after(community);
    cursor = community;
  }
  if (media) {
    media.classList.add('detail-profile-media--desktop');
    cursor.after(media);
    cursor = media;
  }
  if (contribution) cursor.after(contribution);

  detail.dataset.desktopProfileArrangement = 'identity-editorial-attendance-what-to-know-party-community-media-contribution';
}

export function syncDesktopProfileMobileHierarchy({
  state = globalThis.window?.CGBApp?.getState?.(),
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!state?.detailMode || !documentObject) return false;
  const detail = documentObject.querySelector('#venue-detail');
  const venue = state.snapshot?.venues?.find((item) => clean(item?.venue_id) === clean(state.selectedVenueId));
  if (!detail || !venue || !isDesktopProfile(detail, windowObject)) return false;

  installStyles(documentObject);
  const whatToKnow = syncWhatToKnow({ detail, state, venue, documentObject });
  syncAttendance({ detail, state, venue, documentObject });
  arrangeHierarchy(detail, whatToKnow);
  return true;
}
