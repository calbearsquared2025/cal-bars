import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachMapFailureFallback, showMapLoading } from '../js/map-failure.mjs';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const socialPreviewUpdater = readFileSync(new URL('../scripts/update-root-social-preview.mjs', import.meta.url), 'utf8');

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

test('initial HTML presents and preloads the current-game cover before app chrome can paint through', () => {
  const preload = indexHtml.match(/<link\b[^>]*id="cgb-loading-cover-preload"[^>]*href="([^"]+)"[^>]*>/i);
  const image = indexHtml.match(/<img\b[^>]*id="map-fallback-card"[^>]*src="([^"]+)"[\s\S]*?>/i);
  assert.ok(preload, 'current-game cover should be preloaded from the document head');
  assert.ok(image, 'current-game cover should be present in initial HTML');
  assert.equal(preload[1], image[1], 'preload and first-paint image must use the same artwork');
  assert.match(
    indexHtml,
    /<div id="map-fallback" class="map-fallback map-fallback--loading">/,
    'loading cover must be visible in initial markup rather than revealed later by JavaScript'
  );
  assert.match(
    indexHtml,
    /#map-fallback\.map-fallback--loading\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*2000;/,
    'critical first-paint CSS must cover the full viewport above all app chrome'
  );
  assert.match(socialPreviewUpdater, /function updateLoadingCover\(html, entry\)/);
  assert.match(socialPreviewUpdater, /cgb-loading-cover-preload/);
  assert.match(socialPreviewUpdater, /map-fallback-card/);
});

test('runtime adopts the visible first-paint cover without toggling its loading mode off and on', () => {
  const { fallback, documentObject } = fixture();
  const state = {
    gameId: 'game_ucla',
    snapshot: { games: [{ game_id: 'game_ucla', opponent_name: 'UCLA' }] }
  };
  const app = { getState: () => state };

  fallback.hidden = false;
  fallback.classList.add('map-fallback--loading');

  const removed = [];
  const added = [];
  const remove = fallback.classList.remove;
  const add = fallback.classList.add;
  fallback.classList.remove = (...names) => {
    removed.push(...names);
    remove(...names);
  };
  fallback.classList.add = (...names) => {
    added.push(...names);
    add(...names);
  };

  assert.equal(showMapLoading({ app, documentObject }), true);
  assert.equal(fallback.hidden, false);
  assert.deepEqual(removed, [], 'the initial loading class must never be removed during startup adoption');
  assert.deepEqual(added, [], 'the same loading class must not be redundantly re-added during startup adoption');
  assert.equal(fallback.classList.contains('map-fallback--loading'), true);
});

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
  assert.equal(image.fetchPriority, 'high');

  const style = head.children.find((child) => child.id === 'cgb-map-fallback-style');
  assert.ok(style);
  assert.match(style.textContent, /map-fallback--loading/);
  assert.match(
    style.textContent,
    /\.map-fallback\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?z-index:\s*50;/,
    'Failure fallback should remain contained to the map.'
  );
  assert.match(style.textContent, /transition:\s*opacity 240ms ease/);
  assert.match(style.textContent, /map-fallback--loading \.map-fallback__card[\s\S]*?max-height:\s*100%/);
  assert.match(style.textContent, /prefers-reduced-motion:\s*reduce/);
});

test('the loading artwork clears when both the cover and map are ready', () => {
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

  const image = fallback.querySelector('#map-fallback-card');
  image.complete = true;
  image.naturalWidth = 1200;
  listeners.get('load')?.();
  assert.equal(fallback.hidden, true);
  assert.equal(mapContainer.classList.contains('map--loading'), false);
  assert.equal(fallback.classList.contains('map-fallback--loading'), false);
});

test('map readiness does not reveal the site before loading artwork resolves', () => {
  const { fallback, documentObject } = fixture();
  const listeners = new Map();
  const timers = [];
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
    matchMedia: () => ({ matches: false }),
    setTimeout: (callback) => {
      timers.push(callback);
      return timers.length;
    }
  };

  attachMapFailureFallback({ app, documentObject, windowObject });
  const image = fallback.querySelector('#map-fallback-card');
  assert.equal(image.complete, false);

  listeners.get('load')?.();
  assert.equal(fallback.hidden, false, 'cover remains visible while its image is unresolved');
  assert.equal(timers.length, 0, 'fade must not begin before artwork settles');

  image.complete = true;
  image.naturalWidth = 1200;
  image.onload?.();
  assert.equal(timers.length, 1, 'artwork resolution starts the existing fade after map readiness');
  assert.equal(fallback.classList.contains('map-fallback--leaving'), true);
  assert.equal(fallback.hidden, false);

  timers[0]();
  assert.equal(fallback.hidden, true);
});
