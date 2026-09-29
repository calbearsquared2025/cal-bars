import { ACTIVE_INSTANCE_CONFIG } from '../js/instance-config.mjs';

// Browser-visible Firebase and admin endpoint configuration.
// These values are identifiers, not credentials. Fill them only from the CGB
// Firebase web-app configuration and the deployed admin Apps Script web app.
export const ADMIN_AUTH_CONFIG = Object.freeze({
  enabled: ACTIVE_INSTANCE_CONFIG.integrations.admin.enabled,
  endpoint: ACTIVE_INSTANCE_CONFIG.integrations.admin.endpoint,
  firebase: Object.freeze({
    apiKey: 'AIzaSyDmnMf07f1GpbelgKiVnqfOFX_wvHZVBf4',
    authDomain: 'auth.calgoldenbars.com',
    projectId: 'cal-golden-bars',
    appId: '1:415910801317:web:1feca3988c51637cd6024c'
  })
});
