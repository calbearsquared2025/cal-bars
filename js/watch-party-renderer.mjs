import { formatGameDate, gameTitle } from './core.mjs';
import { createIcon } from './icons.mjs';
import { ACTIVE_INSTANCE_CONFIG } from './instance-config.mjs';
import {
  buildWatchPartyIssueUrl,
  resolveWatchPartyIssueContext
} from './watch-party-issue-core.mjs';
import { readRuntimeConfig } from './config.mjs';

const WATCH_PARTY_FEATURE_LABELS = Object.freeze({
  rsvp_requested: 'RSVP REQUESTED',
  cal_specials: `${ACTIVE_INSTANCE_CONFIG.identity.schoolShortName.toUpperCase()} SPECIALS`
});

function issueConfig(documentObject) {
  return readRuntimeConfig({ documentObject }).forms.watchPartyIssue;
}

function appendText(module, text, className, documentObject) {
  if (!text) return null;
  const line = documentObject.createElement('p');
  if (className) line.className = className;
  line.textContent = text;
  module.append(line);
  return line;
}

function appendSectionEyebrow(module, text, documentObject) {
  const eyebrow = documentObject.createElement('p');
  eyebrow.className = 'party-module__eyebrow';
  eyebrow.textContent = text;
  module.append(eyebrow);
  return eyebrow;
}

function watchPartyRequestsExternalRsvp(party = {}) {
  return controlledTagValues(party.feature_tags)
    .map((tag) => tag.toLowerCase())
    .includes('rsvp_requested');
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

export function nativeWatchPartyRsvpEnabled(party = {}) {
  return party.rsvp_enabled === true || String(party.rsvp_enabled ?? '').toLowerCase() === 'true';
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

function appendNativeRsvp(module, party, documentObject) {
  const container = documentObject.createElement('section');
  container.className = 'party-module__section party-module__native-rsvp';
  container.dataset.watchPartyRsvp = party.watch_party_id;
  container.hidden = !nativeWatchPartyRsvpEnabled(party);
  appendSectionEyebrow(container, 'RSVP', documentObject);

  const status = documentObject.createElement('p');
  status.className = 'party-module__rsvp-status';
  status.dataset.watchPartyRsvpStatus = party.watch_party_id;
  status.textContent = 'This Watch Party is collecting RSVPs.';

  const button = documentObject.createElement('button');
  button.type = 'button';
  button.className = 'party-module__rsvp-action party-module__rsvp-action--quiet';
  button.dataset.watchPartyRsvpAction = party.watch_party_id;
  button.textContent = 'RSVP through Cal Golden Bars →';
  button.addEventListener('click', async () => {
    const windowObject = documentObject.defaultView || globalThis.window;
    const loader = windowObject?.CGBAccountsLoader;
    if (!loader?.load) {
      windowObject?.CGBApp?.showStatus?.('RSVP is temporarily unavailable.');
      return;
    }
    button.disabled = true;
    try {
      await loader.load('user-demand');
      if (!windowObject.CGBWatchPartyRsvp?.open) throw new Error('rsvp_unavailable');
      await windowObject.CGBWatchPartyRsvp.open(party.watch_party_id);
    } catch (_) {
      windowObject?.CGBApp?.showStatus?.('RSVP is temporarily unavailable.');
    } finally {
      button.disabled = false;
    }
  });

  container.append(status, button);
  module.append(container);
}

function appendExternalRsvp(module, party, documentObject) {
  if (!party.official_event_url || !watchPartyRequestsExternalRsvp(party) || nativeWatchPartyRsvpEnabled(party)) return;

  const container = documentObject.createElement('section');
  container.className = 'party-module__section party-module__external-rsvp';
  appendSectionEyebrow(container, 'RSVP', documentObject);
  appendText(container, 'Registration is handled by the organizer.', 'party-module__rsvp-status', documentObject);

  const link = documentObject.createElement('a');
  link.className = 'secondary-button party-module__rsvp-action party-module__external-rsvp-action';
  link.href = party.official_event_url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Event details & RSVP ↗';
  container.append(link);
  module.append(container);
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

  const summary = documentObject.createElement('div');
  summary.className = 'party-module__summary';

  const gameSection = documentObject.createElement('div');
  gameSection.className = 'party-module__fact party-module__fact--game';
  appendSectionEyebrow(gameSection, 'Game', documentObject);
  if (game) {
    appendText(
      gameSection,
      `${ACTIVE_INSTANCE_CONFIG.identity.schoolShortName.toUpperCase()} ${gameTitle(game).toUpperCase()}`,
      'party-game-context',
      documentObject
    );
  }
  const timing = [kickoffLabel(game), arrivalLabel(party)].filter(Boolean).join(' · ');
  appendText(gameSection, timing, 'party-module__time', documentObject);

  const hostSection = documentObject.createElement('div');
  hostSection.className = 'party-module__fact party-module__fact--host';
  appendSectionEyebrow(hostSection, 'Hosted by', documentObject);
  const hosted = documentObject.createElement('p');
  hosted.className = 'party-module__host';
  const host = documentObject.createElement('strong');
  host.textContent = party.organizer_name;
  hosted.append(host);
  hostSection.append(hosted);

  summary.append(gameSection, hostSection);
  module.append(summary);

  const details = documentObject.createElement('section');
  details.className = 'party-module__section party-module__details';
  appendSectionEyebrow(details, 'Details', documentObject);
  appendTags(details, watchPartyTagLabels(party, venue), documentObject);
  appendText(details, party.restrictions_note, 'party-module__note', documentObject);
  appendText(details, party.game_day_note, 'party-module__note', documentObject);

  const requestsExternalRsvp = watchPartyRequestsExternalRsvp(party);
  if (party.official_event_url && (nativeWatchPartyRsvpEnabled(party) || !requestsExternalRsvp)) {
    const link = documentObject.createElement('a');
    link.className = 'party-module__event';
    link.href = party.official_event_url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Official event page ↗';
    details.append(link);
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
    details.append(report);
  }

  if (details.children.length > 1) module.append(details);

  appendExternalRsvp(module, party, documentObject);
  appendNativeRsvp(module, party, documentObject);
  return module;
}