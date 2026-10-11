import { ACTIVE_INSTANCE_CONFIG } from './instance-config.mjs';

// Social graphics are generated and published separately. Only their display
// selection follows the game's current client-side selection.
export function loadingCoverImagePathForGame(manifest, game) {
  const gameId = String(game?.game_id || '');
  if (!gameId || !Array.isArray(manifest?.games)) return '';
  const path = String(manifest.games.find((entry) => entry?.game_id === gameId)?.image || '');
  const directory = ACTIVE_INSTANCE_CONFIG.brand.assets.socialCardsDirectory;
  const prefix = `${directory}/`;
  return path.startsWith(prefix) && /^[a-z0-9-]+\.png$/.test(path.slice(prefix.length))
    ? path
    : '';
}

export function loadLoadingCoverManifest({ fetchImpl = globalThis.fetch } = {}) {
  const path = ACTIVE_INSTANCE_CONFIG.integrations.resources.socialManifestPath;
  if (!path || typeof fetchImpl !== 'function') return Promise.resolve(null);
  return Promise.resolve()
    .then(() => fetchImpl(path, { cache: 'no-store' }))
    .then((response) => response.ok ? response.json() : null)
    .catch(() => null);
}

export async function updateLoadingCoverForGame({
  manifestPromise,
  getGame,
  documentObject = globalThis.document
} = {}) {
  const manifest = await Promise.resolve(manifestPromise).catch(() => null);
  const imagePath = loadingCoverImagePathForGame(manifest, getGame?.());
  if (!imagePath) return false;

  const fallback = documentObject?.querySelector?.('#map-fallback');
  const image = fallback?.querySelector?.('#map-fallback-card');
  const preload = documentObject?.querySelector?.('#cgb-loading-cover-preload');
  if (!fallback || fallback.hidden || fallback.classList?.contains?.('map-fallback--leaving') ||
      !image || !preload) return false;

  const existingPath = image.getAttribute?.('src') || image.src || '';
  if (existingPath === imagePath) return false;

  preload.href = imagePath;
  image.classList?.remove?.('map-fallback__card--loaded');
  image.src = imagePath;
  return true;
}
