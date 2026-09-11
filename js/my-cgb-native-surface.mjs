import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady } from './accounts-core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const ACCOUNT_COMMAND = 'my-cgb';
const TRANSIENT_AUTH = 'auth';
const TRANSIENT_PROFILE = 'profile';
const NAV_CLOSE_SELECTOR = '#mobile-map-button, #mobile-search-button, #mobile-add-button, #mobile-list-button, [data-command-close]';

let tray = null;
let surface = null;
let dialog = null;
let shell = null;
let launcher = null;
let navButton = null;
let nativeSignIn = null;
let editProfile = null;
let profileSection = null;
let desktopAddButton = null;
let open = false;
let transientMode = '';
let returnSurface = 'map';
let lastOpener = null;
let selectedVenueAtOpen = '';
let syncFrame = 0;

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function injectStyles() {
  if (document.querySelector('link[data-cgb-my-cgb-native-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/my-cgb-native-surface.css';
  link.dataset.cgbMyCgbNativeStyle = 'true';
  document.head.append(link);
}

function commandLabel(button) {
  return button?.querySelector('span:last-child') || null;
}

function syncNavButton() {
  if (!navButton) return;
  navButton.dataset.command = ACCOUNT_COMMAND;
  navButton.setAttribute('aria-label', 'My CGB');
  const label = commandLabel(navButton);
  if (label) label.textContent = 'My CGB';
  const use = navButton.querySelector('use');
  if (use) use.setAttribute('href', 'assets/icons.svg#icon-users');
}

function syncHeaderLauncher() {
  if (!launcher) return;
  launcher.hidden = true;
  launcher.tabIndex = -1;
  launcher.setAttribute('aria-hidden', 'true');
  launcher.removeAttribute('aria-haspopup');
  launcher.removeAttribute('aria-controls');
  launcher.removeAttribute('aria-expanded');
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

function ensureSurface() {
  tray = document.querySelector('#venue-tray');
  dialog = document.querySelector('#cgb-account-dialog');
  shell = dialog?.querySelector('.accounts-shell') || document.querySelector('.accounts-shell');
  launcher = document.querySelector('#cgb-account-button');
  navButton = document.querySelector('#mobile-about-button');
  if (!tray || !dialog || !shell || !navButton) return false;

  surface = document.querySelector('#my-cgb-surface');
  if (!surface) {
    surface = document.createElement('section');
    surface.id = 'my-cgb-surface';
    surface.className = 'my-cgb-surface';
    surface.hidden = true;
    surface.setAttribute('aria-labelledby', 'cgb-account-title');
    tray.append(surface);
  }

  shell.classList.add('accounts-shell--native');
  surface.append(shell);
  const close = shell.querySelector('.accounts-close');
  if (close) close.hidden = true;

  const signedOut = shell.querySelector('.accounts-signed-out');
  if (signedOut && !signedOut.querySelector('.my-cgb-sign-in')) {
    nativeSignIn = document.createElement('button');
    nativeSignIn.type = 'button';
    nativeSignIn.className = 'primary-button my-cgb-sign-in';
    nativeSignIn.textContent = 'Sign in to My CGB';
    signedOut.querySelector('.accounts-intro')?.insertAdjacentElement('afterend', nativeSignIn);
  } else {
    nativeSignIn = signedOut?.querySelector('.my-cgb-sign-in') || null;
  }

  const profileForm = shell.querySelector('.accounts-profile-form');
  profileSection = profileForm?.closest('.accounts-section') || null;
  if (profileSection) {
    profileSection.classList.add('my-cgb-profile-section');
    const heading = profileSection.querySelector('.accounts-section__heading');
    if (heading && !heading.querySelector('.my-cgb-edit-profile')) {
      editProfile = document.createElement('button');
      editProfile.type = 'button';
      editProfile.className = 'text-button my-cgb-edit-profile';
      editProfile.textContent = 'Edit profile';
      heading.append(editProfile);
    } else {
      editProfile = heading?.querySelector('.my-cgb-edit-profile') || null;
    }
  }

  document.body.dataset.cgbAccountsEnabled = 'true';
  syncNavButton();
  syncHeaderLauncher();
  syncDesktopAddEntry();
  return true;
}

function setCommandState(active) {
  if (!navButton) return;
  if (active) {
    document.querySelectorAll('.mobile-command').forEach((button) => {
      button.classList.remove('mobile-command--active');
      button.removeAttribute('aria-current');
    });
    navButton.classList.add('mobile-command--active');
    navButton.setAttribute('aria-current', 'page');
    return;
  }
  navButton.classList.remove('mobile-command--active');
  navButton.removeAttribute('aria-current');
}

function restoreCommandHighlight() {
  const targetBySurface = {
    map: '#mobile-map-button',
    search: '#mobile-search-button',
    add: '#mobile-add-button',
    list: '#mobile-list-button'
  };
  const target = document.querySelector(targetBySurface[returnSurface] || '');
  if (!target) return;
  document.querySelectorAll('.mobile-command').forEach((button) => {
    button.classList.remove('mobile-command--active');
    button.removeAttribute('aria-current');
  });
  target.classList.add('mobile-command--active');
  target.setAttribute('aria-current', 'page');
}

function setNativeChrome(native) {
  if (!shell) return;
  shell.classList.toggle('accounts-shell--native', native);
  const close = shell.querySelector('.accounts-close');
  if (close) close.hidden = native;
}

function moveShellHome() {
  if (!surface || !shell) return;
  setNativeChrome(true);
  surface.append(shell);
  transientMode = '';
  dialog?.classList.remove('accounts-dialog--auth', 'accounts-dialog--profile');
}

function refreshSelectedFavoriteAction() {
  if (!shell) return;
  const save = shell.querySelector('.accounts-save-selected');
  if (!save) return;
  const state = window.CGBApp?.getState?.();
  const selected = state?.snapshot?.venues?.find((venue) => venue.venue_id === state.selectedVenueId) || null;
  const existingFavoriteIds = new Set(
    [...shell.querySelectorAll('[data-remove-favorite]')]
      .map((button) => button.dataset.removeFavorite)
      .filter(Boolean)
  );
  if (selected && !existingFavoriteIds.has(selected.venue_id)) {
    save.hidden = false;
    save.dataset.venueId = selected.venue_id;
    save.textContent = `Save ${selected.name}`;
  } else {
    save.hidden = true;
    save.dataset.venueId = '';
  }
}

function currentSelectedVenueId() {
  return String(window.CGBApp?.getState?.()?.selectedVenueId || '');
}

function showNativeSurface(opener = null) {
  if (!ensureSurface()) return;
  if (!open) {
    returnSurface = document.body.dataset.commandSurface || 'map';
    selectedVenueAtOpen = currentSelectedVenueId();
  }
  open = true;
  lastOpener = opener || lastOpener || navButton;
  moveShellHome();
  surface.hidden = false;
  tray.dataset.myCgbOpen = 'true';
  document.body.dataset.commandSurface = ACCOUNT_COMMAND;
  document.querySelector('#search-surface')?.setAttribute('hidden', '');
  document.querySelector('#add-surface')?.setAttribute('hidden', '');
  document.querySelector('#about-surface')?.setAttribute('hidden', '');
  setCommandState(true);
  refreshSelectedFavoriteAction();
  const title = shell.querySelector('#cgb-account-title');
  if (title) {
    title.tabIndex = -1;
    window.requestAnimationFrame(() => title.focus({ preventScroll: true }));
  }
}

function restorePreviousSurface() {
  document.body.dataset.commandSurface = returnSurface || 'map';
  const surfaceByCommand = {
    search: '#search-surface',
    add: '#add-surface',
    about: '#about-surface'
  };
  const selector = surfaceByCommand[returnSurface];
  if (selector) document.querySelector(selector)?.removeAttribute('hidden');
}

function closeNativeSurface({ restoreSurface = true, restoreFocus = false } = {}) {
  if (!open) return;
  open = false;
  selectedVenueAtOpen = '';
  if (surface) surface.hidden = true;
  tray?.removeAttribute('data-my-cgb-open');
  if (restoreSurface) restorePreviousSurface();
  setCommandState(false);
  if (restoreSurface) restoreCommandHighlight();
  if (restoreFocus && lastOpener?.isConnected) {
    window.requestAnimationFrame(() => lastOpener.focus({ preventScroll: true }));
  }
}

function openTransient(mode, opener) {
  if (!dialog || !shell || dialog.open) return;
  transientMode = mode;
  lastOpener = opener || lastOpener;
  setNativeChrome(false);
  dialog.classList.toggle('accounts-dialog--auth', mode === TRANSIENT_AUTH);
  dialog.classList.toggle('accounts-dialog--profile', mode === TRANSIENT_PROFILE);
  dialog.append(shell);
  dialog.showModal();
  if (mode === TRANSIENT_PROFILE) {
    window.setTimeout(() => shell.querySelector('.accounts-profile-form input')?.focus(), 0);
  } else {
    window.setTimeout(() => shell.querySelector('[data-account-provider="google"]')?.focus(), 0);
  }
}

function restoreAfterTransient() {
  if (!transientMode) return;
  const opener = lastOpener;
  moveShellHome();
  if (open && surface) surface.hidden = false;
  if (opener?.isConnected) window.requestAnimationFrame(() => opener.focus({ preventScroll: true }));
}

function handleCapture(event) {
  const accountTrigger = event.target.closest?.('#mobile-about-button');
  if (accountTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showNativeSurface(accountTrigger);
    return;
  }

  const desktopAdd = event.target.closest?.('#desktop-add-to-cgb-button');
  if (desktopAdd) {
    event.preventDefault();
    document.querySelector('#mobile-add-button')?.click();
    return;
  }

  const signIn = event.target.closest?.('.my-cgb-sign-in');
  if (signIn) {
    event.preventDefault();
    openTransient(TRANSIENT_AUTH, signIn);
    return;
  }

  const profile = event.target.closest?.('.my-cgb-edit-profile');
  if (profile) {
    event.preventDefault();
    openTransient(TRANSIENT_PROFILE, profile);
    return;
  }

  if (open && event.target.closest?.(NAV_CLOSE_SELECTOR)) {
    closeNativeSurface({ restoreSurface: false });
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && open && !dialog?.open) {
    event.preventDefault();
    closeNativeSurface({ restoreFocus: true });
  }
}

function handleAccountState(event) {
  if (transientMode === TRANSIENT_AUTH && event?.detail?.signedIn === true && dialog?.open) {
    dialog.close();
  }
  scheduleSync();
}

function scheduleSync() {
  window.cancelAnimationFrame(syncFrame);
  syncFrame = window.requestAnimationFrame(() => {
    syncNavButton();
    syncHeaderLauncher();
    syncDesktopAddEntry();
    if (!open) return;
    tray?.setAttribute('data-my-cgb-open', 'true');
    document.body.dataset.commandSurface = ACCOUNT_COMMAND;
    setCommandState(true);
  });
}

function handleAppRendered(detail = {}) {
  const renderedVenueId = String(detail.selectedVenueId || '');
  if (open && renderedVenueId && renderedVenueId !== selectedVenueAtOpen) {
    returnSurface = 'map';
    closeNativeSurface({ restoreSurface: true });
    return;
  }
  if (open) refreshSelectedFavoriteAction();
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

export function initializeMyCgbNativeSurface() {
  if (!enabled()) return false;
  injectStyles();
  if (!ensureSurface()) {
    window.setTimeout(initializeMyCgbNativeSurface, 25);
    return false;
  }

  document.addEventListener('click', handleCapture, { capture: true });
  document.addEventListener('keydown', handleKeydown);
  dialog.addEventListener('close', restoreAfterTransient);
  window.addEventListener('cgb:account-state', handleAccountState);
  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', scheduleSync);
  connectApp();
  scheduleSync();
  return true;
}

window.CGBMyCgbSurface = Object.freeze({
  open: () => showNativeSurface(),
  close: () => closeNativeSurface({ restoreFocus: true }),
  isOpen: () => open
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMyCgbNativeSurface, { once: true });
} else {
  initializeMyCgbNativeSurface();
}
