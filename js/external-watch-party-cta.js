import './mobile-selected-profile-continuation.mjs';
import { observeExternalVenueCommit } from './external-watch-party-cta-core.mjs';
import {
  INTENT_SELECTIONS_STORAGE_KEY,
  withStoredSelection
} from './fan-intent-core.mjs';
import { initializeExternalSearchStateGuard } from './external-search-state-guard.js';
import { initializeExternalWatchPartyPlan } from './external-watch-party-plan.js';

let pendingExternalCommit = null;

function persistCommittedFanIntent(state, gameId, venueId) {
  if (!state?.fanIntent) return false;
  const selections = withStoredSelection(state.fanIntent.selections, gameId, venueId);
  state.fanIntent.selections = selections;
  try {
    window.localStorage.setItem(INTENT_SELECTIONS_STORAGE_KEY, JSON.stringify(selections));
  } catch (_) {}
  return selections[gameId] === venueId;
}

function initialize() {
  const app = window.CGBApp;
  if (!app?.subscribe) return;

  initializeExternalSearchStateGuard({ app, documentObject: document });
  initializeExternalWatchPartyPlan({ app, documentObject: document, windowObject: window });

  app.subscribe('rendered', () => {
    const state = app.getState?.();
    const observation = observeExternalVenueCommit(pendingExternalCommit, state);
    pendingExternalCommit = observation.pending;
    if (!observation.committed) return;

    const adopted = persistCommittedFanIntent(
      state,
      observation.committed.gameId,
      observation.committed.venueId
    );

    if (adopted) queueMicrotask(() => app.render());
  });
}

initialize();
