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

function profileIsPublic(profile = currentProfile) {
  return profile?.publicProfileStatus === 'public';
}

function attendanceDefaultsPublic(profile = currentProfile) {
  return profile?.attendanceVisibilityDefault === 'public';
}

function syncProfileSummary() {
  const summary = document.querySelector('.accounts-profile-summary');
  if (!summary || !currentProfile) return;
  const publicProfile = profileIsPublic();
  const publicAttendance = attendanceDefaultsPublic();
  const nextMarkup = `
    <span class="accounts-profile-summary__item">
      <strong>Profile</strong>
      <span>${publicProfile ? 'Public' : 'Private'}</span>
    </span>
    <span class="accounts-profile-summary__item">
      <strong>Attendance default</strong>
      <span>${publicAttendance ? 'Public' : 'Anonymous'}</span>
    </span>
    <span class="accounts-profile-summary__note">Your email and sign-in details always stay private.</span>`;
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
  const publicProfileCopy = form.querySelector('input[name="publicProfile"]')?.nextElementSibling;
  const profileCopy = 'Public profile: show my display name and avatar when I choose public attendance.';
  if (publicProfileCopy && publicProfileCopy.textContent !== profileCopy) publicProfileCopy.textContent = profileCopy;

  const publicAttendanceCopy = form.querySelector('input[name="publicAttendance"]')?.nextElementSibling;
  const attendanceCopy = 'Attendance default: make future attendance public. I can change this for each game.';
  if (publicAttendanceCopy && publicAttendanceCopy.textContent !== attendanceCopy) {
    publicAttendanceCopy.textContent = attendanceCopy;
  }
}

function clarifyAttendanceControl() {
  const control = document.querySelector('.account-attendance-visibility');
  if (!control) return;
  const checkbox = control.querySelector('input[data-account-visibility]');
  const copy = control.querySelector('span');
  if (!checkbox || !copy) return;

  const nextCopy = profileIsPublic()
    ? 'Show my name and avatar to Bears here'
    : 'Attendance is anonymous. Make your profile public in My CGB to show your name and avatar.';
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
  syncProfileSummary();
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
