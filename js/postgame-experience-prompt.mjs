import { buildFanExperienceFormPrefillUrl } from './fan-experience-form-core.mjs';
import { readFormConfig } from './config.mjs';

export const POSTGAME_EXPERIENCE_STORAGE_KEY = 'cgb_v2_postgame_experience_v1';
const DIALOG_ID = 'postgame-experience-dialog';

function clean(value) {
  return String(value ?? '').trim();
}

export function parsePostgameExperienceState(value) {
  if (!value) return { pending: {} };
  try {
    const parsed = JSON.parse(value);
    const pending = parsed && typeof parsed.pending === 'object' && !Array.isArray(parsed.pending)
      ? Object.fromEntries(Object.entries(parsed.pending)
        .map(([gameId, venueId]) => [clean(gameId), clean(venueId)])
        .filter(([gameId, venueId]) => gameId && venueId))
      : {};
    return { pending };
  } catch (_) {
    return { pending: {} };
  }
}

export function captureCompletedSelections(snapshot, selections = {}, postgameState = { pending: {} }) {
  const venueIds = new Set((snapshot?.venues || []).map((venue) => clean(venue?.venue_id)).filter(Boolean));
  const gamesById = new Map((snapshot?.games || []).map((game) => [clean(game?.game_id), game]));
  const nextSelections = {};
  const nextPending = { ...(postgameState?.pending || {}) };

  Object.entries(selections || {}).forEach(([rawGameId, rawVenueId]) => {
    const gameId = clean(rawGameId);
    const venueId = clean(rawVenueId);
    const game = gamesById.get(gameId);
    if (!game || !venueIds.has(venueId)) return;

    if (game.game_status === 'upcoming') {
      nextSelections[gameId] = venueId;
      return;
    }

    if (game.game_status === 'completed' && !clean(nextPending[gameId])) {
      nextPending[gameId] = venueId;
    }
  });

  return {
    selections: nextSelections,
    postgameState: { pending: nextPending }
  };
}

function gameRecency(game) {
  const order = Number(game?.schedule_order);
  if (Number.isFinite(order)) return order;
  const date = Date.parse(clean(game?.game_date));
  return Number.isFinite(date) ? date : 0;
}

export function nextPostgameExperience(snapshot, postgameState = { pending: {} }) {
  const venuesById = new Map((snapshot?.venues || []).map((venue) => [clean(venue?.venue_id), venue]));
  const gamesById = new Map((snapshot?.games || []).map((game) => [clean(game?.game_id), game]));

  const candidates = Object.entries(postgameState?.pending || {}).map(([rawGameId, rawVenueId]) => {
    const gameId = clean(rawGameId);
    const venueId = clean(rawVenueId);
    const game = gamesById.get(gameId);
    const venue = venuesById.get(venueId);
    if (!game || game.game_status !== 'completed' || !venue) return null;
    return {
      gameId,
      venueId,
      venueName: clean(venue.name),
      opponentName: clean(game.opponent_short_name || game.opponent_name),
      recency: gameRecency(game)
    };
  }).filter((item) => item?.venueName);

  candidates.sort((a, b) => b.recency - a.recency || b.gameId.localeCompare(a.gameId));
  return candidates[0] || null;
}

export function removePostgameExperience(postgameState = { pending: {} }, gameId) {
  const pending = { ...(postgameState?.pending || {}) };
  delete pending[clean(gameId)];
  return { pending };
}

function formConfig(documentObject = document) {
  return readFormConfig('fanExperience', documentObject);
}

function ensureDialog(documentObject = document) {
  let dialog = documentObject.querySelector(`#${DIALOG_ID}`);
  if (dialog) return dialog;

  dialog = documentObject.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'new-location-success-dialog postgame-experience-dialog';
  dialog.setAttribute('aria-labelledby', 'postgame-experience-title');

  const shell = documentObject.createElement('div');
  shell.className = 'new-location-success-shell';

  const handle = documentObject.createElement('div');
  handle.className = 'new-location-success-handle';
  handle.setAttribute('aria-hidden', 'true');

  const header = documentObject.createElement('header');
  header.className = 'new-location-success-header';
  const eyebrow = documentObject.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'After the game';
  const title = documentObject.createElement('h2');
  title.id = 'postgame-experience-title';
  header.append(eyebrow, title);

  const prompt = documentObject.createElement('p');
  prompt.id = 'postgame-experience-copy';
  prompt.className = 'new-location-success-copy';

  const actions = documentObject.createElement('div');
  actions.className = 'new-location-success-actions';
  const contribute = documentObject.createElement('a');
  contribute.id = 'postgame-experience-contribute';
  contribute.className = 'primary-button';
  contribute.target = '_blank';
  contribute.rel = 'noopener noreferrer';
  contribute.textContent = 'Share your experience';
  const skip = documentObject.createElement('button');
  skip.id = 'postgame-experience-skip';
  skip.className = 'secondary-button';
  skip.type = 'button';
  skip.textContent = 'Skip';
  actions.append(contribute, skip);

  shell.append(handle, header, prompt, actions);
  dialog.append(shell);
  documentObject.body.append(dialog);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  return dialog;
}

export function showPostgameExperiencePrompt(context, {
  documentObject = document,
  onComplete = () => {}
} = {}) {
  if (!context?.gameId || !context?.venueId || !context?.venueName) return false;
  const href = buildFanExperienceFormPrefillUrl(formConfig(documentObject), {
    venueId: context.venueId,
    venueName: context.venueName
  });
  if (!href) return false;

  const dialog = ensureDialog(documentObject);
  const title = dialog.querySelector('#postgame-experience-title');
  const copy = dialog.querySelector('#postgame-experience-copy');
  const contribute = dialog.querySelector('#postgame-experience-contribute');
  const skip = dialog.querySelector('#postgame-experience-skip');
  if (!title || !copy || !contribute || !skip) return false;

  title.textContent = `How was watching Cal at ${context.venueName}?`;
  copy.textContent = context.opponentName
    ? `You said you’d be here for Cal–${context.opponentName}. What should another Bear know about watching a game here?`
    : 'What should another Bear know about watching a Cal game here?';
  contribute.href = href;

  const complete = () => {
    onComplete(context.gameId);
    try { dialog.close(); } catch (_) {}
  };
  contribute.onclick = complete;
  skip.onclick = complete;

  try {
    if (dialog.open) dialog.close();
    dialog.showModal();
    return true;
  } catch (_) {
    return false;
  }
}
