// Browser-visible Accounts & Community configuration.
// Firebase web configuration is public client configuration, not a credential.
// Accounts & Community is enabled in production; the separate Fan API remains
// the authenticated data boundary for account-scoped actions.
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
