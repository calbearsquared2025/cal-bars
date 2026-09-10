// Browser-visible Accounts & Community configuration.
// Firebase web configuration is public client configuration, not a credential.
// The feature remains disabled until the complete Accounts & Community bundle
// is accepted for launch and the separate Fan API endpoint is deployed.
export const CGB_ACCOUNTS_CONFIG = Object.freeze({
  enabled: false,
  endpoint: '',
  firebase: Object.freeze({
    apiKey: 'AIzaSyDmnMf07f1GpbelgKiVnqfOFX_wvHZVBf4',
    authDomain: 'cal-golden-bars.firebaseapp.com',
    projectId: 'cal-golden-bars',
    appId: '1:415910801317:web:1feca3988c51637cd6024c'
  }),
  providers: Object.freeze(['google', 'twitter'])
});
