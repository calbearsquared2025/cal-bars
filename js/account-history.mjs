import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady } from './accounts-core.mjs';

const STYLE_ATTR = 'data-cgb-account-history-style';
const HISTORY_CACHE_MS = 60_000;
const HISTORY_RETRY_DELAY_MS = 180;
const BADGE_ASSETS = Object.freeze({
  first_down: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/First_Down.webp',
  chain_mover: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Chain_Mover.webp',
  home_field: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Home_Field.webp',
  road_game: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150177/Road_Game.webp',
  bowl_eligible: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150177/Bowl_Eligible.webp',
  play_caller: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Play_Caller.webp',
  postgame_report: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Postgame_Report.webp'
});
const VISIBLE_BADGE_IDS = new Set(Object.keys(BADGE_ASSETS).filter((id) => id !== 'bowl_eligible'));

let currentSummary = null;
let currentSummaryAt = 0;
let signedIn = false;
let accountStateRevision = 0;
let requestInFlight = null;

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function injectStyles() {
  if (document.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-history.css';
  link.setAttribute(STYLE_ATTR, 'true');
  document.head.append(link);
}

function seasonSection() {
  return document.querySelector('.accounts-season');
}

function renderLoading() {
  const section = seasonSection();
  if (!section) return;
  const content = section.querySelector('.accounts-season-content');
  const title = section.querySelector('#accounts-season-title');
  if (!content || !title) return;
  section.dataset.loading = 'true';
  title.textContent = 'CGB Season';
  content.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'accounts-empty accounts-season-loading';
  loading.textContent = 'Loading season…';
  content.append(loading);
}

function finiteNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function safeText(value, maximumLength = 120) {
  const text = String(value ?? '').trim();
  return text.length <= maximumLength ? text : '';
}

function validateBadge(value) {
  if (!value || typeof value !== 'object') return null;
  const id = safeText(value.id, 40);
  const label = safeText(value.label, 80);
  const description = safeText(value.description, 180);
  const current = finiteNonNegativeInteger(value.current);
  const target = finiteNonNegativeInteger(value.target);
  if (!BADGE_ASSETS[id] || !label || !description || current === null || target === null || target < 1 ||
      current > target || typeof value.earned !== 'boolean' || value.earned !== (current >= target)) return null;
  return {
    id,
    label,
    description,
    earned: value.earned === true,
    current,
    target
  };
}

function validateHistoryEntry(value) {
  if (!value || typeof value !== 'object') return null;
  const gameId = safeText(value.game_id ?? value.gameId, 80);
  const opponentName = safeText(value.opponent_name ?? value.opponentName, 100);
  const gameDate = safeText(value.game_date ?? value.gameDate, 40);
  const homeAway = safeText(value.home_away ?? value.homeAway, 10);
  const venueName = safeText(value.venue_name ?? value.venueName, 120);
  const city = safeText(value.city, 100);
  const region = safeText(value.region, 80);
  if (!gameId || !opponentName || !gameDate || !venueName || !['home', 'away'].includes(homeAway)) return null;
  return { gameId, opponentName, gameDate, homeAway, venueName, city, region };
}

function validateSeasonSummary(payload) {
  const summary = payload?.seasonSummary;
  if (!summary || typeof summary !== 'object') return null;
  const season = finiteNonNegativeInteger(summary.season);
  const stats = summary.stats;
  if (!stats || typeof stats !== 'object') return null;
  const gamesWatched = finiteNonNegativeInteger(stats.games_watched ?? stats.gamesWatched);
  const venuesVisited = finiteNonNegativeInteger(stats.venues_visited ?? stats.venuesVisited);
  const citiesVisited = finiteNonNegativeInteger(stats.cities_visited ?? stats.citiesVisited);
  const currentStreak = finiteNonNegativeInteger(stats.current_streak ?? stats.currentStreak);
  const bestStreak = finiteNonNegativeInteger(stats.best_streak ?? stats.bestStreak);
  if ([season, gamesWatched, venuesVisited, citiesVisited, currentStreak, bestStreak].some((value) => value === null)) return null;
  if (!Array.isArray(summary.badges) || !Array.isArray(summary.history)) return null;
  const badges = summary.badges.map(validateBadge);
  const history = summary.history.map(validateHistoryEntry);
  if (badges.some((value) => !value) || history.some((value) => !value)) return null;
  if (new Set(badges.map((badge) => badge.id)).size !== badges.length) return null;
  return {
    season,
    stats: { gamesWatched, venuesVisited, citiesVisited, currentStreak, bestStreak },
    badges,
    history
  };
}

function statItem(value, label) {
  const item = document.createElement('div');
  item.className = 'accounts-stat';
  const number = document.createElement('strong');
  number.textContent = String(value);
  const copy = document.createElement('span');
  copy.textContent = label;
  item.append(number, copy);
  return item;
}

function subsectionHeading(eyebrowText, titleText) {
  const heading = document.createElement('div');
  heading.className = 'accounts-section__heading accounts-season-subheading';
  const copy = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = eyebrowText;
  const title = document.createElement('h4');
  title.textContent = titleText;
  copy.append(eyebrow, title);
  heading.append(copy);
  return heading;
}

function renderSummary(summary) {
  const section = seasonSection();
  if (!section) return;
  const content = section.querySelector('.accounts-season-content');
  const title = section.querySelector('#accounts-season-title');
  if (!content || !title) return;
  delete section.dataset.loading;
  content.replaceChildren();
  queueMicrotask(() => window.CGBAccountProfilePolish?.sync?.());
  title.textContent = summary?.season ? `${summary.season} CGB Season` : 'CGB Season';

  if (!summary) {
    const unavailable = document.createElement('p');
    unavailable.className = 'accounts-empty';
    unavailable.textContent = 'Season history is temporarily unavailable.';
    content.append(unavailable);
    return;
  }

  const stats = document.createElement('div');
  stats.className = 'accounts-stats';
  stats.append(
    statItem(summary.stats.gamesWatched, 'Games'),
    statItem(summary.stats.venuesVisited, 'Venues'),
    statItem(summary.stats.citiesVisited, 'Cities'),
    statItem(summary.stats.currentStreak, 'Current streak'),
    statItem(summary.stats.bestStreak, 'Best streak')
  );
  content.append(stats);

  const badgesHeading = subsectionHeading('Achievements', 'Coaster Collection');
  const badges = document.createElement('div');
  badges.className = 'accounts-badges';
  summary.badges.filter((badge) => VISIBLE_BADGE_IDS.has(badge.id)).forEach((badge) => {
    const item = document.createElement('div');
    item.className = 'accounts-badge';
    item.dataset.earned = String(badge.earned);

    const artwork = document.createElement('img');
    artwork.className = 'accounts-badge__artwork';
    artwork.src = BADGE_ASSETS[badge.id];
    artwork.alt = `${badge.label} achievement artwork`;
    artwork.width = 512;
    artwork.height = 512;

    const copy = document.createElement('div');
    copy.className = 'accounts-badge__copy';
    const label = document.createElement('strong');
    label.textContent = badge.label;
    const description = document.createElement('span');
    description.textContent = badge.description;
    copy.append(label, description);

    const progress = document.createElement('span');
    progress.className = 'accounts-badge__progress';
    progress.textContent = badge.earned ? 'Earned' : `${badge.current} / ${badge.target}`;
    item.append(artwork, copy, progress);
    badges.append(item);
  });
  content.append(badgesHeading, badges);

  const historyHeading = subsectionHeading('Your games', 'Games watched');
  if (!summary.history.length) {
    const empty = document.createElement('p');
    empty.className = 'accounts-empty';
    empty.textContent = 'Your completed game history will build here as the season moves.';
    content.append(historyHeading, empty);
    return;
  }

  const history = document.createElement('table');
  history.className = 'accounts-game-history';
  const caption = document.createElement('caption');
  caption.className = 'sr-only';
  caption.textContent = 'Games watched this season';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  const gameHead = document.createElement('th');
  gameHead.scope = 'col';
  gameHead.textContent = 'Game';
  const venueHead = document.createElement('th');
  venueHead.scope = 'col';
  venueHead.textContent = 'Watched at';
  headRow.append(gameHead, venueHead);
  head.append(headRow);
  const body = document.createElement('tbody');
  [...summary.history].reverse().forEach((entry) => {
    const row = document.createElement('tr');
    const game = document.createElement('td');
    const opponent = document.createElement('strong');
    opponent.textContent = `${entry.homeAway === 'away' ? 'at' : 'vs.'} ${entry.opponentName}`;
    const date = document.createElement('span');
    date.textContent = entry.gameDate;
    game.append(opponent, date);
    const venue = document.createElement('td');
    const venueName = document.createElement('strong');
    venueName.textContent = entry.venueName;
    const place = document.createElement('span');
    place.textContent = [entry.city, entry.region].filter(Boolean).join(', ');
    venue.append(venueName, place);
    row.append(game, venue);
    body.append(row);
  });
  history.append(caption, head, body);
  content.append(historyHeading, history);
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function acceptAttendanceResponse(payload) {
  if (!signedIn) return null;
  const summary = validateSeasonSummary(payload);
  if (!summary) return null;
  currentSummary = summary;
  currentSummaryAt = Date.now();
  renderSummary(summary);
  return summary;
}

async function requestSeasonSummary() {
  const response = await window.CGBAccounts.request('getFanAttendance');
  const summary = validateSeasonSummary(response);
  if (!summary) throw new Error('invalid_season_summary');
  return summary;
}

async function loadSummary({ force = false } = {}) {
  if (!enabled() || !signedIn || !window.CGBAccounts?.request) return null;
  const revision = accountStateRevision;
  if (!force && currentSummary && Date.now() - currentSummaryAt < HISTORY_CACHE_MS) {
    renderSummary(currentSummary);
    return currentSummary;
  }
  if (requestInFlight?.revision === revision) return requestInFlight.promise;
  if (!currentSummary) renderLoading();

  let promise;
  promise = (async () => {
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const summary = await requestSeasonSummary();
        if (revision !== accountStateRevision || !signedIn) return null;
        currentSummary = summary;
        currentSummaryAt = Date.now();
        renderSummary(summary);
        return summary;
      } catch (error) {
        lastError = error;
        if (revision !== accountStateRevision || !signedIn) return null;
        if (attempt === 0) {
          console.warn('CGB season history load failed; retrying once.', error);
          await delay(HISTORY_RETRY_DELAY_MS);
          if (revision !== accountStateRevision || !signedIn) return null;
        }
      }
    }

    console.error('CGB season history unavailable after retry.', lastError);
    if (revision === accountStateRevision && signedIn) renderSummary(null);
    return null;
  })().finally(() => {
    if (requestInFlight?.promise === promise) requestInFlight = null;
  });
  requestInFlight = { revision, promise };
  return promise;
}

function setAccountState(nextSignedIn) {
  const normalized = nextSignedIn === true;
  if (signedIn === normalized && normalized) return;
  signedIn = normalized;
  accountStateRevision += 1;
  requestInFlight = null;
  if (!signedIn) {
    currentSummary = null;
    currentSummaryAt = 0;
    return;
  }
  if (currentSummary) renderSummary(currentSummary);
  else renderLoading();
}

function initializeAccountHistory() {
  if (!enabled()) return false;
  injectStyles();
  return true;
}

window.CGBAccountHistory = Object.freeze({
  setAccountState,
  acceptAttendanceResponse,
  refresh: (options = {}) => loadSummary({ force: options.force === true }),
  render: () => currentSummary ? renderSummary(currentSummary) : renderLoading(),
  getSummary: () => currentSummary
});

initializeAccountHistory();
