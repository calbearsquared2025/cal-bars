import { formatGameDate, gameTitle } from './core.mjs';
import { createIcon } from './icons.mjs';
import {
  buildWatchPartyIssueUrl,
  resolveWatchPartyIssueContext
} from './watch-party-issue-core.mjs';
import { readFormConfig } from './config.mjs';

const WATCH_PARTY_FEATURE_LABELS = Object.freeze({
  rsvp_requested: 'RSVP REQUESTED',
  cal_specials: 'CAL SPECIALS'
});

function issueConfig(documentObject) {
  return readFormConfig('watchPartyIssue', documentObject);
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

function controlledTagValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
    } catch (_) {}
  }
  return raw.split(/[|;,\n]+/).map((item) => item.trim()).filter(Boolean);
}

export function watchPartyTagLabels(party = {}, venue = {}) {
  const venueTags = new Set(controlledTagValues(venue.venue_tags).map((tag) => tag.toLowerCase()));
  const eventTags = new Set(controlledTagValues(party.feature_tags).map((tag) => tag.toLowerCase()));
  const labels = [];

  if (party.age_policy === '21_plus' && !venueTags.has('21_plus')) labels.push('21+');
  if (party.age_policy === 'all_ages' && !venueTags.has('all_ages')) labels.push('ALL AGES');
  if (party.sound_status === 'confirmed_on' && !venueTags.has('audio_on')) labels.push('AUDIO ON');
  if (eventTags.has('rsvp_requested')) labels.push(WATCH_PARTY_FEATURE_LABELS.rsvp_requested);
  if (eventTags.has('cal_specials')) labels.push(WATCH_PARTY_FEATURE_LABELS.cal_specials);
  return labels;
}

function formatLocalTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(date);
}

function kickoffLabel(game) {
  if (!game) return '';
  if (game.kickoff_status === 'tbd' || !game.kickoff_at) return 'Kickoff Time TBD';
  const time = formatLocalTime(game.kickoff_at);
  return time ? `Kickoff ${time}` : 'Kickoff Time TBD';
}

function arrivalLabel(party) {
  const time = formatLocalTime(party?.event_start_at);
  return time ? `Arrive ${time}` : '';
}

export function refreshWatchPartyProfileOnReturn(link, windowObject = globalThis.window) {
  if (!link || typeof link.addEventListener !== 'function' || !windowObject?.addEventListener) return false;
  link.addEventListener('click', () => {
    windowObject.addEventListener('focus', () => {
      windowObject.CGBSnapshotRefresh?.refresh?.();
    }, { once: true });
  });
  return true;
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

  const game = snapshot?.games?.find((item) => item.game_id === party.game_id);
  const venue = snapshot?.venues?.find((item) => item.venue_id === party.venue_id) || {};
  const title = documentObject.createElement('div');
  title.className = 'party-module__title';
  const star = documentObject.createElement('span');
  star.setAttribute('aria-hidden', 'true');
  star.append(createIcon('star', { documentObject }));
  const titleText = documentObject.createElement('strong');
  titleText.textContent = total > 1 ? `Watch Party ${index + 1} of ${total}` : 'Watch Party';
  title.append(star, titleText);
  if (game) {
    const date = documentObject.createElement('span');
    date.className = 'party-module__date';
    date.textContent = formatGameDate(game).toUpperCase();
    title.append(date);
  }
  module.append(title);

  if (game) appendText(module, `CAL ${gameTitle(game).toUpperCase()}`, 'party-game-context', documentObject);

  const timing = [kickoffLabel(game), arrivalLabel(party)].filter(Boolean).join(' · ');
  appendText(module, timing, 'party-module__time', documentObject);

  const hosted = documentObject.createElement('p');
  hosted.className = 'party-module__host';
  hosted.append(documentObject.createTextNode('Hosted by '));
  const host = documentObject.createElement('strong');
  host.textContent = party.organizer_name;
  hosted.append(host);
  module.append(hosted);

  appendTags(module, watchPartyTagLabels(party, venue), documentObject);
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
    report.dataset.googleFormExternal = 'true';
    report.href = issueUrl;
    report.target = '_blank';
    report.rel = 'noopener noreferrer';
    const prompt = documentObject.createElement('span');
    prompt.className = 'party-module__report-prompt';
    prompt.textContent = 'More to share about this watch party?';
    const action = documentObject.createElement('span');
    action.className = 'party-module__report-action';
    action.textContent = 'Tell us →';
    report.append(prompt, documentObject.createTextNode(' '), action);
    refreshWatchPartyProfileOnReturn(report);
    module.append(report);
  }
  return module;
}
