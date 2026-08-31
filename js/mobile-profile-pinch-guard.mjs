const STYLE_ID = 'cgb-mobile-profile-pinch-guard';
const PROFILE_SELECTOR = '#venue-tray.tray--selected .tray-selected';

export function isSelectedProfileGestureTarget(target) {
  const element = target?.closest ? target : target?.parentElement;
  return Boolean(element?.closest?.(PROFILE_SELECTOR));
}

export function preventSelectedProfileMagnification(event) {
  if (!isSelectedProfileGestureTarget(event?.target)) return false;
  event.preventDefault?.();
  return true;
}

function installStyles(documentObject = document) {
  if (documentObject.getElementById(STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      body[data-view="map"][data-command-surface="map"] #map-view > #venue-tray.venue-tray.tray--selected .tray-selected {
        touch-action: pan-y !important;
      }
    }
  `;
  documentObject.head.append(style);
}

function connect() {
  if (typeof document === 'undefined') return;
  installStyles(document);
  // Modern iOS honors touch-action. Safari's gesture events are retained as a
  // narrowly scoped fallback so page magnification is blocked only inside the
  // selected profile; MapLibre pinch zoom and browser zoom elsewhere remain intact.
  document.addEventListener('gesturestart', preventSelectedProfileMagnification, {
    capture: true,
    passive: false
  });
  document.addEventListener('gesturechange', preventSelectedProfileMagnification, {
    capture: true,
    passive: false
  });
}

if (typeof document !== 'undefined') {
  connect();
}
