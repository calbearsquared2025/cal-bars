import './account-attendance.mjs';
import { markCgbPerformance, measureCgbPerformance } from './performance.mjs';

let loadPromise = null;
let loaded = false;

function markLoadTrigger(trigger) {
  if (trigger === 'public-ready') {
    markCgbPerformance('cgb:accounts-composition:load:trigger:public-ready');
  } else if (trigger === 'user-demand') {
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

function reportAccountsLoadFailure(error) {
  console.error('CGB Accounts modules could not load.', error);
}

function schedulePostPublicReadyLoad() {
  const start = () => {
    void ensureAccountsLoaded('public-ready').catch(reportAccountsLoadFailure);
  };
  if (window.CGBPublicLaunchUsable === true) {
    queueMicrotask(start);
    return;
  }
  window.addEventListener('cgb:public-usable', start, { once: true });
}

function handleEarlyAccountDemand(event) {
  const trigger = event.target.closest?.('#mobile-about-button');
  if (!trigger || loaded) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  trigger.setAttribute('aria-busy', 'true');
  void ensureAccountsLoaded('user-demand')
    .then(() => window.CGBMyCgbSurface?.open?.())
    .catch(reportAccountsLoadFailure)
    .finally(() => trigger.removeAttribute('aria-busy'));
}

document.addEventListener('click', handleEarlyAccountDemand, { capture: true });
schedulePostPublicReadyLoad();

window.CGBAccountsLoader = Object.freeze({
  load: ensureAccountsLoaded,
  isLoaded: accountsLoaded
});
