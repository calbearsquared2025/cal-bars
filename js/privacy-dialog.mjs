import { connectFooterPopover } from './footer-popover.mjs';

function addMobilePrivacySection(dialog) {
  const aboutContent = document.querySelector('#about-surface .about-surface__content');
  if (!aboutContent || aboutContent.querySelector('.about-privacy-section')) return;

  const section = document.createElement('section');
  section.className = 'about-subsection about-privacy-section';

  const heading = document.createElement('span');
  heading.className = 'eyebrow';
  heading.textContent = 'Privacy';
  section.append(heading);

  dialog.querySelectorAll('.dialog-shell > p').forEach((paragraph) => {
    section.append(paragraph.cloneNode(true));
  });

  aboutContent.append(section);
}

function initializePrivacyDialog() {
  const dialog = document.querySelector('#privacy-dialog');
  if (!dialog) return;

  addMobilePrivacySection(dialog);

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
