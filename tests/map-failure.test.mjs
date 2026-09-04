import test from 'node:test';
import assert from 'node:assert/strict';
import { showMapUnavailable } from '../js/map-failure.mjs';

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
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
  map.append(fallback);

  const browse = new FakeElement('button');
  let browseClicks = 0;
  browse.click = () => { browseClicks += 1; };

  const head = new FakeElement('head');
  const selectors = new Map([
    ['#map', map],
    ['#map-fallback', fallback],
    ['#browse-locations-button', browse]
  ]);

  const documentObject = {
    head,
    createElement: (tagName) => new FakeElement(tagName),
    querySelector: (selector) => selectors.get(selector) || null,
    getElementById: (id) => head.children.find((child) => child.id === id) || null
  };

  return {
    map,
    fallback,
    documentObject,
    browseClicks: () => browseClicks
  };
}

test('map failure reserves social-card space before the image loads', () => {
  const { map, fallback, documentObject, browseClicks } = fixture();
  const activeMap = { removed: false, remove() { this.removed = true; } };
  const marker = { removed: false, remove() { this.removed = true; } };
  const userMarker = { removed: false, remove() { this.removed = true; } };
  const state = {
    gameId: 'game_ucla',
    snapshot: {
      games: [{ game_id: 'game_ucla', opponent_name: 'UCLA' }]
    },
    map: activeMap,
    markers: new Set([marker]),
    userMarker
  };
  const app = { getState: () => state };

  assert.equal(showMapUnavailable({ app, documentObject }), true);

  assert.equal(activeMap.removed, true);
  assert.equal(marker.removed, true);
  assert.equal(userMarker.removed, true);
  assert.equal(state.map, null);
  assert.equal(state.userMarker, null);
  assert.equal(fallback.hidden, false);
  assert.equal(map.classList.contains('map--fallback'), true);
  assert.equal(browseClicks(), 0, 'map failure should not automatically cover the fallback with the location list');

  const image = fallback.querySelector('#map-fallback-card');
  const message = fallback.querySelector('.map-fallback__message');
  assert.ok(image);
  assert.match(image.src, /assets\/social-cards\/ucla\.png$/);
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  assert.equal(image.className, 'map-fallback__card');
  image.onload();
  assert.equal(image.className, 'map-fallback__card map-fallback__card--loaded');
  image.onerror();
  assert.equal(image.className, 'map-fallback__card');

  assert.equal(message.children[0].textContent, 'Map temporarily unavailable');
  assert.equal(message.children[1].textContent, 'Please use the location list while we work to get it back up and running.');

  const style = documentObject.head.children.find((child) => child.id === 'cgb-map-fallback-style');
  assert.ok(style);
  assert.match(style.textContent, /#06152f/);
  assert.match(style.textContent, /aspect-ratio:\s*1200\s*\/\s*630/);
  assert.match(style.textContent, /opacity:\s*0/);
  assert.match(style.textContent, /map-fallback__card--loaded/);
  assert.match(style.textContent, /\.map-view > \.map-actions\s*\{[\s\S]*?z-index:\s*49 !important;/);
  assert.match(style.textContent, /\.map-fallback\s*\{[\s\S]*?z-index:\s*50;/);
  assert.doesNotMatch(style.textContent, /gradient/i);
});
