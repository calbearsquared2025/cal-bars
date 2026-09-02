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
        grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr) !important;
        grid-template-rows: auto auto;
        align-items: stretch;
        width: 100%;
        background: var(--cgb-navy-950) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__left,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right {
        display: contents !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__left > .detail-hero {
        grid-column: 1 !important;
        grid-row: 1 !important;
        align-self: stretch !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        min-height: 190px !important;
        padding: 22px 18px 20px 24px !important;
        color: var(--cgb-white) !important;
        background: var(--cgb-navy-950) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening .detail-hero .venue-badge {
        color: var(--cgb-gold-400) !important;
        background: transparent !important;
        border: 1px solid var(--cgb-gold-400) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening .detail-hero h1 {
        max-width: 11ch;
        margin: 9px 0 0 !important;
        color: var(--cgb-white) !important;
        font-family: var(--font-condensed, var(--font-display)) !important;
        font-size: clamp(2.25rem, 4.15vw, 3.45rem) !important;
        font-weight: 900 !important;
        letter-spacing: -.035em !important;
        line-height: .88 !important;
        text-wrap: balance;
        text-transform: uppercase;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening .detail-hero .detail-address__location {
        margin-top: 14px;
        color: rgba(255, 255, 255, .9) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening .detail-hero .detail-address__separator {
        color: rgba(255, 255, 255, .5) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening .detail-hero .detail-directions-inline--desktop {
        color: var(--cgb-gold-300) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .detail-photo {
        grid-column: 2 !important;
        grid-row: 1 !important;
        position: relative !important;
        align-self: stretch !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        background: var(--cgb-navy-950) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .detail-photo::before {
        content: '';
        position: absolute;
        z-index: 2;
        inset: 0 auto 0 0;
        width: 14%;
        pointer-events: none;
        background: linear-gradient(90deg, var(--cgb-navy-950), rgba(1, 1, 51, 0));
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .detail-photo .detail-photo__frame {
        height: 100%;
        border: 0 !important;
        border-radius: 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .detail-photo .detail-photo__metadata {
        position: absolute;
        z-index: 3;
        right: 8px;
        bottom: 6px;
        max-width: calc(100% - 18px);
        padding: 3px 6px !important;
        color: var(--cgb-white);
        background: rgba(1, 1, 51, .72);
        border-radius: 5px;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .detail-photo .detail-photo__caption,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .detail-photo .detail-photo__credit {
        color: inherit !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__left > .detail-what-to-know {
        grid-column: 1 !important;
        grid-row: 2 !important;
        padding: 16px 18px 15px 24px !important;
        border-top: 0 !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="true"] > .detail-desktop-opening > .detail-desktop-opening__right > .activity-card {
        grid-column: 2 !important;
        grid-row: 2 !important;
        align-self: center !important;
        min-height: 92px !important;
        padding: 12px 18px 12px 32px !important;
        border-top: 0 !important;
        border-left: 1px solid var(--cgb-neutral-200) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-what-to-know__title,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-editorial h2,
      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .detail-fan-experiences h2 {
        font-size: .78rem !important;
        font-weight: 900 !important;
        letter-spacing: .08em !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"] .activity-card .bear-count__number {
        font-size: clamp(3.25rem, 5vw, 4.6rem) !important;
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
        grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr) !important;
        grid-template-rows: auto auto;
        grid-auto-rows: auto;
        column-gap: 0 !important;
        row-gap: 0 !important;
        align-content: start;
        background: var(--cgb-navy-950) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-hero.detail-hero--no-photo {
        grid-column: 1 !important;
        grid-row: 1 !important;
        align-self: stretch !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        min-height: 190px !important;
        padding: 22px 18px 20px 24px !important;
        color: var(--cgb-white) !important;
        background: var(--cgb-navy-950) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-hero h1 {
        max-width: 11ch;
        margin: 9px 0 0 !important;
        color: var(--cgb-white) !important;
        font-family: var(--font-condensed, var(--font-display)) !important;
        font-size: clamp(2.25rem, 4.15vw, 3.45rem) !important;
        font-weight: 900 !important;
        letter-spacing: -.035em !important;
        line-height: .88 !important;
        text-wrap: balance;
        text-transform: uppercase;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-hero .detail-address__location {
        margin-top: 14px;
        color: rgba(255, 255, 255, .9) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-hero .detail-directions-inline--desktop {
        color: var(--cgb-gold-300) !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .detail-what-to-know {
        grid-column: 1 !important;
        grid-row: 2 !important;
        align-self: start !important;
        margin-top: 0 !important;
        padding: 16px 18px 15px 24px !important;
        background: var(--cgb-white) !important;
        border-top: 0 !important;
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
        margin: 0 !important;
        overflow: hidden !important;
        background: var(--cgb-neutral-100) !important;
        border: 0 !important;
        border-radius: 0 !important;
        clip-path: none !important;
      }

      html body[data-view="map"] #map-view #tray-selected > #venue-detail[data-profile-presentation="desktop"][data-desktop-photo-forward="false"][data-desktop-fallback-map="true"] > .activity-card {
        grid-column: 2 !important;
        grid-row: 2 !important;
        align-self: center !important;
        min-height: 92px !important;
        padding: 12px 18px 12px 32px !important;
        background: var(--cgb-white) !important;
        border-top: 0 !important;
        border-left: 1px solid var(--cgb-neutral-200) !important;
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
  const partySections = [
    ...detail.querySelectorAll(':scope > .party-module, :scope > [data-watch-party-form-section]')
  ];
  const editorial = detail.querySelector(':scope > .detail-editorial') ||
    opening?.querySelector(':scope > .detail-desktop-opening__left > .detail-editorial');
  const community = detail.querySelector(':scope > .detail-fan-experiences');

  let cursor = opening ||
    detail.querySelector(':scope > .detail-local-map') ||
    detail.querySelector(':scope > .activity-card') ||
    detail.querySelector(':scope > .detail-what-to-know') ||
    detail.querySelector(':scope > .detail-hero');

  partySections.forEach((partySection) => { cursor = placeAfter(cursor, partySection); });
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
