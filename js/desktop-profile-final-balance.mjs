const DESKTOP_QUERY = '(min-width: 900px)';
const STYLE_ID = 'cgb-desktop-profile-final-balance';

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
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening {
        display: grid !important;
        grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr) !important;
        grid-template-rows: auto auto;
        align-items: start;
        width: 100%;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__left,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right {
        display: contents !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__left > .detail-hero {
        grid-column: 1 !important;
        grid-row: 1 !important;
        align-self: center !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .detail-photo {
        grid-column: 2 !important;
        grid-row: 1 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__left > .detail-what-to-know {
        grid-column: 1 !important;
        grid-row: 2 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .activity-card {
        grid-column: 2 !important;
        grid-row: 2 !important;
        align-self: center !important;
        padding: 0 18px 0 34px !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-editorial {
        position: relative !important;
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 12px 18px 14px 38px !important;
        color: var(--cgb-ink-900) !important;
        background: var(--cgb-white) !important;
        border: 0 !important;
        border-top: 1px solid var(--cgb-neutral-200) !important;
        box-sizing: border-box !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-editorial::before {
        position: absolute !important;
        top: 12px !important;
        right: auto !important;
        bottom: 14px !important;
        left: 18px !important;
        width: 3px !important;
        height: auto !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-editorial > h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-editorial > .detail-editorial__copy {
        display: block !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] {
        display: grid !important;
        grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr) !important;
        grid-template-rows: auto auto;
        grid-auto-rows: auto;
        column-gap: 0 !important;
        row-gap: 0 !important;
        align-content: start;
        background: var(--cgb-white) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-hero.detail-hero--no-photo {
        grid-column: 1 !important;
        grid-row: 1 !important;
        align-self: center !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-what-to-know {
        grid-column: 1 !important;
        grid-row: 2 !important;
        align-self: start !important;
        margin-top: 2px !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-local-map {
        position: relative !important;
        z-index: 0 !important;
        grid-column: 2 !important;
        grid-row: 1 !important;
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

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .activity-card {
        grid-column: 2 !important;
        grid-row: 2 !important;
        align-self: center !important;
        padding: 0 18px 0 34px !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-editorial {
        position: relative !important;
        display: block !important;
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

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-editorial::before {
        position: absolute !important;
        top: 12px !important;
        right: auto !important;
        bottom: 14px !important;
        left: 18px !important;
        width: 3px !important;
        height: auto !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-editorial > h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-editorial > .detail-editorial__copy {
        display: block !important;
      }
    }
  `;
  documentObject.head.append(style);
}

function placeAfter(cursor, node) {
  if (!cursor || !node) return cursor;
  cursor.after(node);
  return node;
}

function syncDesktopProfileOrder(detail) {
  const opening = detail.querySelector(':scope > [data-desktop-opening]');
  const parties = [...detail.querySelectorAll(':scope > .party-module')];
  const editorial = detail.querySelector(':scope > .detail-editorial') ||
    opening?.querySelector(':scope > .detail-desktop-opening__left > .detail-editorial');
  const community = detail.querySelector(':scope > .detail-fan-experiences');

  let cursor = opening ||
    detail.querySelector(':scope > .detail-local-map') ||
    detail.querySelector(':scope > .activity-card') ||
    detail.querySelector(':scope > .detail-what-to-know') ||
    detail.querySelector(':scope > .detail-hero');

  parties.forEach((party) => { cursor = placeAfter(cursor, party); });
  cursor = placeAfter(cursor, editorial);
  placeAfter(cursor, community);
}

export function syncDesktopProfileFinalBalance({
  detail = globalThis.document?.querySelector?.('#venue-detail'),
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!detail || !documentObject || !isDesktopProfile(detail, windowObject)) {
    return { mode: 'none', map: null };
  }

  installStyles(documentObject);
  const opening = detail.querySelector(':scope > [data-desktop-opening]');
  if (detail.dataset.desktopPhotoForward === 'true' && opening) {
    syncDesktopProfileOrder(detail);
    delete detail.dataset.desktopFallbackMap;
    detail.dataset.desktopEditorialSpan = 'true';
    detail.dataset.desktopProfileArrangement = 'identity-what-to-know__photo-attendance__party-editorial-community-contribution';
    return { mode: 'photo', map: null };
  }

  if (detail.dataset.desktopPhotoForward !== 'false') {
    return { mode: 'none', map: null };
  }

  const localMap = detail.querySelector(':scope > .detail-local-map');
  if (!localMap) return { mode: 'none', map: null };

  localMap.classList.add('detail-profile-media--desktop');
  detail.dataset.desktopFallbackMap = 'true';
  detail.dataset.desktopEditorialSpan = 'true';
  detail.dataset.desktopBalancedOpening = 'true';
  syncDesktopProfileOrder(detail);
  detail.dataset.desktopProfileArrangement = 'identity-what-to-know__map-attendance__party-editorial-community-contribution';
  return { mode: 'map', map: localMap };
}
