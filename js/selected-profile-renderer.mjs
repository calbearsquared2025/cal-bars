import {
  bearCountCopy,
  compactVenueLocation,
  getFanCount,
  venueBadgeDescriptors
} from './core.mjs';
import { createIcon } from './icons.mjs';
import { venueActivityPresentation } from './venue-activity-core.mjs';
import { getWatchPartiesForVenueGame } from './watch-party-display-core.mjs';
import { createWatchPartyModule } from './watch-party-renderer.mjs';

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return '';
  if (distance < 0.1) return 'Nearby';
  return `${distance.toFixed(distance < 10 ? 1 : 0)} mi away`;
}

function createBadges(venue, party, documentObject) {
  const badges = documentObject.createElement('span');
  badges.className = 'venue-badges';
  venueBadgeDescriptors(venue, party).forEach(({ text, kind }) => {
    const badge = documentObject.createElement('span');
    badge.className = `venue-badge badge--${kind}`;
    badge.textContent = text;
    badges.append(badge);
  });
  return badges;
}

export function selectedAttendanceViewModel({ state, game, venue } = {}) {
  const publicCount = getFanCount(state?.snapshot, state?.gameId, venue?.venue_id);
  const selectedByThisBrowser = state?.fanIntent?.selections?.[state?.gameId] === venue?.venue_id;
  const number = selectedByThisBrowser ? Math.max(publicCount, 1) : publicCount;
  const currentCopy = bearCountCopy(number);
  const presentation = venueActivityPresentation({
    snapshot: state?.snapshot,
    game,
    venue,
    currentCopy
  });

  if (game?.game_status === 'completed') {
    return {
      kind: 'completed',
      number,
      ariaLabel: presentation.primary,
      primary: presentation.primary,
      secondary: presentation.secondary
    };
  }

  return {
    kind: number === 0 ? 'empty' : 'positive',
    number,
    ariaLabel: currentCopy,
    primary: presentation.primary,
    secondary: presentation.secondary
  };
}

function createAttendance(state, game, venue, documentObject) {
  const view = selectedAttendanceViewModel({ state, game, venue });
  const count = documentObject.createElement('p');
  count.className = 'bear-count';
  count.setAttribute('aria-label', view.ariaLabel);

  if (view.kind === 'completed') {
    count.textContent = view.primary;
  } else {
    const icon = createIcon('users', { className: 'ui-icon bear-count__icon', documentObject });
    if (view.kind === 'empty') {
      count.classList.add('bear-count--empty');
      const prompt = documentObject.createElement('strong');
      prompt.className = 'bear-count__prompt';
      prompt.textContent = 'Be the first.';
      count.append(icon, prompt);
    } else {
      const numeral = documentObject.createElement('span');
      numeral.className = 'bear-count__number';
      numeral.textContent = String(view.number);
      const label = documentObject.createElement('span');
      label.className = 'bear-count__label';
      label.textContent = view.number === 1 ? 'Bear watching here' : 'Bears watching here';
      count.append(icon, numeral, label);
    }
  }

  let history = null;
  if (view.secondary.length) {
    history = documentObject.createElement('p');
    history.className = 'venue-activity-history';
    view.secondary.forEach((line, index) => {
      if (index > 0) history.append(documentObject.createElement('br'));
      history.append(documentObject.createTextNode(line));
    });
  }
  return { count, history };
}

function createDirectionsLink(href, documentObject) {
  const directions = documentObject.createElement('a');
  directions.className = 'selected-card__directions-inline';
  directions.href = href;
  directions.target = '_blank';
  directions.rel = 'noopener';
  directions.textContent = 'Directions';
  return directions;
}

function createPlanWatchPartyAction(documentObject) {
  const button = documentObject.createElement('button');
  button.type = 'button';
  button.className = 'selected-card__plan-party';
  button.setAttribute('aria-label', 'No listed Watch Party for this game. Add a Watch Party');

  const status = documentObject.createElement('span');
  status.className = 'selected-card__plan-party-status';
  status.textContent = 'No listed Watch Party for this game.';
  const action = documentObject.createElement('span');
  action.className = 'selected-card__plan-party-action';
  action.textContent = '+ Add a Watch Party';
  button.append(status, action);
  return button;
}

function createIntentButton(state, venue, documentObject) {
  const selected = state?.fanIntent?.selections?.[state?.gameId] === venue.venue_id;
  const intent = documentObject.createElement('button');
  intent.type = 'button';
  intent.className = 'primary-button intent-button';
  intent.dataset.venueId = venue.venue_id;
  intent.dataset.intentState = selected ? 'selected' : 'available';
  intent.setAttribute('aria-pressed', String(selected));
  intent.setAttribute('aria-label', selected ? 'You’ll be here. Undo selection' : 'I’ll be here');
  intent.disabled = true;

  const main = documentObject.createElement('span');
  main.className = 'intent-button__main';
  if (selected) main.append(createIcon('check', { documentObject }), documentObject.createTextNode('You’ll be here'));
  else main.textContent = 'I’ll be here';
  intent.append(main);
  if (selected) {
    const undo = documentObject.createElement('span');
    undo.className = 'intent-button__undo';
    undo.textContent = 'Undo';
    intent.append(undo);
  }
  return intent;
}

function createSelectedActionRow({ state, venue, hasWatchParty, onShare, documentObject }) {
  const row = documentObject.createElement('div');
  row.className = 'action-row';
  row.dataset.venueId = venue.venue_id;
  row.append(createIntentButton(state, venue, documentObject));

  const share = documentObject.createElement('button');
  share.type = 'button';
  share.className = 'secondary-button selected-card__share';
  share.setAttribute('aria-label', hasWatchParty ? 'Share Watch Party' : 'Share');
  share.textContent = hasWatchParty ? 'Share Watch Party' : 'Share';
  share.addEventListener('click', onShare);
  row.append(share);
  return row;
}

export function createSelectedVenueCard({
  state,
  venue,
  game,
  mobile,
  distance,
  directionsHref,
  onCollapse,
  onShare,
  documentObject = document
}) {
  const parties = getWatchPartiesForVenueGame(state.snapshot, state.gameId, venue.venue_id);
  const card = documentObject.createElement('article');
  card.className = 'selected-card';
  card.dataset.venueId = venue.venue_id;

  const header = documentObject.createElement('div');
  header.className = 'selected-card__header';
  const heading = documentObject.createElement('div');
  heading.append(createBadges(venue, parties[0] || null, documentObject));
  const title = documentObject.createElement('h2');
  title.textContent = venue.name;
  heading.append(title);

  const location = documentObject.createElement('p');
  location.className = 'venue-location';
  const distanceCopy = formatDistance(distance);
  const compactLocation = compactVenueLocation(venue);
  const locality = [venue?.city, venue?.region].filter(Boolean).join(', ');
  const mobileLocation = locality
    ? compactLocation.replace(locality, locality.replaceAll(' ', '\u00a0'))
    : compactLocation;
  location.textContent = mobile
    ? mobileLocation
    : [compactLocation, distanceCopy].filter(Boolean).join(' · ');
  heading.append(location);

  if (mobile) {
    const proximity = documentObject.createElement('div');
    proximity.className = 'selected-card__proximity-row';
    if (distanceCopy) {
      const distanceElement = documentObject.createElement('span');
      distanceElement.className = 'selected-card__distance';
      distanceElement.textContent = distanceCopy;
      proximity.append(distanceElement);
    }
    const directions = createDirectionsLink(directionsHref, documentObject);
    if (distanceCopy) directions.textContent = '\u00a0Directions';
    proximity.append(directions);
    heading.append(proximity);
  } else {
    location.append(documentObject.createTextNode(' '), createDirectionsLink(directionsHref, documentObject));
  }

  header.append(heading);
  const collapse = documentObject.createElement('button');
  collapse.type = 'button';
  collapse.className = 'icon-button';
  collapse.setAttribute('aria-label', 'Collapse selected venue');
  collapse.append(createIcon('chevron-down', { documentObject }));
  collapse.addEventListener('click', onCollapse);
  header.append(collapse);
  card.append(header);

  if (venue.short_description) {
    const description = documentObject.createElement('p');
    description.className = 'venue-description';
    description.textContent = venue.short_description;
    card.append(description);
  }

  const attendance = createAttendance(state, game, venue, documentObject);
  card.append(attendance.count);
  if (attendance.history) card.append(attendance.history);

  if (parties.length) {
    parties.forEach((party, index) => card.append(createWatchPartyModule({
      party,
      index,
      total: parties.length,
      snapshot: state.snapshot,
      detail: false,
      documentObject
    })));
  } else {
    card.append(createPlanWatchPartyAction(documentObject));
  }

  card.append(createSelectedActionRow({
    state,
    venue,
    hasWatchParty: parties.length > 0,
    onShare,
    documentObject
  }));
  return card;
}
