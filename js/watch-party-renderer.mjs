import { formatGameDate, gameTitle } from './core.mjs';
import { createIcon } from './icons.mjs';
import {
  buildWatchPartyIssueUrl,
  resolveWatchPartyIssueContext
} from './watch-party-issue-core.mjs';

function meta(name, documentObject) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function issueConfig(documentObject) {
  return {
    formUrl: meta('cgb-watch-party-issue-form-url', documentObject),
    venueNameEntry: meta('cgb-watch-party-issue-venue-name-entry', documentObject),
    gameEntry: meta('cgb-watch-party-issue-game-entry', documentObject),
    watchPartyIdEntry: meta('cgb-watch-party-issue-id-entry', documentObject)
  };
}

function appendText(module, text, className, documentObject) {
  if (!text) return;
  const line = documentObject.createElement('p');
  if (className) line.className = className;
  line.textContent = text;
  module.append(line);
}

function appendTags(module, labels, documentObject) {
  if (!labels.length) return;
  const tags = documentObject.createElement('div');
  tags.className = 'party-meta';
  tags.setAttribute('aria-label', 'Watch Party details');
  labels.forEach((label) => {
    const tag = documentObject.createElement('span');
    tag.className = 'party-meta__tag';
    tag.textContent = label;
    tags.append(tag);
  });
  module.append(tags);
}

export function createWatchPartyModule({
  party,
  index = 0,
  total = 1,
  snapshot,
  detail = false,
  documentObject = document
}) {
  const module = documentObject.createElement('section');
  module.className = 'party-module party-module--multiple';
  module.dataset.watchPartyId = party.watch_party_id;

  const title = documentObject.createElement('div');
  title.className = 'party-module__title';
  const star = documentObject.createElement('span');
  star.setAttribute('aria-hidden', 'true');
  star.append(createIcon('star', { documentObject }));
  const titleText = documentObject.createElement('strong');
  titleText.textContent = total > 1 ? `Watch Party ${index + 1} of ${total}` : 'Watch Party';
  title.append(star, titleText);
  module.append(title);

  const game = snapshot?.games?.find((item) => item.game_id === party.game_id);
  if (game) appendText(module, `${gameTitle(game)} · ${formatGameDate(game)}`, 'party-game-context', documentObject);

  const hosted = documentObject.createElement('p');
  hosted.className = 'party-module__host';
  hosted.append(documentObject.createTextNode('Hosted by '));
  const host = documentObject.createElement('strong');
  host.textContent = party.organizer_name;
  hosted.append(host);
  module.append(hosted);

  if (party.event_start_at) {
    const start = new Date(party.event_start_at);
    if (!Number.isNaN(start.getTime())) {
      appendText(module, `Arrive ${new Intl.DateTimeFormat(undefined, {
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      }).format(start)}`, 'party-module__time', documentObject);
    }
  }

  const details = [];
  if (party.age_policy === '21_plus') details.push('21+');
  if (party.age_policy === 'all_ages') details.push('ALL AGES');
  if (party.sound_status === 'confirmed_on') details.push('AUDIO ON');
  if (party.sound_status === 'confirmed_off') details.push('AUDIO OFF');
  appendTags(module, details, documentObject);
  appendText(module, party.restrictions_note, 'party-module__note', documentObject);
  appendText(module, party.game_day_note, 'party-module__note', documentObject);

  if (party.official_event_url) {
    const link = documentObject.createElement('a');
    link.className = 'party-module__event';
    link.href = party.official_event_url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'OFFICIAL EVENT DETAILS ↗';
    module.append(link);
  }

  const issueUrl = buildWatchPartyIssueUrl(issueConfig(documentObject), resolveWatchPartyIssueContext(snapshot, party));
  if (issueUrl) {
    const report = documentObject.createElement('a');
    report.className = 'party-module__report';
    report.dataset.watchPartyIssueEntry = party.watch_party_id;
    report.href = issueUrl;
    report.target = '_blank';
    report.rel = 'noopener noreferrer';
    report.textContent = 'More to share about this watch party? Tell us →';
    module.append(report);
  }
  return module;
}
