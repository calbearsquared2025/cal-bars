const ICON_SPRITE = 'assets/icons.svg';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

export function iconHref(name) {
  return `${ICON_SPRITE}#icon-${name}`;
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

  const use = document.createElementNS(SVG_NS, 'use');
  const href = iconHref(name);
  use.setAttribute('href', href);
  use.setAttributeNS(XLINK_NS, 'xlink:href', href);
  svg.append(use);
  return svg;
}

export function setIcon(svg, name) {
  const use = svg?.querySelector?.('use');
  if (!use) return false;
  const href = iconHref(name);
  use.setAttribute('href', href);
  use.setAttributeNS(XLINK_NS, 'xlink:href', href);
  return true;
}
