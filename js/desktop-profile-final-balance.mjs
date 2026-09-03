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
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card > strong.bear-count:not(.bear-count--empty) {
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        grid-template-rows: repeat(3, auto) !important;
        column-gap: 10px !important;
        row-gap: 0 !important;
        align-items: center !important;
        white-space: normal !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__number {
        grid-column: 1 !important;
        grid-row: 1 / span 3 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__label,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__attending,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__context {
        grid-column: 2 !important;
        align-self: end !important;
        white-space: normal !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__label {
        grid-row: 1 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__attending {
        grid-row: 2 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__context {
        grid-row: 3 !important;
        align-self: start !important;
        font-weight: 650 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__title,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-editorial h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-fan-experiences h2 {
        font-size: .78rem !important;
        font-weight: 900 !important;
        letter-spacing: .08em !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__number {
        font-size: clamp(3.15rem, 4.2vw, 4rem) !important;
        font-weight: 900 !important;
        line-height: .82 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__label,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__attending,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__context {
        font-size: .78rem !important;
        font-weight: 900 !important;
        line-height: 1.02 !important;
      }
    }
  `;
  documentObject.head.append(style);
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
  return { mode: 'none', map: null };
}
