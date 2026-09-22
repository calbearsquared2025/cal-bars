import { cloneAboutContent } from './about-content.mjs';
import { markCgbPerformance } from './performance.mjs';
import {
  setActiveCommand,
  setCommandSurface,
  setPrimarySurfaceVisibility
} from './command-surface.mjs';

const ACCOUNT_COMMAND = 'my-cgb';
const PROMO_VIEWS = Object.freeze(['profile', 'leaderboard', 'about']);
const NAV_CLOSE_SELECTOR = '#mobile-map-button, #mobile-search-button, #mobile-add-button, #mobile-list-button, [data-command-close]';
const FULL_SURFACE_RETRY_LIMIT = 100;
const FULL_SURFACE_RETRY_MS = 25;
const ACCOUNT_STATE_RESOLUTION_TIMEOUT_MS = 6000;

let tray = null;
let surface = null;
let navButton = null;
let desktopAddButton = null;
let currentView = 'profile';
let activationPromise = null;
let signInRequested = false;
let signInResolutionPromise = null;
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

function syncPromoView({ focus = false } = {}) {
  if (!surface) return;
  const shell = surface.querySelector('.my-cgb-promo-shell');
  if (!shell) return;
  shell.dataset.myCgbView = currentView;
  shell.querySelectorAll('[data-my-cgb-promo-view]').forEach((view) => {
    view.hidden = view.dataset.myCgbPromoView !== currentView;
  });
  shell.querySelectorAll('[data-my-cgb-promo-view-target]').forEach((button) => {
    const active = button.dataset.myCgbPromoViewTarget === currentView;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  if (focus) {
    shell.querySelector(`[data-my-cgb-promo-view-target="${currentView}"]`)?.focus({ preventScroll: true });
  }
}

function setPromoView(next, { focus = false } = {}) {
  if (!PROMO_VIEWS.includes(next)) return false;
  currentView = next;
  syncPromoView({ focus });
  return true;
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
      <div class="my-cgb-promo-shell" data-my-cgb-view="profile">
        <header class="my-cgb-promo-header">
          <div>
            <span class="eyebrow">HOME</span>
            <h2 id="my-cgb-promo-title">My CGB</h2>
          </div>
        </header>
        <div class="my-cgb-view-tabs my-cgb-promo-tabs" role="tablist" aria-label="My CGB views">
          <button id="my-cgb-promo-profile-tab" type="button" role="tab" data-my-cgb-promo-view-target="profile" aria-controls="my-cgb-promo-profile-view">Profile</button>
          <button id="my-cgb-promo-leaderboard-tab" type="button" role="tab" data-my-cgb-promo-view-target="leaderboard" aria-controls="my-cgb-promo-leaderboard-view">Leaderboard</button>
          <button id="my-cgb-promo-about-tab" type="button" role="tab" data-my-cgb-promo-view-target="about" aria-controls="my-cgb-promo-about-view">About</button>
        </div>
        <div id="my-cgb-promo-profile-view" class="my-cgb-promo-view my-cgb-promo-profile-view" role="tabpanel" aria-labelledby="my-cgb-promo-profile-tab" data-my-cgb-promo-view="profile">
          <div class="my-cgb-promo-intro">
            <strong>Make Cal Golden Bars yours.</strong>
            <p>Create a profile to save favorite places, keep your attendance history, and build your CGB progress. Browsing still works without an account.</p>
          </div>
          <button class="primary-button my-cgb-promo-sign-in" type="button" data-my-cgb-sign-in>Sign in to My CGB</button>
          <p class="my-cgb-promo-fine-print">No-email profiles stay on this browser and cannot be recovered on another device. Your sign-in identifiers stay private. Public profile and attendance visibility are separate choices.</p>
        </div>
        <section id="my-cgb-promo-leaderboard-view" class="my-cgb-promo-view public-community-section public-community-panel" role="tabpanel" aria-labelledby="my-cgb-promo-leaderboard-tab" data-my-cgb-promo-view="leaderboard" hidden>
          <div class="accounts-section__heading public-community-heading">
            <div>
              <span class="eyebrow">CGB community</span>
              <h3>Season leaderboard</h3>
            </div>
          </div>
          <p class="public-community-intro">Loading the CGB community…</p>
        </section>
        <section id="my-cgb-promo-about-view" class="my-cgb-promo-view my-cgb-about-view" role="tabpanel" aria-labelledby="my-cgb-promo-about-tab" data-my-cgb-promo-view="about" hidden></section>
      </div>`;
    const aboutContent = cloneAboutContent();
    if (aboutContent) surface.querySelector('#my-cgb-promo-about-view')?.append(aboutContent);
    const tabs = surface.querySelector('.my-cgb-promo-tabs');
    tabs?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-my-cgb-promo-view-target]');
      if (button) setPromoView(button.dataset.myCgbPromoViewTarget);
    });
    tabs?.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const currentIndex = Math.max(0, PROMO_VIEWS.indexOf(currentView));
      const nextIndex = (currentIndex + direction + PROMO_VIEWS.length) % PROMO_VIEWS.length;
      setPromoView(PROMO_VIEWS[nextIndex], { focus: true });
    });
    tray.append(surface);
  }

  syncPromoView();
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
    currentView = 'profile';
  }
  open = true;
  lastOpener = opener || lastOpener || navButton;
  surface.hidden = false;
  tray.dataset.myCgbPromoOpen = 'true';
  setCommandSurface(document, ACCOUNT_COMMAND);
  setPrimarySurfaceVisibility(document, ACCOUNT_COMMAND);
  setPromoCommandState(true);
  markCgbPerformance('cgb:my-cgb:promo:visible');
  syncPromoView();
  const title = surface.querySelector('#my-cgb-promo-title');
  if (title) {
    title.tabIndex = -1;
    window.requestAnimationFrame(() => {
      title.focus({ preventScroll: true });
      if (open) void activateFullMyCgb({ opener: lastOpener });
    });
  } else {
    window.requestAnimationFrame(() => {
      if (open) void activateFullMyCgb({ opener: lastOpener });
    });
  }
  return true;
}

function closePromoSurface({ restoreSurface = true, restoreFocus = false } = {}) {
  if (!open) return;
  open = false;
  selectedVenueAtOpen = '';
  signInRequested = false;
  signInResolutionPromise = null;
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
  const handoffReturnSurface = returnSurface || 'map';

  for (let attempt = 0; attempt < FULL_SURFACE_RETRY_LIMIT; attempt += 1) {
    const owner = window.CGBMyCgbSurface;
    if (owner?.open) {
      const opened = await owner.open({ returnSurfaceOverride: handoffReturnSurface });
      if (opened !== false) {
        window.CGBPublicCommunity?.setView?.(currentView);
        return true;
      }
    }
    await wait(FULL_SURFACE_RETRY_MS);
  }
  return false;
}

async function activateFullMyCgb({ signIn = false, opener = null } = {}) {
  if (!open) showPromoSurface(opener);
  if (opener) lastOpener = opener;
  if (signIn) {
    signInRequested = true;
    if (!signInResolutionPromise) signInResolutionPromise = waitForResolvedAccountState();
  }
  if (activationPromise) return activationPromise;

  activationPromise = (async () => {
    try {
      const loader = window.CGBAccountsLoader;
      if (!loader?.load) throw new Error('accounts_loader_unavailable');
      await loader.load('user-demand');
      if (!open) return false;
      const opened = await openLoadedMyCgb();
      if (!opened) throw new Error('accounts_surface_unavailable');

      const shouldSignIn = signInRequested;
      const resolution = signInResolutionPromise;
      signInRequested = false;
      signInResolutionPromise = null;
      closePromoSurface({ restoreSurface: false });

      if (shouldSignIn) {
        const signedIn = window.CGBAccounts?.isSignedIn?.() === true ||
          (resolution ? await resolution : false);
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
      activationPromise = null;
    }
  })();

  return activationPromise;
}

function handleCapture(event) {
  const accountTrigger = event.target.closest?.('#mobile-about-button');
  if (accountTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.CGBAccountsLoader?.isLoaded?.()) {
      returnSurface = document.body.dataset.commandSurface || 'map';
      currentView = 'profile';
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

  const signIn = event.target.closest?.('[data-my-cgb-sign-in]');
  if (signIn) {
    event.preventDefault();
    void activateFullMyCgb({ signIn: true, opener: signIn });
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
