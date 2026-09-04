import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';
import { venueTagsForVenue } from './fan-experiences.mjs';
import { createIcon } from './icons.mjs';
import { selectedAttendanceViewModel } from './selected-profile-renderer.mjs';

const DESKTOP_QUERY = '(min-width: 900px)';

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
  detail.dataset.desktopProfileArrangement = 'identity-party-what-to-know-attendance-editorial-community-photo-contribution';

  let cursor = hero;
  parties.forEach((party) => { cursor = placeAfter(cursor, party); });
  cursor = placeAfter(cursor, whatToKnow);
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

  const whatToKnow = syncWhatToKnow({ detail, state, venue, documentObject });
  syncAttendance({ detail, state, venue, documentObject });
  arrangeHierarchy({ detail, whatToKnow });
  return true;
}
