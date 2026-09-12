// Browser-visible Accounts & Community configuration.
// Firebase web configuration is public client configuration, not a credential.
// Accounts & Community is enabled in production; the separate Fan API remains
// the authenticated data boundary for account-scoped actions.

function installIosGoogleSignInHotfix() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return;
  const userAgent = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const isIos = /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
  if (!isIos || document.querySelector('style[data-cgb-ios-google-signin-hotfix]')) return;

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
