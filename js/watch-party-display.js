import { getWatchPartiesForVenueGame } from './watch-party-display-core.mjs';

function appendText(container, text, className = '') {
  if (!text) return;
  const line = document.createElement('p');
  if (className) line.className = className;
  line.textContent = text;
  container.append(line);
}

function renderParty(party, index, total) {
  const module = document.createElement('section');
  module.className = 'party-module party-module--multiple';
  module.dataset.watchPartyId = party.watch_party_id;

  const title = document.createElement('div');
  title.className = 'party-module__title';
  const star = document.createElement('span');
  star.setAttribute('aria-hidden', 'true');
  star.textContent = '★';
  const titleText = document.createElement('strong');
  titleText.textContent = total > 1 ? `Watch Party ${index + 1} of ${total}` : 'Watch Party';
  title.append(star, titleText);
  module.append(title);

  appendText(module, `Hosted by ${party.organizer_name}`);

  if (party.event_start_at) {
    const start = new Date(party.event_start_at);
    if (!Number.isNaN(start.getTime())) {
      appendText(module, `Arrive ${new Intl.DateTimeFormat(undefined, {
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      }).format(start)}`);
    }
  }

  const details = [];
  if (party.age_policy === '21_plus') details.push('21+');
  if (party.age_policy === 'all_ages') details.push('All ages');
  if (party.sound_status === 'confirmed_on') details.push('Game audio on');
  if (party.sound_status === 'confirmed_off') details.push('Game audio off');
  appendText(module, details.join(' · '), 'party-meta');
  appendText(module, party.restrictions_note);
  appendText(module, party.game_day_note);

  if (party.official_event_url) {
    const link = document.createElement('a');
    link.href = party.official_event_url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open event information';
    module.append(link);
  }

  return module;
}

function replaceRenderedParties(container, parties) {
  if (!container) return;
  container.querySelectorAll('.party-module').forEach((module) => module.remove());
  if (!parties.length) return;

  const anchor = container.querySelector('.action-row, .venue-website, .watch-party-contribution, .preview-note');
  const fragment = document.createDocumentFragment();
  parties.forEach((party, index) => fragment.append(renderParty(party, index, parties.length)));
  container.insertBefore(fragment, anchor || null);
}

export function renderMultipleWatchParties({ app = window.CGBApp, documentObject = document } = {}) {
  const state = app?.getState?.();
  if (!state?.snapshot || !state.gameId || !state.selectedVenueId) return [];

  const parties = getWatchPartiesForVenueGame(
    state.snapshot,
    state.gameId,
    state.selectedVenueId
  );

  replaceRenderedParties(documentObject.querySelector('#tray-selected .selected-card'), parties);
  if (state.detailMode) replaceRenderedParties(documentObject.querySelector('#venue-detail'), parties);
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
