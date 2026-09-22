import './my-cgb-promo-shell.mjs';
import './account-favorites-navigation.mjs';
import { markCgbPerformance, measureCgbPerformance } from './performance.mjs';

let loadPromise = null;
let loaded = false;

const ACCOUNT_STYLE_RESOURCES = Object.freeze([
  Object.freeze({
    selector: 'link[data-cgb-accounts-style]',
    href: 'css/accounts.css',
    attribute: 'data-cgb-accounts-style'
  }),
  Object.freeze({
    selector: 'link[data-cgb-my-cgb-native-style]',
    href: 'css/my-cgb-native-surface.css',
    attribute: 'data-cgb-my-cgb-native-style'
  }),
  Object.freeze({
    selector: 'link[data-cgb-public-community-style]',
    href: 'css/account-public-community.css',
    attribute: 'data-cgb-public-community-style'
  })
]);

function ensureStylesheetReady({ selector, href, attribute }) {
  return new Promise((resolve, reject) => {
    let link = document.querySelector(selector);
    let append = false;
    if (link?.sheet) {
      resolve(true);
      return;
    }
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute(attribute, 'true');
      append = true;
    }
    link.addEventListener('load', () => resolve(true), { once: true });
    link.addEventListener('error', () => {
      link.remove();
      reject(new Error('accounts_stylesheet_unavailable'));
    }, { once: true });
    if (append) document.head.append(link);
  });
}

function ensureAccountsStylesReady() {
  return Promise.all(ACCOUNT_STYLE_RESOURCES.map(ensureStylesheetReady));
}

function markLoadTrigger(trigger) {
  if (trigger === 'user-demand') {
    markCgbPerformance('cgb:accounts-composition:load:trigger:user-demand');
  }
}

export function ensureAccountsLoaded(trigger = 'user-demand') {
  if (loadPromise) return loadPromise;

  markLoadTrigger(trigger);
  markCgbPerformance('cgb:accounts-composition:load:start');
  loadPromise = Promise.all([
    ensureAccountsStylesReady(),
    import('./accounts-composition-root.mjs')
  ])
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
