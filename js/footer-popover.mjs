const DEFAULT_DESKTOP_QUERY = '(min-width: 900px)';
const DEFAULT_WIDTH = 440;
const DEFAULT_GAP = 16;
const VIEWPORT_INSET = 16;

export function connectFooterPopover({
  dialog,
  button,
  tray = null,
  mediaQuery = DEFAULT_DESKTOP_QUERY,
  width = DEFAULT_WIDTH,
  gap = DEFAULT_GAP
} = {}) {
  if (!dialog || !button || typeof window === 'undefined' || typeof document === 'undefined') return null;

  const media = window.matchMedia(mediaQuery);

  const clear = () => {
    dialog.classList.remove('about-dialog--footer-popover');
    dialog.style.removeProperty('--about-popover-left');
    dialog.style.removeProperty('--about-popover-bottom');
  };

  const close = ({ restoreFocus = false } = {}) => {
    if (!dialog.open || !dialog.classList.contains('about-dialog--footer-popover')) return false;
    dialog.close();
    if (restoreFocus) button.focus();
    return true;
  };

  const show = () => {
    if (dialog.open) return false;
    clear();

    document.querySelectorAll('dialog.about-dialog--footer-popover[open]').forEach((other) => {
      if (other !== dialog) other.close();
    });

    const buttonRect = button.getBoundingClientRect();
    const trayRect = tray?.getBoundingClientRect();
    const footerRect = button.closest?.('.site-footer')?.getBoundingClientRect?.();
    const popoverWidth = Math.min(width, window.innerWidth - (VIEWPORT_INSET * 2));
    const fallbackLeft = buttonRect.left + (buttonRect.width / 2) - (popoverWidth / 2);
    const left = Math.min(
      Math.max(VIEWPORT_INSET, trayRect ? trayRect.left - popoverWidth - gap : fallbackLeft),
      window.innerWidth - popoverWidth - VIEWPORT_INSET
    );
    const bottom = footerRect
      ? Math.max(VIEWPORT_INSET, window.innerHeight - footerRect.top + gap)
      : VIEWPORT_INSET;

    dialog.style.setProperty('--about-popover-left', `${Math.round(left)}px`);
    dialog.style.setProperty('--about-popover-bottom', `${Math.round(bottom)}px`);
    dialog.classList.add('about-dialog--footer-popover');
    dialog.show();
    return true;
  };

  const toggle = (event) => {
    if (!media.matches) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (dialog.open && dialog.classList.contains('about-dialog--footer-popover')) {
      close({ restoreFocus: true });
      return;
    }

    if (dialog.open) dialog.close();
    window.requestAnimationFrame(show);
  };

  button.addEventListener('click', toggle, { capture: true });
  dialog.addEventListener('close', clear);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener('click', (event) => {
    if (!dialog.open || !dialog.classList.contains('about-dialog--footer-popover')) return;
    if (dialog.contains(event.target) || button.contains(event.target)) return;
    close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close({ restoreFocus: true });
  });

  window.addEventListener('resize', () => close());
  media.addEventListener?.('change', () => close());

  return Object.freeze({ close });
}
