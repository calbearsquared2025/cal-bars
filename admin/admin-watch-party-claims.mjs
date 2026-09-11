import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

import {
  buildAdminWatchPartyClaimsRequest,
  buildResolveAdminWatchPartyClaimRequest,
  filterAdminWatchPartyClaims,
  validateAdminWatchPartyClaimsResponse,
  validateResolveAdminWatchPartyClaimResponse
} from './admin-watch-party-claims-core.mjs';
import { ADMIN_AUTH_CONFIG } from './config.mjs';

const REQUEST_TIMEOUT_MS = 12000;
const endpoint = String(ADMIN_AUTH_CONFIG.endpoint || '').trim();
const dashboard = document.querySelector('#dashboard');
const navButton = document.querySelector('[data-view="watch-party-claims"]');
const listNode = document.querySelector('#watch-party-claims-list');
const summaryNode = document.querySelector('#watch-party-claims-summary');
const statusFilter = document.querySelector('#watch-party-claims-status-filter');
const refreshButton = document.querySelector('#watch-party-claims-refresh');

const RELATIONSHIP_LABELS = Object.freeze({
  organizer: 'Organizer / host',
  alumni_group_representative: 'Alumni group / organization representative',
  venue_representative: 'Venue representative',
  other: 'Other'
});

let claims = [];
let loaded = false;
let loading = false;
let probingAvailability = false;

function currentUser() {
  try { return getAuth().currentUser; } catch (_) { return null; }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function setEmpty(message) {
  if (!listNode) return;
  listNode.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = message;
  listNode.append(empty);
}

async function postAdmin(payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) throw new Error('admin_backend_unavailable');
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
}

function updateSummary() {
  if (!summaryNode) return;
  const pending = claims.filter((claim) => claim.status === 'pending').length;
  const approved = claims.filter((claim) => claim.status === 'approved').length;
  const rejected = claims.filter((claim) => claim.status === 'rejected').length;
  summaryNode.textContent = `${pending} pending · ${approved} approved · ${rejected} rejected`;
}

function managementSummary(claim) {
  if (!claim.management.length) return 'No current manager';
  return claim.management.map((entry) => `${entry.role === 'owner' ? 'Owner' : 'Manager'}: ${entry.displayName}`).join(' · ');
}

function claimIsApprovable(claim) {
  return claim?.watchParty?.eventStatus === 'active' && claim?.watchParty?.publicationStatus === 'published';
}

function createSupportingLink(url) {
  if (!url) return document.createTextNode('—');
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open supporting link';
  return link;
}

function appendTextLine(cell, strongText, text) {
  const line = document.createElement('div');
  if (strongText) {
    const strong = document.createElement('strong');
    strong.textContent = strongText;
    line.append(strong);
  }
  if (text) line.append(document.createTextNode(strongText ? ` ${text}` : text));
  cell.append(line);
}

function createClaimRow(claim) {
  const row = document.createElement('tr');
  row.dataset.claimId = claim.claimId;

  const partyCell = document.createElement('td');
  partyCell.dataset.label = 'Watch Party';
  appendTextLine(partyCell, claim.watchParty.venueName, '');
  appendTextLine(partyCell, '', `vs. ${claim.watchParty.opponentName}`);
  if (claim.watchParty.organizerName) appendTextLine(partyCell, '', `Hosted by ${claim.watchParty.organizerName}`);
  const partyStatus = document.createElement('small');
  partyStatus.textContent = `${claim.watchParty.eventStatus} · ${claim.watchParty.publicationStatus}`;
  partyCell.append(partyStatus);

  const claimantCell = document.createElement('td');
  claimantCell.dataset.label = 'Claimant';
  appendTextLine(claimantCell, claim.claimantName, '');
  appendTextLine(claimantCell, '', claim.claimant.displayName);
  const email = document.createElement('small');
  email.textContent = claim.claimant.email || 'No email available';
  claimantCell.append(email);
  if (claim.claimant.accountStatus !== 'active') {
    const accountStatus = document.createElement('span');
    accountStatus.className = 'status-chip';
    accountStatus.textContent = claim.claimant.accountStatus;
    claimantCell.append(document.createTextNode(' '), accountStatus);
  }

  const relationshipCell = document.createElement('td');
  relationshipCell.dataset.label = 'Relationship';
  relationshipCell.textContent = RELATIONSHIP_LABELS[claim.relationship] || claim.relationship;

  const detailCell = document.createElement('td');
  detailCell.dataset.label = 'Details';
  detailCell.className = 'activity-detail-cell';
  if (claim.explanation) {
    const detail = document.createElement('div');
    detail.textContent = claim.explanation;
    detailCell.append(detail);
  }
  const linkLine = document.createElement('div');
  linkLine.append(createSupportingLink(claim.supportingUrl));
  detailCell.append(linkLine);
  const management = document.createElement('small');
  management.textContent = managementSummary(claim);
  detailCell.append(management);

  const statusCell = document.createElement('td');
  statusCell.dataset.label = 'Status';
  const chip = document.createElement('span');
  chip.className = 'status-chip';
  chip.textContent = claim.status;
  statusCell.append(chip);
  const time = document.createElement('time');
  time.dateTime = claim.createdAt;
  time.textContent = formatDate(claim.createdAt);
  statusCell.append(document.createElement('br'), time);
  if (claim.reviewedAt) {
    const reviewed = document.createElement('small');
    reviewed.textContent = `Reviewed ${formatDate(claim.reviewedAt)}`;
    statusCell.append(document.createElement('br'), reviewed);
  }

  const actionCell = document.createElement('td');
  actionCell.dataset.label = 'Review';
  actionCell.className = 'activity-review-cell';
  if (claim.status === 'pending') {
    const note = document.createElement('input');
    note.type = 'text';
    note.maxLength = 600;
    note.placeholder = 'Decision note (optional)';
    note.setAttribute('aria-label', 'Decision note');
    note.dataset.claimDecisionNote = claim.claimId;
    actionCell.append(note, document.createElement('br'));

    if (claimIsApprovable(claim)) {
      const approve = document.createElement('button');
      approve.type = 'button';
      approve.dataset.claimDecision = 'approve';
      approve.dataset.claimId = claim.claimId;
      approve.textContent = claim.management.some((entry) => entry.role === 'owner') ? 'Approve as manager' : 'Approve as owner';
      actionCell.append(approve, document.createTextNode(' '));
    } else {
      const unavailable = document.createElement('small');
      unavailable.textContent = 'Approval unavailable: Watch Party is no longer active and published.';
      actionCell.append(unavailable, document.createElement('br'));
    }

    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'secondary';
    reject.dataset.claimDecision = 'reject';
    reject.dataset.claimId = claim.claimId;
    reject.textContent = 'Reject';
    actionCell.append(reject);
  } else {
    const result = document.createElement('span');
    result.className = 'reviewed-label';
    result.textContent = claim.status === 'approved' ? 'Approved' : 'Rejected';
    actionCell.append(result);
    if (claim.decisionNote) {
      const note = document.createElement('small');
      note.textContent = claim.decisionNote;
      actionCell.append(document.createElement('br'), note);
    }
  }

  row.append(partyCell, claimantCell, relationshipCell, detailCell, statusCell, actionCell);
  return row;
}

function render() {
  if (!listNode || !statusFilter) return;
  updateSummary();
  const filtered = filterAdminWatchPartyClaims(claims, statusFilter.value);
  listNode.replaceChildren();
  if (!filtered.length) {
    setEmpty(claims.length ? 'No claims match this filter.' : 'No Watch Party claims yet.');
    return;
  }
  const table = document.createElement('table');
  table.className = 'activity-table';
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Watch Party', 'Claimant', 'Relationship', 'Details', 'Status', 'Review'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headerRow.append(th);
  });
  head.append(headerRow);
  const body = document.createElement('tbody');
  filtered.forEach((claim) => body.append(createClaimRow(claim)));
  table.append(head, body);
  listNode.append(table);
}

function resetClaimsAvailability() {
  if (navButton) navButton.hidden = true;
  claims = [];
  loaded = false;
  loading = false;
  setEmpty('Claims are unavailable until the deployed Admin backend supports them.');
}

async function probeClaimsAvailability() {
  if (probingAvailability || !navButton || !dashboard || dashboard.hidden || !endpoint) return;
  const user = currentUser();
  if (!user) return;
  probingAvailability = true;
  navButton.hidden = true;
  try {
    const idToken = await user.getIdToken();
    const payload = await postAdmin(buildAdminWatchPartyClaimsRequest(idToken));
    if (dashboard.hidden || currentUser() !== user) return;
    if (payload.ok !== true) throw new Error(payload.error || 'admin_backend_unavailable');
    const result = validateAdminWatchPartyClaimsResponse(payload);
    if (!result) throw new Error('admin_backend_unavailable');
    claims = [...result.claims];
    loaded = true;
    render();
    navButton.hidden = false;
  } catch (_) {
    if (!dashboard.hidden && currentUser() === user) resetClaimsAvailability();
  } finally {
    probingAvailability = false;
  }
}

async function loadClaims({ refresh = false } = {}) {
  if (loading || (loaded && !refresh)) return;
  const user = currentUser();
  if (!user || !endpoint) {
    setEmpty('Claim review is unavailable until Admin authentication completes.');
    return;
  }
  loading = true;
  setEmpty('Loading Watch Party claims…');
  try {
    const idToken = await user.getIdToken();
    const payload = await postAdmin(buildAdminWatchPartyClaimsRequest(idToken));
    if (payload.ok !== true) throw new Error(payload.error || 'admin_backend_unavailable');
    const result = validateAdminWatchPartyClaimsResponse(payload);
    if (!result) throw new Error('admin_backend_unavailable');
    claims = [...result.claims];
    loaded = true;
    render();
  } catch (_) {
    setEmpty('Watch Party claims could not reach the private backend.');
  } finally {
    loading = false;
  }
}

async function resolveClaim(claim, decision, button) {
  const user = currentUser();
  if (!user || !claim) return;
  if (decision === 'approve' && claim.claimant.accountStatus !== 'active') {
    window.alert('This account is suspended. Restore it before approving the claim.');
    return;
  }
  if (decision === 'approve' && !claimIsApprovable(claim)) {
    window.alert('This Watch Party is no longer active and published, so its claim cannot be approved.');
    return;
  }
  const existingOwner = claim.management.find((entry) => entry.role === 'owner');
  if (decision === 'approve' && existingOwner && !window.confirm(
    `${existingOwner.displayName} is already the owner. Approve ${claim.claimantName} as an additional manager?`
  )) return;
  if (decision === 'reject' && !window.confirm(`Reject the claim from ${claim.claimantName}?`)) return;

  const note = listNode.querySelector(`[data-claim-decision-note="${claim.claimId}"]`)?.value || '';
  const rowButtons = [...listNode.querySelectorAll(`[data-claim-id="${claim.claimId}"]`)];
  rowButtons.forEach((candidate) => { candidate.disabled = true; });
  button.textContent = decision === 'approve' ? 'Approving…' : 'Rejecting…';
  try {
    const idToken = await user.getIdToken();
    const payload = await postAdmin(buildResolveAdminWatchPartyClaimRequest(idToken, claim.claimId, decision, note));
    if (payload.ok !== true) throw new Error(payload.error || 'admin_backend_unavailable');
    const updated = validateResolveAdminWatchPartyClaimResponse(payload);
    if (!updated) throw new Error('admin_backend_unavailable');
    claims = claims.map((candidate) => candidate.claimId === updated.claimId ? updated : candidate);
    render();
  } catch (_) {
    window.alert('The Watch Party claim could not be updated.');
    render();
  }
}

navButton?.addEventListener('click', () => { void loadClaims(); });
statusFilter?.addEventListener('change', () => { if (loaded) render(); });
refreshButton?.addEventListener('click', () => { void loadClaims({ refresh: true }); });
listNode?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-claim-decision][data-claim-id]');
  if (!button) return;
  const claim = claims.find((candidate) => candidate.claimId === button.dataset.claimId);
  if (!claim || claim.status !== 'pending') return;
  void resolveClaim(claim, button.dataset.claimDecision, button);
});

if (dashboard) {
  const dashboardObserver = new MutationObserver(() => {
    if (dashboard.hidden) {
      resetClaimsAvailability();
      return;
    }
    void probeClaimsAvailability();
  });
  dashboardObserver.observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });
  if (!dashboard.hidden) void probeClaimsAvailability();
}