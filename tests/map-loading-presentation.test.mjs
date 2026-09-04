import test from 'node:test';
import assert from 'node:assert/strict';
import { attachMapFailureFallback, showMapLoading } from '../js/map-failure.mjs';

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name)
  };
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.hidden = false;
    this.id = '';
    this.className = '';
    this.classList = classList();
    this.textContent = '';
    this.src = '';
    this.complete = false;
    this.naturalWidth = 0;
    this.width = 0;
    this.height = 0;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  removeAttribute(name) {
    if (name === 'src') this.src = '';
  }

  querySelector(selector) {
    const matches = (element) => {
      if (selector.startsWith('#')) return element.id === selector.slice(1);
      if (selector.startsWith('.')) return element.className.split(/\s+/).includes(selector.slice(1));
      return false;
    };
    const visit = (elements) => {
      for (const child of elements) {
        if (matches(child)) return child;
        const nested = visit(child.children || []);
        if (nested) return nested;
      }
      return null;
    };
    return visit(this.children);
  }
}

function fixture() {
  const map = new FakeElement();
  map.id = 'map';
  const fallback = new FakeElement();
  fallback.id = 'map-fallback';
  fallback.hidden = true;
  const legacyHeading = new FakeElement('strong');
  legacyHeading.textContent = 'Map unavailable';
  const legacyCopy = new FakeElement('span');
  legacyCopy.textContent = 'The location list remains available.';
  fallback.append(legacyHeading, legacyCopy);
  map.append(fallback);

  const head = new FakeElement('head');
  const selectors = new Map([
    ['#map', map],
    ['#map-fallback', fallback]
  ]);
  const documentObject = {
    head,
    createElement: (tagName) => new FakeElement(tagName),
    querySelector: (selector) => selectors.get(selector) || null,
    getElementById: (id) => head.children.find((child) => child.id === id) || null
  };

  return { map, fallback, head, documentObject };
}

test('normal map loading shows only the branded game artwork, without unavailable copy', () => {
  const { map, fallback, head, documentObject } = fixture();
  const state = {
    gameId: 'game_ucla',
    snapshot: { games: [{ game_id: 'game_ucla', opponent_name: 'UCLA' }] }
  };
  const app = { getState: () => state };

  assert.equal(showMapLoading({ app, documentObject }), true);
  assert.equal(fallback.hidden, false);
  assert.equal(fallback.classList.contains('map-fallback--loading'), true);
  assert.equal(map.classList.contains('map--loading'), true);
  assert.equal(map.classList.contains('map--fallback'), false);
  assert.equal(fallback.querySelector('.map-fallback__message'), null);
  assert.equal(fallback.children.length, 1, 'legacy unavailable text should be removed before loading cover is shown');

  const image = fallback.querySelector('#map-fallback-card');
  assert.ok(image);
  assert.match(image.src, /assets\/social-cards\/ucla\.png$/);

  const style = head.children.find((child) => child.id === 'cgb-map-fallback-style');
  assert.ok(style);
  assert.match(style.textContent, /map-fallback--loading/);
  assert.match(
    style.textContent,
    /\.map-fallback\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?z-index:\s*50;/,
    'Failure fallback should remain contained to the map.'
  );
  assert.match(
    style.textContent,
    /\.map-fallback--loading\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*2000;/,
    'Loading artwork must cover the viewport above header, navigation, map controls, and safe-area chrome.'
  );
  assert.match(style.textContent, /transition:\s*opacity 240ms ease/);
  assert.match(style.textContent, /map-fallback--loading \.map-fallback__card[\s\S]*?max-height:\s*100%/);
  assert.match(style.textContent, /prefers-reduced-motion:\s*reduce/);
});

test('the loading artwork clears when the map reaches its first load event', () => {
  const { map: mapContainer, fallback, documentObject } = fixture();
  const listeners = new Map();
  const activeMap = {
    loaded: () => false,
    on: (event, handler) => listeners.set(event, handler)
  };
  const state = {
    gameId: 'game_ucla',
    snapshot: { games: [{ game_id: 'game_ucla', opponent_name: 'UCLA' }] },
    map: activeMap
  };
  const app = { getState: () => state };
  const windowObject = {
    matchMedia: () => ({ matches: true }),
    setTimeout: (callback) => callback()
  };

  assert.equal(attachMapFailureFallback({ app, documentObject, windowObject }), true);
  assert.equal(fallback.hidden, false);
  assert.equal(mapContainer.classList.contains('map--loading'), true);

  listeners.get('load')?.();
  assert.equal(fallback.hidden, true);
  assert.equal(mapContainer.classList.contains('map--loading'), false);
  assert.equal(fallback.classList.contains('map-fallback--loading'), false);
});
