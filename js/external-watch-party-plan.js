import { buildCommittedExternalVenueWatchPartyUrl } from './external-watch-party-cta-core.mjs';
import { INTENT_SELECTIONS_STORAGE_KEY } from './fan-intent-core.mjs';
import { createExternalVenueWithoutAttendance } from './external-venue-contribution.js';
import {
  beginExternalWatchPartyPlan,
  resolveExternalWatchPartyPlan,
  selectionsAfterExternalWatchPartyPlan
} from './external-watch-party-plan-core.mjs';
import {
  WATCH_PARTY_ATTENDANCE_CHOICES,
  closeWaitingFormWindow,
  navigateWaitingFormWindow,
  requestWatchPartyAttendance
} from './watch-party-attendance-handoff.mjs';
import { readFormConfig } from './config.mjs';

const BUTTON_ID = 'external-venue-plan-watch-party';
const ADD_ONLY_BUTTON_ID = 'external-venue-add-only';
const RETRY_SELECTOR = '[data-external-watch-party-form-retry]';
const STYLE_HREF = 'css/external-watch-party-plan.css';
let pendingPlan = null;
let pendingWindow = null;

function readConfig(documentObject = document) {
  return readFormConfig('watchParty', documentObject);
}

function ensureStylesheet(documentObject = document) {
  if (documentObject.querySelector(`link[href="${STYLE_HREF}"]`)) return;
  const link = documentObject.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  documentObject.head?.append(link);
}

function closeWaitingWindow() {
  closeWaitingFormWindow(pendingWindow);
  pendingWindow = null;
}

function showFormRetry(href, attending, documentObject = document) {
  documentObject.querySelector(RETRY_SELECTOR)?.remove();
  const card = documentObject.querySelector('#tray-selected .selected-card');
  if (!card || !href) return;

  const section = documentObject.createElement('section');
  section.className = 'external-watch-party-cta';
  section.dataset.externalWatchPartyFormRetry = 'true';

  const prompt = documentObject.createElement('p');
  prompt.textContent = attending
    ? 'Your location and attendance were saved. Open the Watch Party Form to continue.'
    : 'Your location was saved. Open the Watch Party Form to continue.';

  const link = documentObject.createElement('a');
  link.className = 'primary-button';
  link.dataset.cgbFormTitle = 'Add a Watch Party';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open Watch Party Form';

  section.append(prompt, link);
  card.append(section);
}

function navigateToForm(href, attending, documentObject, windowObject) {
  if (!href) return false;
  const embedded = windowObject.CGBGoogleFormHost?.open?.(href, {
    title: 'Add a Watch Party'
  });
  if (embedded) {
    closeWaitingWindow();
    return true;
  }
  const opened = navigateWaitingFormWindow(pendingWindow, href, windowObject);
  if (opened) {
    pendingWindow = null;
    return true;
  }
  showFormRetry(href, attending, documentObject);
  return false;
}

function persistCommittedSelection(state, committed, windowObject = window) {
  if (!state?.fanIntent || committed?.attending !== true) return false;
  const selections = selectionsAfterExternalWatchPartyPlan(
    state.fanIntent.selections,
    committed
  );
  state.fanIntent.selections = selections;
  try {
    windowObject.localStorage.setItem(
      INTENT_SELECTIONS_STORAGE_KEY,
      JSON.stringify(selections)
    );
  } catch (_) {}
  return selections[committed.gameId] === committed.venueId;
}

function syncExternalVenueActions({ app, documentObject = document } = {}) {
  const state = app?.getState?.();
  const pending = Boolean(state?.externalSearch?.pending);
  const addOnly = documentObject.querySelector(`#${ADD_ONLY_BUTTON_ID}`);
  const plan = documentObject.querySelector(`#${BUTTON_ID}`);
  const confirm = documentObject.querySelector('#external-venue-confirm');
  const cancel = documentObject.querySelector('#external-venue-cancel');
  const error = documentObject.querySelector('#external-venue-error');

  if (addOnly) {
    addOnly.disabled = pending;
    addOnly.textContent = pending ? 'Adding location…' : 'Add location only';
  }
  if (plan) plan.disabled = pending;
  if (confirm) confirm.disabled = pending;
  if (cancel) cancel.disabled = pending;

  const message = state?.externalSearch?.error || '';
  if (error && message) {
    error.textContent = message;
    error.hidden = false;
  }
}

function ensurePlanButton({ app, documentObject = document, windowObject = window } = {}) {
  const actions = documentObject.querySelector('.external-venue-actions');
  const confirm = documentObject.querySelector('#external-venue-confirm');
  const cancel = documentObject.querySelector('#external-venue-cancel');
  if (!actions || !confirm || !cancel || documentObject.querySelector(`#${BUTTON_ID}`)) return;

  const button = documentObject.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = 'secondary-button external-venue-plan-button';
  button.textContent = 'Add a Watch Party';
  actions.insertBefore(button, cancel);

  button.addEventListener('click', async () => {
    const state = app?.getState?.();
    const external = windowObject.CGBExternalVenueSearch?.getState?.();
    const selected = external?.retry || external?.selected;
    if (!selected || external?.pending) return;

    const handoff = await requestWatchPartyAttendance({
      documentObject,
      windowObject,
      reserveWindow: false
    });
    if (!handoff) return;

    const attending = handoff.choice === WATCH_PARTY_ATTENDANCE_CHOICES.attend;
    const plan = beginExternalWatchPartyPlan({
      selected,
      gameId: state?.gameId,
      attending
    });
    if (!plan) {
      closeWaitingFormWindow(handoff.windowRef);
      return;
    }

    pendingPlan = plan;
    pendingWindow = handoff.windowRef;

    if (attending) {
      confirm.click();
      return;
    }

    const venue = await createExternalVenueWithoutAttendance({
      selected,
      documentObject,
      windowObject
    });
    if (!venue && pendingPlan) {
      pendingPlan = null;
      closeWaitingWindow();
    }
  });
}

function ensureAddOnlyButton({ app, documentObject = document, windowObject = window } = {}) {
  const actions = documentObject.querySelector('.external-venue-actions');
  const cancel = documentObject.querySelector('#external-venue-cancel');
  if (!actions || !cancel || documentObject.querySelector(`#${ADD_ONLY_BUTTON_ID}`)) return;

  const button = documentObject.createElement('button');
  button.id = ADD_ONLY_BUTTON_ID;
  button.type = 'button';
  button.className = 'secondary-button external-venue-add-only-button';
  button.textContent = 'Add location only';

  const plan = documentObject.querySelector(`#${BUTTON_ID}`);
  actions.insertBefore(button, plan || cancel);

  button.addEventListener('click', async () => {
    const external = windowObject.CGBExternalVenueSearch?.getState?.();
    const selected = external?.retry || external?.selected;
    if (!selected || external?.pending) return;

    button.disabled = true;
    button.textContent = 'Adding location…';
    await createExternalVenueWithoutAttendance({
      selected,
      documentObject,
      windowObject
    });
    syncExternalVenueActions({ app, documentObject });
  });
}

export function initializeExternalWatchPartyPlan({
  app = window.CGBApp,
  documentObject = document,
  windowObject = window
} = {}) {
  ensureStylesheet(documentObject);
  ensurePlanButton({ app, documentObject, windowObject });
  ensureAddOnlyButton({ app, documentObject, windowObject });
  syncExternalVenueActions({ app, documentObject });
  if (!app?.subscribe) return;

  app.subscribe('rendered', () => {
    ensurePlanButton({ app, documentObject, windowObject });
    ensureAddOnlyButton({ app, documentObject, windowObject });
    syncExternalVenueActions({ app, documentObject });
    if (!pendingPlan) return;

    const state = app.getState?.();
    const resolution = resolveExternalWatchPartyPlan(pendingPlan, state);
    pendingPlan = resolution.pending;

    if (resolution.failed) {
      closeWaitingWindow();
      return;
    }
    if (!resolution.committed) return;

    if (resolution.committed.attending) {
      persistCommittedSelection(state, resolution.committed, windowObject);
      app.render?.();
    }

    const href = buildCommittedExternalVenueWatchPartyUrl({
      config: readConfig(documentObject),
      snapshot: state.snapshot,
      gameId: resolution.committed.gameId,
      venueId: resolution.committed.venueId
    });

    navigateToForm(
      href,
      resolution.committed.attending,
      documentObject,
      windowObject
    );
  });
}
