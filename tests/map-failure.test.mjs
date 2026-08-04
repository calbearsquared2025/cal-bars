import test from 'node:test';
import assert from 'node:assert/strict';

import {
  attachMapFailureFallback,
  showMapUnavailable
} from '../js/map-failure.mjs';

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add(value) { values.add(value); },
    contains(value) { return values.has(value); }
  };
}

function fixture({ selectedVenueId = null, loaded = false } = {}) {
  const calls = { mapRemove: 0, markerRemove: 0, userRemove: 0, browse: 0, warnings: [] };
  const handlers = {};
  const map = {
    loaded: () => loaded,
    on(name, handler) { handlers[name] = handler; },
    remove() { calls.mapRemove += 1; }
  };
  const state = {
    map,
    selectedVenueId,
    markers: new Map([['venue_1', { remove() { calls.markerRemove += 1; } }]]),
    userMarker: { remove() { calls.userRemove += 1; } }
  };
  const elements = {
    '#map': { classList: classList() },
    '#map-fallback': { hidden: true },
    '#fullscreen-button': {
      disabled: false,
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; }
    },
    '#browse-locations-button': { click() { calls.browse += 1; } }
  };
  return {
    calls,
    handlers,
    map,
    state,
    app: { getState: () => state },
    documentObject: { querySelector: (selector) => elements[selector] || null },
    consoleObject: { warn: (...args) => calls.warnings.push(args) },
    elements
  };
}

test('map failure exposes fallback, removes unusable map state, and opens the location list', () => {
  const item = fixture();
  assert.equal(showMapUnavailable(item), true);
  assert.equal(item.calls.mapRemove, 1);
  assert.equal(item.calls.markerRemove, 1);
  assert.equal(item.calls.userRemove, 1);
  assert.equal(item.state.map, null);
  assert.equal(item.state.userMarker, null);
  assert.equal(item.state.markers.size, 0);
  assert.equal(item.elements['#map-fallback'].hidden, false);
  assert.equal(item.elements['#map'].classList.contains('map--fallback'), true);
  assert.equal(item.elements['#fullscreen-button'].disabled, true);
  assert.equal(item.elements['#fullscreen-button'].attributes['aria-disabled'], 'true');
  assert.equal(item.calls.browse, 1);
});

test('map failure preserves an already selected Venue instead of forcing the full list', () => {
  const item = fixture({ selectedVenueId: 'venue_1' });
  showMapUnavailable(item);
  assert.equal(item.calls.browse, 0);
});

test('pre-load MapLibre errors activate the fallback', () => {
  const item = fixture();
  assert.equal(attachMapFailureFallback(item), true);
  item.handlers.error({ error: new Error('style failed') });
  assert.equal(item.state.map, null);
  assert.equal(item.elements['#map-fallback'].hidden, false);
  assert.equal(item.calls.warnings.length, 1);
});

test('post-load tile errors are logged without discarding a usable map', () => {
  const item = fixture();
  attachMapFailureFallback(item);
  item.handlers.load();
  item.handlers.error({ error: new Error('one tile failed') });
  assert.equal(item.state.map, item.map);
  assert.equal(item.elements['#map-fallback'].hidden, true);
  assert.equal(item.calls.warnings.length, 1);
});
