import { connectFooterPopover } from './footer-popover.mjs';

const ABOUT_ATTRIBUTION = 'Cal Golden Bars is built and maintained by Matthew Putzulu.';

function addAboutAttribution() {
  const containers = [
    document.querySelector('#about-surface .about-surface__content'),
    document.querySelector('#about-dialog .dialog-shell')
  ];

  containers.forEach((container) => {
    if (!container || container.querySelector('.about-attribution')) return;

    const paragraph = document.createElement('p');
    paragraph.className = 'about-attribution';
    paragraph.textContent = ABOUT_ATTRIBUTION;

    const support = container.querySelector('.about-support');
    if (support) support.before(paragraph);
    else container.append(paragraph);
  });
}

function initializeSupportDialog() {
  const aboutDialog = document.querySelector('#about-dialog');
  const footerAboutButton = document.querySelector('#about-button');
  const venueTray = document.querySelector('#venue-tray');
  const aboutPopover = connectFooterPopover({
    dialog: aboutDialog,
    button: footerAboutButton,
    tray: venueTray
  });

  addAboutAttribution();

  const dialog = document.querySelector('#support-dialog');
  const frame = document.querySelector('#kofiframe');
  const openButtons = Array.from(document.querySelectorAll('[data-support-open]'));
  if (!dialog || !frame || openButtons.length === 0) return;

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
