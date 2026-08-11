import './final-functional-stabilization.mjs';
import './map-mobile-refinement.mjs';
import './map-profile-first-pass.mjs';
import './mobile-tab-location-refinement.mjs';
import './map-profile-aesthetic-refinement.mjs';
import './search-map-refinement.mjs';
import './map-profile-final-pass.mjs';
import { markerKind } from './core.mjs';
import { createIcon, inlineSpriteIcons } from './icons.mjs';

let appConnected = false;
let appConnectAttempts = 0;
let detailLocalMap = null;
let detailLocalMapContainer = null;
let detailLocalMapVenueId = '';
const APP_CONNECT_MAX_ATTEMPTS = 1200;
const DETAIL_HIERARCHY_STYLE_ID = 'cgb-desktop-detail-hierarchy';
const DETAIL_MAP_STYLE_ID = '019997ef-99cb-7052-b842-98cc3dbf3d7c';
const DETAIL_MAP_ZOOM = 17;

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
    const detail = Boolean(row.closest('#venue-detail'));
    const hasWatchParty = Boolean(container?.querySelector(':scope > .party-module'));
    const icon = share.querySelector('.ui-icon');
    share.replaceChildren();
    if (icon) share.append(icon);
    share.append(document.createTextNode(detail ? 'Share' : hasWatchParty ? 'Share Watch Party' : 'Share'));
  });
}

function installDesktopDetailHierarchy() {
  if (document.getElementById(DETAIL_HIERARCHY_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DETAIL_HIERARCHY_STYLE_ID;
  style.textContent = `
    body[data-view="detail"] {
      --header-height: calc(118px + env(safe-area-inset-top, 0px));
    }

    body[data-view="detail"] .site-header {
      height: auto !important;
      min-height: var(--header-height) !important;
      display: grid !important;
      grid-template-rows: auto auto !important;
      gap: 8px !important;
      padding-bottom: 10px !important;
    }

    body[data-view="detail"] .opening-stat,
    body[data-view="detail"] .mobile-command-bar,
    body[data-view="detail"] .site-footer {
      display: none !important;
    }

    body[data-view="detail"] #app,
    body[data-view="detail"] .detail-view,
    body[data-view="detail"] .detail-shell {
      min-height: 0 !important;
    }

    body[data-view="detail"] .venue-detail {
      min-height: calc(100dvh - var(--header-height)) !important;
      padding-bottom: calc(126px + env(safe-area-inset-bottom, 0px)) !important;
    }

    body[data-view="detail"] .detail-game-context {
      display: none !important;
    }

    body[data-view="detail"] .detail-hero.detail-hero--no-photo {
      min-height: 0 !important;
      display: block !important;
      padding: 12px 16px 17px !important;
      color: var(--cgb-ink-900) !important;
      background: var(--cgb-white) !important;
      overflow: visible !important;
    }

    body[data-view="detail"] .detail-hero.detail-hero--no-photo::before,
    body[data-view="detail"] .detail-hero.detail-hero--no-photo::after {
      display: none !important;
    }

    body[data-view="detail"] .detail-hero.detail-hero--no-photo > * {
      position: relative !important;
      z-index: 1 !important;
    }

    body[data-view="detail"] .detail-hero.detail-hero--no-photo .venue-badges {
      position: static !important;
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      margin: 12px 0 0 !important;
    }

    body[data-view="detail"] .detail-local-map {
      position: relative !important;
      z-index: 0 !important;
      width: 100% !important;
      height: 138px !important;
      margin: 0 !important;
      overflow: hidden !important;
      background: var(--cgb-neutral-100) !important;
      border: 1px solid var(--cgb-neutral-200) !important;
      border-radius: 14px !important;
      clip-path: none !important;
    }

    body[data-view="detail"] .detail-local-map canvas {
      cursor: default !important;
    }

    body[data-view="detail"] .detail-local-map .maplibregl-control-container {
      display: none !important;
    }

    body[data-view="detail"] .detail-local-map__marker {
      pointer-events: none !important;
    }

    body[data-view="detail"] .detail-local-map__fallback {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: var(--cgb-ink-500);
      font-size: var(--text-xs);
      font-weight: 700;
    }

    body[data-view="detail"] .detail-hero h1 {
      overflow-wrap: anywhere !important;
    }

    body[data-view="detail"] .detail-address {
      overflow-wrap: anywhere !important;
    }

    body[data-view="detail"] .detail-address-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    body[data-view="detail"] .detail-directions-inline,
    body[data-view="detail"] .detail-website-inline {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--cgb-navy-900);
      font-size: var(--text-xs);
      font-weight: 800;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
    }

    body[data-view="detail"] .detail-description {
      margin: 8px 0 0 !important;
      color: var(--cgb-ink-700) !important;
      font-size: var(--text-sm) !important;
      line-height: 1.48 !important;
    }

    body[data-view="detail"] .activity-card {
      margin: 12px 16px 0 !important;
      padding: 14px 16px !important;
      color: var(--cgb-navy-950) !important;
      background: var(--cgb-white) !important;
      border: 1px solid var(--cgb-neutral-200) !important;
      border-radius: 14px !important;
      clip-path: none !important;
      box-shadow: none !important;
    }

    body[data-view="detail"] .activity-card::before {
      display: none !important;
    }

    body[data-view="detail"] .activity-card > strong {
      display: flex !important;
      align-items: baseline !important;
      gap: 6px !important;
      color: var(--cgb-navy-950) !important;
      font-size: var(--text-sm) !important;
      line-height: 1.18 !important;
    }

    body[data-view="detail"] .activity-card .bear-count__number {
      flex: 0 0 auto;
      color: var(--cgb-navy-950) !important;
      font-family: var(--font-display) !important;
      font-size: 1.8rem !important;
      font-weight: 750 !important;
      line-height: .9 !important;
    }

    body[data-view="detail"] .activity-card .bear-count__label {
      color: var(--cgb-navy-950) !important;
      font-size: var(--text-sm) !important;
      font-weight: 800 !important;
    }

    body[data-view="detail"] .activity-card p {
      margin-top: 6px !important;
      color: var(--cgb-ink-500) !important;
    }

    body[data-view="detail"] .venue-detail > .party-module {
      max-height: none !important;
      overflow: visible !important;
      overscroll-behavior: auto !important;
      display: grid !important;
      gap: 5px !important;
      margin: 14px 16px 0 !important;
      padding: 13px 14px !important;
      color: var(--cgb-navy-950) !important;
      background: linear-gradient(135deg, var(--cgb-gold-50), var(--cgb-white) 82%) !important;
      border: 1px solid var(--cgb-gold-200) !important;
      border-left: 4px solid var(--cgb-gold-400) !important;
      border-radius: 14px !important;
      clip-path: none !important;
      box-shadow: none !important;
    }

    body[data-view="detail"] .venue-detail > .party-module .party-module__title,
    body[data-view="detail"] .venue-detail > .party-module .party-meta {
      color: var(--cgb-navy-950) !important;
    }

    body[data-view="detail"] .venue-detail > .party-module p {
      margin: 0 !important;
      color: var(--cgb-ink-700) !important;
      font-size: var(--text-sm) !important;
      line-height: 1.35 !important;
    }

    body[data-view="detail"] .venue-detail > .party-module a {
      width: fit-content !important;
      color: var(--cgb-navy-900) !important;
      font-weight: 800 !important;
    }

    body[data-view="detail"] .badge--fan-added {
      color: var(--cgb-ink-700) !important;
      background: var(--cgb-neutral-50) !important;
      border-color: var(--cgb-neutral-300) !important;
      font-size: .6rem !important;
      font-weight: 800 !important;
    }

    body[data-view="detail"] .detail-contribution {
      margin: 14px 16px 0;
      padding: 13px 14px;
      background: var(--cgb-white);
      border: 1px solid var(--cgb-neutral-200);
      border-radius: 14px;
    }

    body[data-view="detail"] .detail-contribution h2 {
      margin: 0 0 8px;
      color: var(--cgb-navy-950);
      font-family: var(--font-display);
      font-size: 1rem;
      line-height: 1.15;
    }

    body[data-view="detail"] .detail-contribution__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
    }

    body[data-view="detail"] .detail-contribution__action {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      padding: 5px 0;
      color: var(--cgb-navy-900);
      background: transparent;
      border: 0;
      border-radius: 0;
      font-size: var(--text-xs);
      font-weight: 800;
      line-height: 1.25;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
    }

    body[data-view="detail"] .post-join-invitation.detail-post-join-invitation {
      margin: 12px 16px 0;
      border-radius: 14px;
    }

    body[data-view="detail"] .venue-detail > .action-row.detail-primary-actions {
      position: sticky !important;
      z-index: 8 !important;
      bottom: 0 !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(96px, .42fr) !important;
      gap: 8px !important;
      margin: 16px 0 0 !important;
      padding: 10px max(14px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom, 0px)) max(14px, env(safe-area-inset-left)) !important;
      background: rgba(255, 255, 255, .97) !important;
      border-top: 1px solid var(--cgb-neutral-200) !important;
      box-shadow: 0 -8px 22px rgba(1, 1, 51, .08) !important;
      backdrop-filter: blur(14px) !important;
    }

    body[data-view="detail"] .venue-detail > .action-row.detail-primary-actions > .intent-button,
    body[data-view="detail"] .venue-detail > .action-row.detail-primary-actions > .detail-share {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 50px !important;
      border-radius: 12px !important;
      clip-path: none !important;
    }

    body[data-view="detail"] .venue-detail > .action-row.detail-primary-actions > .detail-share {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 7px !important;
      color: var(--cgb-navy-900) !important;
      background: var(--cgb-white) !important;
      border: 1px solid var(--cgb-neutral-300) !important;
      font-weight: 800 !important;
    }

    @media (max-width: 359px) {
      body[data-view="detail"] {
        --header-height: calc(112px + env(safe-area-inset-top, 0px));
      }

      body[data-view="detail"] .site-header {
        padding-inline: max(10px, env(safe-area-inset-left)) !important;
      }

      body[data-view="detail"] .detail-local-map {
        height: 124px !important;
      }

      body[data-view="detail"] .detail-hero.detail-hero--no-photo {
        padding-inline: 12px !important;
      }
    }

    @media (max-width: 899px) and (orientation: landscape) and (max-height: 500px) {
      body[data-view="detail"] {
        --header-height: calc(62px + env(safe-area-inset-top, 0px));
      }

      body[data-view="detail"] .site-header {
        min-height: var(--header-height) !important;
        grid-template-columns: minmax(180px, 1fr) minmax(250px, 320px) !important;
        grid-template-rows: 1fr !important;
        gap: 12px !important;
        padding-block: calc(env(safe-area-inset-top, 0px) + 5px) 5px !important;
      }

      body[data-view="detail"] .venue-detail {
        display: block !important;
        min-height: 0 !important;
      }

      body[data-view="detail"] .detail-hero,
      body[data-view="detail"] .detail-hero.detail-hero--no-photo {
        min-height: 0 !important;
        display: block !important;
        padding: 10px 14px 14px !important;
      }

      body[data-view="detail"] .detail-local-map {
        height: 120px !important;
      }

      body[data-view="detail"] .venue-detail > :not(.detail-hero) {
        grid-column: auto !important;
      }
    }

    @media (min-width: 900px) {
      body[data-view="detail"] {
        --header-height: 88px;
      }

      body[data-view="detail"] .site-header {
        min-height: var(--header-height) !important;
        grid-template-columns: minmax(230px, 1fr) minmax(310px, 430px) !important;
        grid-template-rows: 1fr !important;
        gap: clamp(20px, 4vw, 60px) !important;
        padding-block: 10px !important;
      }

      body[data-view="detail"] .detail-shell {
        max-width: 1180px !important;
        padding: 20px !important;
      }

      body[data-view="detail"] .back-link {
        top: 30px !important;
        left: 30px !important;
      }

      body[data-view="detail"] .venue-detail {
        display: grid !important;
        grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr) !important;
        align-items: start !important;
        gap: 0 !important;
        overflow: visible !important;
        border-radius: 18px !important;
      }

      body[data-view="detail"] .detail-hero {
        grid-column: 1 !important;
        grid-row: 1 / span 8 !important;
        min-height: 360px;
        padding: 172px 40px 34px;
      }

      body[data-view="detail"] .detail-hero.detail-hero--no-photo {
        grid-row: 1 / span 8 !important;
        min-height: 0 !important;
        padding: 18px 20px 22px !important;
      }

      body[data-view="detail"] .detail-local-map {
        height: 250px !important;
      }

      body[data-view="detail"] .detail-hero.detail-hero--no-photo .venue-badges {
        margin-top: 14px !important;
      }

      body[data-view="detail"] .venue-detail > :not(.detail-hero) {
        grid-column: 2 !important;
      }

      body[data-view="detail"] .venue-detail > .action-row.detail-primary-actions {
        align-self: end !important;
      }
    }
  `;
  document.head.append(style);
}

function destroyDetailLocalMap() {
  try { detailLocalMap?.remove?.(); } catch (_) {}
  detailLocalMap = null;
  detailLocalMapContainer = null;
  detailLocalMapVenueId = '';
}

function detailVenue(state) {
  return state?.snapshot?.venues?.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function createDetailLocalMarker(venue, state) {
  const kind = markerKind(state.snapshot, state.gameId, venue);
  const marker = document.createElement('div');
  marker.className = `cgb-marker marker--${kind} is-selected detail-local-map__marker`;
  marker.dataset.kind = kind;
  marker.setAttribute('aria-hidden', 'true');
  const symbol = document.createElement('span');
  symbol.className = kind === 'watch-party' ? 'marker-star' : 'marker-pin';
  symbol.setAttribute('aria-hidden', 'true');
  if (kind === 'watch-party') symbol.textContent = '★';
  marker.append(symbol);
  return marker;
}

function syncDetailLocalMap(hero, venue, state) {
  if (!hero?.classList.contains('detail-hero--no-photo') || venue.photo_url) {
    destroyDetailLocalMap();
    hero?.querySelector('.detail-local-map')?.remove();
    return;
  }

  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  if (![latitude, longitude].every(Number.isFinite)) {
    destroyDetailLocalMap();
    return;
  }

  let container = hero.querySelector('.detail-local-map');
  if (!container) {
    container = document.createElement('div');
    container.className = 'detail-local-map';
    container.dataset.venueId = venue.venue_id;
    container.dataset.latitude = String(latitude);
    container.dataset.longitude = String(longitude);
    container.dataset.zoom = String(DETAIL_MAP_ZOOM);
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', `Local map centered on ${venue.name}`);
    hero.prepend(container);
  }

  if (detailLocalMap && detailLocalMapContainer === container && detailLocalMapVenueId === venue.venue_id) {
    return;
  }

  destroyDetailLocalMap();
  detailLocalMapContainer = container;
  detailLocalMapVenueId = venue.venue_id;

  if (!window.maplibregl?.Map || !window.maplibregl?.Marker) {
    const fallback = document.createElement('span');
    fallback.className = 'detail-local-map__fallback';
    fallback.textContent = 'Map unavailable';
    container.append(fallback);
    return;
  }

  const key = String(window.CGBApp?.mapTilerKey || '').trim();
  if (!key) return;
  const style = `https://api.maptiler.com/maps/${DETAIL_MAP_STYLE_ID}/style.json?key=${encodeURIComponent(key)}`;
  detailLocalMap = new window.maplibregl.Map({
    container,
    style,
    center: [longitude, latitude],
    zoom: DETAIL_MAP_ZOOM,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0
  });
  detailLocalMap.on('error', (event) => console.warn('Detail map error', event?.error || event));
  new window.maplibregl.Marker({
    element: createDetailLocalMarker(venue, state),
    anchor: 'bottom'
  }).setLngLat([longitude, latitude]).addTo(detailLocalMap);
  requestAnimationFrame(() => detailLocalMap?.resize?.());
}

function refineDetailBadges(detail, venue) {
  const badges = detail.querySelector('.detail-hero .venue-badges');
  if (!badges) return;
  Array.from(badges.children).forEach((badge) => {
    if (/community location/i.test(badge.textContent)) badge.remove();
  });
  badges.querySelector('.badge--fan-added')?.remove();
  const fanAdded = venue.venue_type !== 'cal_bar' && venue.verification_status === 'user_added';
  if (!fanAdded) return;
  const badge = document.createElement('span');
  badge.className = 'venue-badge badge--fan-added';
  badge.textContent = 'FAN-ADDED';
  badges.append(badge);
}

function refineDetailIdentity(detail, venue) {
  const hero = detail.querySelector('.detail-hero');
  const address = hero?.querySelector('.detail-address');
  const actionRow = detail.querySelector(':scope > .action-row');
  if (!hero || !address || !actionRow) return hero;

  let addressActions = hero.querySelector('.detail-address-actions');
  if (!addressActions) {
    addressActions = document.createElement('div');
    addressActions.className = 'detail-address-actions';
    address.insertAdjacentElement('afterend', addressActions);
  }

  const directions = Array.from(actionRow.querySelectorAll(':scope > a'))
    .find((link) => /^Directions$/i.test(link.textContent.trim()));
  if (directions) {
    directions.className = 'detail-directions-inline';
    directions.querySelectorAll('.ui-icon').forEach((icon) => icon.remove());
    directions.replaceChildren(createIcon('directions'), document.createTextNode('Directions'));
    addressActions.append(directions);
  }

  const website = detail.querySelector(':scope > .venue-website');
  if (website) {
    website.classList.add('detail-website-inline');
    website.querySelectorAll('.ui-icon').forEach((icon) => icon.remove());
    website.replaceChildren(createIcon('external'), document.createTextNode('Visit venue website'));
    addressActions.append(website);
  }

  const description = detail.querySelector(':scope > .detail-description');
  if (description) {
    description.hidden = false;
    addressActions.insertAdjacentElement('afterend', description);
  }

  refineDetailBadges(detail, venue);
  return hero;
}

function refineDetailAttendance(detail) {
  const primary = detail.querySelector(':scope > .activity-card > strong');
  if (!primary) return;
  const raw = primary.getAttribute('aria-label') || primary.textContent.trim();
  const match = raw.match(/^(\d+)\s+Bear(?:s)?\s+watching here/i);
  if (!match) return;
  const number = Number(match[1]);
  const numeral = document.createElement('span');
  numeral.className = 'bear-count__number';
  numeral.textContent = String(number);
  const label = document.createElement('span');
  label.className = 'bear-count__label';
  label.textContent = number === 1 ? 'Bear watching here' : 'Bears watching here';
  primary.setAttribute('aria-label', raw);
  primary.replaceChildren(numeral, label);
}

function refineDetailPartyLinks(detail) {
  detail.querySelectorAll(':scope > .party-module a[target="_blank"]:not(.party-module__report)').forEach((link) => {
    const icon = link.querySelector('.ui-icon') || createIcon('external');
    link.replaceChildren(document.createTextNode('External event details'), icon);
  });
}

function refineDetailContribution(detail, actionRow) {
  const existing = detail.querySelector(':scope > .detail-contribution');
  const sources = Array.from(detail.querySelectorAll(
    ':scope > [data-watch-party-form-entry-point], :scope > [data-cal-bar-nomination-entry], :scope > [data-listing-update-entry]'
  ));
  if (!sources.length) return existing;
  existing?.remove();

  const links = [];
  sources.forEach((source) => {
    const link = source.querySelector('a[href]');
    if (link) links.push(link);
    source.remove();
  });
  if (!links.length) return null;

  const section = document.createElement('section');
  section.className = 'detail-contribution';
  const heading = document.createElement('h2');
  heading.textContent = 'Help improve this listing';
  const actions = document.createElement('div');
  actions.className = 'detail-contribution__actions';

  links.forEach((link) => {
    link.className = 'detail-contribution__action';
    link.textContent = link.textContent.trim().replace(/\.$/, '');
    actions.append(link);
  });
  section.append(heading, actions);
  detail.insertBefore(section, actionRow || null);
  return section;
}

function refineDetailPrimaryActions(detail) {
  const row = detail.querySelector(':scope > .action-row');
  if (!row) return null;
  row.classList.add('detail-primary-actions');

  Array.from(row.querySelectorAll(':scope > a, :scope > button')).forEach((action) => {
    if (action.classList.contains('intent-button')) return;
    if (/^Share(?: Watch Party)?$/i.test(action.textContent.trim())) return;
    if (/^Directions$/i.test(action.textContent.trim())) return;
    action.remove();
  });

  const share = Array.from(row.querySelectorAll(':scope > button'))
    .find((button) => /^Share(?: Watch Party)?$/i.test(button.textContent.trim()));
  if (share) {
    share.classList.add('detail-share');
    share.replaceChildren(createIcon('share'), document.createTextNode('Share'));
  }

  const invitation = row.querySelector(':scope > .post-join-invitation');
  if (invitation) {
    invitation.classList.add('detail-post-join-invitation');
    detail.insertBefore(invitation, row);
  }
  return row;
}

function refineVenueDetail(root = document) {
  const detail = root.querySelector('#venue-detail');
  const state = window.CGBApp?.getState?.();
  const venue = detailVenue(state);
  if (!detail || !state?.detailMode || !venue) {
    destroyDetailLocalMap();
    return;
  }

  detail.querySelector(':scope > .detail-game-context')?.remove();
  const hero = refineDetailIdentity(detail, venue);
  refineDetailAttendance(detail);
  refineDetailPartyLinks(detail);
  const actionRow = refineDetailPrimaryActions(detail);
  const contribution = refineDetailContribution(detail, actionRow);

  const invitation = detail.querySelector(':scope > .detail-post-join-invitation');
  if (invitation && contribution) detail.insertBefore(invitation, contribution);
  if (actionRow) detail.append(actionRow);
  syncDetailLocalMap(hero, venue, state);
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

function runRefinements() {
  upgradeRenderedIcons();
  refineVenueDetail();
}

function scheduleUpgrade() {
  requestAnimationFrame(() => {
    runRefinements();
    requestAnimationFrame(runRefinements);
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
  runRefinements();
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
