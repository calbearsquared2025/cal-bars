import { rankVenues } from './core.mjs';

const STYLE_ID = 'cgb-issue-121-search-ui';
const DESKTOP_QUERY = '(min-width: 900px)';
let connected = false;
let prompt = null;

function app() {
  return window.CGBApp || null;
}

function state() {
  return app()?.getState?.() || null;
}

function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function query() {
  return String(document.querySelector('#location-query')?.value || '').trim();
}

function cgbMatchCount(currentQuery = query()) {
  const current = state();
  if (!current?.snapshot || !currentQuery) return 0;
  return rankVenues(current.snapshot, current.gameId, current.origin, currentQuery).length;
}

function addPromptCopy() {
  const currentQuery = query();
  if (!currentQuery) return 'Add a location.';
  return cgbMatchCount(currentQuery) > 0
    ? 'Don’t see it? Add a location.'
    : 'No matching locations found. Add a location.';
}

function ensureDesktopAddPrompt() {
  const form = document.querySelector('#location-search');
  if (!form) return;
  if (!prompt) {
    prompt = document.createElement('button');
    prompt.type = 'button';
    prompt.className = 'desktop-search-add-location';
    prompt.addEventListener('click', () => {
      document.querySelector('#search-add-location-button')?.click();
    });
  }
  prompt.textContent = addPromptCopy();
  prompt.hidden = !isDesktop() || state()?.searchMode !== 'existing';
  if (prompt.parentElement !== form.parentElement) form.after(prompt);
  else if (form.nextElementSibling !== prompt) form.after(prompt);
}

function normalizeSearchListChrome() {
  const current = state();
  const searching = Boolean(String(current?.listQuery || '').trim());
  const range = document.querySelector('#list-location-toggle');
  const clear = document.querySelector('#clear-search-button');
  const eyebrow = document.querySelector('#tray-list .tray-list__heading .eyebrow');
  if (range) range.hidden = searching;
  if (clear) clear.textContent = searching ? 'Clear search' : 'All locations';
  if (eyebrow) eyebrow.textContent = searching ? 'Search results' : 'Browse';
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (min-width: 900px) {
      .map-toolbar .search-field,
      .command-surface .search-field {
        border-width: 1px !important;
        border-color: rgba(11, 40, 86, .46) !important;
      }

      .map-toolbar .search-field:focus-within,
      .command-surface .search-field:focus-within {
        border-color: var(--cgb-navy-900, #0b2856) !important;
      }

      .desktop-search-add-location {
        width: fit-content;
        margin: 5px 0 0;
        padding: 5px 7px;
        color: var(--cgb-navy-800, #0b2856);
        background: rgba(255, 255, 255, .94);
        border: 1px solid rgba(11, 40, 86, .18);
        border-radius: 7px;
        box-shadow: 0 2px 8px rgba(1, 1, 51, .07);
        font-family: var(--font-condensed, sans-serif);
        font-size: .68rem;
        font-weight: 760;
        line-height: 1.15;
        text-align: left;
        cursor: pointer;
      }

      .desktop-search-add-location:hover,
      .desktop-search-add-location:focus-visible {
        border-color: rgba(11, 40, 86, .4);
        background: var(--cgb-gold-50, #fff9e7);
      }
    }
  `;
  document.head.append(style);
}

function reconcile() {
  ensureDesktopAddPrompt();
  normalizeSearchListChrome();
}

function connectApp() {
  if (connected) return;
  if (!app()?.subscribe) {
    window.setTimeout(connectApp, 25);
    return;
  }
  connected = true;
  app().subscribe('rendered', () => requestAnimationFrame(reconcile));
  app().subscribe('ready', () => requestAnimationFrame(reconcile));
  reconcile();
}

function initialize() {
  installStyles();
  document.addEventListener('input', (event) => {
    if (event.target?.matches?.('#location-query')) requestAnimationFrame(reconcile);
  });
  window.addEventListener('resize', reconcile);
  connectApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
