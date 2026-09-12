import './account-dialog-interactions.mjs';
import './account-avatar-policy.mjs';
import './accounts-ui.mjs';
import './account-avatar-picker.mjs';
import './my-cgb-native-surface.mjs';
import './account-favorites-navigation.mjs';
import './account-profile-polish.mjs';
import './account-profile-onboarding.mjs';
import './account-attendance.mjs';
import './account-public-community.mjs';
import './account-contributions.mjs';
import { connectFooterPopover } from './footer-popover.mjs';

function initializePrivacyDialog() {
  const dialog = document.querySelector('#privacy-dialog');
  if (!dialog) return;

  let modalOpener = null;
  const aboutPrivacyButton = document.querySelector('#about-privacy-button');
  aboutPrivacyButton?.addEventListener('click', () => {
    modalOpener = aboutPrivacyButton;
    if (!dialog.open) dialog.showModal();
  });
  dialog.addEventListener('close', () => {
    if (!modalOpener?.isConnected) {
      modalOpener = null;
      return;
    }
    const opener = modalOpener;
    modalOpener = null;
    window.requestAnimationFrame(() => opener.focus({ preventScroll: true }));
  });

  connectFooterPopover({
    dialog,
    button: document.querySelector('#privacy-button'),
    tray: document.querySelector('#venue-tray')
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePrivacyDialog, { once: true });
} else {
  initializePrivacyDialog();
}
