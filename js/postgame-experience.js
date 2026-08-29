import { appState, waitForApplicationReady } from './app-state.mjs';
import { INTENT_SELECTIONS_STORAGE_KEY, parseStoredSelections } from './fan-intent-core.mjs';
import {
  POSTGAME_EXPERIENCE_STORAGE_KEY,
  captureCompletedSelections,
  nextPostgameExperience,
  parsePostgameExperienceState,
  removePostgameExperience,
  showPostgameExperiencePrompt
} from './postgame-experience-prompt.mjs';

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}

function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (_) {}
}

// Capture the persisted selection before fan-intent startup prunes completed games.
// A stored selection only survives normal use after a successful authoritative write.
const selectionsAtPageLoad = parseStoredSelections(storageGet(INTENT_SELECTIONS_STORAGE_KEY));
let postgameState = parsePostgameExperienceState(storageGet(POSTGAME_EXPERIENCE_STORAGE_KEY));

function persistPostgameState() {
  storageSet(POSTGAME_EXPERIENCE_STORAGE_KEY, JSON.stringify(postgameState));
}

function completePrompt(gameId) {
  postgameState = removePostgameExperience(postgameState, gameId);
  persistPostgameState();
}

async function bootPostgameExperience() {
  await waitForApplicationReady();
  if (!appState.snapshot) return;

  const captured = captureCompletedSelections(
    appState.snapshot,
    selectionsAtPageLoad,
    postgameState
  );

  if (JSON.stringify(captured.postgameState) !== JSON.stringify(postgameState)) {
    postgameState = captured.postgameState;
    persistPostgameState();
  }

  const context = nextPostgameExperience(appState.snapshot, postgameState);
  if (!context) return;

  showPostgameExperiencePrompt(context, {
    onComplete: completePrompt
  });
}

bootPostgameExperience().catch((error) => {
  console.error('Postgame experience prompt initialization failed.', error);
});
