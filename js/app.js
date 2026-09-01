import {
  bearCountCopy,
  buildGameUrl,
  buildVenueShareMessage,
  buildVenueUrl,
  calculateMinimalPan,
  compactVenueLocation,
  findExactVenueMatch,
  formatKickoff,
  gameRouteParam,
  gameTitle,
  getFanCount,
  getWatchPartiesForGame,
  getWatchParty,
  markerKind,
  NEARBY_RADIUS_MILES,
  normalizeSearchText,
  rankNearbyVenues,
  rankVenues,
  resolveGameRouteParam,
  selectDefaultGame,
  shareOrCopy,
  validateSnapshotShape,
  venueBadgeDescriptors,
  venueTypeLabel
} from './core.mjs';
import {
  activeFanIntentVenueId,
  appState as state,
  emitAppEvent,
  markApplicationReady,
  restoreSelectedVenueFromFanIntent,
  setCanonicalSnapshot,
  subscribeAppEvent
} from './app-state.mjs';
import { legacyActivitySeason, venueActivityPresentation } from './venue-activity-core.mjs';
import { createIcon } from './icons.mjs';
import { createSelectedVenueCard } from './selected-profile-renderer.mjs';

const MAPTILER_KEY = 'jNqIsIVa4dP9qv7vQ8fy';
const MAPTILER_STYLE = new URL('../styles/dataviz-with-cgb-states.json', import.meta.url).href;
const LAST_GOOD_KEY = 'cgb_v2_last_good_snapshot';
const DATA_URL_KEY = 'cgb_v2_public_data_url';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_MAP_LAYOUT_WAIT_FRAMES = 2;
const MOBILE_MEDIA_QUERY = '(max-width: 899px)';
const MOBILE_MEDIA = window.matchMedia(MOBILE_MEDIA_QUERY);
const TRAY_SWIPE_THRESHOLD = 48;

const dom = {};
let previousMobileLayout = MOBILE_MEDIA.matches;
let lastExpandedTrayState = null;

function isMobileLayout() {
  return MOBILE_MEDIA.matches;
}

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}

function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (_) {}
}

function storageRemove(key) {
  try { window.localStorage.removeItem(key); } catch (_) {}
}

function configuredEndpoint() {
  return storageGet(DATA_URL_KEY)?.trim() ||
    document.querySelector('meta[name="cgb-data-endpoint"]')?.content.trim() || '';
}

function cacheDom() {
  Object.assign(dom, {
    app: document.querySelector('#app'),
    mapView: document.querySelector('#map-view'),
    detailView: document.querySelector('#detail-view'),
    detailShell: document.querySelector('#detail-view .detail-shell'),
    venueDetail: document.querySelector('#venue-detail'),
    detailBack: document.querySelector('#detail-back'),
    map: document.querySelector('#map'),
    mapToolbar: document.querySelector('.map-toolbar'),
    mapFallback: document.querySelector('#map-fallback'),
    gameButton: document.querySelector('#game-button'),
    gameDialog: document.querySelector('#game-dialog'),
    gameList: document.querySelector('#game-list'),
    headerGameLabel: document.querySelector('#header-game-label'),
    headerKickoff: document.querySelector('#header-kickoff'),
    partyStat: document.querySelector('#watch-party-stat'),
    locationStat: document.querySelector('#location-stat'),
    searchForm: document.querySelector('#location-search'),
    searchInput: document.querySelector('#location-query'),
    searchDropdown: document.querySelector('#search-dropdown'),
    suggestions: document.querySelector('#search-suggestions'),
    addLocationSearch: document.querySelector('#search-add-location-button'),
    nearMe: document.querySelector('#near-me-button'),
    tray: document.querySelector('#venue-tray'),
    trayHandle: document.querySelector('#tray-handle'),
    trayPeek: document.querySelector('#tray-peek'),
    traySelected: document.querySelector('#tray-selected'),
    trayList: document.querySelector('#tray-list'),
    browseButton: document.querySelector('#browse-locations-button'),
    closeList: document.querySelector('#close-list-button'),
    listLocationNearby: document.querySelector('#list-location-nearby'),
    listLocationAll: document.querySelector('#list-location-all'),
    listHeading: document.querySelector('#list-heading'),
    locationList: document.querySelector('#location-list'),
    status: document.querySelector('#status'),
    aboutButton: document.querySelector('#about-button'),
    aboutDialog: document.querySelector('#about-dialog')
  });
}

function showStatus(message, timeout = 2600) {
  if (!dom.status) return;
  dom.status.textContent = message;
  dom.status.hidden = false;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { dom.status.hidden = true; }, timeout);
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadSnapshot() {
  const configured = configuredEndpoint();

  if (configured) {
    try {
      const live = await fetchJson(configured);
      if (!validateSnapshotShape(live)) throw new Error('Unexpected public-data shape');
      storageSet(LAST_GOOD_KEY, JSON.stringify(live));
      return setCanonicalSnapshot(live, 'live');
    } catch (error) {
      console.warn('Live snapshot unavailable; using last-known-good or fallback.', error);
    }
  }

  const cached = storageGet(LAST_GOOD_KEY);
  if (cached) {
    try {
      const snapshot = JSON.parse(cached);
      if (validateSnapshotShape(snapshot)) {
        return setCanonicalSnapshot(snapshot, 'last-known-good');
      }
    } catch (error) {
      console.warn('Ignoring malformed last-known-good snapshot.', error);
    }
  }

  const fallback = await fetchJson('data/fallback-v2.json');
  if (!validateSnapshotShape(fallback)) throw new Error('Fallback snapshot is invalid');
  return setCanonicalSnapshot(fallback, 'fallback');
}

async function refreshSnapshot({ restoreSelection = false } = {}) {
  const endpoint = configuredEndpoint();
  if (!endpoint || !state.snapshot) return false;
  const live = await fetchJson(endpoint);
  if (!validateSnapshotShape(live)) throw new Error('Unexpected public-data shape');
  storageSet(LAST_GOOD_KEY, JSON.stringify(live));
  setCanonicalSnapshot(live, 'live');
  if (restoreSelection) restoreSelectedVenueFromFanIntent({ preserveCurrentWhenEmpty: true });
  renderAll();
  return true;
}

function selectedGame() {
  return state.snapshot.games.find((game) => game.game_id === state.gameId) || null;
}

function selectedVenue() {
  return state.snapshot.venues.find((venue) => venue.venue_id === state.selectedVenueId) || null;
}

function normalizedUserLocation(origin = state.origin) {
  const lat = Number(origin?.lat);
  const lon = Number(origin?.lon);
  if (origin?.label !== 'your location' || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, label: 'your location' };
}

function rememberNearbyOrigin(origin = state.origin) {
  const location = normalizedUserLocation(origin);
  if (location) state.nearbyOrigin = location;
  return state.nearbyOrigin;
}

function initializeRoute() {
  const params = new URLSearchParams(location.search);
  const requestedGame = params.get('game');
  const requestedGameRecord = resolveGameRouteParam(state.snapshot.games, requestedGame);
  const defaultGame = selectDefaultGame(state.snapshot.games);
  state.gameId = requestedGameRecord?.game_id || defaultGame?.game_id || state.snapshot.games[0]?.game_id || null;

  const venueSlug = params.get('venue');
  const venue = state.snapshot.venues.find((item) => item.slug === venueSlug);
  state.detailMode = Boolean(venue);
  state.selectedVenueId = venue?.venue_id || null;

  if (requestedGame && requestedGameRecord) {
    const canonicalGameParam = gameRouteParam(requestedGameRecord);
    if (canonicalGameParam && canonicalGameParam !== requestedGame) {
      const url = new URL(location.href);
      url.searchParams.set('game', canonicalGameParam);
      history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }
}

function updateRouteForGame() {
  const venue = state.detailMode ? selectedVenue() : null;
  const game = selectedGame();
  const nextUrl = venue
    ? buildVenueUrl(venue.slug, game, location.href)
    : buildGameUrl(game, location.href);
  const url = new URL(nextUrl);
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function renderHeaderAndStats() {
  const game = selectedGame();
  dom.headerGameLabel.textContent = gameTitle(game);
  dom.headerKickoff.textContent = formatKickoff(game);
  const partyCount = getWatchPartiesForGame(state.snapshot, state.gameId).length;
  dom.partyStat.textContent = `${partyCount} watch ${partyCount === 1 ? 'party' : 'parties'} for this game`;
  dom.locationStat.textContent = `${state.snapshot.venues.length} locations mapped`;
  if (!state.listQuery) dom.listHeading.textContent = `${gameTitle(game)} locations`;
}

function selectGame(gameId) {
  state.gameId = gameId;
  state.listQuery = '';
  state.origin = null;
  dom.searchInput.value = '';
  if (state.detailMode) {
    state.selectedVenueId = selectedVenue()?.venue_id || state.selectedVenueId;
  } else {
    state.selectedVenueId = activeFanIntentVenueId(gameId);
    setTrayState(state.selectedVenueId ? 'selected' : 'peek');
  }
  updateRouteForGame();
  renderAll();
  renderUserMarker();
}

function renderGameDialog() {
  dom.gameList.replaceChildren();
  const games = [...state.snapshot.games].sort((a, b) =>
    Number(a.season) - Number(b.season) || Number(a.schedule_order) - Number(b.schedule_order));
  games.forEach((game) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-option';
    button.dataset.gameId = game.game_id;
    button.dataset.selected = String(game.game_id === state.gameId);
    const gameInfo = document.createElement('span');
    const gameName = document.createElement('strong');
    gameName.textContent = gameTitle(game);
    const gameTime = document.createElement('small');
    gameTime.textContent = formatKickoff(game);
    gameInfo.append(gameName, gameTime);
    const status = document.createElement('span');
    status.className = 'game-status';
    status.textContent = game.game_status;
    button.append(gameInfo, status);
    button.addEventListener('click', () => {
      selectGame(game.game_id);
      dom.gameDialog.close();
    });
    dom.gameList.append(button);
  });
}

function markerElement(venue) {
  const kind = markerKind(state.snapshot, state.gameId, venue);
  const count = getFanCount(state.snapshot, state.gameId, venue.venue_id);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `cgb-marker marker--${kind}`;
  button.setAttribute('aria-label', `${venue.name}, ${venueTypeLabel(venue)}. ${bearCountCopy(count)}`);
  button.dataset.venueId = venue.venue_id;
  const symbol = document.createElement('span');
  symbol.className = kind === 'watch-party' ? 'marker-star' : 'marker-pin';
  symbol.setAttribute('aria-hidden', 'true');
  if (kind === 'watch-party') symbol.textContent = '★';
  button.append(symbol);
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'marker-count';
    badge.textContent = count === 1 ? '1 Bear' : `${count} Bears`;
    badge.setAttribute('aria-hidden', 'true');
    button.append(badge);
  }
  button.addEventListener('click', () => selectVenue(venue.venue_id));
  return button;
}

function initMap() {
  if ((state.detailMode && isMobileLayout()) || state.map || !dom.map) return;
  if (!window.maplibregl) {
    dom.mapFallback.hidden = false;
    dom.map.classList.add('map--fallback');
    return;
  }

  const rect = dom.map.getBoundingClientRect();
  const hasLayout = [rect.width, rect.height, dom.map.clientWidth, dom.map.clientHeight]
    .every((dimension) => Number.isFinite(dimension) && dimension > 0);
  if (!hasLayout) {
    if (state.mapLayoutWaitFrames < MAX_MAP_LAYOUT_WAIT_FRAMES && state.mapLayoutFrame === null) {
      state.mapLayoutWaitFrames += 1;
      state.mapLayoutFrame = requestAnimationFrame(() => {
        state.mapLayoutFrame = null;
        initMap();
      });
    } else if (state.mapLayoutWaitFrames >= MAX_MAP_LAYOUT_WAIT_FRAMES) {
      dom.mapFallback.hidden = false;
      dom.map.classList.add('map--fallback');
    }
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  state.snapshot.venues.forEach((venue) => bounds.extend([Number(venue.longitude), Number(venue.latitude)]));

  state.map = new maplibregl.Map({
    container: dom.map,
    style: MAPTILER_STYLE,
    center: [-98.5795, 39.8283],
    zoom: 3.2,
    attributionControl: false,
    fadeDuration: 100
  });
  if (!bounds.isEmpty()) {
    state.map.fitBounds(bounds, { padding: 56, maxZoom: 7, duration: 0 });
  }
  state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  state.map.on('error', (event) => console.warn('Map error', event?.error || event));
  state.map.on('load', () => {
    renderMarkers();
    if (!isMobileLayout() && state.selectedVenueId) focusReturnedDetailVenue(selectedVenue());
  });
  new ResizeObserver(() => state.map?.resize()).observe(dom.map);
}

function rankedVisibleVenues(query = state.listQuery) {
  if (query) return rankVenues(state.snapshot, state.gameId, state.origin, query);
  if (state.origin) return rankNearbyVenues(state.snapshot, state.gameId, state.origin);
  return rankVenues(state.snapshot, state.gameId);
}

function rankedMapVenues(query = state.listQuery) {
  return rankVenues(state.snapshot, state.gameId, state.origin, query);
}

function focusLocation(origin, nearby) {
  if (!state.map || !origin) return;
  const center = [Number(origin.lon), Number(origin.lat)];
  if (!center.every(Number.isFinite)) return;
  if (origin.venueId) state.locationFocusVenueId = origin.venueId;
  const ranked = nearby ?? rankNearbyVenues(state.snapshot, state.gameId, origin);

  if (isMobileLayout()) {
    const points = [
      center,
      ...ranked.slice(0, 2).map(({ venue }) => [Number(venue.longitude), Number(venue.latitude)])
    ].filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

    if (points.length > 1) {
      const lons = points.map(([lon]) => lon);
      const lats = points.map(([, lat]) => lat);
      state.map.fitBounds([
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)]
      ], {
        padding: { top: 72, right: 54, bottom: 148, left: 54 },
        maxZoom: 11,
        duration: REDUCED_MOTION ? 0 : 520,
        essential: true
      });
      return;
    }
  }

  state.map.easeTo({
    center,
    zoom: isMobileLayout() ? 10 : 11,
    duration: REDUCED_MOTION ? 0 : 500,
    essential: true
  });
}

function renderMarkers() {
  if (!state.map) return;
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();
  rankedMapVenues().forEach(({ venue }) => {
    const element = markerElement(venue);
    element.classList.toggle('is-selected', venue.venue_id === state.selectedVenueId);
    const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
      .setLngLat([Number(venue.longitude), Number(venue.latitude)])
      .addTo(state.map);
    state.markers.set(venue.venue_id, marker);
  });
  renderUserMarker();
}

function renderUserMarker() {
  if (!state.map) return;
  state.userMarker?.remove();
  state.userMarker = null;
  if (!state.origin) return;
  const dot = document.createElement('div');
  dot.className = 'user-marker';
  dot.setAttribute('aria-label', 'Your search location');
  state.userMarker = new maplibregl.Marker({ element: dot, anchor: 'center' })
    .setLngLat([state.origin.lon, state.origin.lat])
    .addTo(state.map);
}

function mapVisibilityMetrics() {
  const mapRect = dom.map.getBoundingClientRect();
  const mobile = isMobileLayout();
  const insets = { top: 16, right: 16, bottom: 16, left: 16 };

  if (mobile && dom.mapToolbar) {
    const toolbarRect = dom.mapToolbar.getBoundingClientRect();
    insets.top = Math.max(insets.top, toolbarRect.bottom - mapRect.top + 8);
  }
  if (mobile && dom.tray && state.trayState !== 'peek') {
    const trayRect = dom.tray.getBoundingClientRect();
    insets.bottom = Math.max(insets.bottom, mapRect.bottom - trayRect.top + 12);
  }
  return { mapRect, insets };
}

function markerScreenPoint(venue) {
  if (!state.map) return null;
  const longitude = Number(venue?.longitude);
  const latitude = Number(venue?.latitude);
  if (![longitude, latitude].every(Number.isFinite)) return null;
  const projected = state.map.project([longitude, latitude]);
  if (!projected) return null;
  return { x: Number(projected.x), y: Number(projected.y) };
}

function venueNeedsPan(venue, metrics) {
  const point = markerScreenPoint(venue);
  if (!point) return false;
  const { mapRect, insets } = metrics;
  const x = point.x;
  const y = point.y;
  return x < insets.left ||
    x > mapRect.width - insets.right ||
    y < insets.top ||
    y > mapRect.height - insets.bottom;
}

function selectedVenuePan() {
  const venue = selectedVenue();
  if (!venue || !state.map || state.detailMode) return null;
  const metrics = mapVisibilityMetrics();
  if (!venueNeedsPan(venue, metrics)) return null;
  const point = markerScreenPoint(venue);
  if (!point) return null;
  const target = {
    x: Math.min(Math.max(point.x, metrics.insets.left), metrics.mapRect.width - metrics.insets.right),
    y: Math.min(Math.max(point.y, metrics.insets.top), metrics.mapRect.height - metrics.insets.bottom)
  };
  const delta = calculateMinimalPan(point, target);
  return Math.abs(delta.x) > 0.5 || Math.abs(delta.y) > 0.5 ? delta : null;
}

function keepSelectedVenueVisible() {
  const delta = selectedVenuePan();
  if (!delta || !state.map) return false;
  state.map.panBy([delta.x, delta.y], {
    duration: REDUCED_MOTION ? 0 : 260,
    essential: true
  });
  return true;
}

function scheduleSelectedVenueVisibility() {
  clearVenueVisibilitySchedule();
  state.venueVisibilityFrame = requestAnimationFrame(() => {
    state.venueVisibilityFrame = null;
    keepSelectedVenueVisible();
  });
}

function clearVenueVisibilitySchedule() {
  if (state.venueVisibilityFrame !== null) {
    cancelAnimationFrame(state.venueVisibilityFrame);
    state.venueVisibilityFrame = null;
  }
}

function observeTrayLayout() {
  if (typeof ResizeObserver !== 'function' || !dom.tray) return;
  state.trayResizeObserver?.disconnect();
  state.trayResizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (!rect) return;
    const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (size === state.lastTraySize) return;
    state.lastTraySize = size;
    state.map?.resize();
    scheduleSelectedVenueVisibility();
  });
  state.trayResizeObserver.observe(dom.tray);
}

function selectVenue(venueId) {
  state.selectedVenueId = venueId;
  setTrayState('selected');
  if (!isMobileLayout()) {
    state.detailMode = true;
    updateRouteForGame();
    renderAll();
    focusReturnedDetailVenue(selectedVenue());
    return;
  }
  renderMarkers();
  renderTray();
  scheduleSelectedVenueVisibility();
  emitRendered();
}

function trayHandleLabel(next) {
  if (next === 'peek') return 'Location tray collapsed';
  return 'Collapse to mini profile';
}

function restoredTrayState() {
  if (lastExpandedTrayState === 'selected' && !state.selectedVenueId) return 'full';
  return lastExpandedTrayState || (state.selectedVenueId ? 'selected' : 'full');
}

function animateTrayHeight(previousHeight) {
  if (!isMobileLayout() || REDUCED_MOTION || typeof dom.tray?.animate !== 'function') return;
  const nextHeight = dom.tray.getBoundingClientRect().height;
  if (!Number.isFinite(previousHeight) || !Number.isFinite(nextHeight) || Math.abs(previousHeight - nextHeight) < 1) return;
  const animation = dom.tray.animate([
    { height: `${previousHeight}px` },
    { height: `${nextHeight}px` }
  ], {
    duration: 220,
    easing: 'ease-out'
  });
  animation.addEventListener('finish', () => {
    state.map?.resize();
    scheduleSelectedVenueVisibility();
  }, { once: true });
}

function setTrayState(next, { animate = false } = {}) {
  const changed = state.trayState !== next;
  const previousHeight = animate && changed && dom.tray && isMobileLayout() && !REDUCED_MOTION
    ? dom.tray.getBoundingClientRect().height
    : null;
  state.trayState = next;
  if (next !== 'peek') lastExpandedTrayState = next;
  if (!dom.tray) return changed;
  dom.tray.dataset.state = next;
  dom.tray.className = `venue-tray tray--${next}`;
  dom.trayHandle.setAttribute('aria-expanded', String(next !== 'peek'));
  dom.trayHandle.setAttribute('aria-label', trayHandleLabel(next));
  dom.trayPeek.hidden = next !== 'peek';
  dom.traySelected.hidden = next !== 'selected';
  dom.trayList.hidden = next !== 'full';
  if (previousHeight !== null) animateTrayHeight(previousHeight);
  requestAnimationFrame(() => state.map?.resize());
  if (changed) scheduleSelectedVenueVisibility();
  return changed;
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return '';
  if (distance < 0.1) return 'Nearby';
  return `${distance.toFixed(distance < 10 ? 1 : 0)} mi away`;
}

function directionsUrl(venue) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.latitude},${venue.longitude}`)}`;
}

function createBadges(venue, party) {
  const badges = document.createElement('span');
  badges.className = 'venue-badges';
  venueBadgeDescriptors(venue, party).forEach(({ text, kind }) => {
    const badge = document.createElement('span');
    badge.className = `venue-badge badge--${kind}`;
    badge.textContent = text;
    badges.append(badge);
  });
  return badges;
}

function createFanIntentButton(venueId, count) {
  const intentButton = document.createElement('button');
  intentButton.type = 'button';
  intentButton.className = 'intent-button intent-button--compact';
  intentButton.dataset.intentVenue = venueId;
  intentButton.dataset.intentUi = 'compact';
  intentButton.textContent = 'I’ll be here';
  const activeVenueId = activeFanIntentVenueId();
  if (activeVenueId === venueId) {
    intentButton.classList.add('intent-button--active');
    intentButton.textContent = 'You’ll be here · Undo';
  }
  return intentButton;
}

function createSelectedCard(venue) {
  const party = getWatchParty(state.snapshot, state.gameId, venue.venue_id);
  const count = getFanCount(state.snapshot, state.gameId, venue.venue_id);
  const activeVenueId = activeFanIntentVenueId();
  const selected = activeVenueId === venue.venue_id;
  const ranked = rankedVisibleVenues();
  const row = ranked.find((item) => item.venue.venue_id === venue.venue_id);
  const distanceCopy = row ? formatDistance(row.distance) : '';
  return createSelectedVenueCard({
    venue,
    party,
    count,
    selected,
    distanceCopy,
    onDirections: () => window.open(directionsUrl(venue), '_blank', 'noopener,noreferrer'),
    onDetails: () => openDetail(venue.venue_id),
    onShare: () => shareVenue(venue.venue_id),
    onPlanParty: () => window.CGBWatchParty?.open?.(venue.venue_id)
  });
}

function renderSelectedCard() {
  dom.traySelected.replaceChildren();
  const venue = selectedVenue();
  if (!venue) return;
  dom.traySelected.append(createSelectedCard(venue));
}

function renderLocationList() {
  dom.locationList.replaceChildren();
  const ranked = rankedVisibleVenues();
  const game = selectedGame();
  dom.listHeading.textContent = state.listQuery
    ? `Results for “${state.listQuery}”`
    : `${gameTitle(game)} locations`;
  for (const { venue, distance } of ranked) {
    const party = getWatchParty(state.snapshot, state.gameId, venue.venue_id);
    const count = getFanCount(state.snapshot, state.gameId, venue.venue_id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'location-card';
    button.dataset.venueId = venue.venue_id;
    const top = document.createElement('span');
    top.className = 'location-card__top';
    const title = document.createElement('span');
    title.className = 'location-card__title';
    title.append(createBadges(venue, party), document.createTextNode(venue.name));
    const meta = document.createElement('span');
    meta.className = 'location-card__meta';
    const place = compactVenueLocation(venue);
    meta.textContent = [place, formatDistance(distance)].filter(Boolean).join(' · ');
    title.append(meta);
    const countLabel = count === 1 ? '1 Bear' : `${count} Bears`;
    const countSpan = document.createElement('span');
    countSpan.className = 'location-card__count';
    countSpan.textContent = countLabel;
    top.append(title, countSpan);
    button.append(top);
    if (party) {
      const host = document.createElement('span');
      host.className = 'location-card__party';
      host.textContent = `Hosted by ${party.organizer_name}`;
      button.append(host);
    } else if (venue.short_description) {
      const desc = document.createElement('span');
      desc.className = 'location-card__description';
      desc.textContent = venue.short_description;
      button.append(desc);
    }
    button.addEventListener('click', () => selectVenue(venue.venue_id));
    dom.locationList.append(button);
  });
}

function renderTray() {
  renderSelectedCard();
  renderLocationList();
}

function disposeMapForDetail() {
  if (state.mapLayoutFrame !== null) {
    cancelAnimationFrame(state.mapLayoutFrame);
    state.mapLayoutFrame = null;
  }
  clearVenueVisibilitySchedule();
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();
  state.userMarker?.remove();
  state.userMarker = null;
  state.map?.remove?.();
  state.map = null;
}

function placeVenueProfile(mobile) {
  if (mobile) {
    if (dom.venueDetail.parentElement !== dom.detailShell) dom.detailShell.append(dom.venueDetail);
    return;
  }
  if (dom.venueDetail.parentElement !== dom.traySelected) dom.traySelected.replaceChildren(dom.venueDetail);
}

function renderVenueProfile() {
  const venue = selectedVenue();
  if (!state.detailMode || !venue) return;
  const mobile = isMobileLayout();
  const game = selectedGame();

  placeVenueProfile(mobile);
  if (mobile) {
    disposeMapForDetail();
    document.body.dataset.view = 'detail';
    dom.mapView.hidden = true;
    dom.detailView.hidden = false;
    dom.detailView.setAttribute('aria-busy', 'true');
    dom.detailBack.href = buildGameUrl(game, location.href);
  } else {
    document.body.dataset.view = 'map';
    dom.mapView.hidden = false;
    dom.detailView.hidden = true;
  }
  dom.venueDetail.replaceChildren();

  const hero = document.createElement('section');
  hero.className = 'detail-hero';
  const badges = createBadges(venue, getWatchParty(state.snapshot, state.gameId, venue.venue_id));
  const title = document.createElement('h1');
  title.textContent = venue.name;
  const address = document.createElement('p');
  address.className = 'detail-address';
  const addressText = [venue.address_line_1, venue.city, venue.region].filter(Boolean).join(', ');
  const directions = document.createElement('a');
  directions.className = 'detail-directions-inline';
  directions.href = directionsUrl(venue);
  directions.target = '_blank';
  directions.rel = 'noopener noreferrer';
  directions.append(createIcon('directions'), document.createTextNode(addressText));
  address.append(directions);
  hero.append(badges, title, address);

  if (venue.short_description) {
    const description = document.createElement('p');
    description.className = 'detail-description';
    description.textContent = venue.short_description;
    hero.append(description);
  }

  const party = getWatchParty(state.snapshot, state.gameId, venue.venue_id);
  if (party) hero.append(createPartyModule(party));
  dom.venueDetail.append(hero);

  const activity = document.createElement('section');
  activity.className = 'activity-card';
  activity.append(createActivityBody(venue));
  dom.venueDetail.append(activity);

  if (!party) {
    const prompt = document.createElement('section');
    prompt.className = 'detail-inline-cta';
    const label = document.createElement('p');
    label.textContent = 'Is there a watch party going on?';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = 'Submit a Watch Party';
    button.addEventListener('click', () => window.CGBWatchParty?.open?.(venue.venue_id));
    prompt.append(label, button);
    dom.venueDetail.append(prompt);
  }

  if (venue.venue_type === 'community_location') {
    const nomination = document.createElement('section');
    nomination.className = 'detail-inline-cta detail-inline-cta--cal-bar';
    const question = document.createElement('p');
    question.textContent = 'Think this is a Cal bar?';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = 'Nominate as a Cal Bar';
    button.addEventListener('click', () => window.CGBCalBarNomination?.open?.(venue.venue_id));
    nomination.append(question, button);
    dom.venueDetail.append(nomination);
  }

  const secondaryActions = document.createElement('div');
  secondaryActions.className = 'detail-secondary-actions';
  const photoAction = document.createElement('button');
  photoAction.type = 'button';
  photoAction.className = 'text-button detail-photo-action';
  photoAction.textContent = 'Add a Photo';
  photoAction.addEventListener('click', () => window.CGBPhotoForm?.open?.(venue.venue_id));
  const listingUpdate = document.createElement('button');
  listingUpdate.type = 'button';
  listingUpdate.className = 'text-button detail-listing-update';
  listingUpdate.textContent = 'Suggest an Update';
  listingUpdate.addEventListener('click', () => window.CGBListingUpdate?.open?.(venue.venue_id));
  secondaryActions.append(photoAction, listingUpdate);
  dom.venueDetail.append(secondaryActions);

  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.className = 'primary-button detail-share';
  shareButton.textContent = 'Share';
  shareButton.addEventListener('click', () => shareVenue(venue.venue_id));
  dom.venueDetail.append(shareButton);

  if (mobile) {
    requestAnimationFrame(() => {
      if (!state.detailMode || state.selectedVenueId !== venue.venue_id || dom.detailView.hidden) return;
      document.body.dataset.detailState = 'ready';
      dom.detailView.setAttribute('aria-busy', 'false');
      dom.detailBack.focus({ preventScroll: true });
    });
  }
}

function createPartyModule(party) {
  const section = document.createElement('section');
  section.className = 'party-module';
  const heading = document.createElement('h2');
  heading.textContent = 'Watch Party';
  const host = document.createElement('p');
  host.textContent = `Hosted by ${party.organizer_name}`;
  section.append(heading, host);
  if (party.official_event_url) {
    const link = document.createElement('a');
    link.href = party.official_event_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Official event details';
    section.append(link);
  }
  const details = [party.event_start_at ? `Starts ${formatKickoff({ ...selectedGame(), kickoff_at: party.event_start_at, kickoff_status: 'confirmed' })}` : '', party.age_policy === '21_plus' ? '21+' : '', party.sound_status === 'confirmed_on' ? 'Game audio on' : ''].filter(Boolean);
  if (details.length) {
    const meta = document.createElement('p');
    meta.className = 'party-meta';
    meta.textContent = details.join(' · ');
    section.append(meta);
  }
  if (party.restrictions_note) {
    const restrictions = document.createElement('p');
    restrictions.textContent = party.restrictions_note;
    section.append(restrictions);
  }
  if (party.game_day_note) {
    const note = document.createElement('p');
    note.textContent = party.game_day_note;
    section.append(note);
  }
  return section;
}

function createActivityBody(venue) {
  const count = getFanCount(state.snapshot, state.gameId, venue.venue_id);
  const card = document.createElement('div');
  card.className = 'activity-card__body';
  const countText = document.createElement('strong');
  countText.textContent = bearCountCopy(count);
  const button = createFanIntentButton(venue.venue_id, count);
  card.append(countText, button);
  return card;
}

function createDetailContribution() {
  const section = document.createElement('section');
  section.className = 'detail-contribution';
  return section;
}

function renderAll() {
  renderHeaderAndStats();
  renderGameDialog();
  renderTray();
  renderVenueProfile();
  renderMarkers();
  emitRendered();
}

async function shareVenue(venueId = state.selectedVenueId) {
  const venue = state.snapshot?.venues?.find((item) => item.venue_id === venueId);
  const game = selectedGame();
  if (!venue || !game) return false;
  const detailUrl = buildVenueUrl(venue.slug, game, location.href);
  return shareOrCopy({
    title: venue.name,
    text: buildVenueShareMessage({ venue, game, count: getFanCount(state.snapshot, game.game_id, venue.venue_id), watchParty: getWatchParty(state.snapshot, game.game_id, venue.venue_id) }),
    url: detailUrl
  });
}

function runSearch(query) {
  state.listQuery = query;
  dom.searchDropdown.hidden = true;
  const exact = findExactVenueMatch(state.snapshot, query);
  if (exact) {
    state.origin = { lat: Number(exact.latitude), lon: Number(exact.longitude), label: exact.name, venueId: exact.venue_id };
    selectVenue(exact.venue_id);
    focusLocation(state.origin, rankedVisibleVenues());
    updateRouteForGame();
    return;
  }
  const results = rankVenues(state.snapshot, state.gameId, state.origin, query);
  state.detailMode = false;
  setTrayState('full');
  renderLocationList();
  renderMarkers();
  emitRendered();
}

function wireTrayDrag() {
  let startY = null;
  let pointerId = null;
  let suppressNextClick = false;
  let pendingSwipeState = '';
  let pendingSwipeFrame = null;

  const reset = () => { startY = null; pointerId = null; };
  const clearPendingSwipe = () => {
    if (pendingSwipeFrame !== null) cancelAnimationFrame(pendingSwipeFrame);
    pendingSwipeFrame = null;
    pendingSwipeState = '';
  };
  const applyPendingSwipe = () => {
    if (!pendingSwipeState) return;
    const next = pendingSwipeState;
    clearPendingSwipe();
    setTrayState(next, { animate: true });
  };
  const suppressGeneratedClick = () => {
    suppressNextClick = true;
    window.setTimeout(() => { suppressNextClick = false; }, 350);
  };

  dom.trayHandle.addEventListener('pointerdown', (event) => {
    clearPendingSwipe();
    startY = event.clientY;
    pointerId = event.pointerId;
    dom.trayHandle.setPointerCapture?.(event.pointerId);
  });

  dom.trayHandle.addEventListener('pointerup', (event) => {
    if (startY === null || event.pointerId !== pointerId) return;
    const delta = event.clientY - startY;
    reset();
    if (Math.abs(delta) <= TRAY_SWIPE_THRESHOLD) return;

    if (delta > 0) {
      suppressGeneratedClick();
      setTrayState('peek', { animate: true });
      return;
    }

    if (state.trayState === 'peek') {
      pendingSwipeState = restoredTrayState();
      pendingSwipeFrame = requestAnimationFrame(applyPendingSwipe);
      return;
    }

    suppressGeneratedClick();
  });

  dom.trayHandle.addEventListener('pointercancel', reset);
  dom.trayHandle.addEventListener('lostpointercapture', reset);
  dom.trayHandle.addEventListener('click', (event) => {
    if (pendingSwipeState) {
      event.preventDefault();
      applyPendingSwipe();
      return;
    }
    if (suppressNextClick) {
      suppressNextClick = false;
      event.preventDefault();
      return;
    }
    const next = state.trayState === 'peek' ? restoredTrayState() : 'peek';
    setTrayState(next, { animate: true });
  });
}

function handleViewportClassChange() {
  const mobile = isMobileLayout();
  if (mobile === previousMobileLayout) return;
  previousMobileLayout = mobile;
  if (!mobile && state.selectedVenueId) state.detailMode = true;
  renderAll();
  if (!mobile && state.selectedVenueId) focusReturnedDetailVenue(selectedVenue());
}

function wireEvents() {
  dom.gameButton.addEventListener('click', () => dom.gameDialog.showModal());
  dom.detailBack.addEventListener('click', returnToMapFromDetail);
  dom.browseButton.addEventListener('click', () => setTrayState('full'));
  document.querySelector('#mobile-list-button')?.addEventListener('click', showLocations);
  dom.closeList.addEventListener('click', showSelectedVenue);
  dom.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = dom.searchInput.value.trim();
    if (query) runSearch(query);
  });
  dom.searchInput.addEventListener('input', renderSuggestions);
  dom.searchInput.addEventListener('focus', renderSuggestions);
  dom.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      dom.searchDropdown.hidden = true;
      dom.searchInput.blur();
    }
  });
  document.addEventListener('click', (event) => {
    if (!dom.searchForm.contains(event.target)) dom.searchDropdown.hidden = true;
  });
  dom.listLocationAll.addEventListener('click', () => {
    if (state.origin || state.listQuery) showAllLocations();
  });
  dom.listLocationNearby.addEventListener('click', () => {
    if (normalizedUserLocation(state.origin)) return;
    if (showNearbyLocations()) return;
    if (!navigator.geolocation) return showStatus('Location is not available in this browser');
    dom.listLocationNearby.disabled = true;
    showStatus('Finding your location…', 5000);
    navigator.geolocation.getCurrentPosition((position) => {
      state.origin = { lat: position.coords.latitude, lon: position.coords.longitude, label: 'your location' };
      rememberNearbyOrigin();
      state.listQuery = '';
      renderUserMarker();
      const nearby = rankedVisibleVenues();
      renderLocationList();
      renderMarkers();
      setTrayState('full');
      focusLocation(state.origin, nearby);
      dom.listLocationNearby.disabled = false;
      showStatus(nearby.length
        ? `Showing ${nearby.length} ${nearby.length === 1 ? 'location' : 'locations'} within ${NEARBY_RADIUS_MILES} miles`
        : `No listed locations within ${NEARBY_RADIUS_MILES} miles of your location`);
      emitRendered();
    }, () => {
      dom.listLocationNearby.disabled = false;
      showStatus('Location permission was not available');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
  dom.nearMe?.addEventListener('click', locateOnMap);
  dom.aboutButton.addEventListener('click', () => dom.aboutDialog.showModal());
  wireTrayDrag();
  observeTrayLayout();
  window.addEventListener('popstate', () => location.reload());
  window.addEventListener('resize', () => {
    state.map?.resize();
    scheduleSelectedVenueVisibility();
  });
  MOBILE_MEDIA.addEventListener?.('change', handleViewportClassChange);
}

async function boot() {
  cacheDom();
  wireEvents();
  try {
    await loadSnapshot();
    initializeRoute();
    renderAll();
    dom.app.setAttribute('aria-busy', 'false');
    markApplicationReady();
    if (state.dataSource !== 'live') console.info(`CGB v2 using ${state.dataSource} data.`);
  } catch (error) {
    console.error(error);
    dom.app.setAttribute('aria-busy', 'false');
    if (document.body.dataset.detailState === 'pending') {
      document.body.dataset.detailState = 'ready';
      dom.detailView.setAttribute('aria-busy', 'false');
    }
    showStatus('The location data could not be loaded.', 6000);
    dom.mapFallback.hidden = false;
  }
}

window.CGBApp = Object.freeze({
  mapTilerKey: MAPTILER_KEY,
  getState: () => state,
  getSnapshot: () => state.snapshot,
  render: renderAll,
  refreshSnapshot,
  focusLocation,
  showAllLocations,
  showNearbyLocations,
  showLocations,
  showSelectedVenue,
  restoreSelection,
  selectGame,
  shareVenue,
  showStatus,
  subscribe: subscribeAppEvent
});

window.CGBPreview = Object.freeze({
  setDataEndpoint(url) {
    storageSet(DATA_URL_KEY, String(url || '').trim());
    location.reload();
  },
  clearDataEndpoint() {
    storageRemove(DATA_URL_KEY);
    location.reload();
  },
  clearLastKnownGood() {
    storageRemove(LAST_GOOD_KEY);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
