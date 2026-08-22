import {
  NEARBY_RADIUS_MILES,
  findExactVenueMatch,
  getFanCount,
  rankNearbyVenues,
  rankVenues
} from './core.mjs';
import { buildUsAreaSearchUrl, normalizeUsAreaOrigin } from './search-geocode-core.mjs';
import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';
import { renderWatchPartyFormEntryPoint } from './watch-party-form.js';

const MOBILE_QUERY = '(max-width: 899px)';
const STYLE_ID = 'cgb-issue-121-hardening';
const SEARCH_TIMEOUT_MS = 8000;
const SEARCH_FORM_ID = 'location-search';
const TRAY_DRAG_THRESHOLD = 10;

let appConnected = false;
let reconcileFrame = 0;
let frameKey = '';
let addObserver = null;
let trayPointer = null;
let suppressTrayClick = false;
let searchSequence = 0;
let searchController = null;

function app() {
  return window.CGBApp || null;
}

function state() {
  return app()?.getState?.() || null;
}

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function currentVenue(current = state()) {
  return current?.snapshot?.venues?.find((venue) => venue.venue_id === current.selectedVenueId) || null;
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function setTextIfChanged(node, nextText) {
  if (node && node.textContent !== nextText) node.textContent = nextText;
}

function configuredMapTilerKey() {
  return clean(app()?.mapTilerKey);
}

function currentQuery() {
  return clean(document.querySelector('#location-query')?.value);
}

function noResultPanel() {
  const slot = document.querySelector('#search-surface-form-slot');
  if (!slot) return null;
  let panel = document.querySelector('#search-no-results');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'search-no-results';
    panel.className = 'search-no-results';
    panel.setAttribute('role', 'status');
    panel.hidden = true;
    const strong = document.createElement('strong');
    strong.textContent = 'No mapped location found';
    const copy = document.createElement('span');
    copy.textContent = 'Try another city, ZIP, area, or location name. You can also add a place that is not listed yet.';
    panel.append(strong, copy);
    slot.after(panel);
  }
  return panel;
}

function clearNoResult() {
  const panel = document.querySelector('#search-no-results');
  if (panel) panel.hidden = true;
}

function showNoResult(query) {
  const panel = noResultPanel();
  if (!panel) return;
  panel.querySelector('strong').textContent = query
    ? `No mapped location found for “${query}”`
    : 'No mapped location found';
  panel.hidden = false;
}

function closeSearchDropdown() {
  const dropdown = document.querySelector('#search-suggestions');
  if (dropdown) dropdown.hidden = true;
}

function showMobileSurface(surface) {
  if (!isMobile()) return;
  const selector = surface === 'list' ? '#mobile-list-button' : '#mobile-map-button';
  document.querySelector(selector)?.click();
}

function selectExistingVenue(venueId) {
  if (!venueId) return false;
  const escaped = window.CSS?.escape ? window.CSS.escape(venueId) : venueId.replace(/["\\]/g, '\\$&');
  const selectors = [
    `#search-suggestions button[data-venue-id="${escaped}"]`,
    `#location-list .location-card[data-venue-id="${escaped}"]`
  ];
  for (const selector of selectors) {
    const target = document.querySelector(selector);
    if (!target) continue;
    target.click();
    showMobileSurface('map');
    return true;
  }
  return false;
}

function renderPartialMatches(query, matches) {
  const current = state();
  if (!current) return;
  current.origin = null;
  current.listQuery = query;
  current.detailMode = false;
  current.trayState = 'full';
  closeSearchDropdown();
  app()?.render?.();
  showMobileSurface('list');
  app()?.showStatus?.(`${matches.length} mapped ${matches.length === 1 ? 'location matches' : 'locations match'} your search`, 3200);
}

function focusArea(origin, nearby) {
  const current = state();
  if (!current?.map) return;
  try {
    current.map.easeTo?.({
      center: [origin.lon, origin.lat],
      zoom: 10,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500,
      essential: true
    });
  } catch (error) {
    console.error('Area search map movement failed.', error);
  }
}

async function fetchUsArea(query, sequence) {
  const key = configuredMapTilerKey();
  if (!key) throw new Error('maptiler_not_configured');
  searchController?.abort();
  searchController = new AbortController();
  const timeout = window.setTimeout(() => searchController.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(buildUsAreaSearchUrl(query, key), {
      signal: searchController.signal,
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`area_search_http_${response.status}`);
    const payload = await response.json();
    if (sequence !== searchSequence) throw Object.assign(new Error('stale_search'), { stale: true });
    const origin = normalizeUsAreaOrigin(payload, query);
    if (!origin) throw new Error('us_area_not_found');
    return origin;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function runCanonicalSearch(query) {
  const current = state();
  if (!current?.snapshot || !query) return;
  clearNoResult();
  const sequence = ++searchSequence;
  const previous = {
    origin: current.origin,
    listQuery: current.listQuery,
    detailMode: current.detailMode,
    trayState: current.trayState
  };

  const matches = rankVenues(current.snapshot, current.gameId, current.origin, query);
  const exact = findExactVenueMatch(matches.map(({ venue }) => venue), query);
  closeSearchDropdown();

  if (exact) {
    current.origin = null;
    current.listQuery = '';
    app()?.render?.();
    if (!selectExistingVenue(exact.venue_id)) {
      current.listQuery = exact.name;
      app()?.showLocations?.();
      requestAnimationFrame(() => selectExistingVenue(exact.venue_id));
    }
    return;
  }

  const normalizedQuery = query.toLocaleLowerCase();
  const explicitPlaceFieldMatch = current.snapshot.venues.some((venue) =>
    [venue.city, venue.region, venue.postal_code, venue.address_line_1]
      .map((value) => clean(value).toLocaleLowerCase())
      .some((value) => value && (value === normalizedQuery || `${clean(venue.city)}, ${clean(venue.region)}`.toLocaleLowerCase() === normalizedQuery))
  );

  if (matches.length && !explicitPlaceFieldMatch) {
    renderPartialMatches(query, matches);
    return;
  }

  app()?.showStatus?.('Finding that area…', 5000);
  try {
    const origin = await fetchUsArea(query, sequence);
    if (sequence !== searchSequence) return;
    current.origin = origin;
    current.listQuery = '';
    current.detailMode = false;
    current.trayState = isMobile() ? 'peek' : 'full';
    const nearby = rankNearbyVenues(current.snapshot, current.gameId, origin, NEARBY_RADIUS_MILES);
    app()?.render?.();
    focusArea(origin, nearby);
    showMobileSurface('map');
    app()?.showStatus?.(nearby.length
      ? `Showing ${nearby.length} ${nearby.length === 1 ? 'location' : 'locations'} within ${NEARBY_RADIUS_MILES} miles of ${origin.label}`
      : `No listed locations within ${NEARBY_RADIUS_MILES} miles of ${origin.label}`,
    4200);
  } catch (error) {
    if (error?.stale || error?.name === 'AbortError' && sequence !== searchSequence) return;
    current.origin = previous.origin;
    current.listQuery = previous.listQuery;
    current.detailMode = previous.detailMode;
    current.trayState = previous.trayState;
    app()?.render?.();
    showNoResult(query);
    app()?.showStatus?.('Location not found', 3200);
  }
}

function handleSearchSubmit(event) {
  const form = event.target?.closest?.(`#${SEARCH_FORM_ID}`);
  if (!form || state()?.searchMode !== 'existing') return;
  const query = currentQuery();
  if (!query) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  runCanonicalSearch(query).catch((error) => {
    console.error('Canonical Search failed.', error);
    showNoResult(query);
  });
}

function handleSearchInput(event) {
  if (!event.target?.matches?.('#location-query')) return;
  clearNoResult();
  searchSequence += 1;
  searchController?.abort();
  searchController = null;
}

function setTrayState(next) {
  const current = state();
  const tray = document.querySelector('#venue-tray');
  if (!current || !tray) return;
  current.trayState = next;
  tray.dataset.state = next;
  tray.className = `venue-tray tray--${next}`;
  document.querySelector('#tray-handle')?.setAttribute('aria-expanded', String(next !== 'peek'));
  const peek = document.querySelector('#tray-peek');
  const selected = document.querySelector('#tray-selected');
  const list = document.querySelector('#tray-list');
  if (peek) peek.hidden = next !== 'peek';
  if (selected) selected.hidden = next !== 'selected';
  if (list) list.hidden = next !== 'full';
}

function handleTrayPointerDown(event) {
  if (!isMobile() || !event.target?.closest?.('#tray-handle')) return;
  trayPointer = { x: event.clientX, y: event.clientY };
  suppressTrayClick = false;
}

function handleTrayPointerUp(event) {
  if (!trayPointer) return;
  const distance = Math.hypot(event.clientX - trayPointer.x, event.clientY - trayPointer.y);
  suppressTrayClick = distance > TRAY_DRAG_THRESHOLD;
  trayPointer = null;
}

function handleTrayToggle(event) {
  if (!isMobile() || !event.target?.closest?.('#tray-handle')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (suppressTrayClick) {
    suppressTrayClick = false;
    return;
  }
  const current = state();
  if (!current) return;
  const expanded = current.selectedVenueId ? 'selected' : 'full';
  setTrayState(current.trayState === 'peek' ? expanded : 'peek');
  app()?.render?.();
}

function nominationConfig() {
  const value = (name) => clean(document.querySelector(`meta[name="${name}"]`)?.content);
  return {
    formUrl: value('cgb-cal-bar-nomination-form-url'),
    venueIdEntry: value('cgb-cal-bar-nomination-venue-id-entry'),
    venueNameEntry: value('cgb-cal-bar-nomination-venue-name-entry')
  };
}

function openCalBarForm(event) {
  const button = event.target?.closest?.('#add-cal-bar-button');
  if (!button || document.querySelector('#add-surface')?.hidden) return;
  const current = state();
  const venue = resolveCalBarNominationVenue(current?.snapshot, current?.selectedVenueId);
  if (!venue) return;
  const href = buildCalBarNominationPrefillUrl(nominationConfig(), venue);
  if (!href) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.open(href, '_blank', 'noopener,noreferrer');
}

function ensureAddGroups() {
  const surface = document.querySelector('#add-surface');
  const selectedActions = surface?.querySelector('.add-actions:not(.add-actions--global)');
  if (!surface || !selectedActions) return;
  selectedActions.classList.add('add-actions--selected-place');

  let selectedGroup = surface.querySelector('.add-selected-place-group');
  if (!selectedGroup) {
    selectedGroup = document.createElement('section');
    selectedGroup.className = 'add-selected-place-group';
    const title = document.createElement('h3');
    title.textContent = 'For this place';
    selectedActions.before(selectedGroup);
    selectedGroup.append(title, selectedActions);
  }

  let globalGroup = surface.querySelector('.add-global-location-group');
  if (!globalGroup) {
    globalGroup = document.createElement('section');
    globalGroup.className = 'add-global-location-group';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Add somewhere else';
    const title = document.createElement('h3');
    title.textContent = 'Add a new location';
    const globalActions = document.createElement('div');
    globalActions.className = 'add-actions add-actions--global';
    globalGroup.append(eyebrow, title, globalActions);
    const missing = surface.querySelector('#add-missing-location-link');
    (missing || selectedGroup).after(globalGroup);
  }

  const addLocation = surface.querySelector('#add-location-button');
  if (addLocation && addLocation.parentElement !== globalGroup.querySelector('.add-actions--global')) {
    globalGroup.querySelector('.add-actions--global').append(addLocation);
  }

  const current = state();
  const venue = currentVenue(current);
  const context = surface.querySelector('.add-context:not(.add-game-context)');
  selectedGroup.hidden = !venue;
  if (context) context.hidden = !venue;

  const calBarAction = surface.querySelector('#add-cal-bar-button');
  if (calBarAction && venue) {
    const title = calBarAction.querySelector('strong');
    const helper = calBarAction.querySelector('small');
    if (venue.venue_type === 'cal_bar') {
      setTextIfChanged(title, 'Tell us what makes this Cal Bar special');
      setTextIfChanged(helper, 'Share what makes this a recurring Cal gathering place.');
    } else {
      setTextIfChanged(title, 'Is this your local Cal Bar? Tell us why');
      setTextIfChanged(helper, 'Do Cal fans gather here regularly? Tell us what makes it a Cal Bar.');
    }
  }
}

function ensureWatchPartySection(detail) {
  let section = detail?.querySelector(':scope > .detail-watch-party-cta');
  if (!detail) return null;
  if (!section) {
    section = document.createElement('section');
    section.className = 'detail-watch-party-cta';
    section.hidden = true;
    const copy = document.createElement('div');
    copy.className = 'detail-watch-party-cta__copy';
    const heading = document.createElement('h2');
    heading.textContent = 'Planning a Watch Party?';
    const helper = document.createElement('p');
    helper.textContent = 'Add a game-specific gathering at this location.';
    copy.append(heading, helper);
    const action = document.createElement('div');
    action.className = 'detail-watch-party-cta__action';
    section.append(copy, action);
    const contribution = detail.querySelector(':scope > .detail-contribution');
    if (contribution) contribution.before(section);
    else detail.append(section);
  }
  return section;
}

function normalizeProfileAttendance(detail, current) {
  const venue = currentVenue(current);
  const game = current?.snapshot?.games?.find((candidate) => candidate.game_id === current.gameId);
  if (!detail || !venue || !game || game.game_status === 'completed') return;
  const count = getFanCount(current.snapshot, current.gameId, venue.venue_id);
  const activity = detail.querySelector(':scope > .activity-card');
  if (!activity) return;
  activity.classList.toggle('activity-card--zero', count === 0);
  if (count !== 0) return;
  const primary = activity.querySelector(':scope > strong');
  if (primary) {
    primary.className = 'activity-card__zero';
    primary.textContent = 'Be the first.';
  }
}

function normalizeSelectedPreview(current) {
  if (!isMobile() || current?.detailMode || current?.trayState !== 'selected') return;
  const venue = currentVenue(current);
  const count = venue ? getFanCount(current.snapshot, current.gameId, venue.venue_id) : 0;
  const selected = document.querySelector('#tray-selected .selected-card');
  const attendance = selected?.querySelector(':scope > .bear-count');
  if (!attendance) return;
  attendance.className = 'bear-count issue121-compact-count';
  attendance.textContent = count === 1 ? '1 Bear' : `${count} Bears`;
}

function ensureDesktopCanonicalProfile(current) {
  if (isMobile() || !current?.selectedVenueId || current.detailMode || current.trayState === 'full') return false;
  current.detailMode = true;
  current.trayState = 'selected';
  app()?.render?.();
  return true;
}

function frameSelectedMarker(current) {
  if (isMobile() || !current?.detailMode || !current?.map) return;
  const venue = currentVenue(current);
  const longitude = Number(venue?.longitude);
  const latitude = Number(venue?.latitude);
  if (![longitude, latitude].every(Number.isFinite)) return;
  const tray = document.querySelector('#venue-tray');
  const mapContainer = current.map.getContainer?.() || document.querySelector('#map');
  if (!tray || !mapContainer) return;
  const key = `${venue.venue_id}:${Math.round(mapContainer.clientWidth)}x${Math.round(mapContainer.clientHeight)}:${Math.round(tray.getBoundingClientRect().width)}`;
  if (key === frameKey) return;
  frameKey = key;
  const trayWidth = Math.max(0, tray.getBoundingClientRect().width);
  const currentZoom = Number(current.map.getZoom?.()) || 0;
  try {
    current.map.easeTo?.({
      center: [longitude, latitude],
      zoom: Math.max(currentZoom, 11),
      padding: { top: 24, right: trayWidth + 48, bottom: 24, left: 24 },
      retainPadding: false,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420,
      essential: true
    });
  } catch (error) {
    console.error('Selected marker framing failed.', error);
  }
}

function classifyDesktopTray() {
  const tray = document.querySelector('#venue-tray');
  if (!tray || isMobile()) return;
  const count = document.querySelectorAll('#location-list .location-card').length;
  tray.dataset.resultCount = count === 0 ? 'zero' : count === 1 ? 'one' : 'many';
}

function normalizeFooterCopy() {
  document.querySelectorAll('[data-support-open]').forEach((button) => {
    const spans = button.querySelectorAll(':scope > span');
    if (spans[0]) spans[0].textContent = 'Enjoying Cal Golden Bars?';
    if (spans[1]) spans[1].textContent = 'buy me a beer.';
  });
}

function reconcileRenderedState() {
  const current = state();
  if (!current) return;
  if (ensureDesktopCanonicalProfile(current)) return;

  ensureAddGroups();
  normalizeFooterCopy();
  classifyDesktopTray();
  normalizeSelectedPreview(current);

  if (current.detailMode) {
    const detail = document.querySelector('#venue-detail');
    if (detail) {
      ensureWatchPartySection(detail);
      normalizeProfileAttendance(detail, current);
      renderWatchPartyFormEntryPoint({ app: app(), documentObject: document, windowObject: window });
    }
  }
  frameSelectedMarker(current);
}

function scheduleReconcile() {
  cancelAnimationFrame(reconcileFrame);
  reconcileFrame = requestAnimationFrame(() => {
    requestAnimationFrame(reconcileRenderedState);
  });
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .search-field:focus-within,
    .command-surface .search-field:focus-within {
      border-color: var(--cgb-navy-900, #0b2856) !important;
      outline: 0 !important;
      box-shadow: inset 0 -3px 0 var(--cgb-gold-400, #fdb515), var(--shadow-sm) !important;
    }

    .location-search:has(.search-suggestions:not([hidden])) .search-field {
      border-bottom-left-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      clip-path: none !important;
    }

    .location-search > .search-suggestions,
    .command-surface .location-search > .search-suggestions {
      margin-top: 0 !important;
      border-top: 0 !important;
      border-radius: 0 0 var(--radius-sm) var(--radius-sm) !important;
      box-shadow: var(--shadow-sm) !important;
    }

    .search-no-results {
      display: grid;
      gap: 4px;
      margin-top: 8px;
      padding: 12px 14px;
      color: var(--cgb-ink-700, #334155);
      background: var(--cgb-white, #fff);
      border: 1px solid var(--cgb-neutral-200, #d9dee7);
      border-left: 3px solid var(--cgb-gold-400, #fdb515);
      font-size: .78rem;
      line-height: 1.35;
    }

    .search-no-results[hidden] { display: none !important; }
    .search-no-results strong { color: var(--cgb-navy-950, #010133); }

    .issue121-compact-count {
      min-height: 0 !important;
      width: fit-content !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      grid-column: 1 / -1 !important;
      margin: 0 !important;
      padding: 2px 0 !important;
      color: var(--cgb-ink-600, #566274) !important;
      background: transparent !important;
      background-image: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      font-family: var(--font-condensed, sans-serif) !important;
      font-size: .72rem !important;
      font-weight: 800 !important;
      letter-spacing: .02em !important;
      line-height: 1.1 !important;
      text-align: left !important;
    }

    #venue-detail .detail-hero h1 {
      overflow: visible !important;
      line-height: 1.08 !important;
      padding-bottom: .08em !important;
    }

    #venue-detail .activity-card {
      margin-top: 10px !important;
      padding-block: 12px !important;
    }

    #venue-detail .activity-card p {
      margin-top: 3px !important;
      line-height: 1.3 !important;
    }

    #venue-detail .activity-card--zero {
      display: grid !important;
      gap: 3px !important;
    }

    #venue-detail .activity-card__zero {
      color: var(--cgb-navy-950, #010133) !important;
      font-family: var(--font-condensed, sans-serif) !important;
      font-size: .82rem !important;
      font-weight: 850 !important;
      line-height: 1.15 !important;
    }

    #venue-detail .detail-watch-party-cta {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 14px;
      margin: 14px 16px 0;
      padding: 13px 14px;
      background: linear-gradient(135deg, var(--cgb-gold-50, #fff9e7), var(--cgb-white, #fff));
      border: 1px solid var(--cgb-gold-200, #f6dc86);
      border-left: 4px solid var(--cgb-gold-400, #fdb515);
      border-radius: 14px;
    }

    #venue-detail .detail-watch-party-cta[hidden] { display: none !important; }
    #venue-detail .detail-watch-party-cta__copy { display: grid; gap: 3px; }
    #venue-detail .detail-watch-party-cta h2 {
      margin: 0;
      color: var(--cgb-navy-950, #010133);
      font-family: var(--font-display, sans-serif);
      font-size: 1rem;
      line-height: 1.1;
    }
    #venue-detail .detail-watch-party-cta p {
      margin: 0;
      color: var(--cgb-ink-600, #566274);
      font-size: .72rem;
      line-height: 1.3;
    }
    #venue-detail .detail-watch-party-cta__link {
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      color: var(--cgb-navy-950, #010133);
      background: var(--cgb-gold-400, #fdb515);
      border: 1px solid var(--cgb-gold-500, #e3a100);
      border-radius: 10px;
      font-family: var(--font-condensed, sans-serif);
      font-size: .76rem;
      font-weight: 850;
      line-height: 1.1;
      text-decoration: none;
      white-space: nowrap;
    }

    #venue-detail .detail-contribution {
      background: var(--cgb-neutral-50, #f8fafc) !important;
      border-style: solid !important;
      box-shadow: none !important;
    }

    #venue-detail .detail-contribution h2 {
      color: var(--cgb-ink-700, #334155) !important;
      font-family: var(--font-condensed, sans-serif) !important;
      font-size: .78rem !important;
      font-weight: 850 !important;
      letter-spacing: .035em !important;
      text-transform: uppercase !important;
    }

    #venue-detail .detail-primary-actions {
      align-items: stretch !important;
    }

    .add-selected-place-group,
    .add-global-location-group {
      display: grid;
      gap: 8px;
      margin-top: 16px;
    }

    .add-selected-place-group[hidden] { display: none !important; }
    .add-selected-place-group h3,
    .add-global-location-group h3 {
      margin: 0;
      color: var(--cgb-navy-950, #010133);
      font-family: var(--font-display, sans-serif);
      font-size: 1rem;
      line-height: 1.1;
    }
    .add-global-location-group {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid var(--cgb-neutral-200, #d9dee7);
    }
    .add-global-location-group .eyebrow { margin-bottom: -3px; }

    .about-support [data-support-open] > span:first-child,
    .site-footer [data-support-open] > span:first-child {
      font-weight: 400 !important;
    }

    @media (max-width: 899px) {
      #venue-detail .detail-address-actions {
        align-items: baseline !important;
      }
      #venue-detail .detail-directions-inline,
      #venue-detail .detail-website-inline {
        min-height: auto !important;
        padding-block: 2px !important;
        line-height: 1.2 !important;
      }
      #venue-detail .detail-watch-party-cta {
        grid-template-columns: 1fr;
        justify-items: stretch;
      }
      #venue-detail .detail-watch-party-cta__link {
        width: 100%;
        justify-content: flex-start;
        text-align: left;
      }
    }

    @media (min-width: 900px) {
      .venue-tray[data-result-count="zero"].tray--full,
      .venue-tray[data-result-count="one"].tray--full {
        bottom: auto !important;
        max-height: calc(100% - 44px) !important;
      }
      .venue-tray[data-result-count="zero"].tray--full .tray-list,
      .venue-tray[data-result-count="one"].tray--full .tray-list {
        flex: 0 1 auto !important;
      }
      #tray-selected > .selected-card {
        display: none !important;
      }
      #tray-selected > #venue-detail {
        display: block !important;
      }
    }
  `;
  document.head.append(style);
}

function observeAddSurface() {
  if (addObserver) return;
  const surface = document.querySelector('#add-surface');
  if (!surface) return;
  addObserver = new MutationObserver(() => ensureAddGroups());
  addObserver.observe(surface, { childList: true, subtree: true });
}

function connectApp() {
  if (appConnected) return;
  if (!app()?.subscribe) {
    window.setTimeout(connectApp, 25);
    return;
  }
  appConnected = true;
  app().subscribe('rendered', scheduleReconcile);
  app().subscribe('ready', scheduleReconcile);
  scheduleReconcile();
}

function initialize() {
  installStyles();
  noResultPanel();
  ensureAddGroups();
  normalizeFooterCopy();
  observeAddSurface();
  document.addEventListener('submit', handleSearchSubmit, { capture: true });
  document.addEventListener('input', handleSearchInput, { capture: true });
  document.addEventListener('pointerdown', handleTrayPointerDown, { capture: true });
  document.addEventListener('pointerup', handleTrayPointerUp, { capture: true });
  document.addEventListener('click', handleTrayToggle, { capture: true });
  document.addEventListener('click', openCalBarForm, { capture: true });
  window.addEventListener('resize', () => {
    frameKey = '';
    scheduleReconcile();
  });
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
