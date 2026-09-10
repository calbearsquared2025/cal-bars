import { getApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  ADMIN_WATCH_PARTY_AGE_POLICIES,
  ADMIN_WATCH_PARTY_FEATURE_TAGS,
  ADMIN_WATCH_PARTY_ORGANIZER_TYPES,
  ADMIN_WATCH_PARTY_SOUND_STATUSES,
  adminWatchPartyErrorCopy,
  buildAddAdminWatchPartyRequest,
  buildAdminWatchPartiesRequest,
  buildSaveAdminWatchPartyRequest,
  buildSetAdminWatchPartyEventStatusRequest,
  buildSetAdminWatchPartyPublicationRequest,
  filterAdminWatchParties,
  normalizeEditorFields,
  validateAdminWatchPartiesResponse,
  validateAdminWatchPartyWriteResponse
} from './admin-watch-parties-core.mjs';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const DISPLAY = Object.freeze({
  alumni_group: 'Alumni group', venue: 'Venue', other_organization: 'Other organization', individual: 'Individual', unknown: 'Unknown',
  all_ages: 'All ages', '21_plus': '21+', confirmed_on: 'Confirmed on', confirmed_off: 'Confirmed off',
  rsvp_requested: 'RSVP REQUESTED', cal_specials: 'CAL SPECIALS',
  active: 'Active', cancelled: 'Cancelled', published: 'Published', draft: 'Draft', archived: 'Archived',
  fan_submitted: 'Fan submitted', venue_submitted: 'Venue submitted', alumni_group_submitted: 'Alumni group submitted', cgb_added: 'CGB added'
});

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function display(value) { return DISPLAY[value] || String(value || '').replace(/_/g, ' '); }
function dateLabel(value, { time = true } = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date);
}
function datetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function optionMarkup(values, selected) {
  return values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(display(value))}</option>`).join('');
}
function featureTagMarkup(selected) {
  const tags = new Set(Array.isArray(selected) ? selected : []);
  return ADMIN_WATCH_PARTY_FEATURE_TAGS.map((value) => `
    <label class="venue-tag-toggle">
      <input type="checkbox" name="feature_tags" value="${escapeHtml(value)}"${tags.has(value) ? ' checked' : ''}>
      <span>${escapeHtml(display(value))}</span>
    </label>
  `).join('');
}
function venueOptionMarkup(venues, selected, { creating = false } = {}) {
  return venues.map((venue) => {
    const disabled = venue.publication_status !== 'published' && (creating || venue.venue_id !== selected);
    const location = [venue.city, venue.region].filter(Boolean).join(', ');
    const suffix = venue.publication_status === 'published' ? '' : ` · ${display(venue.publication_status)}`;
    return `<option value="${escapeHtml(venue.venue_id)}"${venue.venue_id === selected ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(`${venue.name}${location ? ` — ${location}` : ''}${suffix}`)}</option>`;
  }).join('');
}
function gameOptionMarkup(games, selected, { creating = false } = {}) {
  return games.map((game) => {
    const disabled = game.game_status !== 'upcoming' && (creating || game.game_id !== selected);
    const label = `${dateLabel(game.game_date, { time: false })} — vs. ${game.opponent_name}${game.game_status === 'upcoming' ? '' : ` · ${display(game.game_status)}`}`;
    return `<option value="${escapeHtml(game.game_id)}"${game.game_id === selected ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
}
function filterOptionMarkup(items, idKey, labelFor, selected, allLabel) {
  return `<option value="all">${escapeHtml(allLabel)}</option>${items.map((item) => `<option value="${escapeHtml(item[idKey])}"${item[idKey] === selected ? ' selected' : ''}>${escapeHtml(labelFor(item))}</option>`).join('')}`;
}
function blankParty(workspace) {
  const firstVenue = workspace.venues.find((venue) => venue.publication_status === 'published');
  const firstGame = workspace.games.find((game) => game.game_status === 'upcoming');
  return {
    watch_party_id: '', venue_id: firstVenue?.venue_id || '', venue_name: firstVenue?.name || '',
    game_id: firstGame?.game_id || '', opponent_name: firstGame?.opponent_name || '', organizer_name: '',
    organizer_type: 'unknown', official_event_url: '', source_type: 'cgb_added', event_start_at: '', age_policy: 'unknown',
    sound_status: 'unknown', feature_tags: [], game_day_note: '', event_status: 'active', publication_status: 'published', updated_at: ''
  };
}
function statusActions(party) {
  const eventAction = party.event_status === 'active'
    ? '<button type="button" class="secondary" data-event-status="cancelled">Cancel event</button>'
    : '<button type="button" class="secondary" data-event-status="active">Mark event active</button>';
  const publicationActions = [];
  if (party.publication_status !== 'published') publicationActions.push('<button type="button" class="secondary" data-publication-status="published">Publish listing</button>');
  if (party.publication_status === 'published') publicationActions.push('<button type="button" class="secondary" data-publication-status="draft">Unpublish listing</button>');
  if (party.publication_status !== 'archived') publicationActions.push('<button type="button" class="secondary" data-publication-status="archived">Archive listing</button>');
  return `<div class="watch-party-status-actions"><div><strong>Event status</strong><span class="status-chip">${escapeHtml(display(party.event_status))}</span>${eventAction}</div><div><strong>Publication</strong><span class="status-chip">${escapeHtml(display(party.publication_status))}</span>${publicationActions.join('')}</div></div>`;
}
function renderEditor(party, workspace, { creating = false } = {}) {
  const venue = workspace.venues.find((item) => item.venue_id === party.venue_id);
  const game = workspace.games.find((item) => item.game_id === party.game_id);
  return `
    <div class="venue-editor__title"><div><p class="eyebrow">${escapeHtml(creating ? 'Direct CGB entry' : `vs. ${party.opponent_name}`)}</p><h2>${escapeHtml(creating ? 'Add Watch Party' : party.venue_name)}</h2><div class="venue-editor__address">${creating ? '<span>Creates a canonical Watch Party directly. No Form response is generated.</span>' : `<span>${escapeHtml([party.venue_city, party.venue_region].filter(Boolean).join(', '))}</span><span>${escapeHtml(dateLabel(party.game_date, { time: false }))}</span>`}</div></div>${creating ? '' : `<span class="status-chip">${escapeHtml(display(party.publication_status))}</span>`}</div>
    <form id="watch-party-form" class="venue-form" data-watch-party-id="${escapeHtml(party.watch_party_id)}" data-mode="${creating ? 'add' : 'edit'}">
      <section class="venue-form-section"><h3>Event</h3><div class="venue-field-grid">
        <label class="venue-field venue-field--wide">Venue<select name="venue_id" required><option value="">Choose a Venue</option>${venueOptionMarkup(workspace.venues, party.venue_id, { creating })}</select></label>
        <label class="venue-field venue-field--wide">Game<select name="game_id" required><option value="">Choose a game</option>${gameOptionMarkup(workspace.games, party.game_id, { creating })}</select></label>
        <label class="venue-field">Organizer / host<input name="organizer_name" required maxlength="180" value="${escapeHtml(party.organizer_name)}"></label>
        <label class="venue-field">Organizer type<select name="organizer_type">${optionMarkup(ADMIN_WATCH_PARTY_ORGANIZER_TYPES, party.organizer_type)}</select></label>
        <label class="venue-field venue-field--wide">Official event or RSVP link<input name="official_event_url" inputmode="url" maxlength="2000" value="${escapeHtml(party.official_event_url)}" placeholder="https://…"></label>
        <label class="venue-field">Event start / suggested arrival<input name="event_start_at" type="datetime-local" value="${escapeHtml(datetimeLocalValue(party.event_start_at))}"></label>
        <label class="venue-field">Age policy<select name="age_policy">${optionMarkup(ADMIN_WATCH_PARTY_AGE_POLICIES, party.age_policy)}</select></label>
        <label class="venue-field">Sound<select name="sound_status">${optionMarkup(ADMIN_WATCH_PARTY_SOUND_STATUSES, party.sound_status)}</select></label>
      </div></section>
      <section class="venue-form-section"><h3>Game-day details</h3>
        <p class="venue-section-note">Watch Party-only details. Persistent Venue details such as food, Cal beer, crowd size, and memorabilia are managed on the Venue record.</p>
        <div class="venue-tag-grid">${featureTagMarkup(party.feature_tags)}</div>
        <div class="venue-field-grid watch-party-note-grid">
          <label class="venue-field venue-field--wide">Anything else fans should know?<textarea name="game_day_note" maxlength="1200" rows="4">${escapeHtml(party.game_day_note)}</textarea></label>
        </div>
      </section>
      <div class="venue-save-bar"><p>${creating ? 'This writes directly to Watch_Parties with source_type = cgb_added.' : 'Field edits do not change cancellation or publication status. Public data may lag by up to 5 minutes.'}</p><div class="watch-party-save-actions">${creating ? '<button type="button" class="secondary" data-cancel-add>Cancel</button>' : ''}<button type="submit">${creating ? 'Add Watch Party' : 'Save Changes'}</button></div></div>
    </form>
    ${creating ? '' : `<section class="venue-form-section"><h3>Status actions</h3><p class="venue-section-note">Cancelling the event and removing the listing are separate actions.</p>${statusActions(party)}</section><section class="venue-form-section venue-related-section"><h3>Associated Venue</h3><div class="watch-party-venue-jump"><div><strong>${escapeHtml(venue?.name || party.venue_name)}</strong><span>${escapeHtml([venue?.city, venue?.region].filter(Boolean).join(', '))}</span></div><button type="button" class="secondary" data-open-venue="${escapeHtml(party.venue_id)}">Open Venue</button></div></section><section class="venue-form-section venue-form-section--meta"><h3>Admin metadata</h3><dl class="venue-meta"><div><dt>Watch Party ID</dt><dd>${escapeHtml(party.watch_party_id)}</dd></div><div><dt>Source type</dt><dd>${escapeHtml(display(party.source_type))}</dd></div><div><dt>Updated</dt><dd>${escapeHtml(dateLabel(party.updated_at))}</dd></div><div><dt>Game status</dt><dd>${escapeHtml(display(game?.game_status || ''))}</dd></div></dl></section>`}
  `;
}
function waitForVenueAndOpen(venueId) {
  const open = () => {
    const node = [...document.querySelectorAll('#venue-list .venue-list-item[data-venue-id]')].find((item) => item.dataset.venueId === venueId);
    if (!node) return false;
    node.click();
    node.scrollIntoView({ block: 'nearest' });
    return true;
  };
  const statusFilter = document.querySelector('#venue-status-filter');
  if (statusFilter) { statusFilter.value = 'all'; statusFilter.dispatchEvent(new Event('change', { bubbles: true })); }
  document.querySelector('[data-view="venues"]')?.click();
  if (open()) return;
  const list = document.querySelector('#venue-list');
  if (!list) return;
  const observer = new MutationObserver(() => { if (open()) observer.disconnect(); });
  observer.observe(list, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 6000);
}

export function setupAdminWatchParties({ postAdmin, notify }) {
  const panel = document.querySelector('[data-panel="watch-parties"]');
  if (!panel) return { activate: async () => {} };
  const searchInput = panel.querySelector('#watch-party-search');
  const gameFilter = panel.querySelector('#watch-party-game-filter');
  const venueFilter = panel.querySelector('#watch-party-venue-filter');
  const sortSelect = panel.querySelector('#watch-party-sort');
  const list = panel.querySelector('#watch-party-list');
  const editor = panel.querySelector('#watch-party-editor');
  const empty = panel.querySelector('#watch-party-editor-empty');
  const addButton = panel.querySelector('#watch-party-add');
  const summary = panel.querySelector('#watch-party-summary');
  let workspace = { watchParties: [], venues: [], games: [], counts: { total: 0 } };
  let selectedId = '';
  let adding = false;
  let loaded = false;
  let loadingPromise = null;
  let sortOrigin = null;

  const filtered = () => filterAdminWatchParties(workspace.watchParties, {
    query: searchInput?.value || '',
    gameId: gameFilter?.value || 'all',
    venueId: venueFilter?.value || 'all',
    sort: sortSelect?.value || 'game_date',
    origin: sortOrigin
  });
  const renderFilters = () => {
    const currentGame = gameFilter?.value || 'all';
    const currentVenue = venueFilter?.value || 'all';
    if (gameFilter) gameFilter.innerHTML = filterOptionMarkup(workspace.games, 'game_id', (game) => `${dateLabel(game.game_date, { time: false })} — vs. ${game.opponent_name}`, currentGame, 'All games');
    if (venueFilter) venueFilter.innerHTML = filterOptionMarkup(workspace.venues, 'venue_id', (venue) => `${venue.name}${venue.city ? ` — ${venue.city}` : ''}`, currentVenue, 'All venues');
    if (gameFilter && [...gameFilter.options].some((option) => option.value === currentGame)) gameFilter.value = currentGame;
    if (venueFilter && [...venueFilter.options].some((option) => option.value === currentVenue)) venueFilter.value = currentVenue;
  };
  const renderList = () => {
    const items = filtered();
    if (summary) summary.textContent = `${workspace.watchParties.length} total · ${items.length} shown`;
    if (!items.length) { list.innerHTML = '<div class="empty-state">No Watch Parties match these filters.</div>'; return; }
    list.innerHTML = items.map((party) => `<button type="button" class="venue-list-item${party.watch_party_id === selectedId && !adding ? ' is-selected' : ''}" data-watch-party-id="${escapeHtml(party.watch_party_id)}"><strong>${escapeHtml(party.venue_name)}</strong><span>vs. ${escapeHtml(party.opponent_name)} · ${escapeHtml(dateLabel(party.game_date, { time: false }))}</span><small>${escapeHtml(party.organizer_name)} · ${escapeHtml(display(party.event_status))} · ${escapeHtml(display(party.publication_status))}</small></button>`).join('');
  };
  const renderSelected = () => {
    if (adding) { empty.hidden = true; editor.hidden = false; editor.innerHTML = renderEditor(blankParty(workspace), workspace, { creating: true }); renderList(); return; }
    const party = workspace.watchParties.find((item) => item.watch_party_id === selectedId);
    if (!party) { editor.hidden = true; empty.hidden = false; empty.textContent = loaded ? 'Select a Watch Party.' : 'Loading Watch Parties…'; renderList(); return; }
    empty.hidden = true; editor.hidden = false; editor.innerHTML = renderEditor(party, workspace); renderList();
  };
  const updateParty = (party) => {
    const index = workspace.watchParties.findIndex((item) => item.watch_party_id === party.watch_party_id);
    if (index >= 0) workspace.watchParties[index] = party; else workspace.watchParties.push(party);
    selectedId = party.watch_party_id; adding = false; renderSelected();
  };
  const load = async ({ force = false } = {}) => {
    if (loaded && !force) { renderSelected(); return; }
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      try {
        const response = await postAdmin(buildAdminWatchPartiesRequest());
        if (!validateAdminWatchPartiesResponse(response)) throw new Error('admin_invalid_response');
        workspace = response; loaded = true; renderFilters();
        if (!selectedId) selectedId = filtered()[0]?.watch_party_id || '';
        renderSelected();
      } catch (error) {
        notify(adminWatchPartyErrorCopy(error) || 'Could not load Watch Parties.', 'error');
        list.innerHTML = '<div class="empty-state">Watch Party data could not be loaded.</div>'; empty.hidden = false; editor.hidden = true;
      } finally { loadingPromise = null; }
    })();
    return loadingPromise;
  };
  const requestNearestSort = () => {
    if (sortOrigin) { renderList(); return; }
    if (!navigator.geolocation) {
      sortSelect.value = 'game_date';
      notify('Location is not available in this browser; sorting by game date.');
      renderList();
      return;
    }
    sortSelect.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sortOrigin = { latitude: Number(position.coords.latitude), longitude: Number(position.coords.longitude) };
        sortSelect.disabled = false;
        renderList();
      },
      () => {
        sortSelect.value = 'game_date';
        sortSelect.disabled = false;
        notify('Location access was not available; sorting by game date.');
        renderList();
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    );
  };

  panel.addEventListener('click', async (event) => {
    const item = event.target.closest('.venue-list-item[data-watch-party-id]');
    if (item) { adding = false; selectedId = item.dataset.watchPartyId; renderSelected(); return; }
    if (event.target.closest('[data-cancel-add]')) { adding = false; renderSelected(); return; }
    const venueButton = event.target.closest('[data-open-venue]');
    if (venueButton) { waitForVenueAndOpen(venueButton.dataset.openVenue); return; }
    const eventStatusButton = event.target.closest('[data-event-status]');
    if (eventStatusButton && selectedId) {
      eventStatusButton.disabled = true;
      try {
        const response = await postAdmin(buildSetAdminWatchPartyEventStatusRequest(selectedId, eventStatusButton.dataset.eventStatus));
        if (!validateAdminWatchPartyWriteResponse(response, 'setAdminWatchPartyEventStatus')) throw new Error('admin_invalid_response');
        updateParty(response.watchParty); notify(response.watchParty.event_status === 'cancelled' ? 'Event marked cancelled.' : 'Event marked active.');
      } catch (error) { notify(adminWatchPartyErrorCopy(error) || 'Could not update event status.', 'error'); eventStatusButton.disabled = false; }
      return;
    }
    const publicationButton = event.target.closest('[data-publication-status]');
    if (publicationButton && selectedId) {
      publicationButton.disabled = true;
      try {
        const response = await postAdmin(buildSetAdminWatchPartyPublicationRequest(selectedId, publicationButton.dataset.publicationStatus));
        if (!validateAdminWatchPartyWriteResponse(response, 'setAdminWatchPartyPublication')) throw new Error('admin_invalid_response');
        updateParty(response.watchParty); notify(`Listing marked ${display(response.watchParty.publication_status).toLowerCase()}.`);
      } catch (error) { notify(adminWatchPartyErrorCopy(error) || 'Could not update publication status.', 'error'); publicationButton.disabled = false; }
    }
  });

  editor.addEventListener('submit', async (event) => {
    const form = event.target.closest('#watch-party-form');
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const fields = normalizeEditorFields(new FormData(form));
      const action = form.dataset.mode === 'add' ? 'addAdminWatchParty' : 'saveAdminWatchParty';
      const request = action === 'addAdminWatchParty' ? buildAddAdminWatchPartyRequest(fields) : buildSaveAdminWatchPartyRequest(form.dataset.watchPartyId, fields);
      const response = await postAdmin(request);
      if (!validateAdminWatchPartyWriteResponse(response, action)) throw new Error('admin_invalid_response');
      updateParty(response.watchParty);
      notify(action === 'addAdminWatchParty' ? 'Watch Party added directly as CGB. Public data may take up to 5 minutes to refresh.' : 'Watch Party saved. Public data may take up to 5 minutes to refresh.');
    } catch (error) { notify(adminWatchPartyErrorCopy(error) || 'Could not save Watch Party.', 'error'); submit.disabled = false; }
  });

  searchInput?.addEventListener('input', renderList);
  gameFilter?.addEventListener('change', renderList);
  venueFilter?.addEventListener('change', renderList);
  sortSelect?.addEventListener('change', () => {
    if (sortSelect.value === 'nearest') requestNearestSort();
    else renderList();
  });
  addButton?.addEventListener('click', () => { adding = true; renderSelected(); });
  return { activate: () => load(), reload: () => load({ force: true }) };
}

const REQUEST_TIMEOUT_MS = 12000;
async function authenticatedWatchPartyPost(payload) {
  const user = getAuth(getApp()).currentUser;
  const endpoint = String(ADMIN_AUTH_CONFIG.endpoint || '').trim();
  if (!user || !endpoint) throw new Error('admin_backend_unavailable');
  const idToken = await user.getIdToken();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ ...payload, idToken }), cache: 'no-store', signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error('admin_backend_unavailable');
    if (result.ok !== true) throw new Error(result.error || 'admin_backend_unavailable');
    return result;
  } finally { window.clearTimeout(timeout); }
}
function watchPartyToast(message, state = 'normal') {
  const node = document.querySelector('#dashboard-status');
  if (!node) return;
  node.textContent = message; node.dataset.state = state; node.dataset.visible = 'true';
  window.setTimeout(() => { node.dataset.visible = 'false'; }, 3200);
}
const watchPartyController = setupAdminWatchParties({ postAdmin: authenticatedWatchPartyPost, notify: (message, state = 'normal') => watchPartyToast(message, state) });
document.querySelector('[data-view="watch-parties"]')?.addEventListener('click', () => { watchPartyController.activate(); });
