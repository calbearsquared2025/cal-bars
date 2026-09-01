const MOBILE_QUERY = '(max-width: 899px)';
const VALID_VIEWS = new Set(['map', 'search', 'add', 'list', 'about']);
let activeView = 'map';
let openingList = false;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function numericText(element) {
  const match = String(element?.textContent || '').match(/\d[\d,]*/);
  return match ? match[0] : '—';
}

function syncStatLayout(element, number, copy) {
  if (isMobile()) {
    element.style.removeProperty('align-items');
    element.style.removeProperty('gap');
    return;
  }

  element.style.alignItems = 'center';
  element.style.gap = '8px';
  number.style.minWidth = '2ch';
  number.style.textAlign = 'right';
  number.style.fontVariantNumeric = 'tabular-nums';
  copy.style.justifyItems = 'start';
  copy.style.textAlign = 'left';
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
  syncStatLayout(element, number, copy);
  element.replaceChildren(number, copy);
  element.setAttribute('aria-label', `${value} ${label.toLowerCase()} ${detail.toLowerCase()}`);
}

function updateStatistics() {
  renderStat(document.querySelector('#watch-party-stat'), 'Watch parties', 'for this game');
  renderStat(document.querySelector('#location-stat'), 'Locations', 'on the map');
}

export function shouldHideOpeningStat({ mobile = false, trayState = 'peek' } = {}) {
  return Boolean(mobile && trayState !== 'peek');
}

function syncOpeningStatVisibility() {
  const panel = document.querySelector('.opening-stat');
  if (!panel) return;
  const trayState = document.querySelector('#venue-tray')?.dataset.state || 'peek';
  panel.hidden = shouldHideOpeningStat({ mobile: isMobile(), trayState });
}

function updateListHeading() {
  if (!isMobile()) return;
  const heading = document.querySelector('#list-heading');
  const eyebrow = document.querySelector('.tray-list__header .eyebrow');
  if (!heading || !eyebrow) return;
  heading.textContent = 'Find your Cal crowd';
  eyebrow.textContent = 'Browse';
}

function normalizeSearchLabels() {
  document.querySelectorAll('.search-result-group--existing .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'CGB locations'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'Places'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__note')
    .forEach((note) => { note.textContent = 'Not yet listed in Cal Golden Bars.'; });
}

function setActiveView(next) {
  if (!isMobile() || !VALID_VIEWS.has(next)) return;
  activeView = next;
  document.body.dataset.commandSurface = next;
}

function visibleSurface() {
  if (!document.querySelector('#search-surface')?.hidden) return 'search';
  if (!document.querySelector('#add-surface')?.hidden) return 'add';
  if (!document.querySelector('#about-surface')?.hidden) return 'about';
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

function scheduleSync() {
  requestAnimationFrame(() => {
    sync();
    requestAnimationFrame(syncNavigation);
  });
}

function sync() {
  updateStatistics();
  syncOpeningStatVisibility();
  updateListHeading();
  normalizeSearchLabels();
}

function initializeNavigation() {
  const mapButton = document.querySelector('#mobile-map-button');
  const searchButton = document.querySelector('#mobile-search-button');
  const addButton = document.querySelector('#mobile-add-button');
  const listButton = document.querySelector('#mobile-list-button');
  const aboutButton = document.querySelector('#mobile-about-button');

  mapButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('map')));
  searchButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('search')));
  addButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('add')));
  listButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('list')));
  aboutButton?.addEventListener('click', () => requestAnimationFrame(() => setActiveView('about')));

  document.querySelector('#browse-locations-button')?.addEventListener('click', openListFromMap, { capture: true });
  const trayHandle = document.querySelector('#tray-handle');
  trayHandle?.addEventListener('pointerup', scheduleSync);
  document.querySelector('#close-list-button')?.addEventListener('click', scheduleSync);
  document.querySelectorAll('[data-command-close]').forEach((button) => {
    button.addEventListener('click', () => requestAnimationFrame(() => setActiveView('map')));
  });
}

function initialize() {
  initializeNavigation();
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
