export const GA_MEASUREMENT_ID = 'G-CZV3JSBNJK';

const SCRIPT_ID = 'cgb-google-analytics';
const INITIALIZED_FLAG = '__CGB_GA_INITIALIZED__';

export function initializeGoogleAnalytics({
  windowObject = window,
  documentObject = document,
  measurementId = GA_MEASUREMENT_ID
} = {}) {
  if (!windowObject || !documentObject || !measurementId) return false;
  if (windowObject[INITIALIZED_FLAG]) return true;

  windowObject[INITIALIZED_FLAG] = true;
  windowObject.dataLayer = windowObject.dataLayer || [];
  windowObject.gtag = windowObject.gtag || function gtag() {
    windowObject.dataLayer.push(arguments);
  };

  if (!documentObject.getElementById(SCRIPT_ID)) {
    const script = documentObject.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    documentObject.head.append(script);
  }

  windowObject.gtag('js', new Date());
  windowObject.gtag('config', measurementId);
  return true;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeGoogleAnalytics();
}
