import { getApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  ADMIN_GAME_HOME_AWAY,
  ADMIN_GAME_STATUSES,
  adminGameErrorCopy,
  buildAdminGamesRequest,
  buildSaveAdminGameRequest,
  normalizeAdminGameChanges,
  validateAdminGamesResponse,
  validateAdminGameSaveResponse
} from './admin-games-core.mjs';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const DISPLAY = Object.freeze({
  home: 'Home',
  away: 'Away',
  neutral: 'Neutral',
  upcoming: 'Upcoming',
  completed: 'Completed',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  tbd: 'Time TBD'
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function display(value) {
  return DISPLAY[value] || String(value || '').replace(/_/g, ' ');
}

function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'Date unavailable';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: year === new Date().getFullYear() ? undefined : 'numeric'
  }).format(new Date(year, month - 1, day, 12));
}

function timeLabel(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return 'Time TBD';
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function options(values, selected) {
  return values.map((value) =>
    `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(display(value))}</option>`
  ).join('');
}

function renderGameEditor(game) {
  return `
    <form id="admin-game-form" data-game-id="${escapeHtml(game.game_id)}">
      <div class="venue-editor__title">
        <div>
          <p class="eyebrow">Game ${escapeHtml(String(game.schedule_order))}</p>
          <h2>${escapeHtml(game.opponent_name)}</h2>
          <div class="venue-editor__address">
            <span>${escapeHtml(dateLabel(game.game_date))} · ${escapeHtml(timeLabel(game.kickoff_local_time))}</span>
            <span>${escapeHtml(display(game.home_away))} · ${escapeHtml(display(game.game_status))}</span>
          </div>
        </div>
      </div>

      <section class="venue-form-section">
        <h3>Schedule</h3>
        <div class="venue-field-grid">
          <label class="venue-field venue-field--wide">
            Opponent
            <input name="opponent_name" required maxlength="180" value="${escapeHtml(game.opponent_name)}">
          </label>
          <label class="venue-field">
            Home / away
            <select name="home_away">${options(ADMIN_GAME_HOME_AWAY, game.home_away)}</select>
          </label>
          <label class="venue-field">
            Game date
            <input name="game_date" type="date" required value="${escapeHtml(game.game_date)}">
          </label>
        </div>
      </section>

      <section class="venue-form-section">
        <h3>Kickoff</h3>
        <div class="venue-field-grid">
          <label class="venue-field">
            School local time
            <input name="kickoff_local_time" type="time" step="60" value="${escapeHtml(game.kickoff_local_time)}">
          </label>
          <div class="admin-game-time-help">
            <strong>${game.kickoff_status === 'confirmed' ? escapeHtml(timeLabel(game.kickoff_local_time)) : 'Time TBD'}</strong>
            <span>Leave the time blank for TBD. CGB converts school local time to the canonical UTC kickoff automatically.</span>
          </div>
        </div>
      </section>

      <section class="venue-form-section">
        <h3>Status</h3>
        <div class="venue-field-grid">
          <label class="venue-field">
            Game status
            <select name="game_status">${options(ADMIN_GAME_STATUSES, game.game_status)}</select>
          </label>
        </div>
      </section>

      <section class="venue-form-section venue-form-section--meta">
        <h3>Admin metadata</h3>
        <dl class="venue-meta">
          <div><dt>Season</dt><dd>${escapeHtml(String(game.season))}</dd></div>
          <div><dt>Schedule order</dt><dd>${escapeHtml(String(game.schedule_order))}</dd></div>
          <div><dt>Game ID</dt><dd>${escapeHtml(game.game_id)}</dd></div>
          <div><dt>Canonical kickoff</dt><dd>${escapeHtml(game.kickoff_at || '—')}</dd></div>
          <div><dt>Updated</dt><dd>${escapeHtml(game.updated_at || '—')}</dd></div>
        </dl>
      </section>

      <div class="venue-save-bar">
        <p>Changes update the canonical Games record. Public data may take up to 5 minutes to refresh.</p>
        <button type="submit">Save game</button>
      </div>
    </form>
  `;
}

export function setupAdminGames({ postAdmin, notify }) {
  const panel = document.querySelector('[data-panel="games"]');
  if (!panel) return { activate: async () => {}, reload: async () => {} };

  const list = panel.querySelector('#admin-games-list');
  const editor = panel.querySelector('#admin-game-editor');
  const empty = panel.querySelector('#admin-game-editor-empty');
  const summary = panel.querySelector('#admin-games-summary');
  const refresh = panel.querySelector('#admin-games-refresh');

  let games = [];
  let selectedId = '';
  let loaded = false;
  let loadingPromise = null;

  const renderList = () => {
    if (summary) {
      const tbdCount = games.filter((game) => game.kickoff_status === 'tbd').length;
      summary.textContent = `${games.length} games · ${tbdCount} time${tbdCount === 1 ? '' : 's'} TBD`;
    }
    if (!games.length) {
      list.innerHTML = '<div class="empty-state">No games are available.</div>';
      return;
    }
    list.innerHTML = games.map((game) => `
      <button type="button" class="venue-list-item${game.game_id === selectedId ? ' is-selected' : ''}" data-game-id="${escapeHtml(game.game_id)}">
        <strong>${escapeHtml(game.opponent_name)}</strong>
        <span>${escapeHtml(dateLabel(game.game_date))} · ${escapeHtml(timeLabel(game.kickoff_local_time))}</span>
        <small>${escapeHtml(display(game.home_away))} · ${escapeHtml(display(game.game_status))}</small>
      </button>
    `).join('');
  };

  const renderSelected = () => {
    const game = games.find((item) => item.game_id === selectedId);
    renderList();
    if (!game) {
      editor.hidden = true;
      empty.hidden = false;
      empty.textContent = loaded ? 'Select a game.' : 'Loading games…';
      return;
    }
    empty.hidden = true;
    editor.hidden = false;
    editor.innerHTML = renderGameEditor(game);
  };

  const load = async ({ force = false } = {}) => {
    if (loaded && !force) {
      renderSelected();
      return;
    }
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      if (refresh) refresh.disabled = true;
      try {
        const response = await postAdmin(buildAdminGamesRequest());
        if (!validateAdminGamesResponse(response)) throw new Error('admin_invalid_response');
        games = response.games;
        loaded = true;
        if (!games.some((game) => game.game_id === selectedId)) {
          selectedId = games.find((game) => game.game_status === 'upcoming')?.game_id || games[0]?.game_id || '';
        }
        renderSelected();
        if (force) notify('Games refreshed.');
      } catch (error) {
        notify(adminGameErrorCopy(error) || 'Could not load games.', 'error');
        list.innerHTML = '<div class="empty-state">Game data could not be loaded.</div>';
        editor.hidden = true;
        empty.hidden = false;
      } finally {
        if (refresh) refresh.disabled = false;
        loadingPromise = null;
      }
    })();
    return loadingPromise;
  };

  list.addEventListener('click', (event) => {
    const item = event.target.closest('.venue-list-item[data-game-id]');
    if (!item) return;
    selectedId = item.dataset.gameId;
    renderSelected();
  });

  editor.addEventListener('submit', async (event) => {
    const form = event.target.closest('#admin-game-form');
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const changes = normalizeAdminGameChanges(new FormData(form));
      const response = await postAdmin(buildSaveAdminGameRequest(form.dataset.gameId, changes));
      if (!validateAdminGameSaveResponse(response)) throw new Error('admin_invalid_response');
      const index = games.findIndex((game) => game.game_id === response.game.game_id);
      if (index >= 0) games[index] = response.game;
      games.sort((a, b) => Number(a.schedule_order) - Number(b.schedule_order));
      selectedId = response.game.game_id;
      renderSelected();
      window.dispatchEvent(new CustomEvent('cgb-admin-game-updated', { detail: response.game }));
      notify('Game saved. Public data may take up to 5 minutes to refresh.');
    } catch (error) {
      notify(adminGameErrorCopy(error) || 'Could not save game.', 'error');
      submit.disabled = false;
    }
  });

  refresh?.addEventListener('click', () => load({ force: true }));

  return { activate: () => load(), reload: () => load({ force: true }) };
}

const REQUEST_TIMEOUT_MS = 12000;

async function authenticatedGamePost(payload) {
  const user = getAuth(getApp()).currentUser;
  const endpoint = String(ADMIN_AUTH_CONFIG.endpoint || '').trim();
  if (!user || !endpoint) throw new Error('admin_backend_unavailable');
  const idToken = await user.getIdToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ ...payload, idToken }),
      cache: 'no-store',
      signal: controller.signal
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error('admin_backend_unavailable');
    if (result.ok !== true) throw new Error(result.error || 'admin_backend_unavailable');
    return result;
  } finally {
    window.clearTimeout(timeout);
  }
}

function gameToast(message, state = 'normal') {
  const node = document.querySelector('#dashboard-status');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
  node.dataset.visible = 'true';
  window.setTimeout(() => { node.dataset.visible = 'false'; }, 3200);
}

const gameController = setupAdminGames({
  postAdmin: authenticatedGamePost,
  notify: (message, state = 'normal') => gameToast(message, state)
});

document.querySelector('[data-view="games"]')?.addEventListener('click', () => {
  gameController.activate();
});
