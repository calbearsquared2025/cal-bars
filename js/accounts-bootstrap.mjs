import './my-cgb-promo-shell.mjs';
import './account-favorites-navigation.mjs';
import { markCgbPerformance, measureCgbPerformance } from './performance.mjs';

let loadPromise = null;
let loaded = false;

function markLoadTrigger(trigger) {
  if (trigger === 'user-demand') {
    markCgbPerformance('cgb:accounts-composition:load:trigger:user-demand');
  }
}

export function ensureAccountsLoaded(trigger = 'user-demand') {
  if (loadPromise) return loadPromise;

  markLoadTrigger(trigger);
  markCgbPerformance('cgb:accounts-composition:load:start');
  loadPromise = import('./accounts-composition-root.mjs')
    .then(() => {
      loaded = true;
      markCgbPerformance('cgb:accounts-composition:load:ready');
      measureCgbPerformance(
        'cgb:accounts-composition:load',
        'cgb:accounts-composition:load:start',
        'cgb:accounts-composition:load:ready'
      );
      return true;
    })
    .catch((error) => {
      loadPromise = null;
      markCgbPerformance('cgb:accounts-composition:load:error');
      throw error;
    });

  return loadPromise;
}

export function accountsLoaded() {
  return loaded;
}

window.CGBAccountsLoader = Object.freeze({
  load: ensureAccountsLoaded,
  isLoaded: accountsLoaded
});

function activateMobileSmokeHarnessAccounts() {
  let smokeMode = '';
  try {
    smokeMode = new URLSearchParams(window.location.search).get('__cgb_smoke') || '';
  } catch (_) {}
  if (smokeMode !== 'mobile') return;
  if (window.CGBPublicLaunchUsable !== true) {
    window.setTimeout(activateMobileSmokeHarnessAccounts, 25);
    return;
  }
  void ensureAccountsLoaded('smoke-harness').catch((error) => {
    console.error('CGB smoke-harness Accounts activation failed.', error);
  });
}

activateMobileSmokeHarnessAccounts();
