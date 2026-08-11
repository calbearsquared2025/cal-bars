import {
  bearCountCopy,
  buildGameUrl,
  buildVenueShareMessage,
  buildVenueUrl,
  calculateMinimalPan,
  compactVenueLocation,
  findExactVenueMatch,
  formatKickoff,
  gameTitle,
  getFanCount,
  getHistoryCount,
  getWatchPartiesForGame,
  getWatchParty,
  historyCountCopy,
  markerKind,
  NEARBY_RADIUS_MILES,
  normalizeSearchText,
  rankNearbyVenues,
  rankVenues,
  resolveTrayState,
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

const MAPTILER_KEY = 'jNqIsIVa4dP9qv7vQ8fy';
const MAPTILER_STYLE = `https://api.maptiler.com/maps/019997ef-99cb-7052-b842-98cc3dbf3d7c/style.json?key=${MAPTILER_KEY}`;
const LAST_GOOD_KEY = 'cgb_v2_last_good_snapshot';
const DATA_URL_KEY = 'cgb_v2_public_data_url';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_MAP_LAYOUT_WAIT_FRAMES = 2;
const MOBILE_MEDIA_QUERY = '(max-width: 899px)';
const TRAY_SWIPE_THRESHOLD = 48;

const dom = {};

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
    suggestions: document.querySelector('#search-suggestions'),
    nearMe: document.querySelector('#near-me-button'),
    tray: document.querySelector('#venue-tray'),
    trayHandle: document.querySelector('#tray-handle'),
    trayPeek: document.querySelector('#tray-peek'),
    traySelected: document.querySelector('#tray-selected'),
    trayList: document.querySelector('#tray-list'),
    browseButton: document.querySelector('#browse-locations-button'),
    closeList: document.querySelector('#close-list-button'),
    clearSearch: document.querySelector('#clear-search-button'),
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

function initializeRoute() {
  const params = new URLSearchParams(location.search);
  const requestedGame = params.get('game');
  const defaultGame = selectDefaultGame(state.snapshot.games);
  state.gameId = state.snapshot.games.some((game) => game.game_id === requestedGame)
    ? requestedGame
    : defaultGame?.game_id || state.snapshot.games[0]?.game_id || null;

  const venueSlug = params.get('venue');
  const venue = state.snapshot.venues.find((item) => item.slug === venueSlug);
  state.detailMode = Boolean(venue);
  state.selectedVenueId = venue?.venue_id || null;
}

function updateRouteForGame() {
  const venue = state.detailMode ? selectedVenue() : null;
  const nextUrl = venue
    ? buildVenueUrl(venue.slug, state.gameId, location.href)
    : buildGameUrl(state.gameId, location.href);
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
    badge.textContent = bearCountCopy(count);
    button.append(badge);
  }
  button.addEventListener('click', () => selectVenue(venue.venue_id));
  return button;
}

function initMap() {
  if (state.detailMode || state.map || !dom.map) return;
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
  state.map.on('load', renderMarkers);
  new ResizeObserver(() => state.map?.resize()).observe(dom.map);
}

function rankedVisibleVenues(query = state.listQuery) {
  if (query) return rankVenues(state.snapshot, state.gameId, state.origin, query);
  if (state.origin) return rankNearbyVenues(state.snapshot, state.gameId, state.origin);
  return rankVenues(state.snapshot, state.gameId);
}

function focusLocation(origin, nearby) {
  if (!state.map || !origin) return;
  const center = [Number(origin.lon), Number(origin.lat)];
  if (!center.every(Number.isFinite)) return;
  if (origin.venueId) state.locationFocusVenueId = origin.venueId;
  const ranked = nearby ?? rankNearbyVenues(state.snapshot, state.gameId, origin);

  if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
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
    zoom: window.matchMedia(MOBILE_MEDIA_QUERY).matches ? 10 : 11,
    duration: REDUCED_MOTION ? 0 : 500,
    essential: true
  });
}

function renderMarkers() {
  if (!state.map) return;
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();
  rankedVisibleVenues().forEach(({ venue }) => {
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
  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  const insets = { top: 16, right: 16, bottom: 16, left: 16 };

  if (isMobile && dom.mapToolbar) {
    const toolbarRect = dom.mapToolbar.getBoundingClientRect();
    if (toolbarRect.bottom > mapRect.top && toolbarRect.top < mapRect.bottom) {
      insets.top = Math.max(insets.top, toolbarRect.bottom - mapRect.top + 12);
    }
  }

  if (isMobile && dom.tray && getComputedStyle(dom.tray).display !== 'none') {
    const trayRect = dom.tray.getBoundingClientRect();
    if (trayRect.top < mapRect.bottom && trayRect.bottom > mapRect.top) {
      insets.bottom = Math.max(insets.bottom, mapRect.bottom - Math.max(mapRect.top, trayRect.top) + 12);
    }
  }

  return { viewport: { width: mapRect.width, height: mapRect.height }, insets };
}

function panToVenue(venue) {
  if (!state.map || !venue) return;
  const point = state.map.project([Number(venue.longitude), Number(venue.latitude)]);
  const { viewport, insets } = mapVisibilityMetrics();
  const offset = calculateMinimalPan({ point, viewport, insets });
  if (Math.abs(offset.x) < 0.5 && Math.abs(offset.y) < 0.5) return;

  const currentZoom = state.map.getZoom();
  const centerPoint = state.map.project(state.map.getCenter());
  const nextCenter = state.map.unproject([centerPoint.x - offset.x, centerPoint.y - offset.y]);
  state.map.easeTo({
    center: nextCenter,
    zoom: currentZoom,
    duration: REDUCED_MOTION ? 0 : 320,
    essential: true
  });
}

function clearVenueVisibilitySchedule() {
  if (state.venueVisibilityFrame !== null) {
    cancelAnimationFrame(state.venueVisibilityFrame);
    state.venueVisibilityFrame = null;
  }
}

function scheduleSelectedVenueVisibility() {
  clearVenueVisibilitySchedule();
  if (!state.map || !state.selectedVenueId || state.detailMode) return;
  state.venueVisibilityFrame = requestAnimationFrame(() => {
    state.venueVisibilityFrame = requestAnimationFrame(() => {
      state.venueVisibilityFrame = null;
      panToVenue(selectedVenue());
    });
  });
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
  renderMarkers();
  renderTray();
  scheduleSelectedVenueVisibility();
  emitRendered();
}

function trayHandleLabel(next) {
  if (next === 'full') return 'Collapse location tray';
  if (next === 'selected') return 'Show all locations';
  return 'Expand location tray';
}

function setTrayState(next) {
  const changed = state.trayState !== next;
  state.trayState = next;
  if (!dom.tray) return changed;
  dom.tray.dataset.state = next;
  dom.tray.className = `venue-tray tray--${next}`;
  dom.trayHandle.setAttribute('aria-expanded', String(next !== 'peek'));
  dom.trayHandle.setAttribute('aria-label', trayHandleLabel(next));
  dom.trayPeek.hidden = next !== 'peek';
  dom.traySelected.hidden = next !== 'selected';
  dom.trayList.hidden = next !== 'full';
  requestAnimationFrame(() => state.map?.resize());
  if (changed) scheduleSelectedVenueVisibility();
  return changed;
}

function applyTrayAction(action) {
  const next = resolveTrayState(state.trayState, action, Boolean(state.selectedVenueId));
  setTrayState(next);
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

function appendWatchParty(container, party) {
  if (!party) return;
  const module = document.createElement('section');
  module.className = 'party-module';
  const title = document.createElement('div');
  title.className = 'party-module__title';
  const star = document.createElement('span');
  star.setAttribute('aria-hidden', 'true');
  star.textContent = '★';
  const titleText = document.createElement('strong');
  titleText.textContent = 'Watch Party';
  title.append(star, titleText);
  module.append(title);

  const hosted = document.createElement('p');
  hosted.textContent = `Hosted by ${party.organizer_name}`;
  module.append(hosted);

  if (party.event_start_at) {
    const start = new Date(party.event_start_at);
    if (!Number.isNaN(start.getTime())) {
      const line = document.createElement('p');
      line.textContent = `Arrive ${new Intl.DateTimeFormat(undefined, {
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      }).format(start)}`;
      module.append(line);
    }
  }

  const details = [];
  if (party.age_policy === '21_plus') details.push('21+');
  if (party.age_policy === 'all_ages') details.push('All ages');
  if (party.sound_status === 'confirmed_on') details.push('Game audio on');
  if (party.sound_status === 'confirmed_off') details.push('Game audio off');
  if (details.length) {
    const detailLine = document.createElement('p');
    detailLine.className = 'party-meta';
    detailLine.textContent = details.join(' · ');
    module.append(detailLine);
  }

  [party.restrictions_note, party.game_day_note].filter(Boolean).forEach((text) => {
    const note = document.createElement('p');
    note.textContent = text;
    module.append(note);
  });

  if (party.official_event_url) {
    const link = document.createElement('a');
    link.href = party.official_event_url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open event information';
    module.append(link);
  }
  container.append(module);
}

function createActionRow(venue, { details = true } = {}) {
  const row = document.createElement('div');
  row.className = 'action-row';
  row.dataset.venueId = venue.venue_id;

  const intent = document.createElement('button');
  intent.type = 'button';
  intent.className = 'primary-button intent-button';
  intent.dataset.venueId = venue.venue_id;
  intent.textContent = 'I’ll be here';
  intent.disabled = true;
  row.append(intent);

  const directions = document.createElement('a');
  directions.className = 'secondary-button';
  directions.href = directionsUrl(venue);
  directions.target = '_blank';
  directions.rel = 'noopener';
  directions.textContent = 'Directions';
  row.append(directions);

  if (details) {
    const detail = document.createElement('a');
    detail.className = 'secondary-button';
    detail.href = buildVenueUrl(venue.slug, state.gameId, location.href);
    detail.textContent = 'View details';
    row.append(detail);
  }

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'secondary-button';
  share.textContent = 'Share';
  share.addEventListener('click', () => shareVenue(venue));
  row.append(share);
  return row;
}

function legacyCopyText(text) {
  const proxy = document.createElement('textarea');
  proxy.className = 'copy-proxy';
  proxy.value = text;
  proxy.readOnly = true;
  proxy.setAttribute('aria-hidden', 'true');
  document.body.append(proxy);
  proxy.focus();
  proxy.select();
  proxy.setSelectionRange(0, proxy.value.length);
  let copied = false;
  try { copied = typeof document.execCommand === 'function' && document.execCommand('copy') === true; } catch (_) {}
  proxy.remove();
  return copied;
}

function showManualCopy(text) {
  document.querySelector('.manual-copy-panel')?.remove();
  const panel = document.createElement('section');
  panel.className = 'manual-copy-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Copy share message');

  const heading = document.createElement('strong');
  heading.textContent = 'Copy this message';
  const explanation = document.createElement('p');
  explanation.textContent = 'Automatic copying is unavailable in this browser. Select and copy the complete message below.';
  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.value = text;
  input.setAttribute('aria-label', 'Share message');
  input.addEventListener('focus', () => input.select());

  const actions = document.createElement('div');
  actions.className = 'manual-copy-actions';
  const select = document.createElement('button');
  select.type = 'button';
  select.className = 'primary-button';
  select.textContent = 'Select message';
  select.addEventListener('click', () => { input.focus(); input.select(); });
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'secondary-button';
  close.textContent = 'Close';
  close.addEventListener('click', () => panel.remove());
  actions.append(select, close);
  panel.append(heading, explanation, input, actions);
  document.body.append(panel);
  input.focus();
  input.select();
}

function buildVenueSharePayload(venue) {
  const url = buildVenueUrl(venue.slug, state.gameId, location.href);
  const game = selectedGame();
  const party = getWatchParty(state.snapshot, state.gameId, venue.venue_id);
  return {
    title: `${party ? 'Watch Party at ' : ''}${venue.name} · Cal Golden Bars`,
    text: buildVenueShareMessage({
      venueName: venue.name,
      opponentName: game?.opponent_name,
      hasWatchParty: Boolean(party),
      url
    })
  };
}

async function shareVenue(venue) {
  const payload = buildVenueSharePayload(venue);
  let nativeShareAvailable = typeof navigator.share === 'function';
  if (nativeShareAvailable && typeof navigator.canShare === 'function') {
    try { nativeShareAvailable = navigator.canShare(payload); } catch (_) { nativeShareAvailable = false; }
  }
  const result = await shareOrCopy({
    payload,
    copyText: payload.text,
    share: nativeShareAvailable ? (sharePayload) => navigator.share(sharePayload) : null,
    writeClipboard: typeof navigator.clipboard?.writeText === 'function'
      ? (text) => navigator.clipboard.writeText(text)
      : null,
    legacyCopy: legacyCopyText
  });

  if (result.method === 'clipboard' || result.method === 'legacy-copy') showStatus('Message copied');
  else if (result.method === 'manual') showManualCopy(result.text);
  return result;
}

function renderSelectedCard() {
  const venue = selectedVenue();
  dom.traySelected.replaceChildren();
  if (!venue) {
    setTrayState('peek');
    return;
  }
  const party = getWatchParty(state.snapshot, state.gameId, venue.venue_id);
  const count = getFanCount(state.snapshot, state.gameId, venue.venue_id);
  const ranked = rankVenues(state.snapshot, state.gameId, state.origin);
  const distance = ranked.find((item) => item.venue.venue_id === venue.venue_id)?.distance;

  const card = document.createElement('article');
  card.className = 'selected-card';
  card.dataset.venueId = venue.venue_id;
  const header = document.createElement('div');
  header.className = 'selected-card__header';
  const heading = document.createElement('div');
  heading.append(createBadges(venue, party));
  const title = document.createElement('h2');
  title.textContent = venue.name;
  heading.append(title);
  const locationLine = document.createElement('p');
  locationLine.className = 'venue-location';
  locationLine.textContent = [compactVenueLocation(venue), formatDistance(distance)].filter(Boolean).join(' · ');
  heading.append(locationLine);
  header.append(heading);
  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'icon-button';
  collapse.textContent = '⌄';
  collapse.setAttribute('aria-label', 'Collapse selected venue');
  collapse.addEventListener('click', () => setTrayState('peek'));
  header.append(collapse);
  card.append(header);

  if (venue.short_description) {
    const description = document.createElement('p');
    description.className = 'venue-description';
    description.textContent = venue.short_description;
    card.append(description);
  }

  const countLine = document.createElement('p');
  countLine.className = 'bear-count';
  countLine.textContent = bearCountCopy(count);
  card.append(countLine);
  appendWatchParty(card, party);
  card.append(createActionRow(venue));
  dom.traySelected.append(card);
}

function updateClearSearchVisibility() {
  const active = Boolean(state.listQuery || state.origin || dom.searchInput.value.trim());
  dom.clearSearch.hidden = !active;
}

function renderLocationList(query = state.listQuery) {
  const ranked = rankedVisibleVenues(query);
  dom.locationList.replaceChildren();
  dom.listHeading.textContent = query
    ? `${ranked.length} matching ${ranked.length === 1 ? 'location' : 'locations'}`
    : state.origin
      ? `${ranked.length} ${ranked.length === 1 ? 'location' : 'locations'} within ${NEARBY_RADIUS_MILES} miles`
      : `${gameTitle(selectedGame())} locations`;

  if (!ranked.length) {
    const empty = document.createElement('section');
    empty.className = 'empty-state';
    if (state.origin && !query) {
      const heading = document.createElement('strong');
      heading.textContent = `No listed Cal gathering locations within ${NEARBY_RADIUS_MILES} miles.`;
      const guidance = document.createElement('p');
      guidance.textContent = 'Try another city or ZIP, or choose All locations to browse every mapped location.';
      empty.append(heading, guidance);
    } else {
      empty.textContent = 'No mapped locations match this search.';
    }
    dom.locationList.append(empty);
    updateClearSearchVisibility();
    return;
  }

  ranked.forEach(({ venue, party, fanCount, distance }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'location-card';
    button.dataset.venueId = venue.venue_id;
    button.dataset.selected = String(venue.venue_id === state.selectedVenueId);
    const top = document.createElement('div');
    top.className = 'location-card__top';
    const info = document.createElement('div');
    info.append(createBadges(venue, party));
    const name = document.createElement('strong');
    name.textContent = venue.name;
    info.append(name);
    const meta = document.createElement('span');
    meta.textContent = [venue.city, venue.region, formatDistance(distance)].filter(Boolean).join(' · ');
    info.append(meta);
    top.append(info);
    const count = document.createElement('span');
    count.className = 'location-card__count';
    count.textContent = bearCountCopy(fanCount);
    top.append(count);
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
  updateClearSearchVisibility();
}

function renderTray() {
  renderSelectedCard();
  renderLocationList();
}

function renderDetailView() {
  const venue = selectedVenue();
  if (!state.detailMode || !venue) return;
  dom.mapView.hidden = true;
  dom.detailView.hidden = false;
  dom.detailBack.href = buildGameUrl(state.gameId, location.href);
  const game = selectedGame();
  const party = getWatchParty(state.snapshot, state.gameId, venue.venue_id);
  const count = getFanCount(state.snapshot, state.gameId, venue.venue_id);
  const history = getHistoryCount(state.snapshot, venue.venue_id);

  dom.venueDetail.replaceChildren();
  dom.venueDetail.dataset.venueId = venue.venue_id;
  const hero = document.createElement('header');
  hero.className = `detail-hero${venue.photo_url ? '' : ' detail-hero--no-photo'}`;
  hero.append(createBadges(venue, party));
  const title = document.createElement('h1');
  title.textContent = venue.name;
  hero.append(title);
  const city = document.createElement('p');
  city.className = 'detail-city';
  city.textContent = `${venue.city}, ${venue.region}`;
  hero.append(city);
  const address = document.createElement('p');
  address.className = 'detail-address';
  address.textContent = [venue.address_line_1, venue.address_line_2, venue.city, venue.region, venue.postal_code]
    .filter(Boolean).join(', ');
  hero.append(address);
  dom.venueDetail.append(hero);

  const gameContext = document.createElement('section');
  gameContext.className = 'detail-game-context';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Selected game';
  gameContext.append(eyebrow);
  const gameHeading = document.createElement('h2');
  gameHeading.textContent = `Cal ${gameTitle(game)}`;
  gameContext.append(gameHeading);
  const kickoff = document.createElement('p');
  kickoff.textContent = formatKickoff(game);
  gameContext.append(kickoff);
  dom.venueDetail.append(gameContext);

  const activity = document.createElement('section');
  activity.className = 'activity-card';
  const current = document.createElement('strong');
  current.textContent = bearCountCopy(count);
  activity.append(current);
  const historical = document.createElement('p');
  historical.textContent = historyCountCopy(history);
  activity.append(historical);
  dom.venueDetail.append(activity);

  if (venue.short_description) {
    const description = document.createElement('p');
    description.className = 'detail-description';
    description.textContent = venue.short_description;
    dom.venueDetail.append(description);
  }

  appendWatchParty(dom.venueDetail, party);
  dom.venueDetail.append(createActionRow(venue, { details: false }));

  if (venue.website_url) {
    const website = document.createElement('a');
    website.className = 'venue-website';
    website.href = venue.website_url;
    website.target = '_blank';
    website.rel = 'noopener';
    website.textContent = 'Visit venue website';
    dom.venueDetail.append(website);
  }

  const note = document.createElement('p');
  note.className = 'preview-note';
  note.textContent = 'Preview: contribution tools are coming soon.';
  dom.venueDetail.append(note);
}

function emitRendered() {
  emitAppEvent('rendered', {
    snapshot: state.snapshot,
    gameId: state.gameId,
    selectedVenueId: state.selectedVenueId,
    detailMode: state.detailMode
  });
}

function renderAll() {
  if (!state.snapshot) return;
  renderHeaderAndStats();
  renderGameDialog();
  if (state.detailMode) {
    renderDetailView();
  } else {
    dom.mapView.hidden = false;
    dom.detailView.hidden = true;
    renderTray();
    if (state.map) renderMarkers();
    else initMap();
  }
  emitRendered();
}

function restoreSelection({ preserveCurrentWhenEmpty = false } = {}) {
  const before = state.selectedVenueId;
  restoreSelectedVenueFromFanIntent({ preserveCurrentWhenEmpty });
  if (!state.detailMode) setTrayState(state.trayState);
  return before !== state.selectedVenueId;
}

async function geocode(query) {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&language=en&limit=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Location search failed');
  const data = await response.json();
  const feature = data.features?.[0];
  const coordinates = feature?.center || feature?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) throw new Error('Location not found');
  return { lon: Number(coordinates[0]), lat: Number(coordinates[1]), label: feature.place_name || query };
}

function queryMatchesMappedLocationField(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  return state.snapshot.venues.some((venue) =>
    [venue.city, venue.region, venue.postal_code, venue.address_line_1]
      .some((value) => normalizeSearchText(value).includes(normalizedQuery))
  );
}

async function runSearch(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return;

  const mappedMatches = rankVenues(state.snapshot, state.gameId, state.origin, normalizedQuery);
  const exact = findExactVenueMatch(mappedMatches.map(({ venue }) => venue), normalizedQuery);
  dom.suggestions.hidden = true;

  if (exact) {
    state.origin = null;
    state.listQuery = '';
    renderUserMarker();
    selectVenue(exact.venue_id);
    updateClearSearchVisibility();
    return;
  }

  if (mappedMatches.length && !queryMatchesMappedLocationField(normalizedQuery)) {
    state.origin = null;
    state.listQuery = normalizedQuery;
    renderUserMarker();
    renderLocationList();
    renderMarkers();
    setTrayState('full');
    showStatus(`${mappedMatches.length} mapped ${mappedMatches.length === 1 ? 'location matches' : 'locations match'} your search`);
    emitRendered();
    return;
  }

  showStatus('Finding that area…', 5000);
  try {
    state.origin = await geocode(normalizedQuery);
    state.listQuery = '';
    renderUserMarker();
    const nearby = rankedVisibleVenues();
    renderLocationList();
    renderMarkers();
    setTrayState('full');
    state.map?.easeTo({
      center: [state.origin.lon, state.origin.lat],
      zoom: 10,
      duration: REDUCED_MOTION ? 0 : 500
    });
    showStatus(nearby.length
      ? `Showing ${nearby.length} ${nearby.length === 1 ? 'location' : 'locations'} within ${NEARBY_RADIUS_MILES} miles of ${state.origin.label}`
      : `No listed locations within ${NEARBY_RADIUS_MILES} miles of ${state.origin.label}`);
    emitRendered();
  } catch (_) {
    showStatus('Location not found');
  }
}

function renderSuggestions() {
  const query = dom.searchInput.value.trim();
  dom.suggestions.replaceChildren();
  if (!query) {
    state.listQuery = '';
    dom.suggestions.hidden = true;
    renderLocationList();
    emitRendered();
    return;
  }

  const matches = rankVenues(state.snapshot, state.gameId, state.origin, query).slice(0, 5);
  matches.forEach(({ venue, party }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.dataset.venueId = venue.venue_id;
    const name = document.createElement('strong');
    name.textContent = venue.name;
    const locationLine = document.createElement('span');
    locationLine.textContent = `${party ? 'Watch Party · ' : ''}${venue.city}, ${venue.region}`;
    button.append(name, locationLine);
    button.addEventListener('click', () => {
      dom.searchInput.value = venue.name;
      state.origin = null;
      state.listQuery = '';
      dom.suggestions.hidden = true;
      renderUserMarker();
      selectVenue(venue.venue_id);
      updateClearSearchVisibility();
    });
    dom.suggestions.append(button);
  });
  dom.suggestions.hidden = matches.length === 0;
  state.listQuery = query;
  renderLocationList();
  renderMarkers();
  emitRendered();
}

function clearSearchResults() {
  state.listQuery = '';
  state.origin = null;
  dom.searchInput.value = '';
  dom.suggestions.hidden = true;
  renderUserMarker();
  renderLocationList();
  renderMarkers();
  setTrayState('full');
  showStatus('Showing all mapped locations');
  emitRendered();
}

function wireTrayDrag() {
  let startY = null;
  let pointerId = null;
  let suppressNextClick = false;
  const reset = () => { startY = null; pointerId = null; };

  dom.trayHandle.addEventListener('pointerdown', (event) => {
    startY = event.clientY;
    pointerId = event.pointerId;
    dom.trayHandle.setPointerCapture?.(event.pointerId);
  });

  dom.trayHandle.addEventListener('pointerup', (event) => {
    if (startY === null || event.pointerId !== pointerId) return;
    const delta = event.clientY - startY;
    reset();
    if (delta < -TRAY_SWIPE_THRESHOLD) {
      suppressNextClick = true;
      window.setTimeout(() => { suppressNextClick = false; }, 0);
      applyTrayAction('up');
    } else if (delta > TRAY_SWIPE_THRESHOLD) {
      suppressNextClick = true;
      window.setTimeout(() => { suppressNextClick = false; }, 0);
      applyTrayAction('down');
    }
  });

  dom.trayHandle.addEventListener('pointercancel', reset);
  dom.trayHandle.addEventListener('lostpointercapture', reset);
  dom.trayHandle.addEventListener('click', (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      event.preventDefault();
      return;
    }
    applyTrayAction('toggle');
  });
}

function wireEvents() {
  dom.gameButton.addEventListener('click', () => dom.gameDialog.showModal());
  dom.browseButton.addEventListener('click', () => setTrayState('full'));
  dom.closeList.addEventListener('click', () => setTrayState(state.selectedVenueId ? 'selected' : 'peek'));
  dom.clearSearch.addEventListener('click', clearSearchResults);
  dom.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = dom.searchInput.value.trim();
    if (query) runSearch(query);
  });
  dom.searchInput.addEventListener('input', renderSuggestions);
  dom.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      dom.suggestions.hidden = true;
      dom.searchInput.blur();
    }
  });
  document.addEventListener('click', (event) => {
    if (!dom.searchForm.contains(event.target)) dom.suggestions.hidden = true;
  });
  dom.nearMe.addEventListener('click', () => {
    if (!navigator.geolocation) return showStatus('Location is not available in this browser');
    dom.nearMe.disabled = true;
    showStatus('Finding your location…', 5000);
    navigator.geolocation.getCurrentPosition((position) => {
      state.origin = { lat: position.coords.latitude, lon: position.coords.longitude, label: 'your location' };
      state.listQuery = '';
      renderUserMarker();
      const nearby = rankedVisibleVenues();
      renderLocationList();
      renderMarkers();
      setTrayState('full');
      focusLocation(state.origin, nearby);
      dom.nearMe.disabled = false;
      showStatus(nearby.length
        ? `Showing ${nearby.length} ${nearby.length === 1 ? 'location' : 'locations'} within ${NEARBY_RADIUS_MILES} miles`
        : `No listed locations within ${NEARBY_RADIUS_MILES} miles of your location`);
      emitRendered();
    }, () => {
      dom.nearMe.disabled = false;
      showStatus('Location permission was not available');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
  dom.aboutButton.addEventListener('click', () => dom.aboutDialog.showModal());
  wireTrayDrag();
  observeTrayLayout();
  window.addEventListener('popstate', () => location.reload());
  window.addEventListener('resize', () => {
    state.map?.resize();
    scheduleSelectedVenueVisibility();
  });
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

boot();
