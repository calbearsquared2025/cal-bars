// Browser-visible Accounts & Community configuration.
// Firebase web configuration is public client configuration, not a credential.
// Accounts & Community is enabled in production; the separate Fan API remains
// the authenticated data boundary for account-scoped actions.

function isIosBrowser() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

// accounts-ui historically routes iOS to Firebase redirect based on navigator.
// Safari's redirect flow failed to restore Firebase persistence in production,
// while the controlled real-iPhone popup test completed successfully. Keep the
// override narrowly scoped to iOS so accounts-ui takes its existing popup path.
function installIosGooglePopupRouting() {
  if (!isIosBrowser()) return;
  const overrides = {
    userAgent: 'CGB iOS Google popup',
    platform: 'CGBGooglePopup',
    maxTouchPoints: 0
  };
  Object.entries(overrides).forEach(([property, value]) => {
    try {
      Object.defineProperty(navigator, property, { configurable: true, value });
    } catch {
      // If Safari prevents the override, accounts-ui will surface the normal auth error.
    }
  });
}

installIosGooglePopupRouting();

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
