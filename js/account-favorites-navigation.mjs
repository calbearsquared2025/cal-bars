import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import {
  accountsConfigIsReady,
  validateFanFavoritesResponse
} from './accounts-core.mjs';
import { buildVenueUrl } from './core.mjs';
import { appState } from './app-state.mjs';

const STYLE_ATTR = 'data-cgb-account-favorites-navigation-style';
let favoriteVenueIds = new Set();

function injectStyles() {
  if (document.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-favorites-navigation.css';
  link.setAttribute(STYLE_ATTR, 'true');
  document.head.append(link);
}

function venueById(venueId) {
  return appState.snapshot?.venues?.find((venue) => venue?.venue_id === venueId) || null;
}

function selectedGame() {
  return appState.snapshot?.games?.find((game) => game?.game_id === appState.gameId) || null;
}

function favoriteHref(venueId) {
  const venue = venueById(venueId);
  if (!venue?.slug) return '';
  return buildVenueUrl(venue.slug, selectedGame(), window.location.href);
}

function enhanceFavoriteRow(row) {
  if (!row || row.querySelector(':scope > .accounts-favorite-open')) return false;
  const remove = row.querySelector(':scope > [data-remove-favorite]');
  const copy = row.querySelector(':scope > div');
  const venueId = String(remove?.dataset.removeFavorite || '').trim();
  const href = favoriteHref(venueId);
  if (!copy || !venueId || !href) return false;

  const venue = venueById(venueId);
  const link = document.createElement('a');
  link.className = 'accounts-favorite-open';
  link.dataset.favoriteVenueId = venueId;
  link.href = href;
  link.setAttribute('aria-label', venue?.name ? `Open ${venue.name}` : 'Open favorite venue');
  while (copy.firstChild) link.append(copy.firstChild);
  copy.replaceWith(link);
  return true;
}

function enhanceFavorites(root = document) {
  root.querySelectorAll?.('.accounts-favorite-row').forEach(enhanceFavoriteRow);
  if (root.matches?.('.accounts-favorite-row')) enhanceFavoriteRow(root);
}

function syncFavoriteIdsFromDom() {
  favoriteVenueIds = new Set(
    [...document.querySelectorAll('[data-remove-favorite]')]
      .map((button) => String(button.dataset.removeFavorite || '').trim())
      .filter(Boolean)
  );
}

function profileFavoriteLabel(venueId) {
  return favoriteVenueIds.has(venueId) ? '★ Favorite' : '☆ Save to Favorites';
}

function syncProfileFavoriteAction(button) {
  if (!button) return;
  const venueId = String(button.dataset.favoriteVenueId || '').trim();
  const favorite = favoriteVenueIds.has(venueId);
  const label = profileFavoriteLabel(venueId);
  if (button.textContent !== label) button.textContent = label;
  const favoriteState = favorite ? 'saved' : 'available';
  if (button.dataset.favoriteState !== favoriteState) button.dataset.favoriteState = favoriteState;
  if (button.getAttribute('aria-pressed') !== String(favorite)) {
    button.setAttribute('aria-pressed', String(favorite));
  }
}

function openSignIn() {
  window.CGBMyCgbSurface?.open?.();
  window.requestAnimationFrame(() => {
    document.querySelector('.my-cgb-sign-in')?.click();
  });
}

function buildFavoriteRow(venue) {
  const row = document.createElement('div');
  row.className = 'accounts-favorite-row';
  const copy = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = venue.name;
  const place = document.createElement('span');
  place.textContent = [venue.city, venue.region].filter(Boolean).join(', ');
  copy.append(name, place);
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'text-button';
  remove.dataset.removeFavorite = venue.venue_id;
  remove.textContent = 'Remove';
  row.append(copy, remove);
  return row;
}

function reconcileFavorites(venueIds) {
  favoriteVenueIds = new Set(venueIds);
  const favorites = document.querySelector('.accounts-favorites');
  if (favorites) {
    favorites.replaceChildren();
    const venues = venueIds.map(venueById).filter(Boolean);
    if (!venues.length) {
      const empty = document.createElement('p');
      empty.className = 'accounts-empty';
      empty.textContent = appState.selectedVenueId
        ? 'No favorite places yet. Save the selected venue to start your list.'
        : 'No favorite places yet. Select a venue on the map, then open My CGB to save it.';
      favorites.append(empty);
    } else {
      venues.forEach((venue) => favorites.append(buildFavoriteRow(venue)));
      enhanceFavorites(favorites);
    }
  }

  const selected = venueById(appState.selectedVenueId);
  const saveSelected = document.querySelector('.accounts-save-selected');
  if (saveSelected) {
    if (selected && !favoriteVenueIds.has(selected.venue_id)) {
      saveSelected.hidden = false;
      saveSelected.dataset.venueId = selected.venue_id;
      saveSelected.textContent = `Save ${selected.name}`;
    } else {
      saveSelected.hidden = true;
      saveSelected.dataset.venueId = '';
    }
  }
  syncProfileFavoriteActions();
}

async function toggleProfileFavorite(button) {
  const venueId = String(button?.dataset.favoriteVenueId || '').trim();
  if (!venueId) return;
  if (!window.CGBAccounts?.isSignedIn?.()) {
    openSignIn();
    return;
  }

  const favorited = !favoriteVenueIds.has(venueId);
  button.disabled = true;
  try {
    const payload = await window.CGBAccounts.request('setFanFavorite', { venueId, favorited });
    if (payload?.ok !== true) throw new Error(payload?.error || 'fan_backend_unavailable');
    const validated = validateFanFavoritesResponse(payload);
    if (!validated) throw new Error('fan_backend_unavailable');
    reconcileFavorites(validated);
  } catch (_) {
    window.CGBApp?.showStatus?.('Favorite could not be updated. Try again.');
  } finally {
    button.disabled = false;
    syncProfileFavoriteAction(button);
  }
}

function buildProfileFavoriteButton(venueId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'account-venue-favorite';
  button.dataset.favoriteVenueId = venueId;
  syncProfileFavoriteAction(button);
  button.addEventListener('click', () => { void toggleProfileFavorite(button); });
  return button;
}

function enhanceProfileSurface(surface, addressSelector) {
  if (!surface || surface.querySelector('.account-venue-favorite')) return false;
  const venueId = String(surface.dataset.venueId || '').trim();
  const address = surface.querySelector(addressSelector);
  if (!venueId || !address) return false;
  address.insertAdjacentElement('afterend', buildProfileFavoriteButton(venueId));
  return true;
}

function enhanceSelectedProfiles(root = document) {
  root.querySelectorAll?.('.selected-card[data-venue-id]').forEach((card) => {
    enhanceProfileSurface(card, '.venue-location');
  });
  if (root.matches?.('.selected-card[data-venue-id]')) {
    enhanceProfileSurface(root, '.venue-location');
  }

  const expanded = document.querySelector('#venue-detail[data-venue-id]');
  if (expanded) enhanceProfileSurface(expanded, '.detail-address');
}

function syncProfileFavoriteActions() {
  document.querySelectorAll('.account-venue-favorite').forEach(syncProfileFavoriteAction);
}

function handleAccountState(event) {
  if (event.detail?.signedIn !== true) favoriteVenueIds = new Set();
  else syncFavoriteIdsFromDom();
  syncProfileFavoriteActions();
}

export function initializeAccountFavoritesNavigation() {
  if (!accountsConfigIsReady(CGB_ACCOUNTS_CONFIG)) return false;
  injectStyles();
  enhanceFavorites(document);
  syncFavoriteIdsFromDom();
  enhanceSelectedProfiles(document);
  syncProfileFavoriteActions();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node?.nodeType !== Node.ELEMENT_NODE) return;
      enhanceFavorites(node);
    }));
    enhanceSelectedProfiles(document);
    syncFavoriteIdsFromDom();
    syncProfileFavoriteActions();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('cgb:account-state', handleAccountState);
  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountFavoritesNavigation, { once: true });
} else {
  initializeAccountFavoritesNavigation();
}
