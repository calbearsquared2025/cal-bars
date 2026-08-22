import { formatGameDate, gameTitle } from './core.mjs';
import { getWatchPartiesForVenueGame } from './watch-party-display-core.mjs';
import {
  buildWatchPartyIssueUrl,
  resolveWatchPartyIssueContext
} from './watch-party-issue-core.mjs';

function issueConfig() {
  const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
  return {
    formUrl: meta('cgb-watch-party-issue-form-url'),
    venueNameEntry: meta('cgb-watch-party-issue-venue-name-entry'),
    gameEntry: meta('cgb-watch-party-issue-game-entry'),
    watchPartyIdEntry: meta('cgb-watch-party-issue-id-entry')
  };
}

function appendText(container, text, className = '') {
  if (!text) return;
  const line = document.createElement('p');
  if (className) line.className = className;
  line.textContent = text;
  container.append(line);
}

function watchPartyGameContext(snapshot, party) {
  const game = snapshot?.games?.find((candidate) => candidate.game_id === party?.game_id);
  if (!game) return '';
  return [gameTitle(game), formatGameDate(game)].filter(Boolean).join(' · ');
}

function renderParty(party, index, total, snapshot, { detail = false } = {}) {
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

  appendText(module, watchPartyGameContext(snapshot, party), 'party-game-context');

  const hosted = document.createElement('p');
  hosted.append(document.createTextNode('Hosted by '));
  const hostName = document.createElement('strong');
  hostName.textContent = party.organizer_name;
  hosted.append(hostName);
  module.append(hosted);

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
    link.textContent = detail ? 'External event details' : 'Open event information';
    module.append(link);
  }

  const reportUrl = buildWatchPartyIssueUrl(
    issueConfig(),
    resolveWatchPartyIssueContext(snapshot, party)
  );
  if (reportUrl) {
    const reportLink = document.createElement('a');
    reportLink.className = 'party-module__report';
    reportLink.dataset.watchPartyIssueEntry = party.watch_party_id;
    reportLink.href = reportUrl;
    reportLink.target = '_blank';
    reportLink.rel = 'noopener noreferrer';
    reportLink.textContent = 'Report an Issue';
    module.append(reportLink);
  }

  return module;
}

function replaceRenderedParties(container, parties, snapshot) {
  if (!container) return;
  container.querySelectorAll('.party-module').forEach((module) => module.remove());
  if (!parties.length) return;

  const detail = container.id === 'venue-detail';
  const anchor = detail
    ? container.querySelector(':scope > .detail-watch-party-cta, :scope > .detail-contribution, :scope > .action-row')
    : container.querySelector('.action-row, .venue-website, .watch-party-contribution, .preview-note');
  const fragment = document.createDocumentFragment();
  parties.forEach((party, index) => fragment.append(renderParty(
    party,
    index,
    parties.length,
    snapshot,
    { detail }
  )));
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

  replaceRenderedParties(documentObject.querySelector('#tray-selected .selected-card'), parties, state.snapshot);
  if (state.detailMode) replaceRenderedParties(documentObject.querySelector('#venue-detail'), parties, state.snapshot);
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
