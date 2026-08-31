function initializePrivacyDialog() {
  const button = document.querySelector('#privacy-button');
  const dialog = document.querySelector('#privacy-dialog');
  if (!button || !dialog) return;

  button.addEventListener('click', () => dialog.showModal());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePrivacyDialog, { once: true });
} else {
  initializePrivacyDialog();
}
