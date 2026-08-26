import { getWatchPartiesForVenueGame } from './watch-party-display-core.mjs';
import { createWatchPartyModule } from './watch-party-renderer.mjs';

function replaceRenderedParties(container, parties, snapshot, documentObject) {
  if (!container) return;
  container.querySelectorAll(':scope > .party-module').forEach((module) => module.remove());
  if (!parties.length) return;

  const detail = container.id === 'venue-detail';
  const anchor = detail
    ? container.querySelector(':scope > .detail-watch-party-cta, :scope > .detail-contribution, :scope > .action-row')
    : container.querySelector(':scope > .action-row, :scope > .venue-website, :scope > .watch-party-contribution, :scope > .preview-note');
  const fragment = documentObject.createDocumentFragment();
  parties.forEach((party, index) => fragment.append(createWatchPartyModule({
    party,
    index,
    total: parties.length,
    snapshot,
    detail,
    documentObject
  })));
  container.insertBefore(fragment, anchor || null);
}

export function renderMultipleWatchParties({ app = window.CGBApp, documentObject = document } = {}) {
  const state = app?.getState?.();
  if (!state?.snapshot || !state.gameId || !state.selectedVenueId) return [];
  const parties = getWatchPartiesForVenueGame(state.snapshot, state.gameId, state.selectedVenueId);
  replaceRenderedParties(
    documentObject.querySelector('#tray-selected .selected-card[data-venue-id]'),
    parties,
    state.snapshot,
    documentObject
  );
  if (state.detailMode) {
    replaceRenderedParties(documentObject.querySelector('#venue-detail'), parties, state.snapshot, documentObject);
  }
  return parties;
}

function initialize() {
  const app = window.CGBApp;
  if (!app?.subscribe) return;
  const render = () => renderMultipleWatchParties({ app, documentObject: document });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
}

initialize();
