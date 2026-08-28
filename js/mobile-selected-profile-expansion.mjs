const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-mobile-selected-profile-expansion';
const EXPAND_SWIPE_THRESHOLD_PX = 42;
const DRAG_ACTIVATION_PX = 6;
const MAP_REVEAL_PX = 72;

let appConnected = false;
let activeVenueId = '';
let expandedVenueId = '';
let baseHeightPx = 0;
let gesture = null;
let syncFrame = 0;

function clean(value) {
  return String(value ?? '').trim();
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function expandedSelectedTrayHeight({
  trayBottom = 0,
  mapContextBottom = 0,
  baseHeight = 0,
  mapRevealHeight = MAP_REVEAL_PX
} = {}) {
  const bottom = finite(trayBottom);
  const contextBottom = Math.max(0, finite(mapContextBottom));
  const base = Math.max(0, finite(baseHeight));
  const reveal = Math.max(0, finite(mapRevealHeight, MAP_REVEAL_PX));
  if (bottom <= 0) return base;
  return Math.max(base, bottom - contextBottom - reveal);
}

export function draggedSelectedTrayHeight({
  startHeight = 0,
  deltaY = 0,
  minHeight = 0,
  maxHeight = 0
} = {}) {
  const min = Math.max(0, finite(minHeight));
  const max = Math.max(min, finite(maxHeight, min));
  const start = Math.min(max, Math.max(min, finite(startHeight, min)));
  const desired = start - finite(deltaY);
  return Math.min(max, Math.max(min, desired));
}

function isMobile(windowObject = window) {
  return windowObject.matchMedia?.(MOBILE_QUERY)?.matches === true;
}

function appState(windowObject = window) {
  return windowObject.CGBApp?.getState?.() || null;
}

function selectedProfileContext(documentObject = document, windowObject = window) {
  const state = appState(windowObject);
  const tray = documentObject.querySelector('#venue-tray');
  const eligible = Boolean(
    isMobile(windowObject) &&
    documentObject.body?.dataset.view === 'map' &&
    documentObject.body?.dataset.commandSurface === 'map' &&
    clean(state?.selectedVenueId) &&
    tray?.dataset.state === 'selected'
  );
  return { eligible, state, tray, venueId: clean(state?.selectedVenueId) };
}

function installStyles(documentObject = document) {
  if (documentObject.getElementById(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected {
        transition: max-height var(--motion-standard, 220ms) ease !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected.cgb-profile-dragging {
        transition: none !important;
      }

      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-handle {
        cursor: ns-resize;
        touch-action: none;
      }
    }
  `;
  documentObject.head.append(style);
}

function inlineSelectedHeight(tray) {
  const raw = tray?.style?.getPropertyValue?.('--cgb-selected-tray-max-height') || '';
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function mapContextBottom(documentObject = document) {
  const candidates = [
    documentObject.querySelector('.site-header'),
    documentObject.querySelector('.opening-stat')
  ];
  return candidates.reduce((bottom, element) => {
    if (!element) return bottom;
    const rect = element.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.bottom)) return bottom;
    return Math.max(bottom, rect.bottom);
  }, 0);
}

function expandedTargetHeight(tray, documentObject = document) {
  const rect = tray?.getBoundingClientRect?.();
  const base = baseHeightPx || inlineSelectedHeight(tray) || finite(rect?.height);
  return expandedSelectedTrayHeight({
    trayBottom: rect?.bottom,
    mapContextBottom: mapContextBottom(documentObject),
    baseHeight: base
  });
}

function applyHeight(tray, height) {
  const value = finite(height);
  if (!tray || value <= 0) return false;
  tray.style.setProperty('--cgb-selected-tray-max-height', `${Math.round(value)}px`);
  return true;
}

function setHandleLabel(documentObject, expanded) {
  const handle = documentObject.querySelector('#tray-handle');
  if (!handle) return;
  if (expanded) {
    handle.setAttribute('aria-label', 'Return to map-first profile');
    return;
  }
  handle.setAttribute('aria-label', 'Collapse selected location');
}

function resetPresentation({ preserveBase = false } = {}) {
  activeVenueId = preserveBase ? activeVenueId : '';
  expandedVenueId = '';
  if (!preserveBase) baseHeightPx = 0;
  gesture = null;
}

function scheduleMapLayout(windowObject = window) {
  windowObject.requestAnimationFrame?.(() => {
    const state = appState(windowObject);
    state?.map?.resize?.();
  });
}

function syncExpandedPresentation(documentObject = document, windowObject = window) {
  const { eligible, tray, venueId } = selectedProfileContext(documentObject, windowObject);
  if (!eligible || !tray) {
    resetPresentation();
    return false;
  }

  if (activeVenueId !== venueId) {
    activeVenueId = venueId;
    expandedVenueId = '';
    baseHeightPx = inlineSelectedHeight(tray) || finite(tray.getBoundingClientRect?.().height);
    setHandleLabel(documentObject, false);
    return false;
  }

  const currentInlineHeight = inlineSelectedHeight(tray);
  if (expandedVenueId === venueId) {
    if (currentInlineHeight > 0 && (!baseHeightPx || currentInlineHeight < baseHeightPx * 1.35)) {
      baseHeightPx = currentInlineHeight;
    }
    const target = expandedTargetHeight(tray, documentObject);
    applyHeight(tray, target);
    setHandleLabel(documentObject, true);
    scheduleMapLayout(windowObject);
    return target > baseHeightPx;
  }

  if (currentInlineHeight > 0) baseHeightPx = currentInlineHeight;
  setHandleLabel(documentObject, false);
  return false;
}

function scheduleSync(documentObject = document, windowObject = window) {
  if (syncFrame) windowObject.cancelAnimationFrame?.(syncFrame);
  syncFrame = windowObject.requestAnimationFrame?.(() => {
    syncFrame = 0;
    syncExpandedPresentation(documentObject, windowObject);
  }) || 0;
}

function beginGesture(event, documentObject = document, windowObject = window) {
  const handle = event.target?.closest?.('#tray-handle');
  const { eligible, tray, venueId } = selectedProfileContext(documentObject, windowObject);
  if (!handle || !eligible || !tray || !venueId) {
    gesture = null;
    return;
  }

  if (activeVenueId !== venueId) {
    activeVenueId = venueId;
    expandedVenueId = '';
    baseHeightPx = 0;
  }

  const rect = tray.getBoundingClientRect();
  if (!baseHeightPx) baseHeightPx = inlineSelectedHeight(tray) || finite(rect.height);
  const targetHeight = expandedTargetHeight(tray, documentObject);
  gesture = {
    pointerId: event.pointerId,
    venueId,
    startY: finite(event.clientY),
    startHeight: finite(rect.height, baseHeightPx),
    minHeight: baseHeightPx,
    maxHeight: Math.max(baseHeightPx, targetHeight),
    wasExpanded: expandedVenueId === venueId,
    moved: false
  };
  tray.classList.add('cgb-profile-dragging');
}

function moveGesture(event, documentObject = document) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const tray = documentObject.querySelector('#venue-tray');
  if (!tray) return;
  const deltaY = finite(event.clientY) - gesture.startY;
  if (Math.abs(deltaY) < DRAG_ACTIVATION_PX) return;

  if (!gesture.wasExpanded && deltaY > 0) return;
  gesture.moved = true;
  applyHeight(tray, draggedSelectedTrayHeight({
    startHeight: gesture.startHeight,
    deltaY,
    minHeight: gesture.minHeight,
    maxHeight: gesture.maxHeight
  }));
  event.preventDefault?.();
}

function finishGesture(event, documentObject = document, windowObject = window) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const current = gesture;
  gesture = null;
  const tray = documentObject.querySelector('#venue-tray');
  tray?.classList.remove('cgb-profile-dragging');
  if (!tray) return;

  const deltaY = finite(event.clientY) - current.startY;
  const expand = deltaY <= -EXPAND_SWIPE_THRESHOLD_PX && current.maxHeight > current.minHeight + 8;
  const contract = current.wasExpanded && deltaY >= EXPAND_SWIPE_THRESHOLD_PX;

  if (expand) {
    expandedVenueId = current.venueId;
    baseHeightPx = current.minHeight;
    applyHeight(tray, current.maxHeight);
    setHandleLabel(documentObject, true);
    scheduleMapLayout(windowObject);
    event.preventDefault?.();
    return;
  }

  if (contract) {
    expandedVenueId = '';
    baseHeightPx = current.minHeight;
    applyHeight(tray, current.minHeight);
    setHandleLabel(documentObject, false);
    scheduleMapLayout(windowObject);
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    return;
  }

  applyHeight(tray, current.wasExpanded ? current.maxHeight : current.minHeight);
  if (current.moved) event.preventDefault?.();
}

function cancelGesture(_event, documentObject = document, windowObject = window) {
  if (!gesture) return;
  const current = gesture;
  gesture = null;
  const tray = documentObject.querySelector('#venue-tray');
  tray?.classList.remove('cgb-profile-dragging');
  if (!tray) return;
  applyHeight(tray, current.wasExpanded ? current.maxHeight : current.minHeight);
  scheduleMapLayout(windowObject);
}

function connect() {
  if (appConnected || typeof window === 'undefined' || typeof document === 'undefined') return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connect, 25);
    return;
  }

  appConnected = true;
  installStyles(document);
  document.addEventListener('pointerdown', (event) => beginGesture(event, document, window), { capture: true });
  document.addEventListener('pointermove', (event) => moveGesture(event, document), { capture: true, passive: false });
  document.addEventListener('pointerup', (event) => finishGesture(event, document, window), { capture: true });
  document.addEventListener('pointercancel', (event) => cancelGesture(event, document, window), { capture: true });
  window.addEventListener('resize', () => scheduleSync(document, window));
  window.visualViewport?.addEventListener?.('resize', () => scheduleSync(document, window));
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', () => scheduleSync(document, window));
  app.subscribe('rendered', () => scheduleSync(document, window));
  app.subscribe('ready', () => scheduleSync(document, window));
  scheduleSync(document, window);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.setTimeout(connect, 0);
}
