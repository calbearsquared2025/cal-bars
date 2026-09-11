import './accounts-ui.mjs';
import './account-attendance.mjs';
import './account-history.mjs';
import './account-contributions.mjs';
import { connectFooterPopover } from './footer-popover.mjs';

function initializePrivacyDialog() {
  const dialog = document.querySelector('#privacy-dialog');
  if (!dialog) return;

  document.querySelector('#about-privacy-button')?.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal();
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
