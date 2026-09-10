import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady } from './accounts-core.mjs';

const HISTORY_CACHE_MS = 60000;
const BADGE_IDS = new Set([
  'first_down', 'chain_mover', 'home_field', 'road_game', 'bowl_eligible',
  'play_caller', 'postgame_report'
]);
let currentSummary = null;
let currentSummaryAt = 0;
let signedIn = false;
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

  if (!Array.isArray(summary.badges) || !Array.isArray(summary.history) || summary.badges.length > 12 || summary.history.length > 40) {
    return null;
  }

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

function ensureSection() {
  const signedInSurface = document.querySelector('.accounts-signed-in');
  const identity = signedInSurface?.querySelector('.accounts-identity');
  if (!signedInSurface || !identity) return null;
  let section = signedInSurface.querySelector('.accounts-season');
  if (section) return section;
  section = document.createElement('section');
  section.className = 'accounts-section accounts-season';
  section.setAttribute('aria-labelledby', 'accounts-season-title');
  section.innerHTML = `
    <div class="accounts-section__heading">
      <div>
        <span class="eyebrow">Your season</span>
        <h3 id="accounts-season-title">CGB Season</h3>
      </div>
    </div>
    <div class="accounts-season-content">
      <p class="accounts-empty">Your completed game history will build here as the season moves.</p>
    </div>`;
  identity.insertAdjacentElement('afterend', section);
  return section;
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
  const section = ensureSection();
  if (!section) return;
  const content = section.querySelector('.accounts-season-content');
  const title = section.querySelector('#accounts-season-title');
  if (!content || !title) return;
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

async function loadSummary({ force = false } = {}) {
  if (!enabled() || !signedIn || !window.CGBAccounts?.request) return null;
  if (!force && currentSummary && Date.now() - currentSummaryAt < HISTORY_CACHE_MS) {
    renderSummary(currentSummary);
    return currentSummary;
  }
  if (requestInFlight) return requestInFlight;
  requestInFlight = (async () => {
    try {
      const response = await window.CGBAccounts.request('getFanAttendance');
      const summary = validateSeasonSummary(response);
      currentSummary = summary;
      currentSummaryAt = Date.now();
      renderSummary(summary);
      return summary;
    } catch (_) {
      renderSummary(null);
      return null;
    } finally {
      requestInFlight = null;
    }
  })();
  return requestInFlight;
}

function handleAccountState(event) {
  signedIn = event?.detail?.signedIn === true;
  if (!signedIn) {
    currentSummary = null;
    currentSummaryAt = 0;
    return;
  }
  void loadSummary({ force: true });
}

function initializeAccountHistory() {
  if (!enabled()) return false;
  injectStyles();
  window.addEventListener('cgb:account-state', handleAccountState);
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#cgb-account-button')) return;
    if (signedIn) void loadSummary();
  });
  if (window.CGBAccounts?.isSignedIn?.()) {
    signedIn = true;
    void loadSummary({ force: true });
  }
  return true;
}

window.CGBAccountHistory = Object.freeze({
  refresh: () => loadSummary({ force: true }),
  getSummary: () => currentSummary
});

initializeAccountHistory();
