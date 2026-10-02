import {
  fanErrorCopy,
  validateFanManagedWatchPartyRsvpResponse,
  validateFanWatchPartyRsvpAttendeesResponse,
  validateFanWatchPartyRsvpResponse
} from './accounts-core.mjs';
import { formatGameDate, gameTitle } from './core.mjs';

const MAX_PARTY_SIZE = 20;
const OWN_REFRESH_MS = 60_000;

let signedIn = false;
let ownLoadedAt = 0;
let ownLoadPromise = null;
let ownRsvps = new Map();
let pendingWatchPartyId = '';
let attendeeDialog = null;
let attendeeForm = null;
let attendeeTitle = null;
let attendeeContext = null;
let attendeeCancel = null;
let attendeeSubmit = null;
let currentWatchPartyId = '';
let currentOpener = null;
let submitting = false;

let managementOpened = false;
let managementSection = null;
let managementContent = null;
let managementLoadPromise = null;
let managedWatchParties = [];
let attendeeListDialog = null;
let attendeeListContent = null;
let attendeeListTitle = null;
let attendeeListExport = null;
let attendeeListOpener = null;
let currentAttendeeExport = null;

function clean(value) {
  return String(value ?? '').trim();
}

function injectRsvpStyles() {
  if (document.querySelector('link[data-cgb-account-contributions-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-contributions.css';
  link.dataset.cgbAccountContributionsStyle = 'true';
  document.head.append(link);
}

function snapshot() {
  return window.CGBApp?.getState?.()?.snapshot || null;
}

function watchPartyById(watchPartyId) {
  return snapshot()?.watchParties?.find((party) => clean(party?.watch_party_id) === clean(watchPartyId)) || null;
}

function gameById(gameId) {
  return snapshot()?.games?.find((game) => clean(game?.game_id) === clean(gameId)) || null;
}

function venueById(venueId) {
  return snapshot()?.venues?.find((venue) => clean(venue?.venue_id) === clean(venueId)) || null;
}

function nativeRsvpEnabled(party) {
  return party?.rsvp_enabled === true || clean(party?.rsvp_enabled).toLowerCase() === 'true';
}

function ownRsvpForGame(gameId) {
  return [...ownRsvps.values()].find((rsvp) => rsvp.gameId === gameId) || null;
}

function ownRsvpForWatchParty(watchPartyId) {
  return ownRsvps.get(clean(watchPartyId)) || null;
}

function dispatchRsvpState() {
  window.dispatchEvent(new CustomEvent('cgb:rsvp-state', {
    detail: Object.freeze({ activeGames: Object.freeze([...new Set([...ownRsvps.values()].map((row) => row.gameId))]) })
  }));
}

function applyOwnResponse(response) {
  const validated = validateFanWatchPartyRsvpResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  ownRsvps = new Map(validated.rsvps.map((rsvp) => [rsvp.watchPartyId, rsvp]));
  ownLoadedAt = Date.now();
  syncPartyModules();
  dispatchRsvpState();
  return validated;
}

async function loadOwnRsvps({ force = false } = {}) {
  if (!signedIn || !window.CGBAccounts?.isSignedIn?.()) return null;
  if (!force && ownLoadedAt && Date.now() - ownLoadedAt < OWN_REFRESH_MS) return ownRsvps;
  if (ownLoadPromise) return ownLoadPromise;
  ownLoadPromise = (async () => {
    const response = await window.CGBAccounts.request('listFanWatchPartyRsvps');
    if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
    applyOwnResponse(response);
    return ownRsvps;
  })().catch((error) => {
    console.error('CGB RSVP state unavailable.', error);
    return null;
  }).finally(() => {
    ownLoadPromise = null;
  });
  return ownLoadPromise;
}

function syncPartyModule(module) {
  const watchPartyId = clean(module?.dataset?.watchPartyId);
  if (!watchPartyId) return;
  const party = watchPartyById(watchPartyId);
  const own = ownRsvpForWatchParty(watchPartyId);
  let container = module.querySelector(`[data-watch-party-rsvp="${CSS.escape(watchPartyId)}"]`);
  if (!container) {
    container = document.createElement('section');
    container.className = 'party-module__section party-module__native-rsvp';
    container.dataset.watchPartyRsvp = watchPartyId;
    const eyebrow = document.createElement('p');
    eyebrow.className = 'party-module__eyebrow';
    eyebrow.textContent = 'RSVP';
    const status = document.createElement('p');
    status.className = 'party-module__rsvp-status';
    status.dataset.watchPartyRsvpStatus = watchPartyId;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'party-module__rsvp-action party-module__rsvp-action--quiet';
    button.dataset.watchPartyRsvpAction = watchPartyId;
    button.addEventListener('click', (event) => {
      void openRsvp(watchPartyId, event.currentTarget);
    });
    container.append(eyebrow, status, button);
    module.append(container);
  }

  const enabled = nativeRsvpEnabled(party);
  container.hidden = !enabled && !own;
  container.dataset.rsvpState = own ? 'confirmed' : 'available';
  const status = container.querySelector('[data-watch-party-rsvp-status]');
  const button = container.querySelector('[data-watch-party-rsvp-action]');
  const state = window.CGBApp?.getState?.();
  const attendingHere = Boolean(
    party &&
    state?.fanIntent?.selections?.[party.game_id] === party.venue_id
  );
  if (status) {
    if (own) {
      const closed = !enabled ? ' · RSVP closed' : '';
      status.textContent = `You’re RSVP’d · party of ${own.partySize}${closed}`;
    } else if (attendingHere) {
      status.textContent = 'You’re in. This Watch Party is also collecting RSVPs.';
    } else {
      status.textContent = 'This Watch Party is collecting RSVPs.';
    }
  }
  if (button) {
    const usePrimaryFollowup = !own && attendingHere;
    button.textContent = own ? 'Edit RSVP' : attendingHere ? 'Complete RSVP' : 'RSVP through Cal Golden Bars →';
    button.classList.toggle('primary-button', usePrimaryFollowup);
    button.classList.toggle('party-module__rsvp-action--quiet', !usePrimaryFollowup);
    button.classList.remove('secondary-button');
    button.setAttribute('aria-label', own ? 'Edit your Watch Party RSVP' : 'RSVP for this Watch Party through Cal Golden Bars');
  }
}

function syncPartyModules() {
  document.querySelectorAll('.party-module[data-watch-party-id]').forEach(syncPartyModule);
}

function makeInput(name, type = 'text') {
  const input = document.createElement('input');
  input.name = name;
  input.type = type;
  input.required = true;
  if (type === 'email') input.autocomplete = 'email';
  else if (name === 'attendeeName') input.autocomplete = 'name';
  else input.autocomplete = 'off';
  return input;
}

function labeledField(label, control, hint = '') {
  const wrapper = document.createElement('label');
  wrapper.className = 'account-contribution-field';
  const name = document.createElement('span');
  name.className = 'account-contribution-label';
  name.textContent = label;
  wrapper.append(name, control);
  if (hint) {
    const helper = document.createElement('small');
    helper.textContent = hint;
    wrapper.append(helper);
  }
  return wrapper;
}

function ensureAttendeeDialog() {
  if (attendeeDialog) return attendeeDialog;
  attendeeDialog = document.createElement('dialog');
  attendeeDialog.id = 'cgb-watch-party-rsvp-dialog';
  attendeeDialog.className = 'account-contribution-dialog';
  attendeeDialog.setAttribute('aria-labelledby', 'cgb-watch-party-rsvp-title');
  attendeeDialog.innerHTML = `
    <div class="account-contribution-shell">
      <header class="account-contribution-header">
        <div>
          <span class="eyebrow">Watch Party</span>
          <h2 id="cgb-watch-party-rsvp-title">RSVP</h2>
          <p class="account-contribution-context"></p>
        </div>
        <button class="icon-button account-contribution-close" type="button" aria-label="Close">×</button>
      </header>
      <form class="account-contribution-form"></form>
    </div>`;
  document.body.append(attendeeDialog);
  attendeeForm = attendeeDialog.querySelector('.account-contribution-form');
  attendeeTitle = attendeeDialog.querySelector('#cgb-watch-party-rsvp-title');
  attendeeContext = attendeeDialog.querySelector('.account-contribution-context');
  attendeeDialog.querySelector('.account-contribution-close').addEventListener('click', () => attendeeDialog.close());
  attendeeDialog.addEventListener('click', (event) => {
    if (event.target === attendeeDialog) attendeeDialog.close();
  });
  attendeeDialog.addEventListener('close', () => {
    if (currentOpener?.isConnected) currentOpener.focus({ preventScroll: true });
    currentOpener = null;
    currentWatchPartyId = '';
  });
  attendeeForm.addEventListener('submit', handleRsvpSubmit);
  return attendeeDialog;
}

function rsvpContext(watchPartyId) {
  const party = watchPartyById(watchPartyId);
  const own = ownRsvpForWatchParty(watchPartyId);
  const gameId = party?.game_id || own?.gameId;
  const venueId = party?.venue_id || own?.venueId;
  return {
    party,
    own,
    game: gameById(gameId),
    venue: venueById(venueId)
  };
}

function renderRsvpForm(watchPartyId) {
  const context = rsvpContext(watchPartyId);
  if (!context.party && !context.own) return false;
  ensureAttendeeDialog();
  currentWatchPartyId = watchPartyId;
  attendeeTitle.textContent = context.own ? 'Your RSVP' : 'RSVP';
  const gameCopy = context.game ? gameTitle(context.game) : '';
  attendeeContext.textContent = [context.venue?.name, gameCopy].filter(Boolean).join(' · ');
  attendeeForm.replaceChildren();

  const name = makeInput('attendeeName');
  name.maxLength = 120;
  name.value = context.own?.attendeeName || window.CGBAccounts?.getProfile?.()?.displayName || '';
  const email = makeInput('contactEmail', 'email');
  email.required = false;
  email.maxLength = 254;
  email.value = context.own?.contactEmail || '';
  const partySize = makeInput('partySize', 'number');
  partySize.min = '1';
  partySize.max = String(MAX_PARTY_SIZE);
  partySize.step = '1';
  partySize.inputMode = 'numeric';
  partySize.value = String(context.own?.partySize || 1);
  const note = document.createElement('textarea');
  note.name = 'note';
  note.rows = 3;
  note.maxLength = 500;
  note.placeholder = 'Optional';
  note.value = context.own?.note || '';

  const privacy = document.createElement('p');
  privacy.className = 'account-contribution-note account-rsvp-privacy';
  privacy.textContent = 'Your RSVP details are private and visible to CGB and the verified owner or manager of this Watch Party. If you provide an email, it is shared with the organizer and is not public.';

  const actions = document.createElement('div');
  actions.className = 'accounts-email-actions account-rsvp-actions';
  attendeeSubmit = document.createElement('button');
  attendeeSubmit.type = 'submit';
  attendeeSubmit.className = 'primary-button account-contribution-submit';
  attendeeSubmit.textContent = context.own ? 'Update RSVP' : 'Confirm RSVP';
  attendeeCancel = document.createElement('button');
  attendeeCancel.type = 'button';
  attendeeCancel.className = 'text-button account-rsvp-cancel';
  attendeeCancel.textContent = 'Cancel RSVP';
  attendeeCancel.hidden = !context.own;
  attendeeCancel.addEventListener('click', () => { void cancelCurrentRsvp(); });
  actions.append(attendeeSubmit, attendeeCancel);

  if (context.own && context.own.eligible === false) {
    const closed = document.createElement('p');
    closed.className = 'account-contribution-note';
    closed.setAttribute('role', 'status');
    closed.textContent = 'This Watch Party is no longer accepting RSVP changes. You can still cancel your RSVP.';
    attendeeSubmit.hidden = true;
    attendeeForm.append(closed);
  }

  attendeeForm.append(
    labeledField('Attendee / contact name', name),
    labeledField('Email to share with the Watch Party organizer — optional', email, 'If provided, this email will be visible to the organizer.'),
    labeledField('Party size', partySize, `1–${MAX_PARTY_SIZE} people. This does not create extra CGB Bear counts.`),
    labeledField('Note', note, 'Optional short note for the organizer.'),
    privacy,
    actions
  );
  return true;
}

async function requestOwnMutation(action, extra) {
  const response = await window.CGBAccounts.request(action, extra);
  if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
  return applyOwnResponse(response);
}

async function refreshAttendanceAfterRsvp() {
  await window.CGBAccountAttendance?.refresh?.();
}

async function handleRsvpSubmit(event) {
  event.preventDefault();
  if (submitting || !currentWatchPartyId || !signedIn) return;
  const data = new FormData(attendeeForm);
  submitting = true;
  attendeeSubmit.disabled = true;
  attendeeSubmit.textContent = 'Saving…';
  try {
    await requestOwnMutation('saveFanWatchPartyRsvp', {
      watchPartyId: currentWatchPartyId,
      attendeeName: clean(data.get('attendeeName')),
      contactEmail: clean(data.get('contactEmail')),
      partySize: Number(data.get('partySize')),
      note: clean(data.get('note'))
    });
    await refreshAttendanceAfterRsvp();
    attendeeDialog.close();
    window.CGBApp?.showStatus?.('RSVP saved.', 4000);
    if (managementOpened) void loadManagement({ force: true });
  } catch (error) {
    window.CGBApp?.showStatus?.(fanErrorCopy(error?.message), 5000);
  } finally {
    submitting = false;
    if (attendeeSubmit) {
      attendeeSubmit.disabled = false;
      attendeeSubmit.textContent = ownRsvpForWatchParty(currentWatchPartyId) ? 'Update RSVP' : 'Confirm RSVP';
    }
  }
}

async function cancelCurrentRsvp() {
  const watchPartyId = currentWatchPartyId;
  if (!watchPartyId || submitting) return;
  submitting = true;
  attendeeCancel.disabled = true;
  try {
    await requestOwnMutation('cancelFanWatchPartyRsvp', { watchPartyId });
    await refreshAttendanceAfterRsvp();
    attendeeDialog.close();
    window.CGBApp?.showStatus?.('RSVP cancelled.', 4000);
    if (managementOpened) void loadManagement({ force: true });
  } catch (error) {
    window.CGBApp?.showStatus?.(fanErrorCopy(error?.message), 5000);
  } finally {
    submitting = false;
    if (attendeeCancel) attendeeCancel.disabled = false;
  }
}

async function beginRsvpSignIn(watchPartyId, opener) {
  pendingWatchPartyId = watchPartyId;
  currentOpener = opener || currentOpener;
  await window.CGBMyCgbSurface?.open?.({ opener: opener || null });
  window.setTimeout(() => {
    if (window.CGBAccounts?.isSignedIn?.()) return;
    document.querySelector('.my-cgb-sign-in')?.click();
  }, 0);
}

async function openRsvp(watchPartyId, opener = null) {
  const id = clean(watchPartyId);
  const party = watchPartyById(id);
  if (!id || (!party && !ownRsvpForWatchParty(id))) return false;
  currentOpener = opener || document.querySelector(`[data-watch-party-rsvp-action="${CSS.escape(id)}"]`) || null;
  await window.CGBAccounts?.start?.();
  if (!window.CGBAccounts?.isSignedIn?.()) {
    await beginRsvpSignIn(id, currentOpener);
    return true;
  }
  signedIn = true;
  await loadOwnRsvps();
  if (!renderRsvpForm(id)) return false;
  attendeeDialog.showModal();
  attendeeForm.querySelector('input, textarea')?.focus();
  return true;
}

function confirmAttendanceChange(operation = {}) {
  const current = ownRsvpForGame(clean(operation.gameId));
  if (!current) return true;
  const action = clean(operation.action);
  const venueId = clean(operation.venueId);
  const cancelsRsvp = action === 'withdraw' ||
    ((action === 'join' || action === 'move') && venueId !== current.venueId);
  if (!cancelsRsvp) return true;
  const context = rsvpContext(current.watchPartyId);
  const label = context.venue?.name || 'your Watch Party';
  return window.confirm(`Changing your CGB attendance away from ${label} will cancel your RSVP. Continue?`);
}

function reconcileAttendanceChange(operation = {}) {
  const gameId = clean(operation.gameId);
  const current = ownRsvpForGame(gameId);
  if (!current) return false;
  const action = clean(operation.action);
  const venueId = clean(operation.venueId);
  const cancelsRsvp = action === 'withdraw' ||
    ((action === 'join' || action === 'move') && venueId !== current.venueId);
  if (!cancelsRsvp) return false;
  ownRsvps.delete(current.watchPartyId);
  syncPartyModules();
  dispatchRsvpState();
  if (managementOpened) void loadManagement({ force: true });
  return true;
}

function ensureManagementSection() {
  const signedInSurface = document.querySelector('.accounts-signed-in');
  if (!signedInSurface) return null;
  if (managementSection?.isConnected) return managementSection;
  managementSection = document.createElement('section');
  managementSection.className = 'accounts-section accounts-rsvp-management';
  managementSection.hidden = true;
  managementSection.setAttribute('aria-labelledby', 'accounts-rsvp-management-title');
  managementSection.innerHTML = `
    <div class="accounts-section__heading">
      <div>
        <span class="eyebrow">Organizer</span>
        <h3 id="accounts-rsvp-management-title">Watch Party RSVPs</h3>
      </div>
    </div>
    <div class="accounts-rsvp-management__content" aria-live="polite"></div>`;
  managementContent = managementSection.querySelector('.accounts-rsvp-management__content');
  const season = signedInSurface.querySelector('.accounts-season');
  if (season) season.insertAdjacentElement('afterend', managementSection);
  else signedInSurface.append(managementSection);
  return managementSection;
}

function managedTitle(item) {
  const matchup = item.opponentName
    ? `${item.gameDate ? item.gameDate + ' · ' : ''}${item.opponentName}`
    : item.gameDate;
  return [item.venueName || item.organizerName || 'Watch Party', matchup].filter(Boolean);
}

function renderManagement() {
  const section = ensureManagementSection();
  if (!section || !managementContent) return;
  managementContent.replaceChildren();
  section.hidden = managedWatchParties.length === 0;
  if (!managedWatchParties.length) return;

  managedWatchParties.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'accounts-rsvp-card';
    card.dataset.managedWatchPartyId = item.watchPartyId;

    const heading = document.createElement('div');
    heading.className = 'accounts-rsvp-card__heading';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    const [primary, secondary] = managedTitle(item);
    title.textContent = primary;
    const context = document.createElement('span');
    context.textContent = secondary || '';
    copy.append(title, context);
    const role = document.createElement('span');
    role.className = 'accounts-connected-method';
    role.textContent = item.managementRole === 'owner' ? 'Owner' : 'Manager';
    heading.append(copy, role);

    const stats = document.createElement('p');
    stats.className = 'accounts-rsvp-card__stats';
    stats.textContent = `${item.responseCount} active RSVP ${item.responseCount === 1 ? 'response' : 'responses'} · ${item.expectedAttendance} expected`;

    const actions = document.createElement('div');
    actions.className = 'accounts-rsvp-card__actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = item.rsvpEnabled ? 'secondary-button' : 'primary-button';
    toggle.textContent = item.rsvpEnabled ? 'Disable RSVPs' : 'Enable RSVPs';
    toggle.disabled = !item.rsvpEnabled && !item.eligible;
    toggle.title = toggle.disabled ? 'This Watch Party is no longer eligible for new RSVPs.' : '';
    toggle.addEventListener('click', () => { void setRsvpEnabled(item.watchPartyId, !item.rsvpEnabled, toggle); });

    const attendees = document.createElement('button');
    attendees.type = 'button';
    attendees.className = 'text-button';
    attendees.textContent = 'View attendee list';
    attendees.addEventListener('click', (event) => {
      void openAttendeeList(item.watchPartyId, event.currentTarget);
    });
    actions.append(toggle, attendees);
    card.append(heading, stats, actions);
    managementContent.append(card);
  });
}

async function loadManagement({ force = false } = {}) {
  if (!managementOpened || !signedIn || !window.CGBAccounts?.isSignedIn?.()) return null;
  if (managementLoadPromise && !force) return managementLoadPromise;
  const section = ensureManagementSection();
  if (!section) return null;
  if (!force && managedWatchParties.length) {
    renderManagement();
    return managedWatchParties;
  }
  managementContent.textContent = 'Loading managed Watch Parties…';
  section.hidden = false;
  managementLoadPromise = (async () => {
    const response = await window.CGBAccounts.request('listFanManagedWatchPartyRsvps');
    if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
    const validated = validateFanManagedWatchPartyRsvpResponse(response);
    if (!validated) throw new Error('fan_backend_unavailable');
    managedWatchParties = [...validated.managedWatchParties];
    renderManagement();
    return managedWatchParties;
  })().catch((error) => {
    managementContent.textContent = fanErrorCopy(error?.message);
    console.error('CGB RSVP management unavailable.', error);
    return null;
  }).finally(() => {
    managementLoadPromise = null;
  });
  return managementLoadPromise;
}

async function setRsvpEnabled(watchPartyId, enabled, button) {
  button.disabled = true;
  try {
    const response = await window.CGBAccounts.request('setFanWatchPartyRsvpEnabled', {
      watchPartyId,
      enabled
    });
    if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
    const validated = validateFanManagedWatchPartyRsvpResponse(response);
    if (!validated) throw new Error('fan_backend_unavailable');
    managedWatchParties = [...validated.managedWatchParties];
    const party = watchPartyById(watchPartyId);
    if (party) party.rsvp_enabled = enabled;
    renderManagement();
    syncPartyModules();
    dispatchRsvpState();
    window.CGBApp?.showStatus?.(enabled ? 'RSVP collection enabled.' : 'RSVP collection disabled.', 4000);
  } catch (error) {
    window.CGBApp?.showStatus?.(fanErrorCopy(error?.message), 5000);
    button.disabled = false;
  }
}

function ensureAttendeeListDialog() {
  if (attendeeListDialog) return attendeeListDialog;
  attendeeListDialog = document.createElement('dialog');
  attendeeListDialog.id = 'cgb-watch-party-rsvp-attendees';
  attendeeListDialog.className = 'account-contribution-dialog';
  attendeeListDialog.setAttribute('aria-labelledby', 'cgb-watch-party-rsvp-attendees-title');
  attendeeListDialog.innerHTML = `
    <div class="account-contribution-shell">
      <header class="account-contribution-header">
        <div>
          <span class="eyebrow">Organizer</span>
          <h2 id="cgb-watch-party-rsvp-attendees-title">RSVP attendees</h2>
          <p class="account-contribution-context">Private attendee list</p>
        </div>
        <button class="icon-button account-contribution-close" type="button" aria-label="Close">×</button>
      </header>
      <div class="account-rsvp-attendees"></div>
    </div>`;
  document.body.append(attendeeListDialog);
  attendeeListTitle = attendeeListDialog.querySelector('#cgb-watch-party-rsvp-attendees-title');
  attendeeListContent = attendeeListDialog.querySelector('.account-rsvp-attendees');
  attendeeListDialog.querySelector('.account-contribution-close').addEventListener('click', () => attendeeListDialog.close());
  attendeeListDialog.addEventListener('click', (event) => {
    if (event.target === attendeeListDialog) attendeeListDialog.close();
  });
  attendeeListDialog.addEventListener('close', () => {
    if (attendeeListOpener?.isConnected) attendeeListOpener.focus({ preventScroll: true });
    attendeeListOpener = null;
    currentAttendeeExport = null;
  });
  return attendeeListDialog;
}

function csvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  const safe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportAttendeesCsv() {
  if (!currentAttendeeExport) return;
  const rows = [
    ['Name', 'Contact Email', 'Party Size', 'Note', 'Updated At'],
    ...currentAttendeeExport.attendees.map((row) => [
      row.attendeeName, row.contactEmail, row.partySize, row.note, row.updatedAt
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cgb-watch-party-rsvps-${currentAttendeeExport.watchPartyId}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderAttendeeList(data) {
  attendeeListContent.replaceChildren();
  const summary = document.createElement('p');
  summary.className = 'account-rsvp-attendee-summary';
  summary.textContent = `${data.responseCount} active RSVP ${data.responseCount === 1 ? 'response' : 'responses'} · ${data.expectedAttendance} expected`;
  attendeeListExport = document.createElement('button');
  attendeeListExport.type = 'button';
  attendeeListExport.className = 'secondary-button';
  attendeeListExport.textContent = 'Export CSV';
  attendeeListExport.disabled = data.attendees.length === 0;
  attendeeListExport.addEventListener('click', exportAttendeesCsv);
  const actions = document.createElement('div');
  actions.className = 'account-rsvp-attendee-actions';
  actions.append(attendeeListExport);
  attendeeListContent.append(summary, actions);

  if (!data.attendees.length) {
    const empty = document.createElement('p');
    empty.className = 'accounts-empty';
    empty.textContent = 'No active RSVPs yet.';
    attendeeListContent.append(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'account-rsvp-attendee-list';
  data.attendees.forEach((row) => {
    const item = document.createElement('article');
    item.className = 'account-rsvp-attendee';
    const name = document.createElement('strong');
    name.textContent = row.attendeeName;
    const party = document.createElement('span');
    party.textContent = `Party of ${row.partySize}`;
    const updated = document.createElement('time');
    updated.dateTime = row.updatedAt;
    updated.textContent = new Date(row.updatedAt).toLocaleString();
    item.append(name);
    if (row.contactEmail) {
      const email = document.createElement('a');
      email.href = `mailto:${row.contactEmail}`;
      email.textContent = row.contactEmail;
      item.append(email);
    }
    item.append(party);
    if (row.note) {
      const note = document.createElement('p');
      note.textContent = row.note;
      item.append(note);
    }
    item.append(updated);
    list.append(item);
  });
  attendeeListContent.append(list);
}

async function openAttendeeList(watchPartyId, opener) {
  ensureAttendeeListDialog();
  attendeeListOpener = opener || null;
  attendeeListTitle.textContent = 'RSVP attendees';
  attendeeListContent.textContent = 'Loading attendee list…';
  attendeeListDialog.showModal();
  try {
    const response = await window.CGBAccounts.request('getFanWatchPartyRsvpAttendees', { watchPartyId });
    if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
    const validated = validateFanWatchPartyRsvpAttendeesResponse(response);
    if (!validated) throw new Error('fan_backend_unavailable');
    currentAttendeeExport = validated;
    renderAttendeeList(validated);
    attendeeListDialog.querySelector('.account-contribution-close')?.focus();
  } catch (error) {
    attendeeListContent.textContent = fanErrorCopy(error?.message);
  }
}

async function openManagement() {
  managementOpened = true;
  signedIn = window.CGBAccounts?.isSignedIn?.() === true;
  if (!signedIn) return false;
  ensureManagementSection();
  await loadOwnRsvps();
  await loadManagement();
  return true;
}

function handleAccountState(event) {
  signedIn = event?.detail?.signedIn === true;
  if (!signedIn) {
    ownLoadedAt = 0;
    ownRsvps = new Map();
    managedWatchParties = [];
    managementOpened = false;
    if (managementSection) managementSection.hidden = true;
    if (attendeeDialog?.open) attendeeDialog.close();
    if (attendeeListDialog?.open) attendeeListDialog.close();
    syncPartyModules();
    dispatchRsvpState();
    return;
  }

  void loadOwnRsvps({ force: true }).then(() => {
    const watchPartyId = pendingWatchPartyId;
    if (!watchPartyId) return;
    pendingWatchPartyId = '';
    window.CGBMyCgbSurface?.close?.();
    window.setTimeout(() => {
      if (!renderRsvpForm(watchPartyId)) return;
      attendeeDialog.showModal();
      attendeeForm.querySelector('input, textarea')?.focus();
    }, 0);
  });
  if (managementOpened) void loadManagement({ force: true });
}

function handleRendered() {
  syncPartyModules();
}

function initializeWatchPartyRsvp() {
  injectRsvpStyles();
  signedIn = window.CGBAccounts?.isSignedIn?.() === true;
  window.addEventListener('cgb:account-state', handleAccountState);
  window.CGBApp?.subscribe?.('rendered', handleRendered);
  window.CGBApp?.subscribe?.('ready', handleRendered);
  syncPartyModules();
  if (signedIn) void loadOwnRsvps();
}

window.CGBWatchPartyRsvp = Object.freeze({
  open: openRsvp,
  openManagement,
  hasActiveForVenueGame(gameId, venueId) {
    const active = ownRsvpForGame(clean(gameId));
    return Boolean(active && active.venueId === clean(venueId));
  },
  confirmAttendanceChange,
  reconcileAttendanceChange,
  refreshOwn: () => loadOwnRsvps({ force: true })
});

initializeWatchPartyRsvp();
