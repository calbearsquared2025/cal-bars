import { isCgbAvatarPresetUrl } from './account-avatar-presets.mjs';

const STYLE_ATTR = 'data-cgb-account-profile-onboarding-style';
let onboardingActive = false;
let promptedForCurrentSession = false;
let currentProfile = null;
let statusObserver = null;

function clean(value) {
  return String(value ?? '').trim();
}

function needsProfileSetup(profile) {
  if (!profile) return false;
  return clean(profile.displayName) === 'Bear' &&
    !isCgbAvatarPresetUrl(profile.avatarUrl) &&
    clean(profile.publicProfileStatus) === 'private' &&
    clean(profile.attendanceVisibilityDefault) === 'anonymous';
}

function injectStyles() {
  if (document.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-profile-onboarding.css';
  link.setAttribute(STYLE_ATTR, 'true');
  document.head.append(link);
}

function ensureOnboardingCopy(form) {
  if (!form) return;
  let intro = form.querySelector('.accounts-onboarding-intro');
  if (!intro) {
    intro = document.createElement('div');
    intro.className = 'accounts-onboarding-intro';
    intro.innerHTML = `
      <strong>Choose how you appear on CGB.</strong>
      <p>Add the display name and profile picture other Bears can see, then choose your privacy defaults. Your email, Favorites, and attendance history stay private.</p>`;
    form.prepend(intro);
  }

  const homeCity = form.elements.homeCity?.closest('label');
  homeCity?.classList.add('accounts-onboarding-optional');

  let privacy = form.querySelector('.accounts-onboarding-privacy');
  if (!privacy) {
    privacy = document.createElement('div');
    privacy.className = 'accounts-onboarding-privacy';
    privacy.innerHTML = '<strong>Privacy</strong><span>Choose what other Bears can see. You can change these settings later.</span>';
    form.elements.publicProfile?.closest('label')?.insertAdjacentElement('beforebegin', privacy);
  }
}

function applyOnboardingPresentation() {
  const dialog = document.querySelector('#cgb-account-dialog');
  const form = dialog?.querySelector('.accounts-profile-form');
  if (!dialog || !form) return false;

  onboardingActive = true;
  dialog.classList.add('accounts-dialog--onboarding');
  ensureOnboardingCopy(form);

  const title = dialog.querySelector('#cgb-account-title');
  const eyebrow = dialog.querySelector('.accounts-header .eyebrow');
  if (title) title.textContent = 'Set up your CGB profile';
  if (eyebrow) eyebrow.textContent = 'Welcome to My CGB';

  const displayName = form.elements.displayName;
  if (displayName) {
    displayName.value = '';
    displayName.required = true;
    displayName.setAttribute('aria-describedby', 'accounts-display-name-help');
    let help = form.querySelector('#accounts-display-name-help');
    if (!help) {
      help = document.createElement('small');
      help.id = 'accounts-display-name-help';
      help.className = 'accounts-display-name-help';
      help.textContent = 'Choose the name other Bears will see if your profile is public.';
      displayName.closest('label')?.append(help);
    }
  }

  window.CGBAccountAvatarPicker?.render?.(form);
  const save = form.querySelector('.accounts-profile-save');
  if (save) save.textContent = 'Save and continue';
  window.setTimeout(() => displayName?.focus?.(), 0);
  return true;
}

function cleanupOnboardingPresentation() {
  const dialog = document.querySelector('#cgb-account-dialog');
  const form = dialog?.querySelector('.accounts-profile-form');
  onboardingActive = false;
  dialog?.classList.remove('accounts-dialog--onboarding');
  const save = form?.querySelector('.accounts-profile-save');
  if (save) save.textContent = 'Save profile';
}

function openOnboarding() {
  if (promptedForCurrentSession || !needsProfileSetup(currentProfile)) return;
  promptedForCurrentSession = true;
  window.CGBMyCgbSurface?.open?.();

  let attempts = 0;
  const openProfile = () => {
    const edit = document.querySelector('.my-cgb-edit-profile');
    if (!edit && attempts < 80) {
      attempts += 1;
      window.setTimeout(openProfile, 25);
      return;
    }
    if (!edit) return;
    window.CGBAccountAvatarPicker?.render?.();
    edit.click();
    window.setTimeout(applyOnboardingPresentation, 0);
  };
  window.setTimeout(openProfile, 0);
}

function handleAccountState(event) {
  if (event?.detail?.signedIn !== true) {
    currentProfile = null;
    promptedForCurrentSession = false;
    cleanupOnboardingPresentation();
    return;
  }
  currentProfile = event.detail?.profile || null;
  if (!onboardingActive) openOnboarding();
}

function observeSaveStatus() {
  const status = document.querySelector('#cgb-account-dialog .accounts-status');
  if (!status || statusObserver) return;
  statusObserver = new MutationObserver(() => {
    if (clean(status.textContent) !== 'Profile saved.') return;
    const dialog = document.querySelector('#cgb-account-dialog');
    const isProfileEditor = dialog?.classList.contains('accounts-dialog--profile');
    if (!onboardingActive && !isProfileEditor) return;
    if (onboardingActive) cleanupOnboardingPresentation();
    if (dialog?.open) dialog.close();
  });
  statusObserver.observe(status, { childList: true, characterData: true, subtree: true });
}

function initializeWhenReady(attempt = 0) {
  const dialog = document.querySelector('#cgb-account-dialog');
  if (!dialog && attempt < 100) {
    window.setTimeout(() => initializeWhenReady(attempt + 1), 25);
    return;
  }
  if (!dialog) return;
  injectStyles();
  observeSaveStatus();
  dialog.addEventListener('close', cleanupOnboardingPresentation);
  window.addEventListener('cgb:account-state', handleAccountState);
  currentProfile = window.CGBAccounts?.getProfile?.() || null;
  if (currentProfile) openOnboarding();
}

window.CGBAccountProfileOnboarding = Object.freeze({
  needsProfileSetup,
  open: openOnboarding
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeWhenReady(), { once: true });
} else {
  initializeWhenReady();
}