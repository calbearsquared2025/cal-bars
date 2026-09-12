import {
  CGB_AVATAR_PRESETS,
  explicitGoogleAvatarUrl,
  isCgbAvatarPresetUrl,
  tagGoogleAvatarUrl
} from './account-avatar-presets.mjs';

const FIREBASE_VERSION = '12.18.0';
let currentProfile = null;
let currentGoogleAvatarUrl = '';
let authConnected = false;

function clean(value) {
  return String(value ?? '').trim();
}

function initialsFor(name) {
  const words = clean(name).split(/\s+/).filter(Boolean);
  if (!words.length) return 'B';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

function presetChoice(preset, index) {
  const choice = document.createElement('label');
  choice.className = 'accounts-avatar-choice';

  const input = document.createElement('input');
  input.name = 'avatarUrl';
  input.type = 'radio';
  input.value = preset.url;

  const image = document.createElement('img');
  image.src = preset.url;
  image.alt = `Avatar option ${index + 1}`;
  image.loading = 'lazy';
  image.decoding = 'async';

  choice.append(input, image);
  return choice;
}

function initialsChoice(displayName) {
  const choice = document.createElement('label');
  choice.className = 'accounts-avatar-choice accounts-avatar-choice--initials';
  choice.dataset.avatarChoice = 'initials';

  const input = document.createElement('input');
  input.name = 'avatarUrl';
  input.type = 'radio';
  input.value = '';

  const initials = document.createElement('span');
  initials.className = 'accounts-avatar-initials';
  initials.setAttribute('aria-hidden', 'true');
  initials.textContent = initialsFor(displayName);

  const label = document.createElement('span');
  label.className = 'accounts-avatar-choice__label';
  label.textContent = 'Initials';

  choice.append(input, initials, label);
  return choice;
}

function googleChoice() {
  if (!currentGoogleAvatarUrl) return null;
  const publicUrl = tagGoogleAvatarUrl(currentGoogleAvatarUrl);
  if (!publicUrl) return null;

  const choice = document.createElement('label');
  choice.className = 'accounts-avatar-choice accounts-avatar-choice--google';
  choice.dataset.avatarChoice = 'google';

  const input = document.createElement('input');
  input.name = 'avatarUrl';
  input.type = 'radio';
  input.value = publicUrl;

  const image = document.createElement('img');
  image.src = currentGoogleAvatarUrl;
  image.alt = 'Google profile photo';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';

  const label = document.createElement('span');
  label.className = 'accounts-avatar-choice__label';
  label.textContent = 'Google';

  choice.append(input, image, label);
  return choice;
}

function selectedAvatarValue() {
  const avatarUrl = clean(currentProfile?.avatarUrl);
  if (!avatarUrl) return '';
  const explicitGoogle = explicitGoogleAvatarUrl(avatarUrl);
  if (explicitGoogle) return explicitGoogle;
  return isCgbAvatarPresetUrl(avatarUrl) ? avatarUrl : '';
}

export function renderAccountAvatarPicker(form = document.querySelector('#cgb-account-dialog .accounts-profile-form')) {
  const picker = form?.querySelector('.accounts-avatar-picker');
  const options = picker?.querySelector('.accounts-avatar-options');
  if (!picker || !options) return false;

  const displayName = form.elements.displayName?.value || currentProfile?.displayName || 'Bear';
  const choices = [
    initialsChoice(displayName),
    ...CGB_AVATAR_PRESETS.map(presetChoice)
  ];
  const google = googleChoice();
  if (google) choices.push(google);
  options.replaceChildren(...choices);

  const legend = picker.querySelector('legend');
  if (legend) legend.textContent = 'Profile picture';

  const selected = selectedAvatarValue();
  const radio = [...options.querySelectorAll('input[name="avatarUrl"]')]
    .find((input) => input.value === selected) || options.querySelector('input[name="avatarUrl"][value=""]');
  if (radio) radio.checked = true;

  const help = picker.querySelector('small');
  if (help) {
    help.textContent = currentGoogleAvatarUrl
      ? 'Choose initials, a CGB avatar, or your Google photo. Your Google photo is used publicly only if you select it.'
      : 'Choose initials or one of the CGB avatars.';
  }
  return true;
}

function updateInitialsPreview(form) {
  const initials = form?.querySelector('.accounts-avatar-initials');
  if (initials) initials.textContent = initialsFor(form.elements.displayName?.value || currentProfile?.displayName || 'Bear');
}

function handleAccountState(event) {
  currentProfile = event?.detail?.signedIn === true ? event.detail?.profile || null : null;
  renderAccountAvatarPicker();
}

async function connectFirebase(attempt = 0) {
  if (authConnected) return;
  try {
    const appUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
    const authUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;
    const [appModule, authModule] = await Promise.all([import(appUrl), import(authUrl)]);
    const apps = appModule.getApps();
    if (!apps.length) {
      if (attempt < 100) window.setTimeout(() => { void connectFirebase(attempt + 1); }, 25);
      return;
    }
    authConnected = true;
    const auth = authModule.getAuth(apps[0]);
    authModule.onAuthStateChanged(auth, (user) => {
      const hasGoogle = Array.isArray(user?.providerData) && user.providerData.some((provider) => provider?.providerId === 'google.com');
      currentGoogleAvatarUrl = hasGoogle ? clean(user?.photoURL) : '';
      renderAccountAvatarPicker();
    });
  } catch (_) {
    currentGoogleAvatarUrl = '';
    renderAccountAvatarPicker();
  }
}

function initialize(attempt = 0) {
  const form = document.querySelector('#cgb-account-dialog .accounts-profile-form');
  if (!form && attempt < 100) {
    window.setTimeout(() => initialize(attempt + 1), 25);
    return;
  }
  if (!form) return;

  currentProfile = window.CGBAccounts?.getProfile?.() || null;
  renderAccountAvatarPicker(form);
  form.elements.displayName?.addEventListener('input', () => updateInitialsPreview(form), { passive: true });
  window.addEventListener('cgb:account-state', handleAccountState);
  void connectFirebase();
}

window.CGBAccountAvatarPicker = Object.freeze({
  render: renderAccountAvatarPicker
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initialize(), { once: true });
} else {
  initialize();
}
