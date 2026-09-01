function initializePrivacyDialog() {
  const dialog = document.querySelector('#privacy-dialog');
  if (!dialog) return;

  const aboutContent = document.querySelector('#about-surface .about-surface__content');
  if (aboutContent && !aboutContent.querySelector('[data-privacy-open]')) {
    const row = document.createElement('p');
    const mobileButton = document.createElement('button');
    mobileButton.type = 'button';
    mobileButton.className = 'text-button';
    mobileButton.dataset.privacyOpen = '';
    mobileButton.textContent = 'Privacy';
    row.append(mobileButton);
    aboutContent.append(row);
  }

  const buttons = [
    document.querySelector('#privacy-button'),
    ...document.querySelectorAll('[data-privacy-open]')
  ].filter(Boolean);

  buttons.forEach((button) => button.addEventListener('click', () => dialog.showModal()));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePrivacyDialog, { once: true });
} else {
  initializePrivacyDialog();
}
