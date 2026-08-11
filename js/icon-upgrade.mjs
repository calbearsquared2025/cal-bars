import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import './map-profile-final-pass.mjs';
import './watch-party-attendance-commitment.mjs';
import { createIcon, inlineSpriteIcons } from './icons.mjs';

let appConnected = false;
let appConnectAttempts = 0;
const APP_CONNECT_MAX_ATTEMPTS = 1200;
const DETAIL_HIERARCHY_STYLE_ID = 'cgb-desktop-detail-hierarchy';

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
  if (label === 'share' || label === 'share watch party') return 'share';
  return null;
}

function clarifyShareLabels(root = document) {
  root.querySelectorAll('.action-row').forEach((row) => {
    const share = Array.from(row.querySelectorAll(':scope > button'))
      .find((button) => /^Share(?: Watch Party)?$/i.test(button.textContent.trim()));
    if (!share) return;
    const container = row.parentElement;
    const hasWatchParty = Boolean(container?.querySelector(':scope > .party-module'));
    const icon = share.querySelector('.ui-icon');
    share.replaceChildren();
    if (icon) share.append(icon);
    share.append(document.createTextNode(hasWatchParty ? 'Share Watch Party' : 'Share'));
  });
}

function installDesktopDetailHierarchy() {
  if (document.getElementById(DETAIL_HIERARCHY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DETAIL_HIERARCHY_STYLE_ID;
  style.textContent = `
    @media (min-width: 900px) {
      body[data-view="detail"] .venue-detail {
        grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr);
      }

      body[data-view="detail"] .detail-hero {
        grid-row: 1 / span 4;
        min-height: 360px;
        padding: 172px 40px 34px;
      }

      body[data-view="detail"] .detail-hero::after {
        left: 18px;
        right: 18px;
        height: 174px;
      }

      body[data-view="detail"] .detail-hero .venue-badges {
        bottom: 157px;
        left: 34px;
      }

      body[data-view="detail"] .detail-game-context {
        margin-top: 20px;
      }
    }
  `;
  document.head.append(style);
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

  clarifyShareLabels(root);
  root.querySelectorAll('.action-row > a, .action-row > button').forEach((action) => {
    const iconName = actionIconName(action);
    if (iconName) prependIcon(action, iconName);
  });

  root.querySelectorAll('.venue-website').forEach((link) => prependIcon(link, 'external'));
  root.querySelectorAll('.party-module a[target="_blank"]:not(.party-module__report)')
    .forEach((link) => appendIcon(link, 'external'));
}

function scheduleUpgrade() {
  requestAnimationFrame(() => {
    upgradeRenderedIcons();
  });
}

function connectApp() {
  if (appConnected) return;
  const app = window.CGBApp;
  if (!app?.subscribe) {
    appConnectAttempts += 1;
    if (appConnectAttempts <= APP_CONNECT_MAX_ATTEMPTS) {
      window.setTimeout(connectApp, 25);
    }
    return;
  }

  appConnected = true;
  window.CGBApp?.subscribe?.('rendered', scheduleUpgrade);
  window.CGBApp?.subscribe?.('ready', scheduleUpgrade);
  scheduleUpgrade();
}

function initialize() {
  installDesktopDetailHierarchy();
  upgradeRenderedIcons();
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
