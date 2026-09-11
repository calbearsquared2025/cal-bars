import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import {
  accountsConfigIsReady,
  fanErrorCopy,
  validateFanContributionResponse
} from './accounts-core.mjs';

let dialog = null;
let form = null;
let title = null;
let contextCopy = null;
let signedIn = false;
let submitting = false;
let currentMode = '';
let currentContext = null;
let currentRequestId = '';

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function clean(value) {
  return String(value ?? '').trim();
}

function injectStyles() {
  if (document.querySelector('link[data-cgb-account-contributions-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-contributions.css';
  link.dataset.cgbAccountContributionsStyle = 'true';
  document.head.append(link);
}

function makeRequestId() {
  if (globalThis.crypto?.randomUUID) return `req_${crypto.randomUUID().replace(/-/g, '')}`;
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `req_${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  }
  throw new Error('fan_backend_unavailable');
}

function selectedContext() {
  const state = window.CGBApp?.getState?.();
  const venue = state?.snapshot?.venues?.find((item) => clean(item?.venue_id) === clean(state?.selectedVenueId));
  const game = state?.snapshot?.games?.find((item) => clean(item?.game_id) === clean(state?.gameId));
  if (!venue) return null;
  return Object.freeze({
    venueId: clean(venue.venue_id),
    venueName: clean(venue.name),
    gameId: clean(game?.game_id),
    opponentName: clean(game?.opponent_name),
    gameStatus: clean(game?.game_status)
  });
}

function buildDialog() {
  const element = document.createElement('dialog');
  element.id = 'cgb-account-contribution-dialog';
  element.className = 'account-contribution-dialog';
  element.setAttribute('aria-labelledby', 'cgb-account-contribution-title');
  element.innerHTML = `
    <div class="account-contribution-shell">
      <header class="account-contribution-header">
        <div>
          <span class="eyebrow">My CGB</span>
          <h2 id="cgb-account-contribution-title"></h2>
          <p class="account-contribution-context"></p>
        </div>
        <button class="icon-button account-contribution-close" type="button" aria-label="Close">×</button>
      </header>
      <form class="account-contribution-form"></form>
    </div>`;
  document.body.append(element);
  element.querySelector('.account-contribution-close').addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return element;
}

function ensureDialog() {
  if (dialog) return dialog;
  injectStyles();
  dialog = buildDialog();
  form = dialog.querySelector('.account-contribution-form');
  title = dialog.querySelector('#cgb-account-contribution-title');
  contextCopy = dialog.querySelector('.account-contribution-context');
  form.addEventListener('submit', handleSubmit);
  return dialog;
}

function field(label, control, hint = '') {
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

function input(name, { required = false, maxLength = 0, type = 'text', placeholder = '' } = {}) {
  const control = document.createElement('input');
  control.name = name;
  control.type = type;
  control.required = required;
  if (maxLength) control.maxLength = maxLength;
  if (placeholder) control.placeholder = placeholder;
  return control;
}

function textarea(name, { required = false, maxLength = 0, rows = 3, placeholder = '' } = {}) {
  const control = document.createElement('textarea');
  control.name = name;
  control.required = required;
  control.rows = rows;
  if (maxLength) control.maxLength = maxLength;
  if (placeholder) control.placeholder = placeholder;
  return control;
}

function select(name, choices) {
  const control = document.createElement('select');
  control.name = name;
  choices.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    control.append(option);
  });
  return control;
}

function submitButton(label) {
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'primary-button account-contribution-submit';
  button.textContent = label;
  return button;
}

function renderFanExperience(context) {
  currentMode = 'fanExperience';
  currentContext = context;
  currentRequestId = makeRequestId();
  title.textContent = 'Share your Cal game experience';
  contextCopy.textContent = context.venueName;
  form.replaceChildren();

  const text = textarea('text', {
    required: true,
    maxLength: 500,
    rows: 5,
    placeholder: 'What should other Bears know about watching a Cal game here?'
  });
  const displayName = input('displayName', { maxLength: 60, placeholder: 'Optional' });
  displayName.value = window.CGBAccounts?.getProfile?.()?.displayName || '';
  const privacy = document.createElement('p');
  privacy.className = 'account-contribution-note';
  privacy.textContent = 'Your CGB account stays private. Only the experience and optional display name can appear publicly after moderation.';
  form.append(
    field('Your experience', text),
    field('Name to display', displayName, 'Optional. Clear this to publish anonymously.'),
    privacy,
    submitButton('Share experience')
  );
}

function checkbox(name, value, label, { checked = false } = {}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'account-contribution-check';
  const control = document.createElement('input');
  control.type = 'checkbox';
  control.name = name;
  control.value = value;
  control.checked = checked;
  const copy = document.createElement('span');
  copy.textContent = label;
  wrapper.append(control, copy);
  return wrapper;
}

function renderWatchParty(context) {
  currentMode = 'watchParty';
  currentContext = context;
  currentRequestId = makeRequestId();
  title.textContent = 'Add a Watch Party';
  contextCopy.textContent = `${context.venueName}${context.opponentName ? ` · ${context.opponentName}` : ''}`;
  form.replaceChildren();

  const organizerName = input('organizerName', { required: true, maxLength: 180 });
  organizerName.value = window.CGBAccounts?.getProfile?.()?.displayName || '';
  const organizerType = select('organizerType', [
    ['individual', 'Individual or group of fans'],
    ['alumni_group', 'Alumni group'],
    ['venue', 'Venue'],
    ['other_organization', 'Other organization'],
    ['unknown', 'Not sure']
  ]);
  const submitterRelationship = select('submitterRelationship', [
    ['', 'Choose one'],
    ['organizer', 'I’m organizing/hosting this'],
    ['representative', 'I represent the organization or venue hosting this'],
    ['sharer', 'I’m sharing someone else’s event']
  ]);
  submitterRelationship.required = true;
  const officialEventUrl = input('officialEventUrl', { type: 'url', maxLength: 2048, placeholder: 'https://…' });
  const eventStart = input('eventStart', { maxLength: 240, placeholder: '4:30 PM PT' });
  const agePolicy = select('agePolicy', [
    ['unknown', 'Age restrictions unknown'],
    ['all_ages', 'All ages'],
    ['21_plus', '21+']
  ]);
  const soundStatus = select('soundStatus', [
    ['unknown', 'Game audio unknown'],
    ['confirmed_on', 'Game audio on'],
    ['confirmed_off', 'Game audio off']
  ]);
  const restrictionsNote = textarea('restrictionsNote', { maxLength: 1200, rows: 2, placeholder: 'Reservation or restriction details (optional)' });
  const gameDayNote = textarea('gameDayNote', { maxLength: 1200, rows: 3, placeholder: 'Anything else Bears should know? (optional)' });
  const tags = document.createElement('fieldset');
  tags.className = 'account-contribution-tags';
  const legend = document.createElement('legend');
  legend.textContent = 'Event details';
  tags.append(
    legend,
    checkbox('featureTags', 'rsvp_requested', 'RSVP requested'),
    checkbox('featureTags', 'cal_specials', 'Cal specials')
  );
  const attendance = checkbox('watchHere', 'yes', 'I’m watching here too');
  attendance.classList.add('account-contribution-attendance');
  const privacy = document.createElement('p');
  privacy.className = 'account-contribution-note';
  privacy.textContent = 'Your account association stays private. If you’re organizing this or represent the host, CGB privately records you as the Watch Party owner. Sharing someone else’s event does not grant management access.';
  form.append(
    field('Organizer or host name', organizerName),
    field('Who is organizing it?', organizerType),
    field('Your relationship to the Watch Party', submitterRelationship),
    field('Official event or RSVP link', officialEventUrl, 'Optional'),
    field('Event start or suggested arrival time', eventStart, 'Optional. Include a timezone, such as 4:30 PM PT.'),
    field('Age policy', agePolicy),
    field('Game audio', soundStatus),
    tags,
    field('Reservation or restriction information', restrictionsNote),
    field('Game-day details', gameDayNote),
    attendance,
    privacy,
    submitButton('Publish Watch Party')
  );
}

function openNative(mode) {
  const context = selectedContext();
  if (!context) return false;
  const surface = ensureDialog();
  if (mode === 'watchParty') {
    if (!context.gameId || context.gameStatus !== 'upcoming') return false;
    renderWatchParty(context);
  } else {
    renderFanExperience(context);
  }
  surface.showModal();
  form.querySelector('textarea, input, select')?.focus();
  return true;
}

function selectedFeatureTags(data) {
  return data.getAll('featureTags').map(clean).filter(Boolean);
}

async function requestContribution(action, extra) {
  const response = await window.CGBAccounts?.request?.(action, extra);
  if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
  const validated = validateFanContributionResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  return validated;
}

async function markAttendanceIfRequested(data, context) {
  if (clean(data.get('watchHere')) !== 'yes') return true;
  try {
    return await window.CGBFanIntent?.ensureAttendance?.(context.venueId, context.gameId) !== false;
  } catch (_) {
    return false;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (submitting || !currentContext || !currentRequestId || !signedIn) return;
  const data = new FormData(form);
  const button = form.querySelector('.account-contribution-submit');
  const context = currentContext;
  submitting = true;
  if (button) {
    button.disabled = true;
    button.textContent = 'Saving…';
  }
  try {
    let result;
    if (currentMode === 'fanExperience') {
      result = await requestContribution('submitFanExperience', {
        clientRequestId: currentRequestId,
        venueId: context.venueId,
        text: clean(data.get('text')),
        displayName: clean(data.get('displayName'))
      });
    } else {
      result = await requestContribution('submitFanWatchParty', {
        clientRequestId: currentRequestId,
        venueId: context.venueId,
        gameId: context.gameId,
        organizerName: clean(data.get('organizerName')),
        organizerType: clean(data.get('organizerType')),
        submitterRelationship: clean(data.get('submitterRelationship')),
        officialEventUrl: clean(data.get('officialEventUrl')),
        eventStart: clean(data.get('eventStart')),
        agePolicy: clean(data.get('agePolicy')),
        soundStatus: clean(data.get('soundStatus')),
        restrictionsNote: clean(data.get('restrictionsNote')),
        gameDayNote: clean(data.get('gameDayNote')),
        featureTags: selectedFeatureTags(data)
      });
    }

    const attendanceUpdated = result.contributionType === 'watch_party'
      ? await markAttendanceIfRequested(data, context)
      : true;
    dialog.close();
    currentRequestId = '';
    if (result.contributionType === 'fan_experience') {
      window.CGBApp?.showStatus?.(
        result.status === 'published' ? 'Experience shared.' : 'Experience submitted for review.',
        4500
      );
    } else {
      window.CGBApp?.showStatus?.(
        attendanceUpdated ? 'Watch Party added.' : 'Watch Party added. Attendance was not updated.',
        5000
      );
    }
    await window.CGBSnapshotRefresh?.refresh?.().catch?.(() => null);
    await window.CGBAccountHistory?.refresh?.().catch?.(() => null);
  } catch (error) {
    window.CGBApp?.showStatus?.(fanErrorCopy(error?.message), 5000);
  } finally {
    submitting = false;
    if (button) {
      button.disabled = false;
      button.textContent = currentMode === 'fanExperience' ? 'Share experience' : 'Publish Watch Party';
    }
  }
}

function handleClick(event) {
  if (!enabled() || !signedIn || !window.CGBAccounts?.isSignedIn?.()) return;
  const experience = event.target.closest('.detail-fan-experiences__share');
  const watchParty = event.target.closest('[data-watch-party-form-entry-point]');
  if (!experience && !watchParty) return;
  if (!openNative(watchParty ? 'watchParty' : 'fanExperience')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function handleAccountState(event) {
  signedIn = event?.detail?.signedIn === true;
  if (!signedIn && dialog?.open) dialog.close();
}

function initializeAccountContributions() {
  if (!enabled()) return false;
  signedIn = window.CGBAccounts?.isSignedIn?.() === true;
  window.addEventListener('cgb:account-state', handleAccountState);
  document.addEventListener('click', handleClick, true);
  return true;
}

window.CGBAccountContributions = Object.freeze({
  openFanExperience: () => signedIn && openNative('fanExperience'),
  openWatchParty: () => signedIn && openNative('watchParty')
});

initializeAccountContributions();
