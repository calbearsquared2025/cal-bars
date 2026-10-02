import { ACTIVE_INSTANCE_CONFIG } from './instance-config.mjs';
import { readRuntimeConfig } from './config.mjs';
import {
  fanErrorCopy,
  validateFanContributionResponse,
  validateFanManagedWatchPartyRsvpResponse
} from './accounts-core.mjs';
import {
  buildNativeWatchPartySubmission,
  publicWatchPartyErrorCopy,
  relationshipCanManageNewWatchParty,
  resolveNativeRsvpSetupState,
  validatePublicWatchPartySubmissionResponse
} from './watch-party-create-core.mjs';

const SIGN_IN_DRAFT_KEY = 'cgb:watch-party-create:signin-draft';

let dialog = null;
let form = null;
let currentContext = null;
let fallbackHref = '';
let currentRequestIds = new Map();
let submitting = false;
let accountHydrationPromise = null;
let pendingRsvpSignIn = false;

function clean(value) {
  return String(value ?? '').trim();
}

function makeRequestId() {
  if (globalThis.crypto?.randomUUID) return `req_${crypto.randomUUID().replace(/-/g, '')}`;
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `req_${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  }
  throw new Error('write_failed');
}

function requestIdForGame(gameId) {
  const key = clean(gameId);
  if (!currentRequestIds.has(key)) currentRequestIds.set(key, makeRequestId());
  return currentRequestIds.get(key);
}

function ensureStyle(href, marker) {
  if (document.querySelector(`link[${marker}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute(marker, 'true');
  document.head.append(link);
}

function ensureStyles() {
  ensureStyle(new URL('../css/accounts.css', import.meta.url).href, 'data-cgb-accounts-style');
  ensureStyle(new URL('../css/account-contributions.css', import.meta.url).href, 'data-cgb-account-contributions-style');
  ensureStyle(new URL('../css/watch-party-create.css', import.meta.url).href, 'data-cgb-watch-party-create-style');
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

function textarea(name, { maxLength = 0, rows = 3, placeholder = '' } = {}) {
  const control = document.createElement('textarea');
  control.name = name;
  control.rows = rows;
  if (maxLength) control.maxLength = maxLength;
  if (placeholder) control.placeholder = placeholder;
  return control;
}

function select(name, choices, { required = false } = {}) {
  const control = document.createElement('select');
  control.name = name;
  control.required = required;
  choices.forEach(([value, label], index) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (index === 0 && value === '') {
      option.disabled = true;
      option.selected = true;
    }
    control.append(option);
  });
  return control;
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

function radioChoice(name, value, label, { checked = false } = {}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'watch-party-create-choice';
  const control = document.createElement('input');
  control.type = 'radio';
  control.name = name;
  control.value = value;
  control.checked = checked;
  const copy = document.createElement('span');
  copy.textContent = label;
  wrapper.append(control, copy);
  return { wrapper, control };
}

function questionGroup(legendCopy, name, choices, selectedValue) {
  const group = document.createElement('fieldset');
  group.className = `watch-party-create-question watch-party-create-question--compact watch-party-create-question--${choices.length}`;
  const legend = document.createElement('legend');
  legend.textContent = legendCopy;
  group.append(legend);
  choices.forEach(([value, label]) => {
    group.append(radioChoice(name, value, label, { checked: value === selectedValue }).wrapper);
  });
  return group;
}

function buildDialog() {
  const element = document.createElement('dialog');
  element.id = 'cgb-watch-party-create-dialog';
  element.className = 'account-contribution-dialog watch-party-create-dialog';
  element.setAttribute('aria-labelledby', 'cgb-watch-party-create-title');
  element.innerHTML = `
    <div class="account-contribution-shell watch-party-create-shell">
      <header class="account-contribution-header watch-party-create-header">
        <div>
          <h2 id="cgb-watch-party-create-title">Add a Watch Party</h2>
          <p class="account-contribution-context"></p>
        </div>
        <button class="icon-button account-contribution-close" type="button" aria-label="Close">×</button>
      </header>
      <form class="account-contribution-form watch-party-create-form"></form>
    </div>`;
  document.body.append(element);
  element.querySelector('.account-contribution-close').addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  return element;
}

function signedInNow() {
  return window.CGBAccounts?.isSignedIn?.() === true;
}

function gameChoices(context) {
  const group = document.createElement('fieldset');
  group.className = 'watch-party-create-games';
  const legend = document.createElement('legend');
  legend.textContent = 'Which game or games will have a Watch Party here?';
  const helper = document.createElement('p');
  helper.className = 'watch-party-create-helper';
  helper.textContent = 'Select every upcoming game that applies. The game you were viewing is already selected.';
  const error = document.createElement('p');
  error.className = 'watch-party-create-error';
  error.dataset.gameSelectionError = 'true';
  error.hidden = true;
  error.textContent = 'Select at least one game.';
  group.append(legend, helper, error);

  const games = Array.isArray(context.availableGames) && context.availableGames.length
    ? context.availableGames
    : [{ gameId: context.gameId, gameLabel: context.gameLabel }];
  games.forEach((game) => {
    group.append(checkbox('gameIds', game.gameId, game.gameLabel, { checked: game.gameId === context.gameId }));
  });
  return group;
}

function attendanceChoice() {
  const wrapper = document.createElement('label');
  wrapper.className = 'watch-party-create-attendance';
  const control = document.createElement('input');
  control.type = 'checkbox';
  control.name = 'watchHere';
  control.value = 'yes';
  const copy = document.createElement('span');
  const title = document.createElement('strong');
  title.textContent = 'I’ll be here!';
  const helper = document.createElement('small');
  helper.dataset.attendanceHelper = 'true';
  helper.textContent = 'Add me to the Bear count for the selected game.';
  copy.append(title, helper);
  wrapper.append(control, copy);
  return wrapper;
}

function captureDraft() {
  if (!form || !currentContext) return null;
  const data = new FormData(form);
  return {
    venueId: currentContext.venueId,
    gameIds: data.getAll('gameIds').map(clean).filter(Boolean),
    organizerName: clean(data.get('organizerName')),
    organizerType: clean(data.get('organizerType')),
    submitterRelationship: clean(data.get('submitterRelationship')),
    agePolicy: clean(data.get('agePolicy')),
    soundStatus: clean(data.get('soundStatus')),
    gameDayNote: clean(data.get('gameDayNote')),
    gameDaySpecials: clean(data.get('gameDaySpecials')) || 'no',
    rsvpMode: clean(data.get('rsvpMode')) || 'none',
    officialEventUrl: clean(data.get('officialEventUrl')),
    watchHere: clean(data.get('watchHere')) === 'yes',
    returnToRsvp: true
  };
}

function saveSignInDraft() {
  try {
    const draft = captureDraft();
    if (draft) window.sessionStorage.setItem(SIGN_IN_DRAFT_KEY, JSON.stringify(draft));
  } catch (_) {}
}

function readSignInDraft() {
  try {
    const raw = window.sessionStorage.getItem(SIGN_IN_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && draft.venueId === currentContext?.venueId ? draft : null;
  } catch (_) {
    return null;
  }
}

function clearSignInDraft() {
  try { window.sessionStorage.removeItem(SIGN_IN_DRAFT_KEY); } catch (_) {}
}

function applyDraft(draft) {
  if (!draft || !form) return;
  const setValue = (name, value) => {
    const control = form.elements.namedItem(name);
    if (control && 'value' in control) control.value = value ?? '';
  };
  setValue('organizerName', draft.organizerName);
  setValue('organizerType', draft.organizerType);
  setValue('submitterRelationship', draft.submitterRelationship);
  setValue('gameDayNote', draft.gameDayNote);
  setValue('officialEventUrl', draft.officialEventUrl);

  form.querySelectorAll('input[name="gameIds"]').forEach((control) => {
    control.checked = (draft.gameIds || []).includes(control.value);
  });
  form.querySelectorAll('input[name="agePolicy"]').forEach((control) => {
    control.checked = control.value === (draft.agePolicy || 'unknown');
  });
  form.querySelectorAll('input[name="soundStatus"]').forEach((control) => {
    control.checked = control.value === (draft.soundStatus || 'unknown');
  });
  form.querySelectorAll('input[name="rsvpMode"]').forEach((control) => {
    control.checked = control.value === (draft.rsvpMode || 'none');
  });
  form.querySelectorAll('input[name="gameDaySpecials"]').forEach((control) => {
    control.checked = control.value === (draft.gameDaySpecials || 'no');
  });
  const watchHere = form.elements.namedItem('watchHere');
  if (watchHere) watchHere.checked = draft.watchHere === true;
}

function selectedGameContexts(data) {
  const selectedIds = new Set(data.getAll('gameIds').map(clean).filter(Boolean));
  const games = Array.isArray(currentContext?.availableGames) && currentContext.availableGames.length
    ? currentContext.availableGames
    : [{ gameId: currentContext?.gameId, gameLabel: currentContext?.gameLabel }];
  return games
    .filter((game) => selectedIds.has(clean(game.gameId)))
    .map((game) => Object.freeze({
      venueId: currentContext.venueId,
      venueName: currentContext.venueName,
      gameId: clean(game.gameId),
      gameLabel: clean(game.gameLabel)
    }));
}

function updateGameSelectionState() {
  if (!form) return;
  const count = form.querySelectorAll('input[name="gameIds"]:checked').length;
  const error = form.querySelector('[data-game-selection-error]');
  if (error) error.hidden = count > 0;
  const button = form.querySelector('.account-contribution-submit');
  if (button && !submitting) button.textContent = count > 1 ? 'Publish Watch Parties' : 'Publish Watch Party';
  const helper = form.querySelector('[data-attendance-helper]');
  if (helper) {
    helper.textContent = count > 1
      ? 'Add me to the Bear count for the selected games.'
      : 'Add me to the Bear count for the selected game.';
  }
}

function updateRsvpState() {
  if (!form) return;
  const relationship = clean(form.elements.submitterRelationship?.value);
  const state = resolveNativeRsvpSetupState({
    signedIn: signedInNow(),
    relationship,
    productName: ACTIVE_INSTANCE_CONFIG.identity.productName
  });
  const nativeControl = form.querySelector('input[name="rsvpMode"][value="native"]');
  const noneControl = form.querySelector('input[name="rsvpMode"][value="none"]');
  const externalControl = form.querySelector('input[name="rsvpMode"][value="external"]');
  const explanation = form.querySelector('[data-native-rsvp-explanation]');
  const signIn = form.querySelector('[data-watch-party-sign-in]');
  if (nativeControl) {
    nativeControl.disabled = !state.eligible;
    if (!state.eligible && nativeControl.checked && noneControl) noneControl.checked = true;
  }
  if (explanation) explanation.textContent = state.explanation;
  if (signIn) signIn.hidden = signedInNow();

  const externalSelected = externalControl?.checked === true;
  const link = form.elements.officialEventUrl;
  const linkField = form.querySelector('[data-rsvp-link-field]');
  if (link) link.required = externalSelected;
  if (linkField) {
    const label = linkField.querySelector('.account-contribution-label');
    if (label) label.textContent = externalSelected ? 'External RSVP link' : 'Official event link (optional)';
  }
}

async function beginRsvpSignIn(event) {
  event.preventDefault();
  if (signedInNow()) {
    updateRsvpState();
    return;
  }
  saveSignInDraft();
  pendingRsvpSignIn = true;
  if (dialog?.open) dialog.close();
  try {
    const activated = await window.CGBMyCgbPromo?.activate?.({ signIn: true, opener: event.currentTarget });
    if (activated === false) throw new Error('accounts_surface_unavailable');
  } catch (_) {
    pendingRsvpSignIn = false;
    if (dialog && !dialog.open) dialog.showModal();
    window.CGBApp?.showStatus?.('Could not open sign in. Try again.', 5000);
  }
}

function renderForm(context) {
  const organizerName = input('organizerName', { required: true, maxLength: 180 });
  const organizerType = select('organizerType', [
    ['', 'Choose one'],
    ['individual', 'Individual or group of fans'],
    ['alumni_group', 'Alumni group'],
    ['venue', 'Venue'],
    ['other_organization', 'Other organization'],
    ['unknown', 'Not sure']
  ], { required: true });
  const relationship = select('submitterRelationship', [
    ['', 'Choose one'],
    ['organizer', 'I’m the organizer or authorized representative'],
    ['sharer', 'I’m sharing someone else’s event']
  ], { required: true });
  relationship.addEventListener('change', () => { updateRsvpState(); updateAuthorityCopy(); });

  const gameDayNote = textarea('gameDayNote', {
    maxLength: 1200,
    rows: 3,
    placeholder: 'Tell fans about this Watch Party. Any details provided will be displayed in the listing on Cal Golden Bars.'
  });

  const organizer = document.createElement('fieldset');
  organizer.className = 'watch-party-create-organizer';
  const organizerLegend = document.createElement('legend');
  organizerLegend.textContent = 'Organizer';
  organizer.append(
    organizerLegend,
    field('Organizer type', organizerType),
    field('Organizer name', organizerName),
    field('What is your relationship to this Watch Party?', relationship)
  );

  const details = document.createElement('fieldset');
  details.className = 'watch-party-create-details';
  const detailsLegend = document.createElement('legend');
  detailsLegend.textContent = 'Watch Party details';
  details.append(
    detailsLegend,
    questionGroup('Are there age restrictions?', 'agePolicy', [
      ['all_ages', 'All ages'],
      ['21_plus', '21+'],
      ['unknown', 'Not sure']
    ], 'unknown'),
    questionGroup('Will the game audio be on?', 'soundStatus', [
      ['confirmed_on', 'Yes'],
      ['confirmed_off', 'No'],
      ['unknown', 'Not sure']
    ], 'unknown'),
    questionGroup('Are there game-day specials?', 'gameDaySpecials', [
      ['yes', 'Yes'],
      ['no', 'No']
    ], 'no'),
    field('What else should fans know?', gameDayNote)
  );

  const rsvp = document.createElement('fieldset');
  rsvp.className = 'watch-party-create-rsvp';
  const rsvpLegend = document.createElement('legend');
  rsvpLegend.textContent = 'RSVP';
  const rsvpQuestion = document.createElement('p');
  rsvpQuestion.className = 'watch-party-create-question-copy';
  rsvpQuestion.textContent = 'Do people need to RSVP?';
  const noRsvp = radioChoice('rsvpMode', 'none', 'No, RSVPs are not required', { checked: true });
  const nativeRsvp = radioChoice(
    'rsvpMode',
    'native',
    `Yes, collect RSVPs through ${ACTIVE_INSTANCE_CONFIG.identity.productName} [BETA]`
  );
  const externalRsvp = radioChoice('rsvpMode', 'external', 'Yes, RSVPs are handled through an external service (link below)');
  [noRsvp.control, nativeRsvp.control, externalRsvp.control].forEach((control) => {
    control.addEventListener('change', updateRsvpState);
  });

  const nativeHelp = document.createElement('div');
  nativeHelp.className = 'watch-party-create-native-rsvp-help';
  const explanation = document.createElement('p');
  explanation.className = 'account-contribution-note';
  explanation.dataset.nativeRsvpExplanation = 'true';
  const signIn = document.createElement('button');
  signIn.type = 'button';
  signIn.className = 'text-button watch-party-create-sign-in';
  signIn.dataset.watchPartySignIn = 'true';
  signIn.textContent = `Sign in to use ${ACTIVE_INSTANCE_CONFIG.identity.productName} RSVPs`;
  signIn.addEventListener('click', beginRsvpSignIn);
  nativeHelp.append(explanation, signIn);

  const officialEventUrl = input('officialEventUrl', { type: 'url', maxLength: 2048, placeholder: 'https://…' });
  const rsvpLinkField = field('Official event link (optional)', officialEventUrl);
  rsvpLinkField.dataset.rsvpLinkField = 'true';
  rsvp.append(
    rsvpLegend,
    rsvpQuestion,
    noRsvp.wrapper,
    nativeRsvp.wrapper,
    nativeHelp,
    externalRsvp.wrapper,
    rsvpLinkField
  );

  const authority = document.createElement('p');
  authority.className = 'account-contribution-note watch-party-create-authority';
  authority.dataset.watchPartyAuthority = 'true';

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'primary-button account-contribution-submit';
  button.textContent = 'Publish Watch Party';

  const fallback = document.createElement('p');
  fallback.className = 'account-contribution-note watch-party-create-fallback';
  if (fallbackHref) {
    const link = document.createElement('a');
    link.href = fallbackHref;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Use the Google Form instead';
    fallback.append('Having trouble? ', link, '.');
  }

  form.replaceChildren(
    gameChoices(context),
    organizer,
    details,
    rsvp,
    attendanceChoice(),
    authority,
    button
  );
  if (fallbackHref) form.append(fallback);

  form.querySelectorAll('input[name="gameIds"]').forEach((control) => {
    control.addEventListener('change', updateGameSelectionState);
  });

  const draft = readSignInDraft();
  if (draft) {
    applyDraft(draft);
    if (draft.returnToRsvp && signedInNow()) {
      const native = form.querySelector('input[name="rsvpMode"][value="native"]');
      if (native) native.checked = true;
      clearSignInDraft();
    }
  }
  updateGameSelectionState();
  updateAuthorityCopy();
  updateRsvpState();
}

function updateAuthorityCopy() {
  if (!form) return;
  const authority = form.querySelector('[data-watch-party-authority]');
  if (!authority) return;
  const relationship = clean(form.elements.submitterRelationship?.value);
  authority.textContent = relationship === 'sharer'
    ? 'Sharing someone else’s event does not add it to your managed Watch Parties.'
    : 'Organizers can manage their Watch Parties in My CGB when logged in.';
}

function ensureDialog() {
  if (dialog) return dialog;
  ensureStyles();
  dialog = buildDialog();
  form = dialog.querySelector('form');
  form.addEventListener('submit', handleSubmit);
  window.addEventListener('cgb:account-state', (event) => {
    const signedIn = event?.detail?.signedIn === true || signedInNow();
    if (pendingRsvpSignIn && signedIn) {
      pendingRsvpSignIn = false;
      window.CGBMyCgbSurface?.close?.();
      window.CGBMyCgbPromo?.close?.();
      if (!dialog.open) dialog.showModal();
      const native = form?.querySelector('input[name="rsvpMode"][value="native"]');
      if (native) native.checked = true;
      clearSignInDraft();
      updateAuthorityCopy();
      updateRsvpState();
      window.requestAnimationFrame(() => {
        form?.querySelector('.watch-party-create-rsvp')?.scrollIntoView({ block: 'center' });
      });
      return;
    }
    if (!dialog?.open) return;
    updateAuthorityCopy();
    updateRsvpState();
  });
  return dialog;
}

async function postPublicWatchParty(payload) {
  const endpoint = readRuntimeConfig({ documentObject: document, windowObject: window }).dataEndpoint;
  if (!endpoint) throw new Error('not_configured');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await window.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action: 'submitPublicWatchParty', ...payload }),
      cache: 'no-store',
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) throw new Error(body?.error || 'write_failed');
    const validated = validatePublicWatchPartySubmissionResponse(body);
    if (!validated) throw new Error('write_failed');
    return validated;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function submitSignedIn(payload) {
  const response = await window.CGBAccounts?.request?.('submitFanWatchParty', payload);
  if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
  const validated = validateFanContributionResponse(response);
  if (!validated || validated.contributionType !== 'watch_party') throw new Error('fan_backend_unavailable');
  return validated;
}

async function enableNativeRsvp(watchPartyId) {
  const response = await window.CGBAccounts?.request?.('setFanWatchPartyRsvpEnabled', {
    watchPartyId,
    enabled: true
  });
  if (!response?.ok) throw new Error(response?.error || 'fan_backend_unavailable');
  const validated = validateFanManagedWatchPartyRsvpResponse(response);
  if (!validated) throw new Error('fan_backend_unavailable');
  const row = validated.managedWatchParties.find((item) => item.watchPartyId === watchPartyId);
  if (!row?.rsvpEnabled) throw new Error('fan_backend_unavailable');
  return true;
}

async function markAttendanceIfRequested(data, contexts) {
  if (clean(data.get('watchHere')) !== 'yes') return true;
  let allUpdated = true;
  for (const context of contexts) {
    try {
      const updated = await window.CGBFanIntent?.ensureAttendance?.(context.venueId, context.gameId);
      if (updated === false) allUpdated = false;
    } catch (_) {
      allUpdated = false;
    }
  }
  return allUpdated;
}

function formValues(data) {
  return {
    organizerName: clean(data.get('organizerName')),
    organizerType: clean(data.get('organizerType')),
    submitterRelationship: clean(data.get('submitterRelationship')),
    officialEventUrl: clean(data.get('officialEventUrl')),
    eventStart: '',
    agePolicy: clean(data.get('agePolicy')),
    soundStatus: clean(data.get('soundStatus')),
    restrictionsNote: '',
    gameDayNote: clean(data.get('gameDayNote')),
    featureTags: clean(data.get('gameDaySpecials')) === 'yes' ? ['cal_specials'] : []
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  if (submitting || !currentContext) return;

  const data = new FormData(form);
  const contexts = selectedGameContexts(data);
  if (!contexts.length) {
    updateGameSelectionState();
    const error = form.querySelector('[data-game-selection-error]');
    error?.scrollIntoView?.({ block: 'center' });
    form.querySelector('input[name="gameIds"]')?.focus?.();
    return;
  }
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const button = form.querySelector('.account-contribution-submit');
  submitting = true;
  button.disabled = true;
  button.textContent = contexts.length > 1 ? 'Publishing…' : 'Publishing…';

  let signedIn = false;
  const created = [];
  let rsvpEnableFailed = false;
  try {
    await accountHydrationPromise;
    signedIn = signedInNow();

    const relationship = clean(data.get('submitterRelationship'));
    const rsvpMode = clean(data.get('rsvpMode')) || 'none';
    const requestedNativeRsvp = rsvpMode === 'native';
    if (requestedNativeRsvp && (!signedIn || !relationshipCanManageNewWatchParty(relationship))) {
      updateRsvpState();
      window.CGBApp?.showStatus?.('Sign in as the organizer to use CGB RSVPs.', 6000);
      return;
    }

    for (const context of contexts) {
      const payload = buildNativeWatchPartySubmission({
        clientRequestId: requestIdForGame(context.gameId),
        context,
        values: formValues(data),
        nativeRsvpEnabled: requestedNativeRsvp,
        rsvpMode
      });
      const result = signedIn ? await submitSignedIn(payload) : await postPublicWatchParty(payload);
      const watchPartyId = signedIn ? result.relatedRecordId : result.watchPartyId;
      created.push({ watchPartyId, context });
      if (requestedNativeRsvp) {
        try {
          await enableNativeRsvp(watchPartyId);
        } catch (_) {
          rsvpEnableFailed = true;
        }
      }
    }

    const attendanceUpdated = await markAttendanceIfRequested(data, contexts);
    dialog.close();
    clearSignInDraft();
    currentRequestIds = new Map();

    let message = created.length > 1 ? 'Watch Parties added.' : 'Watch Party added.';
    if (rsvpEnableFailed) {
      message += ' RSVP collection could not be enabled for one or more Watch Parties; open My CGB to try again.';
    } else if (!attendanceUpdated) {
      message += ' Attendance was not updated for every selected game.';
    }
    window.CGBApp?.showStatus?.(message, rsvpEnableFailed ? 7000 : 5000);
    await window.CGBSnapshotRefresh?.refresh?.().catch?.(() => null);
    await window.CGBAccountHistory?.refresh?.().catch?.(() => null);
    created.forEach(({ watchPartyId, context }) => {
      window.dispatchEvent(new CustomEvent('cgb:watch-party-created', {
        detail: {
          watchPartyId,
          gameId: context.gameId,
          signedIn,
          nativeRsvpEnabled: requestedNativeRsvp && !rsvpEnableFailed
        }
      }));
    });
  } catch (error) {
    const base = signedIn ? fanErrorCopy(error?.message) : publicWatchPartyErrorCopy(error?.message);
    const message = created.length
      ? `${base} ${created.length === 1 ? '1 Watch Party' : `${created.length} Watch Parties`} already published; retrying will not duplicate them.`
      : base;
    window.CGBApp?.showStatus?.(message, 7000);
  } finally {
    submitting = false;
    button.disabled = false;
    updateGameSelectionState();
  }
}

async function hydrateAccountState() {
  try {
    if (window.CGBAccountsLoader?.load && !window.CGBAccountsLoader.isLoaded?.()) {
      await window.CGBAccountsLoader.load('watch-party-form');
    }
    await window.CGBAccounts?.whenReady?.();
  } catch (_) {
    // The public form remains usable even when account services fail to load.
  }
  if (!dialog?.open) return;
  updateAuthorityCopy();
  updateRsvpState();
}

export function openNativeWatchPartyForm({ context, fallbackUrl = '' } = {}) {
  if (!context?.venueId || !context?.gameId || !context?.venueName) return false;
  currentContext = Object.freeze({ ...context });
  fallbackHref = clean(fallbackUrl);
  currentRequestIds = new Map();
  if (!pendingRsvpSignIn) clearSignInDraft();
  const surface = ensureDialog();
  surface.querySelector('.account-contribution-context').textContent = context.venueName;
  renderForm(currentContext);
  surface.showModal();
  const target = form.querySelector('input[name="gameIds"]:checked, input:not([readonly]), select, textarea');
  target?.focus?.({ preventScroll: true });
  accountHydrationPromise = hydrateAccountState();
  return true;
}

window.CGBWatchPartyCreate = Object.freeze({ open: openNativeWatchPartyForm });
