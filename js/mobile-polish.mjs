import { NEARBY_RADIUS_MILES } from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';
const VALID_VIEWS = new Set(['map', 'search', 'add', 'list']);
let activeView = 'map';
let openingList = false;
let trayResizeObserver = null;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function numericText(element) {
  const match = String(element?.textContent || '').match(/\d[\d,]*/);
  return match ? match[0] : '—';
}

function renderStat(element, label, detail) {
  if (!element) return;
  const value = numericText(element);
  const number = document.createElement('span');
  number.className = 'opening-stat__number';
  number.textContent = value;
  const copy = document.createElement('span');
  copy.className = 'opening-stat__copy';
  const main = document.createElement('span');
  main.textContent = label;
  const supporting = document.createElement('small');
  supporting.textContent = detail;
  copy.append(main, supporting);
  element.replaceChildren(number, copy);
  element.setAttribute('aria-label', `${value} ${label.toLowerCase()} ${detail.toLowerCase()}`);
}

function updateStatistics() {
  renderStat(document.querySelector('#watch-party-stat'), 'Watch parties', 'for this game');
  renderStat(document.querySelector('#location-stat'), 'Locations', 'on the map');
}

function updateListHeading() {
  const state = appState();
  const heading = document.querySelector('#list-heading');
  const eyebrow = document.querySelector('.tray-list__header .eyebrow');
  if (!state || !heading || !eyebrow || state.listQuery) return;
  heading.textContent = state.origin ? 'Nearby' : 'Locations';
  eyebrow.textContent = state.origin ? `Within ${NEARBY_RADIUS_MILES} miles` : 'Browse';
}

function normalizeSearchLabels() {
  document.querySelectorAll('.search-result-group--existing .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'CGB locations'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'Places'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__note')
    .forEach((note) => { note.textContent = 'Not yet listed in Cal Golden Bars.'; });
}

function syncMapActionTrayOffset() {
  if (!isMobile()) return;
  const tray = document.querySelector('#venue-tray');
  const mapView = document.querySelector('#map-view');
  if (!tray || !mapView) return;
  const height = Math.max(0, Math.round(tray.getBoundingClientRect().height));
  if (height > 0) mapView.style.setProperty('--cgb-mobile-tray-height', `${height}px`);
}

function observeTraySize() {
  const tray = document.querySelector('#venue-tray');
  trayResizeObserver?.disconnect();
  trayResizeObserver = null;
  if (!tray || typeof ResizeObserver !== 'function') {
    syncMapActionTrayOffset();
    return;
  }
  trayResizeObserver = new ResizeObserver(syncMapActionTrayOffset);
  trayResizeObserver.observe(tray);
  syncMapActionTrayOffset();
}

function setActiveView(next) {
  if (!isMobile() || !VALID_VIEWS.has(next)) return;
  activeView = next;
  document.body.dataset.commandSurface = next;
}

function visibleSurface() {
  if (!document.querySelector('#search-surface')?.hidden) return 'search';
  if (!document.querySelector('#add-surface')?.hidden) return 'add';
  return '';
}

function inferActiveView() {
  const surface = visibleSurface();
  if (surface) return surface;
  return document.querySelector('#venue-tray')?.dataset.state === 'full' ? 'list' : 'map';
}

function syncNavigation() {
  setActiveView(inferActiveView());
}

function openListFromMap(event) {
  if (!isMobile() || activeView !== 'map' || openingList) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openingList = true;
  setActiveView('list');
  document.querySelector('#mobile-list-button')?.click();
  requestAnimationFrame(() => { openingList = false; });
}

function handleTrayControl(event) {
  const tray = document.querySelector('#venue-tray');
  if (!isMobile() || activeView !== 'map' || tray?.dataset.state !== 'peek') return;
  openListFromMap(event);
}

function scheduleSync() {
  requestAnimationFrame(() => {
    sync();
    requestAnimationFrame(syncNavigation);
  });
}

function sync() {
  updateStatistics();
  updateListHeading();
  normalizeSearchLabels();
  syncMapActionTrayOffset();
}

function initializeNavigation() {
  const mapButton = document.querySelector('#mobile-map-button');
  const searchButton = document.querySelector('#mobile-search-button');
  const addButton = document.querySelector('#mobile-add-button');
  const listButton = document.querySelector('#mobile-list-button');

  mapButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('map')));
  searchButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('search')));
  addButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('add')));
  listButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('list')));

  document.querySelector('#browse-locations-button')?.addEventListener('click', openListFromMap, { capture: true });
  const trayHandle = document.querySelector('#tray-handle');
  trayHandle?.addEventListener('click', handleTrayControl, { capture: true });
  trayHandle?.addEventListener('pointerup', scheduleSync);
  document.querySelector('#close-list-button')?.addEventListener('click', scheduleSync);
  document.querySelectorAll('[data-command-close]').forEach((button) => {
    button.addEventListener('click', () => requestAnimationFrame(() => setActiveView('map')));
  });
}

function initialize() {
  initializeNavigation();
  observeTraySize();
  document.querySelector('#location-query')?.addEventListener('input', () => requestAnimationFrame(normalizeSearchLabels));
  document.querySelector('#location-search')?.addEventListener('submit', () => requestAnimationFrame(normalizeSearchLabels));

  window.matchMedia(MOBILE_QUERY).addEventListener?.('change', scheduleSync);
  sync();
  syncNavigation();
  window.CGBApp?.subscribe?.('rendered', () => {
    sync();
    syncNavigation();
  });
  window.CGBApp?.subscribe?.('ready', () => {
    sync();
    syncNavigation();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
