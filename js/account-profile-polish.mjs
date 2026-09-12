import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady } from './accounts-core.mjs';

const STYLE_ATTR = 'data-cgb-account-profile-polish-style';
let currentProfile = null;
let appConnected = false;

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function injectStyles() {
  if (document.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-profile-polish.css';
  link.setAttribute(STYLE_ATTR, 'true');
  document.head.append(link);
}

function initialsFor(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'B';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

function profileIsPublic(profile = currentProfile) {
  return profile?.publicProfileStatus === 'public';
}

function attendanceDefaultsPublic(profile = currentProfile) {
  return profile?.attendanceVisibilityDefault === 'public';
}

function syncIdentityAvatar() {
  const identity = document.querySelector('.my-cgb-surface .accounts-identity');
  if (!identity || !currentProfile) return;
  const image = identity.querySelector('img.accounts-avatar');
  let fallback = identity.querySelector('.accounts-avatar-fallback');
  const imageVisible = Boolean(image && !image.hidden && image.getAttribute('src'));
  if (imageVisible) {
    fallback?.remove();
    return;
  }
  if (!fallback) {
    fallback = document.createElement('span');
    fallback.className = 'accounts-avatar accounts-avatar-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    identity.insertBefore(fallback, identity.firstChild);
  }
  fallback.textContent = initialsFor(currentProfile.displayName);
}

function syncProfileSummary() {
  const summary = document.querySelector('.accounts-profile-summary');
  if (!summary || !currentProfile) return;
  const publicProfile = profileIsPublic();
  const publicAttendance = publicProfile && attendanceDefaultsPublic();
  const visibilityLabel = publicProfile ? 'Public CGB profile' : 'Private CGB profile';
  const visibilityDetail = publicProfile
    ? 'Name, avatar, X profile and season statistics are visible'
    : 'Your profile and season statistics are visible only to you';
  const attendanceDetail = publicAttendance
    ? 'Attendance: Shown by default'
    : (publicProfile ? 'Attendance: Anonymous by default' : 'Attendance: Anonymous');
  const nextMarkup = `
    <span class="accounts-profile-summary__visibility">
      <strong>${visibilityLabel}</strong>
      <span>${visibilityDetail}</span>
    </span>
    <span class="accounts-profile-summary__controls">
      <span>${attendanceDetail}</span>
      <span aria-hidden="true">·</span>
      <button class="text-button my-cgb-edit-profile accounts-profile-summary__manage" type="button">Manage privacy</button>
    </span>`;
  if (summary.innerHTML !== nextMarkup) summary.innerHTML = nextMarkup;
}

function clarifyProfileSection() {
  const section = document.querySelector('.my-cgb-profile-section, .accounts-profile-form')?.closest('.accounts-section');
  if (!section) return;

  const eyebrow = section.querySelector('.accounts-section__heading .eyebrow');
  const title = section.querySelector('#accounts-profile-title');
  if (eyebrow && eyebrow.textContent !== 'Your identity') eyebrow.textContent = 'Your identity';
  if (title && title.textContent !== 'Profile & privacy') title.textContent = 'Profile & privacy';

  const form = section.querySelector('.accounts-profile-form');
  if (!form) return;
  const homeCityLabel = form.elements.homeCity?.closest('label');
  if (homeCityLabel) homeCityLabel.hidden = true;

  const publicProfileCopy = form.querySelector('input[name="publicProfile"]')?.nextElementSibling;
  const profileCopy = 'Public profile: allow my display name, public avatar, X profile, season statistics, and earned achievements to appear to other Bears. My email, Favorites, and attendance history stay private.';
  if (publicProfileCopy && publicProfileCopy.textContent !== profileCopy) publicProfileCopy.textContent = profileCopy;

  const publicAttendanceCopy = form.querySelector('input[name="publicAttendance"]')?.nextElementSibling;
  const attendanceCopy = 'Attendance default: make future attendance public. I can change this for each game.';
  if (publicAttendanceCopy && publicAttendanceCopy.textContent !== attendanceCopy) {
    publicAttendanceCopy.textContent = attendanceCopy;
  }
}

function ensurePrivateBoundary() {
  const historyTitle = [...document.querySelectorAll('.accounts-season-subheading h4')]
    .find((title) => title.textContent.trim() === 'Games watched');
  const historyHeading = historyTitle?.closest('.accounts-season-subheading');
  if (!historyHeading) return;

  let boundary = document.querySelector('.my-cgb-private-boundary');
  if (!boundary) {
    boundary = document.createElement('div');
    boundary.className = 'my-cgb-private-boundary';
    boundary.innerHTML = '<strong>Private to you</strong><span>Only you can see the information below.</span>';
  }
  if (historyHeading.previousElementSibling !== boundary) {
    historyHeading.insertAdjacentElement('beforebegin', boundary);
  }
}

function ensureAccountDetail(section, className, labelText, valueText, beforeNode) {
  let detail = section.querySelector(`.${className}`);
  if (!detail) {
    detail = document.createElement('div');
    detail.className = `accounts-account-detail ${className}`;
    const label = document.createElement('span');
    label.className = 'accounts-account-detail__label';
    const value = document.createElement('span');
    value.className = 'accounts-account-detail__value';
    detail.append(label, value);
  }
  detail.querySelector('.accounts-account-detail__label').textContent = labelText;
  detail.querySelector('.accounts-account-detail__value').textContent = valueText;
  section.insertBefore(detail, beforeNode || null);
  return detail;
}

function clarifyAccountSection() {
  const section = document.querySelector('.accounts-connections');
  if (!section) return;
  const eyebrow = section.querySelector('.accounts-section__heading .eyebrow');
  const title = section.querySelector('#accounts-connections-title');
  if (eyebrow) eyebrow.textContent = 'Account';
  if (title) title.textContent = 'Account information';

  const methods = section.querySelector('.accounts-connected-methods');
  const email = String(document.querySelector('.accounts-identity .accounts-email')?.textContent || '').trim();
  if (email && email !== 'Signed in') {
    ensureAccountDetail(section, 'accounts-account-email', 'Email', email, methods);
  }

  let methodsLabel = section.querySelector('.accounts-account-methods-label');
  if (!methodsLabel && methods) {
    methodsLabel = document.createElement('span');
    methodsLabel.className = 'accounts-account-detail__label accounts-account-methods-label';
  }
  if (methodsLabel && methods) {
    methodsLabel.textContent = 'Sign-in methods';
    section.insertBefore(methodsLabel, methods);
  }

  section.querySelectorAll('.accounts-connected-method').forEach((method) => {
    const value = String(method.textContent || '').replace(/^Signed in with\s+/i, '').trim();
    if (!value) return;
    method.textContent = /^email\s*\+\s*password$/i.test(value) ? 'Email + Password' : value;
  });

  const signOut = section.querySelector('.accounts-sign-out');
  const deleteZone = section.querySelector('.accounts-delete-zone');
  const deleteButton = deleteZone?.querySelector('.accounts-delete-account');
  if (signOut && deleteButton) {
    let actions = section.querySelector('.accounts-account-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'accounts-account-actions';
    }
    if (actions.parentElement !== section) section.append(actions);
    if (signOut.parentElement !== actions) actions.append(signOut);
    if (deleteButton.parentElement !== actions) actions.append(deleteButton);
    deleteZone.remove();
  }
}

function clarifyAttendanceControl() {
  const control = document.querySelector('.account-attendance-visibility');
  if (!control) return;
  const checkbox = control.querySelector('input[data-account-visibility]');
  const copy = control.querySelector('span');
  if (!checkbox || !copy) return;

  const nextCopy = profileIsPublic()
    ? 'Show my public CGB identity to Bears here'
    : 'Attendance is anonymous. Make your profile public in My CGB to show your public CGB identity here.';
  if (copy.textContent !== nextCopy) copy.textContent = nextCopy;
}

function syncTransientTitle() {
  const dialog = document.querySelector('#cgb-account-dialog');
  const title = dialog?.querySelector('#cgb-account-title');
  const eyebrow = dialog?.querySelector('.accounts-header .eyebrow');
  if (!dialog || !title || !eyebrow) return;

  let nextTitle = 'My CGB';
  let nextEyebrow = 'Cal Golden Bars';
  if (dialog.classList.contains('accounts-dialog--auth')) {
    nextTitle = 'Sign in';
    nextEyebrow = 'My CGB';
  } else if (dialog.classList.contains('accounts-dialog--profile')) {
    nextTitle = 'Edit profile';
    nextEyebrow = 'My CGB';
  }
  if (title.textContent !== nextTitle) title.textContent = nextTitle;
  if (eyebrow.textContent !== nextEyebrow) eyebrow.textContent = nextEyebrow;
}

function sync() {
  clarifyProfileSection();
  syncIdentityAvatar();
  syncProfileSummary();
  ensurePrivateBoundary();
  clarifyAccountSection();
  clarifyAttendanceControl();
  syncTransientTitle();
}

function setProfile(profile) {
  currentProfile = profile || null;
  sync();
}

function handleAccountState(event) {
  setProfile(event?.detail?.signedIn === true ? event.detail?.profile || null : null);
}

function connectApp() {
  if (appConnected) return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    window.setTimeout(connectApp, 25);
    return;
  }
  appConnected = true;
  app.subscribe('rendered', clarifyAttendanceControl);
}

export function initializeAccountProfilePolish() {
  if (!enabled()) return false;
  injectStyles();
  currentProfile = window.CGBAccounts?.getProfile?.() || null;
  window.addEventListener('cgb:account-state', handleAccountState);
  document.addEventListener('click', (event) => {
    if (event.target.closest('.my-cgb-sign-in, .my-cgb-edit-profile')) queueMicrotask(syncTransientTitle);
  }, { capture: true });
  document.querySelector('#cgb-account-dialog')?.addEventListener('close', () => queueMicrotask(syncTransientTitle));
  connectApp();
  sync();
  return true;
}

window.CGBAccountProfilePolish = Object.freeze({ setProfile, sync });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountProfilePolish, { once: true });
} else {
  initializeAccountProfilePolish();
}