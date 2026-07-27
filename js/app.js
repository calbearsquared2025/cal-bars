import {
  bearCountCopy,
  buildGameUrl,
  buildVenueUrl,
  formatKickoff,
  gameTitle,
  getFanCount,
  getHistoryCount,
  getWatchPartiesForGame,
  getWatchParty,
  historyCountCopy,
  markerKind,
  rankVenues,
  selectDefaultGame,
  validateSnapshotShape,
  venueTypeLabel
} from './core.mjs';

const MAPTILER_KEY = 'jNqIsIVa4dP9qv7vQ8fy';
const MAPTILER_STYLE = `https://api.maptiler.com/maps/019997ef-99cb-7052-b842-98cc3dbf3d7c/style.json?key=${MAPTILER_KEY}`;
const LAST_GOOD_KEY = 'cgb_v2_last_good_snapshot';
const DATA_URL_KEY = 'cgb_v2_public_data_url';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  snapshot: null,
  gameId: null,
  selectedVenueId: null,
  origin: null,
  trayState: 'peek',
  map: null,
  markers: new Map(),
  userMarker: null,
  detailMode: false,
  dataSource: 'fallback'
};

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

function cacheDom() {
  Object.assign(dom, {
    app: document.querySelector('#app'),
    mapView: document.querySelector('#map-view'),
    detailView: document.querySelector('#detail-view'),
    venueDetail: document.querySelector('#venue-detail'),
    detailBack: document.querySelector('#detail-back'),
    map: document.querySelector('#map'),
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
    fullscreen: document.querySelector('#fullscreen-button'),
    tray: document.querySelector('#venue-tray'),
    trayHandle: document.querySelector('#tray-handle'),
    trayPeek: document.querySelector('#tray-peek'),
    traySelected: document.querySelector('#tray-selected'),
    trayList: document.querySelector('#tray-list'),
    browseButton: document.querySelector('#browse-locations-button'),
    closeList: document.querySelector('#close-list-button'),
    listHeading: document.querySelector('#list-heading'),
    locationList: document.querySelector('#location-list'),
    status: document.querySelector('#status'),
    aboutButton: document.querySelector('#about-button'),
    aboutDialog: document.querySelector('#about-dialog')
  });
}

function showStatus(message, timeout = 2600) {
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
  const configured = storageGet(DATA_URL_KEY)?.trim() ||
    document.querySelector('meta[name="cgb-data-endpoint"]')?.content.trim() || '';

  if (configured) {
    try {
      const live = await fetchJson(configured);
      if (!validateSnapshotShape(live)) throw new Error('Unexpected public-data shape');
      storageSet(LAST_GOOD_KEY, JSON.stringify(live));
      state.dataSource = 'live';
      return live;
    } catch (error) {
      console.warn('Live snapshot unavailable; using last-known-good or fallback.', error);
    }
  }

  const cached = storageGet(LAST_GOOD_KEY);
  if (cached) {
    try {
      const snapshot = JSON.parse(cached);
      if (validateSnapshotShape(snapshot)) {
        state.dataSource = 'last-known-good';
        return snapshot;
      }
    } catch (error) {
      console.warn('Ignoring malformed last-known-good snapshot.', error);
    }
  }

  const fallback = await fetchJson('data/fallback-v2.json');
  if (!validateSnapshotShape(fallback)) throw new Error('Fallback snapshot is invalid');
  state.dataSource = 'fallback';
  return fallback;
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
  const url = new URL(buildGameUrl(state.gameId, location.href));
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function renderHeaderAndStats() {
  const game = selectedGame();
  dom.headerGameLabel.textContent = gameTitle(game);
  dom.headerKickoff.textContent = formatKickoff(game);
  const partyCount = getWatchPartiesForGame(state.snapshot, state.gameId).length;
  dom.partyStat.textContent = `${partyCount} watch ${partyCount === 1 ? 'party' : 'parties'} for this game`;
  dom.locationStat.textContent = `${state.snapshot.venues.length} locations mapped`;
  dom.listHeading.textContent = `${gameTitle(game)} locations`;
}

function renderGameDialog() {
  dom.gameList.replaceChildren();
  const games = [...state.snapshot.games].sort((a, b) => Number(a.season) - Number(b.season) || Number(a.schedule_order) - Number(b.schedule_order));
  games.forEach((game) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-option';
    button.dataset.selected = String(game.game_id === state.gameId);
    button.innerHTML = `
      <span><strong>${gameTitle(game)}</strong><small>${formatKickoff(game)}</small></span>
      <span class="game-status">${game.game_status}</span>
    `;
    button.addEventListener('click', () => {
      state.gameId = game.game_id;
      state.selectedVenueId = null;
      setTrayState('peek');
      updateRouteForGame();
      renderAll();
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
  button.setAttribute('aria-label', `${venue.name}, ${venueTypeLabel(venue)}`);
  button.dataset.venueId = venue.venue_id;
  button.innerHTML = kind === 'watch-party'
    ? '<span class="marker-star" aria-hidden="true">★</span>'
    : '<span class="marker-pin" aria-hidden="true"></span>';
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'marker-count';
    badge.textContent = String(count);
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

  const bounds = new maplibregl.LngLatBounds();
  state.snapshot.venues.forEach((venue) => bounds.extend([Number(venue.longitude), Number(venue.latitude)]));

  state.map = new maplibregl.Map({
    container: dom.map,
    style: MAPTILER_STYLE,
    bounds: bounds.isEmpty() ? undefined : bounds,
    fitBoundsOptions: { padding: 56, maxZoom: 7 },
    center: bounds.isEmpty() ? [-98.5795, 39.8283] : undefined,
    zoom: bounds.isEmpty() ? 3.2 : undefined,
    attributionControl: false,
    fadeDuration: 100
  });
  state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  state.map.on('error', (event) => {
    console.warn('Map error', event?.error || event);
  });
  state.map.on('load', renderMarkers);
  new ResizeObserver(() => state.map?.resize()).observe(dom.map);
}

function renderMarkers() {
  if (!state.map) return;
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();
  state.snapshot.venues.forEach((venue) => {
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

function panToVenue(venue) {
  if (!state.map) return;
  const isMobile = window.matchMedia('(max-width: 899px)').matches;
  const trayHeight = isMobile ? Math.min(window.innerHeight * 0.48, 410) : 0;
  state.map.easeTo({
    center: [Number(venue.longitude), Number(venue.latitude)],
    zoom: Math.max(state.map.getZoom(), 12),
    padding: { top: 80, right: 40, bottom: trayHeight, left: 40 },
    duration: REDUCED_MOTION ? 0 : 450,
    essential: true
  });
}

function selectVenue(venueId) {
  state.selectedVenueId = venueId;
  setTrayState('selected');
  renderMarkers();
  renderTray();
  const venue = selectedVenue();
  if (venue) panToVenue(venue);
}

function setTrayState(next) {
  state.trayState = next;
  dom.tray.dataset.state = next;
  dom.tray.className = `venue-tray tray--${next}`;
  dom.trayHandle.setAttribute('aria-expanded', String(next !== 'peek'));
  dom.trayHandle.setAttribute('aria-label', next === 'full' ? 'Collapse location tray' : 'Expand location tray');
  dom.trayPeek.hidden = next !== 'peek';
  dom.traySelected.hidden = next !== 'selected';
  dom.trayList.hidden = next !== 'full';
  requestAnimationFrame(() => state.map?.resize());
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return '';
  if (distance < 0.1) return 'Nearby';
  return `${distance.toFixed(distance < 10 ? 1 : 0)} mi away`;
}

function directionsUrl(venue) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.latitude},${venue.longitude}`)}`;
}

function createBadge(venue, party) {
  const badge = document.createElement('span');
  badge.className = party ? 'venue-badge badge--party' : venue.venue_type === 'cal_bar' ? 'venue-badge badge--cal' : 'venue-badge badge--community';
  badge.textContent = party ? 'WATCH PARTY' : venueTypeLabel(venue);
  return badge;
}

function appendWatchParty(container, party) {
  if (!party) return;
  const module = document.createElement('section');
  module.className = 'party-module';
  const title = document.createElement('div');
  title.className = 'party-module__title';
  title.innerHTML = '<span aria-hidden="true">★</span><strong>Watch Party</strong>';
  module.append(title);

  const hosted = document.createElement('p');
  hosted.textContent = `Hosted by ${party.organizer_name}`;
  module.append(hosted);

  if (party.event_start_at) {
    const start = new Date(party.event_start_at);
    if (!Number.isNaN(start.getTime())) {
      const line = document.createElement('p');
      line.textContent = `Arrive ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(start)}`;
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

  const intent = document.createElement('button');
  intent.type = 'button';
  intent.className = 'primary-button intent-button';
  intent.textContent = 'I’ll be here';
  intent.disabled = true;
  intent.title = 'Check-ins are implemented in Milestone 3';
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

async function shareVenue(venue) {
  const url = buildVenueUrl(venue.slug, state.gameId, location.href);
  const game = selectedGame();
  const payload = {
    title: `${venue.name} · Cal Golden Bars`,
    text: `${gameTitle(game)} at ${venue.name}`,
    url
  };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }
    await navigator.clipboard.writeText(url);
    showStatus('Link copied');
  } catch (error) {
    if (error?.name !== 'AbortError') showStatus('Could not share this link');
  }
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
  const header = document.createElement('div');
  header.className = 'selected-card__header';
  const heading = document.createElement('div');
  heading.append(createBadge(venue, party));
  const title = document.createElement('h2');
  title.textContent = venue.name;
  heading.append(title);
  const locationLine = document.createElement('p');
  locationLine.className = 'venue-location';
  locationLine.textContent = [venue.city, venue.region, formatDistance(distance)].filter(Boolean).join(' · ');
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

  const previewNote = document.createElement('p');
  previewNote.className = 'preview-note';
  previewNote.textContent = 'Read-only preview: check-ins are enabled in Milestone 3.';
  card.append(previewNote);
  dom.traySelected.append(card);
}

function renderLocationList(query = dom.searchInput.value) {
  const ranked = rankVenues(state.snapshot, state.gameId, state.origin, query);
  dom.locationList.replaceChildren();
  if (!ranked.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No mapped locations match this search.';
    dom.locationList.append(empty);
    return;
  }

  ranked.forEach(({ venue, party, fanCount, distance }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'location-card';
    button.dataset.selected = String(venue.venue_id === state.selectedVenueId);
    const top = document.createElement('div');
    top.className = 'location-card__top';
    const info = document.createElement('div');
    info.append(createBadge(venue, party));
    const name = document.createElement('strong');
    name.textContent = venue.name;
    info.append(name);
    const meta = document.createElement('span');
    meta.textContent = [venue.city, venue.region, formatDistance(distance)].filter(Boolean).join(' · ');
    info.append(meta);
    top.append(info);
    const count = document.createElement('span');
    count.className = 'location-card__count';
    count.textContent = String(fanCount);
    count.setAttribute('aria-label', `${fanCount} Bears watching here`);
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
  const hero = document.createElement('header');
  hero.className = 'detail-hero';
  hero.append(createBadge(venue, party));
  const title = document.createElement('h1');
  title.textContent = venue.name;
  hero.append(title);
  const city = document.createElement('p');
  city.className = 'detail-city';
  city.textContent = `${venue.city}, ${venue.region}`;
  hero.append(city);
  const address = document.createElement('p');
  address.className = 'detail-address';
  address.textContent = [venue.address_line_1, venue.address_line_2, venue.city, venue.region, venue.postal_code].filter(Boolean).join(', ');
  hero.append(address);
  dom.venueDetail.append(hero);

  const gameContext = document.createElement('section');
  gameContext.className = 'detail-game-context';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Selected game';
  gameContext.append(eyebrow);
  const gameHeading = document.createElement('h2');
  gameHeading.textContent = gameTitle(game);
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
  note.textContent = 'Read-only preview: check-ins and contribution forms are implemented in later milestones.';
  dom.venueDetail.append(note);
}

function renderAll() {
  renderHeaderAndStats();
  renderGameDialog();
  if (state.detailMode) {
    renderDetailView();
    return;
  }
  dom.mapView.hidden = false;
  dom.detailView.hidden = true;
  renderTray();
  if (state.map) renderMarkers();
  else initMap();
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

function searchExisting(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  return rankVenues(state.snapshot, state.gameId, state.origin, normalized)[0]?.venue || null;
}

async function runSearch(query) {
  const existing = searchExisting(query);
  if (existing) {
    selectVenue(existing.venue_id);
    dom.suggestions.hidden = true;
    return;
  }

  showStatus('Finding that area…', 5000);
  try {
    state.origin = await geocode(query);
    renderUserMarker();
    renderLocationList('');
    setTrayState('full');
    state.map?.easeTo({ center: [state.origin.lon, state.origin.lat], zoom: 10, duration: REDUCED_MOTION ? 0 : 500 });
    showStatus(`Showing locations near ${state.origin.label}`);
  } catch (error) {
    showStatus('Location not found');
  }
}

function renderSuggestions() {
  const query = dom.searchInput.value.trim();
  dom.suggestions.replaceChildren();
  if (!query) {
    dom.suggestions.hidden = true;
    renderLocationList('');
    return;
  }
  const matches = rankVenues(state.snapshot, state.gameId, state.origin, query).slice(0, 5);
  matches.forEach(({ venue, party }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.innerHTML = `<strong>${venue.name}</strong><span>${party ? 'Watch Party · ' : ''}${venue.city}, ${venue.region}</span>`;
    button.addEventListener('click', () => {
      dom.searchInput.value = venue.name;
      dom.suggestions.hidden = true;
      selectVenue(venue.venue_id);
    });
    dom.suggestions.append(button);
  });
  dom.suggestions.hidden = matches.length === 0;
  renderLocationList(query);
}

function wireTrayDrag() {
  let startY = null;
  dom.trayHandle.addEventListener('pointerdown', (event) => {
    startY = event.clientY;
    dom.trayHandle.setPointerCapture(event.pointerId);
  });
  dom.trayHandle.addEventListener('pointerup', (event) => {
    if (startY === null) return;
    const delta = event.clientY - startY;
    startY = null;
    if (delta < -48) setTrayState('full');
    else if (delta > 48) setTrayState(state.selectedVenueId ? 'selected' : 'peek');
    else if (state.trayState === 'peek') setTrayState(state.selectedVenueId ? 'selected' : 'full');
    else if (state.trayState === 'selected') setTrayState('full');
    else setTrayState(state.selectedVenueId ? 'selected' : 'peek');
  });
}

function wireEvents() {
  dom.gameButton.addEventListener('click', () => dom.gameDialog.showModal());
  dom.browseButton.addEventListener('click', () => setTrayState('full'));
  dom.closeList.addEventListener('click', () => setTrayState(state.selectedVenueId ? 'selected' : 'peek'));
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
      renderUserMarker();
      renderLocationList('');
      setTrayState('full');
      state.map?.easeTo({ center: [state.origin.lon, state.origin.lat], zoom: 11, duration: REDUCED_MOTION ? 0 : 500 });
      dom.nearMe.disabled = false;
      showStatus('Locations ranked by distance');
    }, () => {
      dom.nearMe.disabled = false;
      showStatus('Location permission was not available');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
  dom.fullscreen.addEventListener('click', () => {
    const active = document.body.classList.toggle('map-fullscreen');
    dom.fullscreen.setAttribute('aria-pressed', String(active));
    dom.fullscreen.setAttribute('aria-label', active ? 'Exit full-screen map' : 'Enter full-screen map');
    requestAnimationFrame(() => state.map?.resize());
  });
  dom.aboutButton.addEventListener('click', () => dom.aboutDialog.showModal());
  wireTrayDrag();
  window.addEventListener('popstate', () => location.reload());
  window.addEventListener('resize', () => state.map?.resize());
}

async function boot() {
  cacheDom();
  wireEvents();
  try {
    state.snapshot = await loadSnapshot();
    initializeRoute();
    renderAll();
    dom.app.setAttribute('aria-busy', 'false');
    if (state.dataSource !== 'live') {
      console.info(`CGB v2 using ${state.dataSource} data.`);
    }
  } catch (error) {
    console.error(error);
    dom.app.setAttribute('aria-busy', 'false');
    showStatus('The location data could not be loaded.', 6000);
    dom.mapFallback.hidden = false;
  }
}

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
