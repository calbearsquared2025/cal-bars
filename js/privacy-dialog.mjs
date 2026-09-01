const DESKTOP_QUERY = '(min-width: 900px)';
const PRIVACY_POPOVER_WIDTH = 440;
const PRIVACY_POPOVER_GAP = 16;

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

  const privacyButton = document.querySelector('#privacy-button');
  if (!privacyButton) return;

  const venueTray = document.querySelector('#venue-tray');
  const aboutDialog = document.querySelector('#about-dialog');

  const clearPrivacyPopover = () => {
    dialog.classList.remove('about-dialog--footer-popover');
    dialog.style.removeProperty('--about-popover-left');
    dialog.style.removeProperty('--about-popover-bottom');
  };

  const closePrivacyPopover = ({ restoreFocus = false } = {}) => {
    if (!dialog.open || !dialog.classList.contains('about-dialog--footer-popover')) return;
    dialog.close();
    if (restoreFocus) privacyButton.focus();
  };

  const showPrivacyPopover = () => {
    if (dialog.open) return;
    clearPrivacyPopover();

    const buttonRect = privacyButton.getBoundingClientRect();
    const trayRect = venueTray?.getBoundingClientRect();
    const width = Math.min(PRIVACY_POPOVER_WIDTH, window.innerWidth - 32);
    const fallbackLeft = buttonRect.left + (buttonRect.width / 2) - (width / 2);
    const left = Math.min(
      Math.max(16, trayRect ? trayRect.left - width - PRIVACY_POPOVER_GAP : fallbackLeft),
      window.innerWidth - width - 16
    );

    dialog.style.setProperty('--about-popover-left', `${Math.round(left)}px`);
    dialog.style.setProperty('--about-popover-bottom', '16px');
    dialog.classList.add('about-dialog--footer-popover');
    dialog.show();
  };

  const openPrivacyPopover = (event) => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (dialog.open && dialog.classList.contains('about-dialog--footer-popover')) {
      closePrivacyPopover({ restoreFocus: true });
      return;
    }

    if (aboutDialog?.open) aboutDialog.close();
    if (dialog.open) dialog.close();
    window.requestAnimationFrame(showPrivacyPopover);
  };

  privacyButton.addEventListener('click', openPrivacyPopover, { capture: true });
  dialog.addEventListener('close', clearPrivacyPopover);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener('click', (event) => {
    if (!dialog.open || !dialog.classList.contains('about-dialog--footer-popover')) return;
    if (dialog.contains(event.target) || privacyButton.contains(event.target)) return;
    closePrivacyPopover();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePrivacyPopover({ restoreFocus: true });
  });

  window.addEventListener('resize', () => closePrivacyPopover());
  window.matchMedia(DESKTOP_QUERY).addEventListener?.('change', () => closePrivacyPopover());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePrivacyDialog, { once: true });
} else {
  initializePrivacyDialog();
}
