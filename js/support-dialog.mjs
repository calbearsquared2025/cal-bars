import { connectFooterPopover } from './footer-popover.mjs';

function initializeSupportDialog() {
  const dialog = document.querySelector('#support-dialog');
  const frame = document.querySelector('#kofiframe');
  const aboutDialog = document.querySelector('#about-dialog');
  const footerAboutButton = document.querySelector('#about-button');
  const venueTray = document.querySelector('#venue-tray');
  const openButtons = Array.from(document.querySelectorAll('[data-support-open]'));
  if (!dialog || !frame || openButtons.length === 0) return;

  const aboutPopover = connectFooterPopover({
    dialog: aboutDialog,
    button: footerAboutButton,
    tray: venueTray
  });

  const loadFrame = () => {
    if (frame.hasAttribute('src') || !frame.dataset.src) return;
    frame.setAttribute('src', frame.dataset.src);
  };

  const openDialog = () => {
    loadFrame();
    aboutPopover?.close();
    if (!dialog.open) dialog.showModal();
  };

  openButtons.forEach((button) => button.addEventListener('click', openDialog));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSupportDialog, { once: true });
} else {
  initializeSupportDialog();
}
