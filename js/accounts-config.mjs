// Browser-visible Accounts & Community configuration.
// Firebase web configuration is public client configuration, not a credential.
// Accounts & Community is enabled in production; the separate Fan API remains
// the authenticated data boundary for account-scoped actions.

const IOS_AUTH_DIAGNOSTIC_KEY = 'cgb:ios-google-auth-diagnostic';
const IOS_AUTH_DIAGNOSTIC_TTL_MS = 30 * 60 * 1000;

function isIosBrowser() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

function storedIosAuthDiagnostic() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(IOS_AUTH_DIAGNOSTIC_KEY) || 'null');
    if (!stored?.startedAt || Date.now() - Number(stored.startedAt) > IOS_AUTH_DIAGNOSTIC_TTL_MS) {
      window.localStorage.removeItem(IOS_AUTH_DIAGNOSTIC_KEY);
      return null;
    }
    return stored;
  } catch {
    window.localStorage.removeItem(IOS_AUTH_DIAGNOSTIC_KEY);
    return null;
  }
}

function requestedIosAuthDiagnosticMode() {
  if (typeof window === 'undefined') return '';
  const requested = new URLSearchParams(window.location.search).get('cgbAuthTest');
  if (requested === 'popup') return 'popup';
  if (requested === '1') return 'redirect';
  return '';
}

function readIosAuthDiagnostic() {
  if (typeof window === 'undefined') return null;
  const requestedMode = requestedIosAuthDiagnosticMode();
  const stored = storedIosAuthDiagnostic();
  if (requestedMode) {
    if (stored?.mode === requestedMode) return stored;
    const state = { startedAt: Date.now(), phase: 'ready', mode: requestedMode };
    window.localStorage.setItem(IOS_AUTH_DIAGNOSTIC_KEY, JSON.stringify(state));
    return state;
  }
  return stored;
}

function writeIosAuthDiagnosticPhase(phase) {
  const current = readIosAuthDiagnostic();
  if (!current) return;
  window.localStorage.setItem(IOS_AUTH_DIAGNOSTIC_KEY, JSON.stringify({ ...current, phase }));
}

function diagnosticBanner() {
  let banner = document.querySelector('[data-cgb-ios-auth-diagnostic]');
  if (banner) return banner;
  banner = document.createElement('div');
  banner.dataset.cgbIosAuthDiagnostic = 'true';
  Object.assign(banner.style, {
    position: 'fixed',
    left: '12px',
    right: '12px',
    top: 'max(12px, env(safe-area-inset-top))',
    zIndex: '2147483647',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#fff',
    color: '#111',
    border: '2px solid #111',
    font: '600 14px/1.3 system-ui, sans-serif',
    boxShadow: '0 3px 12px rgba(0,0,0,.2)'
  });
  document.body.append(banner);
  return banner;
}

function showDiagnostic(message) {
  if (!document.body) return;
  diagnosticBanner().textContent = `AUTH TEST — ${message}`;
}

function hasPersistedFirebaseUser(apiKey) {
  try {
    const prefix = `firebase:authUser:${apiKey}:`;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (String(key || '').startsWith(prefix) && window.localStorage.getItem(key)) return true;
    }
  } catch {
    return null;
  }
  return false;
}

function forcePopupDiagnosticRouting() {
  const overrides = {
    userAgent: 'CGB iOS popup diagnostic',
    platform: 'CGBDiagnostic',
    maxTouchPoints: 0
  };
  Object.entries(overrides).forEach(([property, value]) => {
    try {
      Object.defineProperty(navigator, property, { configurable: true, value });
    } catch {
      // The diagnostic remains safe if Safari declines an override; the banner will expose the failed test path.
    }
  });
}

function installIosGoogleSignInHotfix() {
  if (typeof document === 'undefined' || !isIosBrowser()) return;
  const diagnostic = readIosAuthDiagnostic();
  if (diagnostic) {
    if (diagnostic.mode === 'popup') forcePopupDiagnosticRouting();

    document.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-account-provider="google"]');
      if (!button) return;
      if (diagnostic.mode === 'popup') {
        writeIosAuthDiagnosticPhase('popup-started');
        showDiagnostic('popup started; complete Google sign-in');
      } else {
        writeIosAuthDiagnosticPhase('redirect-started');
        showDiagnostic('redirect started; continue with Google');
      }
    }, true);

    window.addEventListener('cgb:account-state', (event) => {
      if (event?.detail?.signedIn === true) {
        writeIosAuthDiagnosticPhase('account-ready');
        showDiagnostic('CGB account ready');
      }
    });

    const inspect = () => {
      const latest = readIosAuthDiagnostic();
      if (!latest) return;
      if (window.CGBAccounts?.isSignedIn?.()) {
        writeIosAuthDiagnosticPhase('account-ready');
        showDiagnostic('CGB account ready');
        return;
      }
      if (latest.mode === 'popup') {
        if (latest.phase !== 'popup-started') {
          showDiagnostic('popup test ready — open My CGB and continue with Google');
        }
        return;
      }
      if (latest.phase !== 'redirect-started') {
        showDiagnostic('ready — open My CGB and continue with Google');
        return;
      }
      const persisted = hasPersistedFirebaseUser(CGB_ACCOUNTS_CONFIG.firebase.apiKey);
      if (persisted === true) {
        showDiagnostic('Firebase user restored; CGB account not ready');
      } else if (persisted === false) {
        showDiagnostic('Firebase user was not restored after redirect');
      } else {
        showDiagnostic('could not inspect Firebase persistence');
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        showDiagnostic(diagnostic.mode === 'popup'
          ? 'popup test ready — open My CGB and continue with Google'
          : 'ready — open My CGB and continue with Google');
        window.setTimeout(inspect, 3000);
      }, { once: true });
    } else {
      showDiagnostic(diagnostic.mode === 'popup'
        ? 'popup test ready — open My CGB and continue with Google'
        : 'ready — open My CGB and continue with Google');
      window.setTimeout(inspect, 3000);
    }
    return;
  }

  if (document.querySelector('style[data-cgb-ios-google-signin-hotfix]')) return;
  const style = document.createElement('style');
  style.dataset.cgbIosGoogleSigninHotfix = 'true';
  style.textContent = '[data-account-provider="google"] { display: none !important; }';
  document.head.append(style);
}

installIosGoogleSignInHotfix();

export const CGB_ACCOUNTS_CONFIG = Object.freeze({
  enabled: true,
  endpoint: 'https://script.google.com/macros/s/AKfycbyIkoxZAXNp36dEXOw5hKltLA8kgK3_07zg899QdEHJ5HSllkQDE_pY2vqOkMIA2nVL/exec',
  firebase: Object.freeze({
    apiKey: 'AIzaSyDmnMf07f1GpbelgKiVnqfOFX_wvHZVBf4',
    authDomain: 'auth.calgoldenbars.com',
    projectId: 'cal-golden-bars',
    appId: '1:415910801317:web:1feca3988c51637cd6024c'
  }),
  providers: Object.freeze(['google', 'email'])
});
