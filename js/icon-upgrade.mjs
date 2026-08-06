import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import './map-profile-final-pass.mjs';
import { createIcon, inlineSpriteIcons, setIcon } from './icons.mjs';

function replaceTextWithIcon(element, iconName, className = 'ui-icon') {
  if (!element || element.querySelector('.ui-icon')) return;
  element.replaceChildren(createIcon(iconName, { className }));
}

function prependIcon(element, iconName) {
  if (!element || element.querySelector('.ui-icon')) return;
  element.prepend(createIcon(iconName));
}

function appendIcon(element, iconName) {
  if (!element || element.querySelector('.ui-icon')) return;
  element.append(createIcon(iconName));
}

function actionIconName(element) {
  const label = element.textContent.trim().toLowerCase();
  if (label === 'directions') return 'directions';
  if (label === 'view details' || label === 'details') return 'details';
  if (label === 'share') return 'share';
  return null;
}

export function upgradeRenderedIcons(root = document) {
  inlineSpriteIcons(root);

  root.querySelectorAll('.marker-star').forEach((star) => {
    replaceTextWithIcon(star, 'star', 'ui-icon marker-star__icon');
  });

  root.querySelectorAll('.party-module__title > span').forEach((star) => {
    replaceTextWithIcon(star, 'star');
  });

  root.querySelectorAll('.selected-card__header > .icon-button').forEach((button) => {
    replaceTextWithIcon(button, 'chevron-down');
  });

  root.querySelectorAll('.action-row > a, .action-row > button').forEach((action) => {
    const iconName = actionIconName(action);
    if (iconName) prependIcon(action, iconName);
  });

  root.querySelectorAll('.venue-website').forEach((link) => prependIcon(link, 'external'));
  root.querySelectorAll('.party-module a[target="_blank"]:not(.party-module__report)')
    .forEach((link) => appendIcon(link, 'external'));
}

function syncFullscreenIcon() {
  const button = document.querySelector('#fullscreen-button');
  const icon = button?.querySelector('.ui-icon');
  if (!button || !icon) return;

  const active = button.getAttribute('aria-pressed') === 'true';
  setIcon(icon, active ? 'compress' : 'fullscreen');

  let label = button.querySelector('.fullscreen-button__label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'fullscreen-button__label';
    button.append(label);
  }

  label.textContent = active ? 'Exit' : 'Full screen';
  button.setAttribute('aria-label', active ? 'Exit full-screen map' : 'Enter full-screen map');
}

function syncListLocationLabel() {
  const button = document.querySelector('#clear-search-button');
  if (!button) return;
  const usingLocation = Boolean(window.CGBApp?.getState?.()?.origin);
  button.hidden = false;
  button.textContent = usingLocation ? 'All locations' : 'Near me';
  button.setAttribute('aria-label', usingLocation
    ? 'Show all mapped locations'
    : 'Use my location to show nearby locations');
}

function scheduleUpgrade() {
  requestAnimationFrame(() => {
    upgradeRenderedIcons();
    syncFullscreenIcon();
  });
}

function initialize() {
  upgradeRenderedIcons();
  syncFullscreenIcon();

  const fullscreen = document.querySelector('#fullscreen-button');
  fullscreen?.addEventListener('click', () => requestAnimationFrame(syncFullscreenIcon));
  document.querySelector('#mobile-list-button')?.addEventListener('click', () => {
    requestAnimationFrame(syncListLocationLabel);
  });

  window.CGBApp?.subscribe?.('rendered', scheduleUpgrade);
  window.CGBApp?.subscribe?.('ready', scheduleUpgrade);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
