const WIDE_DESKTOP_QUERY = '(min-width: 1180px)';
const STYLE_ID = 'cgb-desktop-profile-final-balance';

function isWideDesktopProfile(detail, windowObject) {
  return detail?.dataset?.profilePresentation === 'desktop' &&
    windowObject?.matchMedia?.(WIDE_DESKTOP_QUERY)?.matches === true;
}

function installStyles(documentObject) {
  if (!documentObject?.head || documentObject.getElementById?.(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (min-width: 1180px) {
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-fallback-map="true"] {
        display: block !important;
        background: var(--cgb-white) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] > .detail-desktop-opening[data-desktop-fallback-map="true"] {
        display: grid !important;
        grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr) !important;
        align-items: start;
        width: 100%;
        background: var(--cgb-white) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening[data-desktop-fallback-map="true"] .detail-desktop-opening__left,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening[data-desktop-fallback-map="true"] .detail-desktop-opening__right {
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-self: start;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening[data-desktop-fallback-map="true"] .detail-desktop-opening__left > .detail-hero.detail-hero--no-photo {
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

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-desktop-opening[data-desktop-fallback-map="true"] .detail-desktop-opening__right > .detail-local-map {
        position: relative !important;
        z-index: 0 !important;
        align-self: stretch !important;
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        aspect-ratio: 3 / 2 !important;
        margin: 12px 18px 0 8px !important;
        overflow: hidden !important;
        background: var(--cgb-neutral-100) !important;
        border: 1px solid var(--cgb-neutral-200) !important;
        border-radius: 12px !important;
        clip-path: none !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-editorial-span="true"] > .detail-editorial {
        position: relative !important;
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 12px 18px 14px 38px !important;
        color: var(--cgb-ink-900) !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
        box-sizing: border-box !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-editorial-span="true"] > .detail-editorial::before {
        position: absolute !important;
        top: 12px !important;
        right: auto !important;
        bottom: 14px !important;
        left: 18px !important;
        width: 3px !important;
        height: auto !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-editorial-span="true"] > .detail-editorial > h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-editorial-span="true"] > .detail-editorial > .detail-editorial__copy {
        display: block !important;
      }
    }
  `;
  documentObject.head.append(style);
}

function createFallbackOpening(documentObject) {
  const opening = documentObject.createElement('div');
  opening.className = 'detail-desktop-opening';
  opening.dataset.desktopOpening = 'true';
  opening.dataset.desktopFallbackMap = 'true';

  const left = documentObject.createElement('div');
  left.className = 'detail-desktop-opening__left';
  const right = documentObject.createElement('div');
  right.className = 'detail-desktop-opening__right';
  opening.append(left, right);
  return { opening, left, right };
}

function moveEditorialAfterOpening(detail, opening) {
  const editorial = opening?.querySelector?.('.detail-editorial') ||
    detail?.querySelector?.(':scope > .detail-editorial');
  if (!editorial || !opening) return null;
  opening.after(editorial);
  detail.dataset.desktopEditorialSpan = 'true';
  return editorial;
}

export function syncDesktopProfileFinalBalance({
  detail = globalThis.document?.querySelector?.('#venue-detail'),
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!detail || !documentObject || !isWideDesktopProfile(detail, windowObject)) {
    return { mode: 'none', map: null };
  }

  installStyles(documentObject);
  let opening = detail.querySelector(':scope > [data-desktop-opening]');

  if (detail.dataset.desktopPhotoForward === 'true' && opening) {
    moveEditorialAfterOpening(detail, opening);
    delete detail.dataset.desktopFallbackMap;
    detail.dataset.desktopProfileArrangement = 'identity-what-to-know__photo-attendance__editorial-party-community-contribution';
    return { mode: 'photo', map: null };
  }

  if (opening?.dataset.desktopFallbackMap === 'true') {
    moveEditorialAfterOpening(detail, opening);
    detail.dataset.desktopFallbackMap = 'true';
    detail.dataset.desktopBalancedOpening = 'true';
    return {
      mode: 'map',
      map: opening.querySelector('.detail-desktop-opening__right > .detail-local-map')
    };
  }

  if (detail.dataset.desktopPhotoForward !== 'false') {
    return { mode: 'none', map: null };
  }

  const hero = detail.querySelector(':scope > .detail-hero.detail-hero--no-photo');
  const whatToKnow = detail.querySelector(':scope > .detail-what-to-know');
  const activity = detail.querySelector(':scope > .activity-card');
  const localMap = detail.querySelector(':scope > .detail-local-map') ||
    hero?.querySelector(':scope > .detail-local-map');
  if (!hero || !localMap) return { mode: 'none', map: null };

  const fallback = createFallbackOpening(documentObject);
  detail.insertBefore(fallback.opening, hero);
  fallback.left.append(hero);
  if (whatToKnow) fallback.left.append(whatToKnow);
  fallback.right.append(localMap);
  if (activity) fallback.right.append(activity);
  moveEditorialAfterOpening(detail, fallback.opening);

  localMap.classList.add('detail-profile-media--desktop');
  detail.dataset.desktopFallbackMap = 'true';
  detail.dataset.desktopBalancedOpening = 'true';
  detail.dataset.desktopProfileArrangement = 'identity-what-to-know__map-attendance__editorial-party-community-contribution';
  return { mode: 'map', map: localMap };
}
