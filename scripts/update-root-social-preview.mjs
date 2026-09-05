import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { gameRouteParam, selectDefaultGame } from '../js/core.mjs';
import { metaContentFromHtml, readRuntimeConfig } from '../js/config.mjs';
import { fetchSnapshot } from './generate-social-cards.mjs';

const SITE_ORIGIN = readRuntimeConfig().canonicalSiteUrl.replace(/\/$/, '');
const DESCRIPTION = 'Find your Cal crowd. Join a nearby Watch Party, or plan one of your own.';
const START_MARKER = '<!-- CGB current-game social metadata: start -->';
const END_MARKER = '<!-- CGB current-game social metadata: end -->';
const repositoryRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const indexPath = join(repositoryRoot, 'index.html');
const manifestPath = join(repositoryRoot, 'assets', 'social-cards', 'manifest.json');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pacificCalendarDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12, 0, 0);
}

function endpointFromIndex(html) {
  const endpoint = metaContentFromHtml(html, 'cgb-data-endpoint');
  if (!endpoint) throw new Error('Could not find the cgb-data-endpoint meta tag in index.html.');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') {
    throw new Error(`Refusing unexpected snapshot endpoint: ${url.origin}`);
  }
  return endpoint;
}

function socialMetadataBlock(entry) {
  const title = `${entry.title} · ${entry.locations_mapped} locations mapped · ${entry.watch_parties} Watch ${entry.watch_parties === 1 ? 'Party' : 'Parties'}`;
  const imageUrl = `${SITE_ORIGIN}/${entry.image}`;
  return `${START_MARKER}\n  <meta property="og:title" content="${escapeHtml(title)}">\n  <meta property="og:description" content="${escapeHtml(DESCRIPTION)}">\n  <meta property="og:image" content="${escapeHtml(imageUrl)}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta property="og:url" content="${SITE_ORIGIN}/">\n  <meta property="og:type" content="website">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="${escapeHtml(title)}">\n  <meta name="twitter:description" content="${escapeHtml(DESCRIPTION)}">\n  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">\n  ${END_MARKER}`;
}

function updateIndexMetadata(html, block) {
  const generatedPattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
  if (generatedPattern.test(html)) return html.replace(generatedPattern, block);

  const legacyPattern = /  <meta property="og:title"[^\n]*>\n  <meta property="og:description"[^\n]*>\n  <meta property="og:image"[^\n]*>\n  <meta property="og:type"[^\n]*>/;
  if (!legacyPattern.test(html)) {
    throw new Error('Could not find the existing root Open Graph metadata block in index.html.');
  }
  return html.replace(legacyPattern, `  ${block}`);
}

function updateLoadingCover(html, entry) {
  const imagePath = escapeHtml(entry.image);
  const preloadPattern = /(<link\b[^>]*\bid="cgb-loading-cover-preload"[^>]*\bhref=")[^"]*(")/i;
  const imagePattern = /(<img\b[^>]*\bid="map-fallback-card"[^>]*\bsrc=")[^"]*(")/i;
  if (!preloadPattern.test(html) || !imagePattern.test(html)) {
    throw new Error('Could not find the current-game loading cover hooks in index.html.');
  }
  return html
    .replace(preloadPattern, `$1${imagePath}$2`)
    .replace(imagePattern, `$1${imagePath}$2`);
}

export async function updateRootSocialPreview() {
  const [html, manifestText] = await Promise.all([
    readFile(indexPath, 'utf8'),
    readFile(manifestPath, 'utf8')
  ]);
  const snapshot = await fetchSnapshot(endpointFromIndex(html));
  const game = selectDefaultGame(snapshot.games, pacificCalendarDate());
  if (!game) throw new Error('Could not select the current/default game from the public snapshot.');

  const manifest = JSON.parse(manifestText);
  const slug = gameRouteParam(game);
  const entry = (manifest.games || []).find((item) => item?.slug === slug);
  if (!entry) throw new Error(`Generated social-card manifest has no entry for current game: ${slug}`);

  const metadataUpdated = updateIndexMetadata(html, socialMetadataBlock(entry));
  const updated = updateLoadingCover(metadataUpdated, entry);
  if (updated !== html) await writeFile(indexPath, updated, 'utf8');
  console.log(`Root social preview now uses ${entry.title}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateRootSocialPreview().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
