const DESKTOP_QUERY = '(min-width: 900px)';

function isDesktopProfile(detail, windowObject) {
  return detail?.dataset?.profilePresentation === 'desktop' &&
    windowObject?.matchMedia?.(DESKTOP_QUERY)?.matches === true;
}

function placeAfter(cursor, node) {
  if (!cursor || !node) return cursor;
  cursor.after(node);
  return node;
}

function syncDesktopProfileOrder(detail) {
  const hero = detail.querySelector(':scope > .detail-hero');
  const whatToKnow = detail.querySelector(':scope > .detail-what-to-know');
  const activity = detail.querySelector(':scope > .activity-card');
  const partySections = [
    ...detail.querySelectorAll(':scope > .party-module, :scope > [data-watch-party-form-section]')
  ];
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const community = detail.querySelector(':scope > .detail-fan-experiences');
  const photo = detail.querySelector(':scope > .detail-photo');
  const contribution = detail.querySelector(':scope > .detail-contribution');
  if (!hero) return false;

  detail.querySelectorAll(':scope > .detail-local-map, :scope > .detail-hero > .detail-local-map').forEach((map) => map.remove());

  let cursor = hero;
  cursor = placeAfter(cursor, whatToKnow);
  cursor = placeAfter(cursor, activity);
  partySections.forEach((partySection) => { cursor = placeAfter(cursor, partySection); });
  cursor = placeAfter(cursor, editorial);
  cursor = placeAfter(cursor, community);
  if (photo) {
    photo.classList.remove('detail-photo--desktop-opening');
    photo.classList.add('detail-profile-media--desktop', 'detail-photo--supporting');
    cursor = placeAfter(cursor, photo);
  }
  if (contribution) placeAfter(cursor, contribution);

  detail.dataset.desktopProfileArrangement = 'identity-what-to-know-attendance-party-editorial-community-photo-contribution';
  delete detail.dataset.desktopPhotoForward;
  delete detail.dataset.desktopFallbackMap;
  delete detail.dataset.desktopBalancedOpening;
  delete detail.dataset.desktopEditorialSpan;
  return true;
}

export function syncDesktopProfileFinalBalance({
  detail = globalThis.document?.querySelector?.('#venue-detail'),
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!detail || !documentObject || !isDesktopProfile(detail, windowObject)) {
    return { mode: 'none', map: null };
  }

  const opening = detail.querySelector(':scope > [data-desktop-opening]');
  if (opening) {
    const nodes = [...opening.children].flatMap((column) => [...column.children]);
    opening.replaceWith(...nodes);
  }

  syncDesktopProfileOrder(detail);
  return { mode: 'identity', map: null };
}
