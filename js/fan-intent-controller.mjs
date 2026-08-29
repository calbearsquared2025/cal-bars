import './postgame-experience.js';
import { trackCgbEvent } from './analytics.mjs';
import {
  beginIntentTransaction,
  commitIntentResponse,
  rollbackIntentTransaction
} from './fan-intent-core.mjs';

export function fanIntentFailureCopy(error) {
  const code = String(error?.code || error?.message || '');
  if (code.includes('game_not_open')) return 'This game is no longer open for selections.';
  if (code.includes('venue_not_found')) return 'This location is not available right now.';
  if (code.includes('selection_conflict')) return 'Your selection changed elsewhere. Refresh and try again.';
  if (code.includes('not_configured')) return 'Check-ins are temporarily unavailable.';
  return 'Could not save your selection. Your previous choice was restored.';
}

function trackIntentSuccess(state, operation) {
  const venue = state.snapshot?.venues?.find((item) => item.venue_id === operation.venueId);
  const eventName = operation.action === 'withdraw'
    ? 'fan_intent_withdrawn'
    : operation.action === 'move'
      ? 'fan_intent_moved'
      : 'fan_intent_joined';
  trackCgbEvent(eventName, {
    game_id: state.gameId,
    venue_type: venue?.venue_type || '',
    intent_action: operation.action
  });
}

export function createFanIntentController({
  getState,
  postIntent,
  persistSelections = () => {},
  render = () => {},
  showStatus = () => {}
}) {
  async function performIntent(venueId, forcedAction = null) {
    const state = getState();
    const fanState = state.fanIntent;
    if (fanState.pending || !state.snapshot || !state.gameId) return false;

    const game = state.snapshot.games.find((item) => item.game_id === state.gameId);
    if (game?.game_status !== 'upcoming') {
      showStatus('Selections are closed for this game.');
      return false;
    }

    const transaction = beginIntentTransaction(
      state.snapshot,
      fanState.selections,
      state.gameId,
      venueId,
      forcedAction
    );

    fanState.pending = transaction.operation;
    fanState.retry = null;
    fanState.selections = transaction.nextSelections;
    persistSelections(fanState.selections);
    render();

    try {
      const response = await postIntent(transaction.operation);
      fanState.selections = commitIntentResponse(
        state.snapshot,
        fanState.selections,
        state.gameId,
        response
      );
      persistSelections(fanState.selections);
      const message = transaction.operation.action === 'withdraw'
        ? 'Selection removed.'
        : transaction.operation.action === 'move'
          ? 'Your selection moved.'
          : 'You’ll be here.';
      showStatus(message, 2600);
      trackIntentSuccess(state, transaction.operation);
      return true;
    } catch (error) {
      fanState.selections = rollbackIntentTransaction(state.snapshot, transaction);
      persistSelections(fanState.selections);
      fanState.retry = {
        ...transaction.operation,
        message: fanIntentFailureCopy(error)
      };
      showStatus(fanState.retry.message);
      return false;
    } finally {
      fanState.pending = null;
      render();
    }
  }

  async function ensureIntent(venueId) {
    const state = getState();
    if (!venueId || !state.gameId) return false;
    if (state.fanIntent.selections?.[state.gameId] === venueId) return true;
    return performIntent(venueId);
  }

  async function retryIntent() {
    const retry = getState().fanIntent.retry;
    if (!retry) return false;
    return performIntent(retry.venueId, retry.action);
  }

  return Object.freeze({ ensureIntent, performIntent, retryIntent });
}
