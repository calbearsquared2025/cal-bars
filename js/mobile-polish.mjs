import {
  bearCountCopy,
  getWatchParty,
  markerKind,
  NEARBY_RADIUS_MILES,
  rankVenues,
  venueTypeLabel
} from './core.mjs';

const MOBILE_QUERY = '(max-width: 899px)';

function appState() {
  return window.CGBApp?.getState?.() || null;
}

function formatDistance(distance) {
  const value = Number(distance);
  if (!Number.isFinite(value)) return '';
  if (value < 0.1) return '<0.1 mi';
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} mi`;
}

function rankedLead(state = appState()) {
  if (!state?.snapshot || !state.gameId) return null;
  return rankVenues(state.snapshot, state.gameId, state.origin)?.[0] || null;
}

function updatePeek() {
  const state = appState();
  const lead = rankedLead(state);
  const title = document.querySelector('#tray-summary-title');
  const copy = document.querySelector('#tray-summary-copy');
  const count = document.querySelector('#tray-summary-count');
  const marker = document.querySelector('#tray-summary-marker');
  const button = document.querySelector('#browse-locations-button');
  if (!title || !copy || !count || !marker || !button) return;

  if (!lead) {
    title.textContent = 'Find your Cal crowd';
    copy.textContent = 'Tap a pin or open List to browse locations.';
    count.textContent = '';
    marker.dataset.kind = 'community-location';
    button.setAttribute('aria-label', 'Browse gathering locations');
    return;
  }

  const { venue, party, fanCount, distance } = lead;
  const type = party ? 'Watch Party' : venueTypeLabel(venue);
  const meta = [type, formatDistance(distance), 'Open List'].filter(Boolean).join(' · ');
  title.textContent = venue.name;
  copy.textContent = meta;
  count.textContent = bearCountCopy(fanCount);
  marker.dataset.kind = markerKind(state.snapshot, state.gameId, venue);
  button.setAttribute('aria-label', `Browse locations. First result: ${venue.name}, ${meta}`);
}

function updateListHeading() {
  const state = appState();
  const heading = document.querySelector('#list-heading');
  const eyebrow = document.querySelector('.tray-list__header .eyebrow');
  if (!state || !heading || !eyebrow || state.listQuery) return;
  heading.textContent = state.origin ? 'Nearby' : 'Locations';
  eyebrow.textContent = state.origin ? `Within ${NEARBY_RADIUS_MILES} miles` : 'Browse';
}

function updateAddContext() {
  const state = appState();
  const context = document.querySelector('.add-context');
  const name = document.querySelector('#add-context-name');
  const copy = document.querySelector('#add-context-copy');
  if (!context || !name || !copy) return;
  const venue = state?.snapshot?.venues?.find((item) => item.venue_id === state.selectedVenueId) || null;
  context.hidden = !venue;
  if (!venue) return;
  name.textContent = venue.name;
  const place = [venue.city, venue.region].filter(Boolean).join(', ');
  copy.textContent = place ? `${place} is selected.` : 'This place is selected.';
}

function normalizeSearchLabels() {
  document.querySelectorAll('.search-result-group--existing .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'CGB locations'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__heading')
    .forEach((heading) => { heading.textContent = 'Places'; });
  document.querySelectorAll('.search-result-group--external .search-result-group__note')
    .forEach((note) => { note.textContent = 'Not yet listed in Cal Golden Bars.'; });
}

function setCommandSurface(value) {
  if (!window.matchMedia(MOBILE_QUERY).matches) return;
  document.body.dataset.commandSurface = value;
}

function sync() {
  updatePeek();
  updateListHeading();
  updateAddContext();
  normalizeSearchLabels();
}

function initialize() {
  document.querySelector('#mobile-map-button')?.addEventListener('click', () => setCommandSurface('map'));
  document.querySelector('#mobile-search-button')?.addEventListener('click', () => setCommandSurface('search'));
  document.querySelector('#mobile-add-button')?.addEventListener('click', () => setCommandSurface('add'));
  document.querySelector('#mobile-list-button')?.addEventListener('click', () => requestAnimationFrame(() => setCommandSurface('list')));
  document.querySelectorAll('[data-command-close]').forEach((button) => {
    button.addEventListener('click', () => setCommandSurface('map'));
  });
  document.querySelector('#location-query')?.addEventListener('input', () => requestAnimationFrame(normalizeSearchLabels));
  document.querySelector('#location-search')?.addEventListener('submit', () => requestAnimationFrame(normalizeSearchLabels));

  sync();
  window.CGBApp?.subscribe?.('rendered', sync);
  window.CGBApp?.subscribe?.('ready', sync);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
