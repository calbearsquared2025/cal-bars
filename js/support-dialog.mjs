const DESKTOP_QUERY = '(min-width: 900px)';

function initializeSupportDialog() {
  const dialog = document.querySelector('#support-dialog');
  const frame = document.querySelector('#kofiframe');
  const aboutDialog = document.querySelector('#about-dialog');
  const footerAboutButton = document.querySelector('#about-button');
  const footerSupportButton = document.querySelector('.site-footer [data-support-open]');
  const openButtons = Array.from(document.querySelectorAll('[data-support-open]'));
  if (!dialog || !frame || openButtons.length === 0) return;

  if (footerSupportButton) {
    const separator = footerSupportButton.previousElementSibling;
    footerSupportButton.hidden = true;
    if (separator?.getAttribute('aria-hidden') === 'true') separator.hidden = true;
  }

  const clearAboutPopover = () => {
    aboutDialog?.classList.remove('about-dialog--footer-popover');
    aboutDialog?.style.removeProperty('--footer-popover-left');
    aboutDialog?.style.removeProperty('--footer-popover-bottom');
  };

  const closeAboutPopover = ({ restoreFocus = false } = {}) => {
    if (!aboutDialog?.open || !aboutDialog.classList.contains('about-dialog--footer-popover')) return;
    aboutDialog.close();
    if (restoreFocus) footerAboutButton?.focus();
  };

  const openFooterAboutPopover = (event) => {
    if (!event.isTrusted || !window.matchMedia(DESKTOP_QUERY).matches || !aboutDialog || !footerAboutButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (aboutDialog.open) aboutDialog.close();

    const rect = footerAboutButton.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.min(
      Math.max(16, rect.left + (rect.width / 2) - (width / 2)),
      window.innerWidth - width - 16
    );
    const bottom = Math.max(16, window.innerHeight - rect.top + 8);

    aboutDialog.style.setProperty('--footer-popover-left', `${Math.round(left)}px`);
    aboutDialog.style.setProperty('--footer-popover-bottom', `${Math.round(bottom)}px`);
    aboutDialog.classList.add('about-dialog--footer-popover');
    aboutDialog.show();
  };

  footerAboutButton?.addEventListener('click', openFooterAboutPopover, { capture: true });
  aboutDialog?.addEventListener('close', clearAboutPopover);

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
