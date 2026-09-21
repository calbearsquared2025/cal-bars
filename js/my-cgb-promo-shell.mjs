import { cloneAboutContent } from './about-content.mjs';
import { markCgbPerformance } from './performance.mjs';
import {
  setActiveCommand,
  setCommandSurface,
  setPrimarySurfaceVisibility
} from './command-surface.mjs';

const ACCOUNT_COMMAND = 'my-cgb';
const NAV_CLOSE_SELECTOR = '#mobile-map-button, #mobile-search-button, #mobile-add-button, #mobile-list-button, [data-command-close]';
const FULL_SURFACE_RETRY_LIMIT = 100;
const FULL_SURFACE_RETRY_MS = 25;
const ACCOUNT_STATE_RESOLUTION_TIMEOUT_MS = 6000;

let tray = null;
let surface = null;
let navButton = null;
let activationButton = null;
let desktopAddButton = null;
let open = false;
let returnSurface = 'map';
let lastOpener = null;
let selectedVenueAtOpen = '';
let syncFrame = 0;

function injectStyles() {
  if (!document.querySelector('link[data-cgb-my-cgb-native-style]')) {
    const native = document.createElement('link');
    native.rel = 'stylesheet';
    native.href = 'css/my-cgb-native-surface.css';
    native.dataset.cgbMyCgbNativeStyle = 'true';
    document.head.append(native);
  }
  if (!document.querySelector('link[data-cgb-my-cgb-promo-style]')) {
    const promo = document.createElement('link');
    promo.rel = 'stylesheet';
    promo.href = 'css/my-cgb-promo-shell.css';
    promo.dataset.cgbMyCgbPromoStyle = 'true';
    document.head.append(promo);
  }
}

function commandLabel(button) {
  return button?.querySelector('span:last-child') || null;
}

function syncDesktopAddEntry() {
  const heading = document.querySelector('#tray-list .tray-list__heading');
  const source = document.querySelector('#mobile-add-button');
  if (!heading || !source) return;

  desktopAddButton = heading.querySelector('#desktop-add-to-cgb-button');
  if (!desktopAddButton) {
    desktopAddButton = document.createElement('button');
    desktopAddButton.id = 'desktop-add-to-cgb-button';
    desktopAddButton.type = 'button';
    desktopAddButton.className = 'my-cgb-desktop-add';
    desktopAddButton.dataset.commandProxy = 'add';

    const mark = document.createElement('span');
    mark.className = 'my-cgb-desktop-add__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '+';
    const label = document.createElement('span');
    label.className = 'my-cgb-desktop-add__label';
    desktopAddButton.append(mark, label);
    heading.append(desktopAddButton);
  }

  const sourceLabel = commandLabel(source)?.textContent?.trim() || 'Add to CGB';
  desktopAddButton.querySelector('.my-cgb-desktop-add__label').textContent = sourceLabel;
  desktopAddButton.setAttribute('aria-label', source.getAttribute('aria-label') || sourceLabel);
}

function ensurePromoSurface() {
  tray = document.querySelector('#venue-tray');
  navButton = document.querySelector('#mobile-about-button');
  if (!tray || !navButton) return false;

  surface = document.querySelector('#my-cgb-promo-surface');
  if (!surface) {
    surface = document.createElement('section');
    surface.id = 'my-cgb-promo-surface';
    surface.className = 'my-cgb-promo-surface';
    surface.hidden = true;
    surface.setAttribute('aria-labelledby', 'my-cgb-promo-title');
    surface.innerHTML = `
      <div class="my-cgb-promo-shell">
        <header class="my-cgb-promo-header">
          <span class="eyebrow">Cal Golden Bars</span>
          <h2 id="my-cgb-promo-title">My CGB</h2>
        </header>
        <div class="my-cgb-promo-intro">
          <strong>Make Cal Golden Bars yours.</strong>
          <p>Create a profile to save favorite places, keep your attendance history, and build your CGB progress. Browsing still works without an account.</p>
        </div>
        <div class="my-cgb-promo-benefits" aria-label="My CGB features">
          <span>Save favorite Cal bars</span>
          <span>Track the games you watch</span>
          <span>Build your season and join the community</span>
        </div>
        <button class="primary-button my-cgb-promo-activate" type="button" data-my-cgb-activate>Open My CGB</button>
        <p class="my-cgb-promo-fine-print">No account is required to browse CGB.</p>
      </div>`;
    const aboutContent = cloneAboutContent();
    if (aboutContent) {
      const aboutSection = document.createElement('section');
      aboutSection.className = 'my-cgb-promo-about';
      aboutSection.setAttribute('aria-labelledby', 'my-cgb-promo-about-title');
      aboutSection.innerHTML = `
        <div class="my-cgb-promo-about__heading">
          <span class="eyebrow">About</span>
          <h3 id="my-cgb-promo-about-title">Cal Golden Bars</h3>
        </div>`;
      aboutSection.append(aboutContent);
      surface.querySelector('.my-cgb-promo-shell')?.append(aboutSection);
    }
    tray.append(surface);
  }

  activationButton = surface.querySelector('[data-my-cgb-activate]');
  document.body.dataset.cgbAccountsEnabled = 'true';
  syncDesktopAddEntry();
  return true;
}

function currentSelectedVenueId() {
  return String(window.CGBApp?.getState?.()?.selectedVenueId || '');
}

function setPromoCommandState(active) {
  setActiveCommand(document, active ? ACCOUNT_COMMAND : null);
}

function restorePreviousSurface() {
  const next = returnSurface || 'map';
  setCommandSurface(document, next);
  setPrimarySurfaceVisibility(document, next);
  setActiveCommand(document, next);
}

function showPromoSurface(opener = null) {
  if (!ensurePromoSurface()) return false;
  if (!open) {
    returnSurface = document.body.dataset.commandSurface || 'map';
    selectedVenueAtOpen = currentSelectedVenueId();
  }
  open = true;
  lastOpener = opener || lastOpener || navButton;
  surface.hidden = false;
  tray.dataset.myCgbPromoOpen = 'true';
  setCommandSurface(document, ACCOUNT_COMMAND);
  setPrimarySurfaceVisibility(document, ACCOUNT_COMMAND);
  setPromoCommandState(true);
  markCgbPerformance('cgb:my-cgb:promo:visible');
  const title = surface.querySelector('#my-cgb-promo-title');
  if (title) {
    title.tabIndex = -1;
    window.requestAnimationFrame(() => title.focus({ preventScroll: true }));
  }
  return true;
}

function closePromoSurface({ restoreSurface = true, restoreFocus = false } = {}) {
  if (!open) return;
  open = false;
  selectedVenueAtOpen = '';
  if (surface) surface.hidden = true;
  tray?.removeAttribute('data-my-cgb-promo-open');
  if (restoreSurface) restorePreviousSurface();
  if (restoreFocus && lastOpener?.isConnected) {
    window.requestAnimationFrame(() => lastOpener.focus({ preventScroll: true }));
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function firebaseInitializationStarted() {
  return Boolean(window.CGBPerformance?.getEntries?.().some((entry) => entry.name === 'cgb:firebase:init:start'));
}

function waitForResolvedAccountState(timeoutMs = ACCOUNT_STATE_RESOLUTION_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    let timeout = 0;
    const finish = (signedIn) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.removeEventListener('cgb:account-state', handleAccountState);
      resolve(Boolean(signedIn));
    };
    const handleAccountState = (event) => {
      if (!firebaseInitializationStarted()) return;
      finish(event?.detail?.signedIn === true);
    };
    window.addEventListener('cgb:account-state', handleAccountState);
    timeout = window.setTimeout(() => finish(window.CGBAccounts?.isSignedIn?.() === true), timeoutMs);
  });
}

async function openLoadedMyCgb() {
  const priorSurface = returnSurface || document.body.dataset.commandSurface || 'map';
  setCommandSurface(document, priorSurface);
  setPrimarySurfaceVisibility(document, priorSurface);

  for (let attempt = 0; attempt < FULL_SURFACE_RETRY_LIMIT; attempt += 1) {
    const owner = window.CGBMyCgbSurface;
    if (owner?.open) {
      const opened = await owner.open();
      if (opened !== false) return true;
    }
    await wait(FULL_SURFACE_RETRY_MS);
  }
  return false;
}

async function activateFullMyCgb({ signIn = false, opener = null } = {}) {
  if (!open) showPromoSurface(opener);
  const button = activationButton;
  button?.setAttribute('aria-busy', 'true');
  if (button) button.disabled = true;
  try {
    const loader = window.CGBAccountsLoader;
    if (!loader?.load) throw new Error('accounts_loader_unavailable');
    const accountStatePromise = signIn ? waitForResolvedAccountState() : null;
    await loader.load('user-demand');
    const opened = await openLoadedMyCgb();
    if (!opened) throw new Error('accounts_surface_unavailable');
    closePromoSurface({ restoreSurface: false });
    if (signIn) {
      const signedIn = await accountStatePromise;
      if (!signedIn) document.querySelector('.my-cgb-sign-in')?.click();
    }
    return true;
  } catch (error) {
    console.error('CGB My CGB activation failed.', error);
    if (open) {
      setCommandSurface(document, ACCOUNT_COMMAND);
      setPrimarySurfaceVisibility(document, ACCOUNT_COMMAND);
      setPromoCommandState(true);
    }
    window.CGBApp?.showStatus?.('My CGB could not open. Try again.');
    return false;
  } finally {
    button?.removeAttribute('aria-busy');
    if (button) button.disabled = false;
  }
}

function handleCapture(event) {
  const accountTrigger = event.target.closest?.('#mobile-about-button');
  if (accountTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.CGBAccountsLoader?.isLoaded?.()) {
      returnSurface = document.body.dataset.commandSurface || 'map';
      void openLoadedMyCgb();
    } else {
      showPromoSurface(accountTrigger);
    }
    return;
  }

  const desktopAdd = event.target.closest?.('#desktop-add-to-cgb-button');
  if (desktopAdd) {
    event.preventDefault();
    document.querySelector('#mobile-add-button')?.click();
    return;
  }

  const activate = event.target.closest?.('[data-my-cgb-activate]');
  if (activate) {
    event.preventDefault();
    void activateFullMyCgb({ opener: activate });
    return;
  }

  const favorite = event.target.closest?.('.account-venue-favorite');
  if (favorite && !window.CGBAccountsLoader?.isLoaded?.()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void activateFullMyCgb({ signIn: true, opener: favorite });
    return;
  }

  if (open && event.target.closest?.(NAV_CLOSE_SELECTOR)) {
    closePromoSurface({ restoreSurface: false });
  }
}

function handleKeydown(event) {
  if (event.key !== 'Escape' || !open) return;
  event.preventDefault();
  closePromoSurface({ restoreFocus: true });
}

function scheduleSync() {
  window.cancelAnimationFrame(syncFrame);
  syncFrame = window.requestAnimationFrame(() => {
    syncDesktopAddEntry();
    if (!open) return;
    tray?.setAttribute('data-my-cgb-promo-open', 'true');
    setCommandSurface(document, ACCOUNT_COMMAND);
    setPromoCommandState(true);
  });
}

function handleAppRendered(detail = {}) {
  const renderedVenueId = String(detail.selectedVenueId || '');
  if (open && renderedVenueId && renderedVenueId !== selectedVenueAtOpen) {
    returnSurface = 'map';
    closePromoSurface({ restoreSurface: true });
    return;
  }
  scheduleSync();
}

function connectApp() {
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connectApp, 25);
    return;
  }
  app.subscribe('rendered', handleAppRendered);
  app.subscribe('ready', scheduleSync);
}

export function initializeMyCgbPromoShell() {
  injectStyles();
  if (!ensurePromoSurface()) {
    window.setTimeout(initializeMyCgbPromoShell, 25);
    return false;
  }
  document.addEventListener('click', handleCapture, { capture: true });
  document.addEventListener('keydown', handleKeydown);
  connectApp();
  scheduleSync();
  return true;
}

window.CGBMyCgbPromo = Object.freeze({
  open: () => showPromoSurface(),
  activate: (options) => activateFullMyCgb(options),
  close: () => closePromoSurface({ restoreFocus: true }),
  isOpen: () => open
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMyCgbPromoShell, { once: true });
} else {
  initializeMyCgbPromoShell();
}
