import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady } from './accounts-core.mjs';

const HISTORY_CACHE_MS = 60000;
const HISTORY_RETRY_DELAY_MS = 350;
const BADGE_IDS = new Set([
  'first_down', 'chain_mover', 'home_field', 'road_game', 'bowl_eligible',
  'play_caller', 'postgame_report'
]);

let currentSummary = null;
let currentSummaryAt = 0;
let signedIn = false;
let accountStateRevision = 0;
let requestInFlight = null;

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function clean(value) {
  return String(value ?? '').trim();
}

function nonnegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function validateSeasonSummary(payload) {
  const summary = payload?.seasonSummary;
  if (!payload || payload.ok !== true || !summary || typeof summary !== 'object') return null;
  const season = nonnegativeInteger(summary.season);
  const stats = summary.stats;
  if (season === null || !stats || typeof stats !== 'object') return null;

  const normalizedStats = {
    gamesWatched: nonnegativeInteger(stats.games_watched),
    venuesVisited: nonnegativeInteger(stats.venues_visited),
    citiesVisited: nonnegativeInteger(stats.cities_visited),
    currentStreak: nonnegativeInteger(stats.current_streak),
    bestStreak: nonnegativeInteger(stats.best_streak)
  };
  if (Object.values(normalizedStats).some((value) => value === null)) return null;
  if (normalizedStats.currentStreak > normalizedStats.bestStreak ||
      normalizedStats.venuesVisited > normalizedStats.gamesWatched ||
      normalizedStats.citiesVisited > normalizedStats.gamesWatched) return null;

  if (!Array.isArray(summary.badges) || !Array.isArray(summary.history) ||
      summary.badges.length > 12 || summary.history.length > 40) return null;

  const badges = [];
  const seenBadges = new Set();
  for (const badge of summary.badges) {
    const id = clean(badge?.id);
    const label = clean(badge?.label);
    const description = clean(badge?.description);
    const current = nonnegativeInteger(badge?.current);
    const target = nonnegativeInteger(badge?.target);
    if (!BADGE_IDS.has(id) || seenBadges.has(id) || !label || label.length > 40 ||
        !description || description.length > 140 || current === null || target === null || target < 1 ||
        current > target || typeof badge?.earned !== 'boolean' || badge.earned !== (current >= target)) return null;
    seenBadges.add(id);
    badges.push(Object.freeze({ id, label, description, current, target, earned: badge.earned }));
  }

  const history = [];
  const seenGames = new Set();
  for (const row of summary.history) {
    const gameId = clean(row?.game_id);
    const venueId = clean(row?.venue_id);
    const rowSeason = nonnegativeInteger(row?.season);
    const scheduleOrder = nonnegativeInteger(row?.schedule_order);
    const opponentName = clean(row?.opponent_name);
    const gameDate = clean(row?.game_date);
    const homeAway = clean(row?.home_away);
    const venueName = clean(row?.venue_name);
    const city = clean(row?.city);
    const region = clean(row?.region);
    if (!/^game_[a-f0-9]{24}$/.test(gameId) || !/^venue_[a-f0-9]{24}$/.test(venueId) ||
        seenGames.has(gameId) || rowSeason !== season || scheduleOrder === null || !opponentName ||
        opponentName.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(gameDate) ||
        !['home', 'away'].includes(homeAway) || !venueName || venueName.length > 120 ||
        city.length > 80 || region.length > 80) return null;
    seenGames.add(gameId);
    history.push(Object.freeze({
      gameId, venueId, season: rowSeason, scheduleOrder, opponentName, gameDate,
      homeAway, venueName, city, region
    }));
  }

  if (history.length !== normalizedStats.gamesWatched) return null;
  return Object.freeze({
    season,
    stats: Object.freeze(normalizedStats),
    badges: Object.freeze(badges),
    history: Object.freeze(history)
  });
}

function injectStyles() {
  if (document.querySelector('link[data-cgb-account-history-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-history.css';
  link.dataset.cgbAccountHistoryStyle = 'true';
  document.head.append(link);
}

function seasonSection() {
  return document.querySelector('.accounts-signed-in .accounts-season');
}

function renderLoading() {
  const section = seasonSection();
  const content = section?.querySelector('.accounts-season-content');
  const title = section?.querySelector('#accounts-season-title');
  if (!section || !content || !title || currentSummary) return;
  section.dataset.loading = 'true';
  title.textContent = 'CGB Season';
  const loading = document.createElement('p');
  loading.className = 'accounts-empty';
  loading.dataset.seasonLoading = 'true';
  loading.textContent = 'Loading your season…';
  content.replaceChildren(loading);
}

function statCard(value, label) {
  const card = document.createElement('div');
  card.className = 'accounts-stat';
  const number = document.createElement('strong');
  number.textContent = String(value);
  const copy = document.createElement('span');
  copy.textContent = label;
  card.append(number, copy);
  return card;
}

function renderSummary(summary) {
  const section = seasonSection();
  if (!section) return;
  const content = section.querySelector('.accounts-season-content');
  const title = section.querySelector('#accounts-season-title');
  if (!content || !title) return;
  delete section.dataset.loading;
  content.replaceChildren();
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
    statCard(summary.stats.gamesWatched, 'Games'),
    statCard(summary.stats.venuesVisited, 'Venues'),
    statCard(summary.stats.citiesVisited, 'Cities'),
    statCard(summary.stats.currentStreak, 'Current streak'),
    statCard(summary.stats.bestStreak, 'Best streak')
  );
  content.append(stats);

  const badgesHeading = document.createElement('strong');
  badgesHeading.className = 'accounts-subheading';
  badgesHeading.textContent = 'Achievements';
  const badges = document.createElement('div');
  badges.className = 'accounts-badges';
  summary.badges.forEach((badge) => {
    const item = document.createElement('div');
    item.className = 'accounts-badge';
    item.dataset.earned = String(badge.earned);
    const copy = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = badge.label;
    const description = document.createElement('span');
    description.textContent = badge.description;
    copy.append(label, description);
    const progress = document.createElement('span');
    progress.className = 'accounts-badge__progress';
    progress.textContent = badge.earned ? 'Earned' : `${badge.current} / ${badge.target}`;
    item.append(copy, progress);
    badges.append(item);
  });
  content.append(badgesHeading, badges);

  const historyHeading = document.createElement('strong');
  historyHeading.className = 'accounts-subheading';
  historyHeading.textContent = 'Games watched';
  const history = document.createElement('div');
  history.className = 'accounts-game-history';
  if (!summary.history.length) {
    const empty = document.createElement('p');
    empty.className = 'accounts-empty';
    empty.textContent = 'Your completed game history will build here as the season moves.';
    history.append(empty);
  } else {
    [...summary.history].reverse().forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'accounts-game-row';
      const game = document.createElement('div');
      const opponent = document.createElement('strong');
      opponent.textContent = `${entry.homeAway === 'away' ? 'at' : 'vs.'} ${entry.opponentName}`;
      const date = document.createElement('span');
      date.textContent = entry.gameDate;
      game.append(opponent, date);
      const venue = document.createElement('div');
      const venueName = document.createElement('strong');
      venueName.textContent = entry.venueName;
      const place = document.createElement('span');
      place.textContent = [entry.city, entry.region].filter(Boolean).join(', ');
      venue.append(venueName, place);
      row.append(game, venue);
      history.append(row);
    });
  }
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
