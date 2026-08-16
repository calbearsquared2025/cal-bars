export const GA_MEASUREMENT_ID = 'G-CZV3JSBNJK';

const SCRIPT_ID = 'cgb-google-analytics';
const INITIALIZED_FLAG = '__CGB_GA_INITIALIZED__';
const FLOW_INITIALIZED_FLAG = '__CGB_GA_FLOW_INITIALIZED__';
const APP_CONNECT_MAX_ATTEMPTS = 400;
const APP_CONNECT_DELAY_MS = 25;
const EVENT_ALIASES = Object.freeze({
  external_place_result_selected: 'external_place_selected'
});
const ALLOWED_EVENT_PARAMETERS = new Set([
  'action_surface',
  'content_type',
  'entry_surface',
  'form_type',
  'game_id',
  'has_watch_party',
  'intent_action',
  'place_type',
  'result_count',
  'result_type',
  'search_mode',
  'venue_type',
  'view_mode'
]);

let pendingVenueEntrySurface = '';
let pendingIntentSurface = '';
let lastVenueSignature = '';
let lastGameId = '';
let appConnectAttempts = 0;

function canonicalEventName(name) {
  const value = String(name || '').trim();
  return EVENT_ALIASES[value] || value;
}

function cleanParameterValue(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, 100) : null;
}

export function sanitizeEventParameters(parameters = {}) {
  return Object.fromEntries(Object.entries(parameters)
    .filter(([key]) => ALLOWED_EVENT_PARAMETERS.has(key))
    .map(([key, value]) => [key, cleanParameterValue(value)])
    .filter(([, value]) => value !== null && value !== undefined));
}

function appState(windowObject) {
  try { return windowObject?.CGBApp?.getState?.() || null; } catch (_) { return null; }
}

function venueById(state, venueId) {
  return state?.snapshot?.venues?.find((venue) => venue.venue_id === venueId) || null;
}

function watchPartyAtVenue(state, venueId) {
  return Boolean(state?.snapshot?.watchParties?.some((party) =>
    party.game_id === state.gameId &&
    party.venue_id === venueId &&
    party.event_status === 'active'
  ));
}

function currentGameContext(windowObject) {
  const state = appState(windowObject);
  return state?.gameId ? { game_id: state.gameId } : {};
}

function eventDefaults(eventName, windowObject) {
  const defaults = currentGameContext(windowObject);
  if (eventName === 'external_place_selected') {
    defaults.entry_surface = 'search';
    defaults.result_type = 'external';
  }
  if (eventName === 'community_location_created') {
    defaults.venue_type = 'community_location';
    defaults.action_surface = 'external_dialog';
  }
  if (eventName.startsWith('fan_intent_') && pendingIntentSurface) {
    defaults.action_surface = pendingIntentSurface;
  }
  return defaults;
}

function normalizeEventArguments(args, windowObject) {
  if (args[0] !== 'event') return args;
  const eventName = canonicalEventName(args[1]);
  const parameters = sanitizeEventParameters({
    ...eventDefaults(eventName, windowObject),
    ...(args[2] || {})
  });
  if (eventName.startsWith('fan_intent_')) pendingIntentSurface = '';
  return ['event', eventName, parameters];
}

export function trackCgbEvent(eventName, parameters = {}, windowObject = globalThis.window) {
  if (!windowObject || typeof windowObject.gtag !== 'function') return false;
  const normalizedName = canonicalEventName(eventName);
  const normalizedParameters = sanitizeEventParameters({
    ...eventDefaults(normalizedName, windowObject),
    ...parameters
  });
  windowObject.gtag('event', normalizedName, normalizedParameters);
  if (normalizedName.startsWith('fan_intent_')) pendingIntentSurface = '';
  return true;
}

export function initializeGoogleAnalytics({
  windowObject = window,
  documentObject = document,
  measurementId = GA_MEASUREMENT_ID
} = {}) {
  if (!windowObject || !documentObject || !measurementId) return false;
  if (windowObject[INITIALIZED_FLAG]) return true;

  windowObject[INITIALIZED_FLAG] = true;
  windowObject.dataLayer = windowObject.dataLayer || [];
  windowObject.gtag = windowObject.gtag || function gtag(...args) {
    windowObject.dataLayer.push(normalizeEventArguments(args, windowObject));
  };

  if (!documentObject.getElementById(SCRIPT_ID)) {
    const script = documentObject.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    documentObject.head.append(script);
  }

  windowObject.gtag('js', new Date());
  windowObject.gtag('config', measurementId);
  return true;
}

function actionSurface(element) {
  if (!element?.closest) return 'unknown';
  if (element.closest('#venue-detail')) return 'detail';
  if (element.closest('#tray-selected')) return 'selected_tray';
  if (element.closest('#tray-list')) return 'location_list';
  if (element.closest('#search-suggestions')) return 'search';
  if (element.closest('#external-venue-dialog')) return 'external_dialog';
  if (element.closest('#add-surface')) return 'add_surface';
  return 'map';
}

function venueIdFromElement(element) {
  if (!element?.closest) return '';
  return element.closest('[data-venue-id]')?.dataset?.venueId || '';
}

function venueContext(state, venueId, extra = {}) {
  const venue = venueById(state, venueId);
  return {
    game_id: state?.gameId || '',
    venue_type: venue?.venue_type || '',
    has_watch_party: watchPartyAtVenue(state, venueId),
    ...extra
  };
}

function isDirectionsLink(element) {
  if (!element?.matches?.('a')) return false;
  if (element.matches('.detail-directions-inline')) return true;
  return element.closest('.action-row') && /^Directions$/i.test(element.textContent.trim());
}

function isShareButton(element) {
  if (!element?.matches?.('button')) return false;
  if (element.matches('.detail-share')) return true;
  return element.closest('.action-row') && /^(Share|Invite more|Share Watch Party)$/i.test(element.textContent.trim());
}

function handleFlowClick(event, windowObject) {
  const element = event.target?.closest?.('a, button');
  if (!element) return;
  const state = appState(windowObject);
  const surface = actionSurface(element);
  const venueId = venueIdFromElement(element) || state?.selectedVenueId || '';

  if (element.matches('.cgb-marker[data-venue-id]')) pendingVenueEntrySurface = 'map';
  else if (element.matches('.location-card[data-venue-id]')) pendingVenueEntrySurface = 'location_list';
  else if (element.matches('#search-suggestions button[data-venue-id]')) pendingVenueEntrySurface = 'search';

  if (element.matches('.intent-button[data-venue-id]')) pendingIntentSurface = surface;

  if (isDirectionsLink(element)) {
    trackCgbEvent('directions_clicked', venueContext(state, venueId, { action_surface: surface }), windowObject);
  }

  if (isShareButton(element)) {
    trackCgbEvent('share', venueContext(state, venueId, {
      action_surface: surface,
      content_type: 'venue'
    }), windowObject);
  }

  if (element.matches('a[href*="venue="]') && /^View details$/i.test(element.textContent.trim())) {
    trackCgbEvent('venue_detail_opened', venueContext(state, venueId, { action_surface: surface }), windowObject);
  }

  if (element.matches('[data-watch-party-form-entry-point], [data-external-watch-party-form-retry], #external-venue-plan-watch-party')) {
    const formContext = element.matches('#external-venue-plan-watch-party')
      ? {
          game_id: state?.gameId || '',
          action_surface: surface,
          form_type: 'watch_party'
        }
      : venueContext(state, venueId, {
          action_surface: surface,
          form_type: 'watch_party'
        });
    trackCgbEvent('watch_party_form_started', formContext, windowObject);
  }

  if (element.matches('[data-cal-bar-nomination-entry]')) {
    trackCgbEvent('cal_bar_nomination_started', venueContext(state, venueId, {
      action_surface: surface,
      form_type: 'cal_bar_nomination'
    }), windowObject);
  }

  if (element.matches('.party-module a[target="_blank"]:not(.party-module__report)')) {
    trackCgbEvent('official_event_link_clicked', venueContext(state, venueId, { action_surface: surface }), windowObject);
  }
}

function handleFlowSubmit(event, windowObject) {
  if (!event.target?.matches?.('#location-search')) return;
  const input = event.target.querySelector('#location-query');
  const query = String(input?.value || '').trim();
  if (!query) return;
  trackCgbEvent('search', {
    game_id: appState(windowObject)?.gameId || '',
    search_mode: /^\d{5}(?:-\d{4})?$/.test(query) ? 'postal' : 'text'
  }, windowObject);
  pendingVenueEntrySurface = 'search';
  windowObject.setTimeout(() => {
    if (pendingVenueEntrySurface === 'search') pendingVenueEntrySurface = '';
  }, 1500);
}

function handleRendered(windowObject) {
  const state = appState(windowObject);
  if (!state?.snapshot) return;

  if (state.gameId && state.gameId !== lastGameId) {
    trackCgbEvent('game_view', {
      game_id: state.gameId,
      view_mode: state.detailMode ? 'detail' : 'map'
    }, windowObject);
    lastGameId = state.gameId;
  }

  const venue = venueById(state, state.selectedVenueId);
  const signature = venue
    ? `${state.gameId}:${venue.venue_id}:${state.detailMode ? 'detail' : 'selected'}`
    : '';
  if (!signature) {
    lastVenueSignature = '';
    return;
  }
  if (signature === lastVenueSignature && !pendingVenueEntrySurface) return;

  if (pendingVenueEntrySurface || state.detailMode) {
    trackCgbEvent('venue_view', venueContext(state, venue.venue_id, {
      entry_surface: pendingVenueEntrySurface || 'direct_link',
      view_mode: state.detailMode ? 'detail' : 'selected_tray'
    }), windowObject);
  }
  lastVenueSignature = signature;
  pendingVenueEntrySurface = '';
}

function connectToApp(windowObject) {
  const app = windowObject.CGBApp;
  if (!app?.subscribe) {
    appConnectAttempts += 1;
    if (appConnectAttempts <= APP_CONNECT_MAX_ATTEMPTS) {
      windowObject.setTimeout(() => connectToApp(windowObject), APP_CONNECT_DELAY_MS);
    }
    return false;
  }
  app.subscribe('rendered', () => handleRendered(windowObject));
  app.subscribe('ready', () => handleRendered(windowObject));
  handleRendered(windowObject);
  return true;
}

export function initializeFlowInstrumentation({
  windowObject = window,
  documentObject = document
} = {}) {
  if (!windowObject || !documentObject) return false;
  if (windowObject[FLOW_INITIALIZED_FLAG]) return true;
  windowObject[FLOW_INITIALIZED_FLAG] = true;

  documentObject.addEventListener('click', (event) => handleFlowClick(event, windowObject), { capture: true });
  documentObject.addEventListener('submit', (event) => handleFlowSubmit(event, windowObject), { capture: true });
  connectToApp(windowObject);
  return true;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeGoogleAnalytics();
  initializeFlowInstrumentation();
}
