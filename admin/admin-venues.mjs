import { getApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { readRuntimeConfig } from '../js/config.mjs';
import {
  buildMapTilerSearchUrl,
  rankMapTilerResults
} from '../js/external-venue-core.mjs';
import {
  ADMIN_ALUMNI_OWNED,
  ADMIN_PUBLICATION_STATUSES,
  ADMIN_VENUE_TAGS,
  ADMIN_VENUE_TYPES,
  ADMIN_VERIFICATION_STATUSES,
  adminVenueDistanceMiles,
  adminVenueErrorCopy,
  buildAddAdminVenueRequest,
  buildAdminVenueRelatedRequest,
  buildAdminVenuesRequest,
  buildSaveAdminFanExperienceRequest,
  buildSaveAdminVenueRequest,
  filterAdminVenues,
  validateAdminVenueRelatedResponse,
  validateAdminVenueWriteResponse,
  validateAdminVenuesResponse,
  venueFormChanges
} from './admin-venues-core.mjs';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const DISPLAY = Object.freeze({
  cal_bar: 'Cal Bar',
  community_location: 'Community Location',
  cgb_reviewed: 'CGB reviewed',
  user_added: 'Fan added',
  yes: 'Yes',
  no: 'No',
  unknown: 'Unknown',
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived'
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function optionMarkup(values, selected) {
  return values.map((value) =>
    `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(DISPLAY[value] || value)}</option>`
  ).join('');
}

function dateLabel(value, { time = true } = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const options = time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function distanceLabel(miles) {
  if (!Number.isFinite(miles)) return '';
  if (miles < 0.1) return '<0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function venueAddressMarkup(venue) {
  const street = [venue.address_line_1, venue.address_line_2].filter(Boolean).join(', ');
  const locality = [venue.city, venue.region].filter(Boolean).join(', ');
  const localityPostal = [locality, venue.postal_code].filter(Boolean).join(' ');
  const country = venue.country_code && venue.country_code !== 'US' ? venue.country_code : '';
  return `
    <div class="venue-editor__address">
      ${street ? `<span>${escapeHtml(street)}</span>` : ''}
      ${localityPostal ? `<span>${escapeHtml(localityPostal)}</span>` : ''}
      ${country ? `<span>${escapeHtml(country)}</span>` : ''}
    </div>
  `;
}

function externalPlaceButton(place, selectedPlaceId) {
  const selected = place.placeId === selectedPlaceId;
  return `
    <button class="venue-search-result${selected ? ' is-selected' : ''}" type="button"
      data-select-place-id="${escapeHtml(place.placeId)}" aria-pressed="${selected}">
      <strong>${escapeHtml(place.name)}</strong>
      <span>${escapeHtml(place.address || place.locationContext || '')}</span>
    </button>
  `;
}

function renderExternalResults(results, selectedPlaceId) {
  if (!results.length) return '<div class="empty-state">No matching places found.</div>';
  const selected = results.find((item) => item.placeId === selectedPlaceId);
  return `
    <div class="venue-search-result-list">
      ${results.map((place) => externalPlaceButton(place, selectedPlaceId)).join('')}
    </div>
    ${selected ? `
      <div class="venue-add-confirm">
        <div>
          <small>Selected place</small>
          <strong>${escapeHtml(selected.name)}</strong>
          <span>${escapeHtml(selected.address || selected.locationContext || '')}</span>
        </div>
        <button id="venue-add-confirm" type="button">Add Venue</button>
      </div>
    ` : '<p class="venue-add-help">Select a result, then confirm Add Venue.</p>'}
  `;
}

function renderFanExperiences(related) {
  if (!related) return '<p class="venue-context-empty">Loading Fan Experiences…</p>';
  if (!related.fanExperiences.length) return '<p class="venue-context-empty">No Fan Experiences connected to this venue.</p>';
  return `<div class="fan-experience-list">${related.fanExperiences.map((item) => `
    <form class="fan-experience-form" data-experience-key="${escapeHtml(item.experience_key)}">
      <textarea name="public_text" maxlength="500" rows="3" required>${escapeHtml(item.text)}</textarea>
      <div class="fan-experience-footer">
        <span>${escapeHtml(item.display_name || 'Anonymous')} · ${escapeHtml(item.status || 'status unknown')} · ${escapeHtml(dateLabel(item.occurred_at))}</span>
        <button type="submit" class="secondary">Save Experience</button>
      </div>
    </form>
  `).join('')}</div>`;
}

function renderFanIntent(related) {
  if (!related) return '<p class="venue-context-empty">Loading Fan Intent…</p>';
  if (!related.fanIntent.length) return '<p class="venue-context-empty">No Fan Intent recorded for this venue.</p>';
  return `
    <div class="venue-table-wrap">
      <table class="venue-related-table">
        <thead><tr><th>Game</th><th>Attending</th><th>Withdrawn</th><th>Archived</th></tr></thead>
        <tbody>${related.fanIntent.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.opponent_name ? `vs. ${item.opponent_name}` : 'Game')}</strong><small>${escapeHtml(dateLabel(item.game_date, { time: false }))}</small></td>
            <td class="numeric">${escapeHtml(item.attending)}</td>
            <td class="numeric muted-cell">${escapeHtml(item.withdrawn)}</td>
            <td class="numeric muted-cell">${escapeHtml(item.archived)}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;
}

function renderWatchParties(venue) {
  if (!venue.watchParties?.length) return '<p class="venue-context-empty">No Watch Parties connected to this venue.</p>';
  return `
    <div class="venue-table-wrap">
      <table class="venue-related-table venue-related-table--watch-parties">
        <thead><tr><th>Game</th><th>Organizer</th><th>Status</th></tr></thead>
        <tbody>${venue.watchParties.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.opponent_name ? `vs. ${item.opponent_name}` : 'Watch Party')}</strong><small>${escapeHtml(dateLabel(item.game_date, { time: false }))}</small></td>
            <td>${escapeHtml(item.organizer_name || '—')}</td>
            <td><span class="status-chip">${escapeHtml(DISPLAY[item.publication_status] || item.publication_status || item.event_status || '—')}</span>${item.event_status && item.event_status !== item.publication_status ? `<small>${escapeHtml(item.event_status)}</small>` : ''}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;
}

function renderEditor(venue, related) {
  const tags = new Set(venue.venue_tags || []);
  const photo = venue.photo;

  return `
    <div class="venue-editor__title">
      <div>
        <p class="eyebrow">${escapeHtml(DISPLAY[venue.venue_type] || venue.venue_type)}</p>
        <h2>${escapeHtml(venue.name)}</h2>
        ${venueAddressMarkup(venue)}
      </div>
      <span class="status-chip">${escapeHtml(DISPLAY[venue.publication_status] || venue.publication_status)}</span>
    </div>

    <form id="venue-form" class="venue-form" data-venue-id="${escapeHtml(venue.venue_id)}">
      <section class="venue-form-section">
        <h3>Identity</h3>
        <div class="venue-field-grid">
          <label class="venue-field venue-field--wide">Name
            <input name="name" required maxlength="180" value="${escapeHtml(venue.name)}">
          </label>
          <label class="venue-field">Type
            <select name="venue_type">${optionMarkup(ADMIN_VENUE_TYPES, venue.venue_type)}</select>
          </label>
          <label class="venue-field">Verification
            <select name="verification_status">${optionMarkup(ADMIN_VERIFICATION_STATUSES, venue.verification_status)}</select>
          </label>
          <label class="venue-field">Alumni owned
            <select name="alumni_owned">${optionMarkup(ADMIN_ALUMNI_OWNED, venue.alumni_owned)}</select>
          </label>
          <label class="venue-field">Publication
            <select name="publication_status">${optionMarkup(ADMIN_PUBLICATION_STATUSES, venue.publication_status)}</select>
          </label>
        </div>
      </section>

      <section class="venue-form-section">
        <h3>Location</h3>
        <div class="venue-field-grid">
          <label class="venue-field venue-field--wide">Street
            <input name="address_line_1" required maxlength="220" value="${escapeHtml(venue.address_line_1)}">
          </label>
          <label class="venue-field venue-field--wide">Address line 2
            <input name="address_line_2" maxlength="120" value="${escapeHtml(venue.address_line_2)}">
          </label>
          <label class="venue-field">City
            <input name="city" required maxlength="140" value="${escapeHtml(venue.city)}">
          </label>
          <label class="venue-field">State / region
            <input name="region" required maxlength="80" value="${escapeHtml(venue.region)}">
          </label>
          <label class="venue-field">Postal code
            <input name="postal_code" maxlength="40" value="${escapeHtml(venue.postal_code)}">
          </label>
          <label class="venue-field">Country
            <input name="country_code" required maxlength="2" value="${escapeHtml(venue.country_code)}">
          </label>
          <label class="venue-field">Latitude
            <input name="latitude" required inputmode="decimal" value="${escapeHtml(venue.latitude ?? '')}">
          </label>
          <label class="venue-field">Longitude
            <input name="longitude" required inputmode="decimal" value="${escapeHtml(venue.longitude ?? '')}">
          </label>
          <label class="venue-field venue-field--wide">Website
            <input name="website_url" inputmode="url" maxlength="500" value="${escapeHtml(venue.website_url)}">
          </label>
        </div>
      </section>

      <section class="venue-form-section">
        <h3>CGB Says</h3>
        <label class="venue-field">
          <textarea name="short_description" maxlength="1000" rows="4">${escapeHtml(venue.short_description)}</textarea>
        </label>
      </section>

      <section class="venue-form-section">
        <h3>What to Know</h3>
        <div class="venue-tag-grid">
          ${ADMIN_VENUE_TAGS.map(([value, label]) => `
            <label class="venue-tag-toggle">
              <input type="checkbox" name="venue_tags" value="${escapeHtml(value)}"${tags.has(value) ? ' checked' : ''}>
              <span>${escapeHtml(label)}</span>
            </label>
          `).join('')}
        </div>
      </section>

      <section class="venue-form-section">
        <h3>Current photo</h3>
        ${photo?.photo_url ? `
          <div class="venue-photo-summary">
            <a href="${escapeHtml(photo.photo_url)}" target="_blank" rel="noopener">Open current photo</a>
            <span>${escapeHtml(photo.publication_status || 'status unknown')}</span>
            ${photo.photo_credit ? `<span>Credit: ${escapeHtml(photo.photo_credit)}</span>` : ''}
          </div>
        ` : '<p class="venue-context-empty">No current Venue_Photos record.</p>'}
      </section>

      <div class="venue-save-bar">
        <p>Changes to the public site can lag by up to 5 minutes while the public snapshot cache expires.</p>
        <button type="submit">Save Changes</button>
      </div>
    </form>

    <section class="venue-form-section venue-related-section">
      <h3>Fan Experiences</h3>
      <p class="venue-section-note">Edit the public Fan Experience text. Original form-response text is preserved.</p>
      <div data-related-fan-experiences>${renderFanExperiences(related)}</div>
    </section>

    <section class="venue-form-section venue-related-section">
      <h3>Fan Intent</h3>
      <p class="venue-section-note">Aggregate counts by game. Anonymous browser identifiers are not shown.</p>
      <div data-related-fan-intent>${renderFanIntent(related)}</div>
    </section>

    <section class="venue-form-section venue-related-section">
      <h3>Watch Parties</h3>
      ${renderWatchParties(venue)}
    </section>

    <section class="venue-form-section venue-form-section--meta">
      <h3>Admin metadata</h3>
      <dl class="venue-meta">
        <div><dt>Venue ID</dt><dd>${escapeHtml(venue.venue_id)}</dd></div>
        <div><dt>Slug</dt><dd>${escapeHtml(venue.slug)}</dd></div>
        <div><dt>External source</dt><dd>${escapeHtml(venue.source.external_source || '—')}</dd></div>
        <div><dt>External place ID</dt><dd>${escapeHtml(venue.source.external_place_id || '—')}</dd></div>
        <div><dt>Source submission</dt><dd>${escapeHtml(venue.source.source_submission_id || '—')}</dd></div>
        <div><dt>Created</dt><dd>${escapeHtml(dateLabel(venue.source.created_at))}</dd></div>
        <div><dt>Updated</dt><dd>${escapeHtml(dateLabel(venue.source.updated_at))}</dd></div>
      </dl>
    </section>
  `;
}

export function setupAdminVenues({ postAdmin, notify }) {
  const panel = document.querySelector('[data-panel="venues"]');
  if (!panel) return { activate: async () => {} };

  const searchInput = panel.querySelector('#venue-search');
  const typeFilter = panel.querySelector('#venue-type-filter');
  const statusFilter = panel.querySelector('#venue-status-filter');
  const sortSelect = panel.querySelector('#venue-sort');
  const list = panel.querySelector('#venue-list');
  const editor = panel.querySelector('#venue-editor');
  const empty = panel.querySelector('#venue-editor-empty');
  const addToggle = panel.querySelector('#venue-add-toggle');
  const addPanel = panel.querySelector('#venue-add-panel');
  const addForm = panel.querySelector('#venue-add-form');
  const addInput = panel.querySelector('#venue-add-search');
  const addResults = panel.querySelector('#venue-add-results');

  let venues = [];
  let selectedVenueId = '';
  let loaded = false;
  let loading = false;
  let externalResults = [];
  let selectedExternalPlaceId = '';
  let sortOrigin = null;
  const relatedByVenue = new Map();
  const relatedLoading = new Set();

  const currentVenueList = () => filterAdminVenues(venues, {
    query: searchInput?.value || '',
    status: statusFilter?.value || 'active',
    type: typeFilter?.value || 'all',
    sort: sortSelect?.value || 'az',
    origin: sortOrigin
  });

  const renderList = () => {
    const filtered = currentVenueList();
    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state">No venues match this filter.</div>';
      return;
    }
    list.innerHTML = filtered.map((venue) => {
      const miles = sortSelect?.value === 'nearest' && sortOrigin
        ? adminVenueDistanceMiles(venue, sortOrigin)
        : null;
      const distance = miles === null ? '' : distanceLabel(miles);
      return `
        <button type="button" class="venue-list-item${venue.venue_id === selectedVenueId ? ' is-selected' : ''}" data-venue-id="${escapeHtml(venue.venue_id)}">
          <strong>${escapeHtml(venue.name)}</strong>
          <span>${escapeHtml([venue.city, venue.region].filter(Boolean).join(', '))}${distance ? ` · ${escapeHtml(distance)}` : ''}</span>
          <small>${escapeHtml(DISPLAY[venue.venue_type] || venue.venue_type)} · ${escapeHtml(DISPLAY[venue.publication_status] || venue.publication_status)}</small>
        </button>
      `;
    }).join('');
  };

  const patchRelatedSections = (venueId) => {
    if (venueId !== selectedVenueId) return;
    const related = relatedByVenue.get(venueId) || null;
    const experiencesNode = editor.querySelector('[data-related-fan-experiences]');
    const intentNode = editor.querySelector('[data-related-fan-intent]');
    if (experiencesNode) experiencesNode.innerHTML = renderFanExperiences(related);
    if (intentNode) intentNode.innerHTML = renderFanIntent(related);
  };

  const loadRelated = async (venueId, { force = false } = {}) => {
    if (!force && relatedByVenue.has(venueId)) {
      patchRelatedSections(venueId);
      return;
    }
    if (relatedLoading.has(venueId)) return;
    relatedLoading.add(venueId);
    try {
      const response = await postAdmin(buildAdminVenueRelatedRequest(venueId));
      if (!validateAdminVenueRelatedResponse(response)) throw new Error('admin_invalid_response');
      relatedByVenue.set(venueId, response);
      patchRelatedSections(venueId);
    } catch (error) {
      if (venueId === selectedVenueId) {
        const experiencesNode = editor.querySelector('[data-related-fan-experiences]');
        const intentNode = editor.querySelector('[data-related-fan-intent]');
        if (experiencesNode) experiencesNode.innerHTML = '<p class="venue-context-empty">Fan Experiences could not be loaded.</p>';
        if (intentNode) intentNode.innerHTML = '<p class="venue-context-empty">Fan Intent could not be loaded.</p>';
      }
      notify(adminVenueErrorCopy(error) || 'Related Venue data could not be loaded.', 'error');
    } finally {
      relatedLoading.delete(venueId);
    }
  };

  const selectVenue = (venueId) => {
    selectedVenueId = venueId;
    const venue = venues.find((item) => item.venue_id === venueId);
    renderList();
    if (!venue) {
      editor.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    editor.hidden = false;
    editor.innerHTML = renderEditor(venue, relatedByVenue.get(venueId) || null);
    editor.scrollTop = 0;
    loadRelated(venueId);
  };

  const load = async ({ force = false } = {}) => {
    if (loading || (loaded && !force)) return;
    loading = true;
    try {
      const response = await postAdmin(buildAdminVenuesRequest());
      if (!validateAdminVenuesResponse(response)) throw new Error('admin_invalid_response');
      venues = response.venues;
      loaded = true;
      renderList();
      if (selectedVenueId && venues.some((venue) => venue.venue_id === selectedVenueId)) {
        selectVenue(selectedVenueId);
      } else if (venues.length) {
        selectVenue(venues[0].venue_id);
      }
    } catch (error) {
      notify(adminVenueErrorCopy(error) || 'Could not load venues.', 'error');
      list.innerHTML = '<div class="empty-state">Venue data could not be loaded.</div>';
    } finally {
      loading = false;
    }
  };

  const requestNearestSort = () => {
    if (sortOrigin) {
      renderList();
      return;
    }
    if (!navigator.geolocation) {
      sortSelect.value = 'az';
      notify('Location is not available in this browser; sorting A–Z.');
      renderList();
      return;
    }
    sortSelect.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sortOrigin = {
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude)
        };
        sortSelect.disabled = false;
        renderList();
      },
      () => {
        sortSelect.value = 'az';
        sortSelect.disabled = false;
        notify('Location access was not available; sorting A–Z.');
        renderList();
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    );
  };

  panel.addEventListener('click', async (event) => {
    const venueButton = event.target.closest('.venue-list-item[data-venue-id]');
    if (venueButton) {
      selectVenue(venueButton.dataset.venueId);
      return;
    }

    const placeButton = event.target.closest('[data-select-place-id]');
    if (placeButton) {
      selectedExternalPlaceId = placeButton.dataset.selectPlaceId;
      addResults.innerHTML = renderExternalResults(externalResults, selectedExternalPlaceId);
      return;
    }

    const confirmButton = event.target.closest('#venue-add-confirm');
    if (confirmButton) {
      const place = externalResults.find((item) => item.placeId === selectedExternalPlaceId);
      if (!place) return;
      confirmButton.disabled = true;
      try {
        const response = await postAdmin(buildAddAdminVenueRequest(place));
        if (!validateAdminVenueWriteResponse(response, 'addAdminVenue')) throw new Error('admin_invalid_response');
        selectedVenueId = response.venue.venue_id;
        relatedByVenue.delete(selectedVenueId);
        await load({ force: true });
        notify(response.created ? 'Venue added.' : 'Venue already existed; opened the existing record.');
        addPanel.hidden = true;
        addResults.innerHTML = '';
        addInput.value = '';
        externalResults = [];
        selectedExternalPlaceId = '';
      } catch (error) {
        notify(adminVenueErrorCopy(error) || 'Could not add venue.', 'error');
        confirmButton.disabled = false;
      }
    }
  });

  editor.addEventListener('submit', async (event) => {
    const form = event.target;
    if (form?.id === 'venue-form') {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const request = buildSaveAdminVenueRequest(form.dataset.venueId, venueFormChanges(new FormData(form)));
        const response = await postAdmin(request);
        if (!validateAdminVenueWriteResponse(response, 'saveAdminVenue')) throw new Error('admin_invalid_response');
        const index = venues.findIndex((venue) => venue.venue_id === response.venue.venue_id);
        if (index >= 0) venues[index] = response.venue;
        renderList();
        editor.innerHTML = renderEditor(response.venue, relatedByVenue.get(response.venue.venue_id) || null);
        notify('Venue saved. Public data may take up to 5 minutes to refresh.');
      } catch (error) {
        notify(adminVenueErrorCopy(error) || 'Could not save venue.', 'error');
        submit.disabled = false;
      }
      return;
    }

    if (form?.matches('.fan-experience-form')) {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        const request = buildSaveAdminFanExperienceRequest(
          selectedVenueId,
          form.dataset.experienceKey,
          new FormData(form).get('public_text')
        );
        const response = await postAdmin(request);
        if (!validateAdminVenueRelatedResponse(response, 'saveAdminFanExperience')) throw new Error('admin_invalid_response');
        relatedByVenue.set(selectedVenueId, response);
        patchRelatedSections(selectedVenueId);
        notify('Fan Experience saved. Public data may take up to 5 minutes to refresh.');
      } catch (error) {
        notify(adminVenueErrorCopy(error) || 'Could not save Fan Experience.', 'error');
        submit.disabled = false;
      }
    }
  });

  searchInput?.addEventListener('input', renderList);
  typeFilter?.addEventListener('change', renderList);
  statusFilter?.addEventListener('change', renderList);
  sortSelect?.addEventListener('change', () => {
    if (sortSelect.value === 'nearest') requestNearestSort();
    else renderList();
  });

  addToggle?.addEventListener('click', () => {
    addPanel.hidden = !addPanel.hidden;
    if (!addPanel.hidden) addInput?.focus();
  });

  addForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = String(addInput.value || '').trim();
    if (query.length < 3) {
      addResults.innerHTML = '<div class="empty-state">Enter at least 3 characters.</div>';
      return;
    }
    const runtime = readRuntimeConfig();
    if (!runtime.mapTiler.apiKey) {
      addResults.innerHTML = '<div class="empty-state">MapTiler search is not configured.</div>';
      return;
    }

    const submit = addForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    selectedExternalPlaceId = '';
    addResults.innerHTML = '<div class="empty-state">Searching MapTiler…</div>';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = buildMapTilerSearchUrl(query, runtime.mapTiler.apiKey, {
        limit: 8,
        autocomplete: false,
        fuzzyMatch: true
      });
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error('maptiler_search_failed');
      const payload = await response.json();
      externalResults = rankMapTilerResults(payload, query, { maximum: 6, filterWeak: true });
      addResults.innerHTML = renderExternalResults(externalResults, selectedExternalPlaceId);
    } catch (error) {
      addResults.innerHTML = `<div class="empty-state">${escapeHtml(error?.name === 'AbortError' ? 'MapTiler search timed out.' : 'MapTiler search failed.')}</div>`;
    } finally {
      clearTimeout(timeout);
      submit.disabled = false;
    }
  });

  return {
    activate: () => load(),
    reload: () => load({ force: true })
  };
}

const REQUEST_TIMEOUT_MS = 12000;

async function authenticatedVenuePost(payload) {
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

function venueToast(message, state = 'normal') {
  const node = document.querySelector('#dashboard-status');
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
  node.dataset.visible = 'true';
  window.setTimeout(() => { node.dataset.visible = 'false'; }, 3200);
}

const venueController = setupAdminVenues({
  postAdmin: authenticatedVenuePost,
  notify: (message, state = 'normal') => venueToast(message, state)
});

document.querySelector('[data-view="venues"]')?.addEventListener('click', () => {
  venueController.activate();
});
