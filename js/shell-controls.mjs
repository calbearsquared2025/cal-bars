function syncViewState() {
  const detailVisible = !document.querySelector('#detail-view')?.hidden;
  document.body.dataset.view = detailVisible ? 'detail' : 'map';

  const trayState = document.querySelector('#venue-tray')?.dataset.state || 'peek';
  document.querySelector('#mobile-map-button')?.classList.toggle('mobile-command--active', trayState === 'peek');
  document.querySelector('#mobile-list-button')?.classList.toggle('mobile-command--active', trayState !== 'peek');
}

function showMap() {
  const tray = document.querySelector('#venue-tray');
  if (!tray || tray.dataset.state === 'peek') return;

  if (tray.dataset.state === 'full') {
    document.querySelector('#close-list-button')?.click();
    return;
  }

  document.querySelector('.selected-card__header .icon-button')?.click();
}

function focusSearch() {
  const input = document.querySelector('#location-query');
  if (!input) return;
  showMap();
  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.select?.();
  });
}

function showNearby() {
  const tray = document.querySelector('#venue-tray');
  if (!tray || tray.dataset.state === 'full') return;
  document.querySelector('#tray-handle')?.click();
}

function initializeShellControls() {
  document.querySelector('#header-about-button')?.addEventListener('click', () => {
    document.querySelector('#about-button')?.click();
  });
  document.querySelector('#mobile-map-button')?.addEventListener('click', showMap);
  document.querySelector('#mobile-search-button')?.addEventListener('click', focusSearch);
  document.querySelector('#mobile-list-button')?.addEventListener('click', showNearby);
  document.querySelector('#mobile-game-button')?.addEventListener('click', () => {
    document.querySelector('#game-button')?.click();
  });

  syncViewState();
  window.CGBApp?.subscribe?.('rendered', syncViewState);
  window.CGBApp?.subscribe?.('ready', syncViewState);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeShellControls, { once: true });
} else {
  initializeShellControls();
}
