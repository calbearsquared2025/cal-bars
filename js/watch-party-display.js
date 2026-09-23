import {
  getWatchPartiesForVenueGame,
  isWatchPartyTrayRenderCurrent
} from './watch-party-display-core.mjs';
import { createWatchPartyModule } from './watch-party-renderer.mjs';

function replaceRenderedParties(container, parties, snapshot, documentObject) {
  if (!container) return;
  const detail = container.id === 'venue-detail';
  const target = detail
    ? container
    : (container.querySelector(':scope > .selected-card__scroll-region') || container);
  target.querySelectorAll(':scope > .party-module').forEach((module) => module.remove());
  if (!parties.length) return;

  const anchor = detail
    ? target.querySelector(':scope > .activity-card, :scope > .detail-watch-party-cta, :scope > .detail-contribution, :scope > .action-row')
    : target.querySelector(':scope > .bear-count, :scope > .action-row, :scope > .venue-website, :scope > .watch-party-contribution, :scope > .preview-note');
  const fragment = documentObject.createDocumentFragment();
  parties.forEach((party, index) => fragment.append(createWatchPartyModule({
    party,
    index,
    total: parties.length,
    snapshot,
    detail,
    documentObject
  })));
  target.insertBefore(fragment, anchor || null);
}

export function synchronizeWatchPartyContainers({
  selectedCard,
  detail,
  detailMode,
  parties,
  snapshot,
  gameId,
  venueId,
  documentObject,
  replace = replaceRenderedParties
} = {}) {
  let trayReplaced = false;
  let detailReplaced = false;

  if (selectedCard && !isWatchPartyTrayRenderCurrent(selectedCard, { venueId, gameId, parties })) {
    replace(selectedCard, parties, snapshot, documentObject);
    trayReplaced = true;
  }

  if (detailMode && detail) {
    replace(detail, parties, snapshot, documentObject);
    detailReplaced = true;
  }

  return { trayReplaced, detailReplaced };
}

export function renderMultipleWatchParties({ app = window.CGBApp, documentObject = document } = {}) {
  const state = app?.getState?.();
  if (!state?.snapshot || !state.gameId || !state.selectedVenueId) return [];
  const parties = getWatchPartiesForVenueGame(state.snapshot, state.gameId, state.selectedVenueId);
  const selectedCard = documentObject.querySelector('#tray-selected .selected-card[data-venue-id]');
  const detail = state.detailMode ? documentObject.querySelector('#venue-detail') : null;

  synchronizeWatchPartyContainers({
    selectedCard,
    detail,
    detailMode: state.detailMode,
    parties,
    snapshot: state.snapshot,
    gameId: state.gameId,
    venueId: state.selectedVenueId,
    documentObject
  });
  return parties;
}

function initialize(windowObject = window, documentObject = document) {
  const app = windowObject.CGBApp;
  if (!app?.subscribe) return;
  const render = () => renderMultipleWatchParties({ app, documentObject });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initialize();
