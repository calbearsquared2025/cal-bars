import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady, validatePublicAttendanceResponse } from './accounts-core.mjs';
import { isCgbAvatarPresetUrl } from './account-avatar-presets.mjs';

const STYLE_ATTR = 'data-cgb-public-community-style';
const CACHE_MS = 60000;
const PROFILE_ID_PATTERN = /^profile_[a-f0-9]{24}$/;
const BADGE_ASSETS = Object.freeze({
  first_down: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/First_Down.webp',
  chain_mover: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Chain_Mover.webp',
  home_field: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Home_Field.webp',
  road_game: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150177/Road_Game.webp',
  play_caller: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Play_Caller.webp',
  postgame_report: 'https://res.cloudinary.com/noouxqko/image/upload/v1789150178/Postgame_Report.webp'
});
const VISIBLE_BADGE_IDS = new Set(Object.keys(BADGE_ASSETS));
const KNOWN_BADGE_IDS = new Set([...VISIBLE_BADGE_IDS, 'bowl_eligible']);

let leaderboard = null;
let leaderboardAt = 0;
let requestInFlight = null;
let currentProfile = null;
let initialized = false;
let activeBearAnchor = null;
let attendeeObserver = null;
let currentView = 'profile';

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

function injectStyles() {
  if (document.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-public-community.css';
  link.setAttribute(STYLE_ATTR, 'true');
  document.head.append(link);
}

function initialsFor(name) {
  const words = clean(name).split(/\s+/).filter(Boolean);
  if (!words.length) return 'B';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
}

function validateBadge(value) {
  if (!value || typeof value !== 'object') return null;
  const id = clean(value.id);
  const label = clean(value.label);
  const description = clean(value.description);
  if (!KNOWN_BADGE_IDS.has(id) || !label || label.length > 40 || !description || description.length > 140) return null;
  return Object.freeze({ id, label, description });
}

function validateEntry(value) {
  if (!value || typeof value !== 'object') return null;
  const expected = [
    'profile_id', 'display_name', 'avatar_url', 'games_watched', 'venues_visited',
    'current_streak', 'best_streak', 'earned_badges', 'rank'
  ];
  const actualKeys = Object.keys(value);
  if (actualKeys.some((key) => !expected.includes(key) && key !== 'x_handle') ||
      expected.some((key) => !actualKeys.includes(key))) return null;
  const profileId = clean(value.profile_id);
  const displayName = clean(value.display_name);
  const avatarUrl = isCgbAvatarPresetUrl(value.avatar_url) ? clean(value.avatar_url) : '';
  const xHandle = clean(value.x_handle).replace(/^@+/, '');
  const gamesWatched = nonnegativeInteger(value.games_watched);
  const venuesVisited = nonnegativeInteger(value.venues_visited);
  const currentStreak = nonnegativeInteger(value.current_streak);
  const bestStreak = nonnegativeInteger(value.best_streak);
  const rank = nonnegativeInteger(value.rank);
  if (!PROFILE_ID_PATTERN.test(profileId) || !displayName || displayName.length > 80 ||
      (xHandle && !/^[A-Za-z0-9_]{1,30}$/.test(xHandle)) ||
      gamesWatched === null || gamesWatched < 1 || venuesVisited === null || venuesVisited > gamesWatched ||
      currentStreak === null || bestStreak === null || currentStreak > bestStreak || rank === null || rank < 1 ||
      !Array.isArray(value.earned_badges) || value.earned_badges.length > 12) return null;
  const badges = value.earned_badges.map(validateBadge);
  if (badges.some((badge) => !badge)) return null;
  const visibleBadges = badges.filter((badge) => VISIBLE_BADGE_IDS.has(badge.id));

  return Object.freeze({
    profileId,
    displayName,
    avatarUrl,
    xHandle,
    gamesWatched,
    venuesVisited,
    currentStreak,
    bestStreak,
    rank,
    badges: Object.freeze(visibleBadges)
  });
}

function validateLeaderboard(payload) {
  if (!payload || payload.ok !== true || payload.action !== 'publicLeaderboard' || !Array.isArray(payload.entries)) return null;
  const season = nonnegativeInteger(payload.season);
  if (season === null || payload.entries.length > 500) return null;
  const entries = payload.entries.map(validateEntry);
  if (entries.some((entry) => !entry)) return null;
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index].gamesWatched > entries[index - 1].gamesWatched) return null;
  }
  return Object.freeze({ season, entries: Object.freeze(entries) });
}

async function fetchLeaderboard({ force = false } = {}) {
  if (!enabled()) return null;
  const now = Date.now();
  if (!force && leaderboard && now - leaderboardAt < CACHE_MS) return leaderboard;
  if (requestInFlight) return requestInFlight;

  requestInFlight = (async () => {
    const url = new URL(CGB_ACCOUNTS_CONFIG.endpoint);
    url.searchParams.set('action', 'publicLeaderboard');
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return null;
    const validated = validateLeaderboard(payload);
    if (!validated) return null;
    leaderboard = validated;
    leaderboardAt = Date.now();
    return leaderboard;
  })().finally(() => {
    requestInFlight = null;
  });

  return requestInFlight;
}

async function fetchAttendanceForCard(card) {
  const state = window.CGBApp?.getState?.();
  const gameId = clean(state?.gameId);
  const venueId = clean(card?.dataset?.venueId);
  if (!gameId || !venueId) return null;
  try {
    const url = new URL(CGB_ACCOUNTS_CONFIG.endpoint, window.location.href);
    url.searchParams.set('action', 'publicAttendance');
    url.searchParams.set('gameId', gameId);
    url.searchParams.set('venueId', venueId);
    const response = await fetch(url.toString(), { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return null;
    return validatePublicAttendanceResponse(payload);
  } catch (_) {
    return null;
  }
}

function avatarElement(entry, className = '') {
  const avatar = document.createElement(entry.avatarUrl ? 'img' : 'span');
  avatar.className = ['public-community-avatar', className].filter(Boolean).join(' ');
  if (entry.avatarUrl) {
    avatar.src = entry.avatarUrl;
    avatar.alt = '';
    avatar.loading = 'lazy';
    avatar.decoding = 'async';
  } else {
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initialsFor(entry.displayName);
  }
  return avatar;
}

function syncViewState(shell) {
  if (!shell) return;
  shell.dataset.myCgbView = currentView;
  shell.querySelectorAll('[data-my-cgb-view-target]').forEach((button) => {
    const active = button.dataset.myCgbViewTarget === currentView;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

function setView(next, { focus = false } = {}) {
  if (next !== 'profile' && next !== 'leaderboard') return false;
  currentView = next;
  const shell = document.querySelector('.accounts-shell');
  syncViewState(shell);
  if (focus) shell?.querySelector(`[data-my-cgb-view-target="${next}"]`)?.focus({ preventScroll: true });
  return true;
}

function ensureViewStructure(shell) {
  if (!shell) return null;
  const signedOut = shell.querySelector('.accounts-signed-out');
  const signedIn = shell.querySelector('.accounts-signed-in');
  const header = shell.querySelector('.accounts-header');
  if (!signedOut || !signedIn || !header) return null;

  let tabs = shell.querySelector('.my-cgb-view-tabs');
  if (!tabs) {
    tabs = document.createElement('div');
    tabs.className = 'my-cgb-view-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'My CGB views');
    tabs.innerHTML = `
      <button id="my-cgb-profile-tab" type="button" role="tab" data-my-cgb-view-target="profile" aria-controls="my-cgb-profile-view">Profile</button>
      <button id="my-cgb-leaderboard-tab" type="button" role="tab" data-my-cgb-view-target="leaderboard" aria-controls="my-cgb-leaderboard-view">Leaderboard</button>`;
    header.insertAdjacentElement('afterend', tabs);
    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-my-cgb-view-target]');
      if (button) setView(button.dataset.myCgbViewTarget);
    });
    tabs.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setView(currentView === 'profile' ? 'leaderboard' : 'profile', { focus: true });
    });
  }

  let profileView = shell.querySelector('#my-cgb-profile-view');
  if (!profileView) {
    profileView = document.createElement('div');
    profileView.id = 'my-cgb-profile-view';
    profileView.className = 'my-cgb-profile-view';
    profileView.setAttribute('role', 'tabpanel');
    profileView.setAttribute('aria-labelledby', 'my-cgb-profile-tab');
    signedOut.insertAdjacentElement('beforebegin', profileView);
    profileView.append(signedOut, signedIn);
  }

  let leaderboardView = shell.querySelector('#my-cgb-leaderboard-view');
  if (!leaderboardView) {
    leaderboardView = document.createElement('section');
    leaderboardView.id = 'my-cgb-leaderboard-view';
    leaderboardView.className = 'public-community-section public-community-panel';
    leaderboardView.setAttribute('role', 'tabpanel');
    leaderboardView.setAttribute('aria-labelledby', 'my-cgb-leaderboard-tab');
    leaderboardView.innerHTML = `
      <div class="accounts-section__heading public-community-heading">
        <div>
          <span class="eyebrow">CGB community</span>
          <h3>Season leaderboard</h3>
        </div>
      </div>
      <p class="public-community-intro"></p>
      <div class="public-community-list"></div>
      <p class="public-community-status" role="status" aria-live="polite"></p>`;
    profileView.insertAdjacentElement('afterend', leaderboardView);
  }

  syncViewState(shell);
  return leaderboardView;
}

function ensureDetailDialog() {
  let dialog = document.querySelector('#public-bear-dialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'public-bear-dialog';
  dialog.className = 'public-bear-dialog';
  dialog.setAttribute('aria-labelledby', 'public-bear-title');
  dialog.setAttribute('aria-modal', 'false');
  dialog.innerHTML = `
    <div class="public-bear-shell">
      <header class="public-bear-header">
        <h2 id="public-bear-title">Bear profile</h2>
        <button class="icon-button public-bear-close" type="button" aria-label="Close Bear profile">×</button>
      </header>
      <div class="public-bear-content"></div>
    </div>`;
  dialog.querySelector('.public-bear-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    activeBearAnchor = null;
  });
  document.body.append(dialog);
  return dialog;
}

function positionBearDialog(dialog, anchor) {
  if (!dialog?.open || !anchor?.getBoundingClientRect) return;
  const margin = 12;
  const gap = 8;
  const anchorRect = anchor.getBoundingClientRect();
  const dialogRect = dialog.getBoundingClientRect();
  const width = dialogRect.width;
  const height = dialogRect.height;
  let left = anchorRect.left;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  let top = anchorRect.bottom + gap;
  if (top + height > window.innerHeight - margin) top = anchorRect.top - height - gap;
  top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
  dialog.style.left = `${Math.round(left)}px`;
  dialog.style.top = `${Math.round(top)}px`;
}

function statElement(label, value) {
  const wrapper = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = String(value);
  wrapper.append(term, description);
  return wrapper;
}

function badgeElement(badge) {
  const figure = document.createElement('figure');
  figure.className = 'public-bear-badge';
  const image = document.createElement('img');
  image.src = BADGE_ASSETS[badge.id];
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  const caption = document.createElement('figcaption');
  const label = document.createElement('strong');
  const description = document.createElement('span');
  label.textContent = badge.label;
  description.textContent = badge.description;
  caption.append(label, description);
  figure.append(image, caption);
  return figure;
}

function showPublicBear(entry, anchor) {
  const dialog = ensureDetailDialog();
  const content = dialog.querySelector('.public-bear-content');
  if (!content) return;
  content.replaceChildren();

  const identity = document.createElement('div');
  identity.className = 'public-bear-identity';
  const identityCopy = document.createElement('div');
  const name = document.createElement('strong');
  const rank = document.createElement('span');
  rank.className = 'public-bear-rank';
  name.textContent = entry.displayName;
  rank.textContent = entry.rank > 0 ? `#${entry.rank} this season` : 'New this season';
  identityCopy.append(name);
  if (entry.xHandle) {
    const xProfile = document.createElement('a');
    xProfile.className = 'public-bear-x-profile';
    xProfile.href = `https://x.com/${encodeURIComponent(entry.xHandle)}`;
    xProfile.target = '_blank';
    xProfile.rel = 'noopener noreferrer';
    xProfile.textContent = `@${entry.xHandle}`;
    xProfile.setAttribute('aria-label', `Open ${entry.displayName}'s X profile`);
    identityCopy.append(xProfile);
  }
  identityCopy.append(rank);
  identity.append(avatarElement(entry, 'public-community-avatar--large'), identityCopy);

  const stats = document.createElement('dl');
  stats.className = 'public-bear-stats';
  stats.append(
    statElement('Games', entry.gamesWatched),
    statElement('Venues', entry.venuesVisited),
    statElement('Current streak', entry.currentStreak),
    statElement('Best streak', entry.bestStreak)
  );

  const achievementsHeading = document.createElement('div');
  achievementsHeading.className = 'public-bear-achievements-heading';
  const achievementTitle = document.createElement('strong');
  const season = leaderboard?.season || new Date().getFullYear();
  achievementTitle.textContent = `${season} Coaster Collection`;
  achievementsHeading.append(achievementTitle);

  let achievements;
  if (entry.badges.length) {
    achievements = document.createElement('div');
    achievements.className = 'public-bear-achievements';
    achievements.setAttribute('aria-label', `${season} earned coasters`);
    entry.badges.forEach((badge) => achievements.append(badgeElement(badge)));
  } else {
    achievements = document.createElement('p');
    achievements.className = 'accounts-empty';
    achievements.textContent = 'No coasters earned yet.';
  }

  content.append(identity, stats, achievementsHeading, achievements);
  activeBearAnchor = anchor || null;
  if (!dialog.open) dialog.show();
  window.requestAnimationFrame(() => positionBearDialog(dialog, activeBearAnchor));
}

function leaderboardRow(entry) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'public-community-row';
  row.setAttribute('aria-label', `${entry.displayName}, rank ${entry.rank}, ${entry.gamesWatched} games watched`);

  const rank = document.createElement('span');
  rank.className = 'public-community-rank';
  rank.textContent = `#${entry.rank}`;

  const name = document.createElement('span');
  name.className = 'public-community-name';
  name.textContent = entry.displayName;

  const games = document.createElement('span');
  games.className = 'public-community-games';
  const count = document.createElement('strong');
  count.textContent = String(entry.gamesWatched);
  games.append(count, ` ${entry.gamesWatched === 1 ? 'game' : 'games'}`);

  row.append(rank, avatarElement(entry), name, games);
  row.addEventListener('click', () => showPublicBear(entry, row));
  return row;
}

function renderSection(section, data) {
  if (!section) return;
  const intro = section.querySelector('.public-community-intro');
  const list = section.querySelector('.public-community-list');
  const status = section.querySelector('.public-community-status');
  if (!intro || !list || !status) return;

  intro.textContent = currentProfile
    ? currentProfile.publicProfileStatus === 'public'
      ? 'See how Bears are watching this season. Leaderboard rank is based on games watched.'
      : 'See how Bears are watching this season. Make your profile visible in Manage privacy to join the leaderboard.'
    : 'See how Bears are watching this season. Sign in from Profile to track games, build streaks, earn achievements, and join the leaderboard.';

  list.replaceChildren();
  status.textContent = '';
  if (!data) {
    status.textContent = 'Leaderboard unavailable right now.';
    return;
  }
  if (!data.entries.length) {
    status.textContent = 'No Bears are on the leaderboard yet.';
    return;
  }

  data.entries.forEach((entry) => list.append(leaderboardRow(entry)));
}

function prepareAttendeeAvatars(root = document) {
  root.querySelectorAll?.('.account-attendee-avatar').forEach((avatar) => {
    if (avatar.dataset.publicBearReady === 'true') return;
    avatar.dataset.publicBearReady = 'true';
    avatar.tabIndex = 0;
    avatar.setAttribute('role', 'button');
    const label = avatar.getAttribute('aria-label') || avatar.title || 'Bear';
    avatar.setAttribute('aria-label', `View ${label}'s CGB profile`);
  });
}

async function openAttendeeProfile(avatar) {
  const card = avatar.closest('.selected-card[data-venue-id]');
  const stack = avatar.closest('.account-attendee-stack');
  if (!card || !stack) return;
  const avatars = [...stack.querySelectorAll('.account-attendee-avatar')];
  const index = avatars.indexOf(avatar);
  if (index < 0) return;
  const attendance = await fetchAttendanceForCard(card);
  const attendee = attendance?.attendees?.[index];
  if (!attendee) return;
  const data = await fetchLeaderboard().catch(() => null);
  const listed = data?.entries?.find((entry) => entry.profileId === attendee.profileId) || null;
  const entry = listed || Object.freeze({
    profileId: attendee.profileId,
    displayName: attendee.displayName,
    avatarUrl: isCgbAvatarPresetUrl(attendee.avatarUrl) ? attendee.avatarUrl : '',
    xHandle: attendee.xHandle || '',
    gamesWatched: 0,
    venuesVisited: 0,
    currentStreak: 0,
    bestStreak: 0,
    rank: 0,
    badges: Object.freeze([])
  });
  showPublicBear(entry, avatar);
}

function handleAttendeeActivation(event) {
  const avatar = event.target.closest?.('.account-attendee-avatar[data-public-bear-ready="true"]');
  if (!avatar) return;
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  if (event.type === 'keydown') event.preventDefault();
  void openAttendeeProfile(avatar);
}

async function renderAll({ force = false } = {}) {
  const shell = document.querySelector('.accounts-shell');
  if (!shell) return false;
  const section = ensureViewStructure(shell);
  if (!section) return false;
  const data = await fetchLeaderboard({ force }).catch(() => null);
  renderSection(section, data);
  prepareAttendeeAvatars();
  return true;
}

function handleAccountState(event) {
  currentProfile = event?.detail?.signedIn === true ? event.detail?.profile || null : null;
  void renderAll({ force: true });
}

function handleDocumentPointer(event) {
  const dialog = document.querySelector('#public-bear-dialog');
  if (!dialog?.open) return;
  if (dialog.contains(event.target) || activeBearAnchor?.contains?.(event.target)) return;
  dialog.close();
}

function handleDocumentKeydown(event) {
  handleAttendeeActivation(event);
  if (event.key !== 'Escape') return;
  const dialog = document.querySelector('#public-bear-dialog');
  if (!dialog?.open) return;
  const anchor = activeBearAnchor;
  dialog.close();
  anchor?.focus?.({ preventScroll: true });
}

function handleViewportChange() {
  const dialog = document.querySelector('#public-bear-dialog');
  if (!dialog?.open || !activeBearAnchor) return;
  positionBearDialog(dialog, activeBearAnchor);
}

function initializeWhenReady(attempt = 0) {
  if (!enabled() || initialized) return;
  const shell = document.querySelector('.accounts-shell');
  const signedInSurface = shell?.querySelector('.accounts-signed-in');
  const signedOutSurface = shell?.querySelector('.accounts-signed-out');
  if ((!shell || !signedInSurface || !signedOutSurface) && attempt < 100) {
    window.setTimeout(() => initializeWhenReady(attempt + 1), 25);
    return;
  }
  if (!shell || !signedInSurface || !signedOutSurface) return;
  initialized = true;
  injectStyles();
  currentProfile = window.CGBAccounts?.getProfile?.() || null;
  ensureViewStructure(shell);
  window.addEventListener('cgb:account-state', handleAccountState);
  document.addEventListener('pointerdown', handleDocumentPointer, { capture: true });
  document.addEventListener('click', handleAttendeeActivation);
  document.addEventListener('keydown', handleDocumentKeydown);
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);
  attendeeObserver = new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length)) prepareAttendeeAvatars();
  });
  attendeeObserver.observe(document.body, { childList: true, subtree: true });
  prepareAttendeeAvatars();
  void renderAll();
}

window.CGBPublicCommunity = Object.freeze({
  refresh: () => renderAll({ force: true }),
  setView,
  validateLeaderboard
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeWhenReady(), { once: true });
} else {
  initializeWhenReady();
}