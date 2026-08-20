const DESKTOP_QUERY = '(min-width: 900px)';
const ABOUT_POPOVER_WIDTH = 440;
const ABOUT_POPOVER_GAP = 16;

function initializeSupportDialog() {
  const dialog = document.querySelector('#support-dialog');
  const frame = document.querySelector('#kofiframe');
  const aboutDialog = document.querySelector('#about-dialog');
  const footerAboutButton = document.querySelector('#about-button');
  const venueTray = document.querySelector('#venue-tray');
  const openButtons = Array.from(document.querySelectorAll('[data-support-open]'));
  if (!dialog || !frame || openButtons.length === 0) return;

  const clearAboutPopover = () => {
    aboutDialog?.classList.remove('about-dialog--footer-popover');
    aboutDialog?.style.removeProperty('--about-popover-left');
    aboutDialog?.style.removeProperty('--about-popover-bottom');
  };

  const closeAboutPopover = ({ restoreFocus = false } = {}) => {
    if (!aboutDialog?.open || !aboutDialog.classList.contains('about-dialog--footer-popover')) return;
    aboutDialog.close();
    if (restoreFocus) footerAboutButton?.focus();
  };

  const showFooterAboutPopover = () => {
    if (!aboutDialog || !footerAboutButton || aboutDialog.open) return;
    clearAboutPopover();

    const buttonRect = footerAboutButton.getBoundingClientRect();
    const trayRect = venueTray?.getBoundingClientRect();
    const width = Math.min(ABOUT_POPOVER_WIDTH, window.innerWidth - 32);
    const fallbackLeft = buttonRect.left + (buttonRect.width / 2) - (width / 2);
    const left = Math.min(
      Math.max(16, trayRect ? trayRect.left - width - ABOUT_POPOVER_GAP : fallbackLeft),
      window.innerWidth - width - 16
    );
    const bottom = Math.max(16, trayRect ? window.innerHeight - trayRect.bottom : 16);

    aboutDialog.style.setProperty('--about-popover-left', `${Math.round(left)}px`);
    aboutDialog.style.setProperty('--about-popover-bottom', `${Math.round(bottom)}px`);
    aboutDialog.classList.add('about-dialog--footer-popover');
    aboutDialog.show();
  };

  const openFooterAboutPopover = (event) => {
    if (!window.matchMedia(DESKTOP_QUERY).matches || !aboutDialog || !footerAboutButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (aboutDialog.open && aboutDialog.classList.contains('about-dialog--footer-popover')) {
      closeAboutPopover({ restoreFocus: true });
      return;
    }
    if (aboutDialog.open) aboutDialog.close();
    window.requestAnimationFrame(showFooterAboutPopover);
  };

  footerAboutButton?.addEventListener('click', openFooterAboutPopover, { capture: true });
  aboutDialog?.addEventListener('close', clearAboutPopover);
  aboutDialog?.addEventListener('click', (event) => {
    if (event.target !== aboutDialog || aboutDialog.classList.contains('about-dialog--footer-popover')) return;
    aboutDialog.close();
  });

  document.addEventListener('click', (event) => {
    if (!aboutDialog?.open || !aboutDialog.classList.contains('about-dialog--footer-popover')) return;
    if (aboutDialog.contains(event.target) || footerAboutButton?.contains(event.target)) return;
    closeAboutPopover();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAboutPopover({ restoreFocus: true });
  });

  window.addEventListener('resize', () => closeAboutPopover());

  const loadFrame = () => {
    if (frame.hasAttribute('src') || !frame.dataset.src) return;
    frame.setAttribute('src', frame.dataset.src);
  };

  const openDialog = () => {
    loadFrame();
    if (aboutDialog?.open) aboutDialog.close();
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
