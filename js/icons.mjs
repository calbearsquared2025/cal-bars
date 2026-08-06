const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_DEFINITIONS = Object.freeze({
  search: [
    ['circle', { cx: '11', cy: '11', r: '6.5' }],
    ['path', { d: 'm16 16 4.25 4.25' }]
  ],
  location: [
    ['path', { d: 'M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z' }],
    ['circle', { cx: '12', cy: '10', r: '2' }]
  ],
  'near-me': [['path', { d: 'm20 4-7 16-2.2-6.8L4 11l16-7Z' }]],
  fullscreen: [['path', { d: 'M8 3H3v5M16 3h5v5M8 21H3v-5m13 5h5v-5' }]],
  compress: [['path', { d: 'M8 8H3V3m13 5h5V3M8 16H3v5m13-5h5v5' }]],
  'chevron-up': [['path', { d: 'm5 15 7-7 7 7' }]],
  'chevron-down': [['path', { d: 'm5 9 7 7 7-7' }]],
  'chevron-right': [['path', { d: 'm9 5 7 7-7 7' }]],
  close: [['path', { d: 'M5 5l14 14M19 5 5 19' }]],
  'arrow-left': [['path', { d: 'm10 5-7 7 7 7M3 12h18' }]],
  directions: [
    ['path', { d: 'm12 3 9 9-9 9-9-9 9-9Z' }],
    ['path', { d: 'M9 15v-3h6m0 0-2.5-2.5M15 12l-2.5 2.5' }]
  ],
  share: [
    ['path', { d: 'M12 16V3' }],
    ['path', { d: 'm7 8 5-5 5 5' }],
    ['path', { d: 'M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8' }]
  ],
  calendar: [
    ['rect', { x: '3', y: '5', width: '18', height: '16', rx: '3' }],
    ['path', { d: 'M7 3v4m10-4v4M3 10h18' }]
  ],
  star: [['path', { d: 'm12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z' }]],
  external: [
    ['path', { d: 'M14 4h6v6m0-6-9 9' }],
    ['path', { d: 'M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4' }]
  ],
  check: [['path', { d: 'm4 12 5 5L20 6' }]],
  users: [
    ['circle', { cx: '9', cy: '8', r: '3' }],
    ['path', { d: 'M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8V20' }]
  ],
  info: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'M12 11v6m0-10v.01' }]
  ],
  map: [
    ['path', { d: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z' }],
    ['path', { d: 'M9 3v15m6-12v15' }]
  ]
});

function appendDefinition(svg, name) {
  const definition = ICON_DEFINITIONS[name];
  if (!definition) return false;
  definition.forEach(([tagName, attributes]) => {
    const node = document.createElementNS(SVG_NS, tagName);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    svg.append(node);
  });
  svg.dataset.iconName = name;
  return true;
}

function iconNameFromUse(use) {
  const href = use?.getAttribute?.('href') || use?.getAttribute?.('xlink:href') || '';
  return href.match(/#icon-([a-z0-9-]+)$/i)?.[1] || '';
}

export function iconHref(name) {
  return `#icon-${name}`;
}

export function createIcon(name, { className = 'ui-icon', label = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add(...String(className).split(/\s+/).filter(Boolean));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('focusable', 'false');

  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  appendDefinition(svg, name);
  return svg;
}

export function setIcon(svg, name) {
  if (!svg || !ICON_DEFINITIONS[name]) return false;
  svg.replaceChildren();
  return appendDefinition(svg, name);
}

export function inlineSpriteIcons(root = document) {
  root.querySelectorAll?.('svg use').forEach((use) => {
    const name = iconNameFromUse(use);
    const svg = use.closest?.('svg');
    if (name && svg) setIcon(svg, name);
  });
}
