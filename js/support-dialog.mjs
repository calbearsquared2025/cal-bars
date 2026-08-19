function initializeSupportDialog() {
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
    const aboutDialog = document.querySelector('#about-dialog');
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
