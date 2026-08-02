import { buildCommittedExternalVenueWatchPartyUrl } from './external-watch-party-cta-core.mjs';
import {
  beginExternalWatchPartyPlan,
  resolveExternalWatchPartyPlan
} from './external-watch-party-plan-core.mjs';

const BUTTON_ID = 'external-venue-plan-watch-party';
const RETRY_SELECTOR = '[data-external-watch-party-form-retry]';
let pendingPlan = null;
let pendingWindow = null;

function metaContent(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function readConfig(documentObject = document) {
  return {
    formUrl: metaContent('cgb-watch-party-form-url', documentObject),
    venueIdEntry: metaContent('cgb-watch-party-venue-id-entry', documentObject),
    venueNameEntry: metaContent('cgb-watch-party-venue-name-entry', documentObject),
    gameIdEntry: metaContent('cgb-watch-party-game-id-entry', documentObject)
  };
}

function openWaitingWindow(windowObject = window) {
  const opened = windowObject.open('', '_blank');
  try {
    if (opened?.document) {
      opened.document.title = 'Preparing Watch Party Form';
      opened.document.body.textContent = 'Preparing the Watch Party Form…';
    }
  } catch (_) {}
  return opened;
}

function closeWaitingWindow() {
  try { pendingWindow?.close?.(); } catch (_) {}
  pendingWindow = null;
}

function showFormRetry(href, documentObject = document) {
  documentObject.querySelector(RETRY_SELECTOR)?.remove();
  const card = documentObject.querySelector('#tray-selected .selected-card');
  if (!card || !href) return;

  const section = documentObject.createElement('section');
  section.className = 'external-watch-party-cta';
  section.dataset.externalWatchPartyFormRetry = 'true';

  const prompt = documentObject.createElement('p');
  prompt.textContent = 'Your location and attendance were saved. Open the Watch Party Form to continue.';

  const link = documentObject.createElement('a');
  link.className = 'primary-button';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open Watch Party Form';

  section.append(prompt, link);
  card.append(section);
}

function navigateToForm(href, documentObject = document) {
  if (!href) return false;
  try {
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.location.href = href;
      pendingWindow = null;
      return true;
    }
  } catch (_) {}
  showFormRetry(href, documentObject);
  return false;
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
  button.textContent = 'Plan a Watch Party';
  actions.insertBefore(button, cancel);

  button.addEventListener('click', () => {
    const state = app?.getState?.();
    const external = windowObject.CGBExternalVenueSearch?.getState?.();
    const selected = external?.retry || external?.selected;
    const plan = beginExternalWatchPartyPlan({ selected, gameId: state?.gameId });
    if (!plan || external?.pending) return;

    pendingPlan = plan;
    pendingWindow = openWaitingWindow(windowObject);
    confirm.click();
  });
}

export function initializeExternalWatchPartyPlan({
  app = window.CGBApp,
  documentObject = document,
  windowObject = window
} = {}) {
  ensurePlanButton({ app, documentObject, windowObject });
  if (!app?.subscribe) return;

  app.subscribe('rendered', () => {
    ensurePlanButton({ app, documentObject, windowObject });
    if (!pendingPlan) return;

    const state = app.getState?.();
    const resolution = resolveExternalWatchPartyPlan(pendingPlan, state);
    pendingPlan = resolution.pending;

    const button = documentObject.querySelector(`#${BUTTON_ID}`);
    if (button) button.disabled = Boolean(state?.externalSearch?.pending);

    if (resolution.failed) {
      closeWaitingWindow();
      return;
    }
    if (!resolution.committed) return;

    const href = buildCommittedExternalVenueWatchPartyUrl({
      config: readConfig(documentObject),
      snapshot: state.snapshot,
      gameId: resolution.committed.gameId,
      venueId: resolution.committed.venueId
    });

    navigateToForm(href, documentObject);
  });
}
