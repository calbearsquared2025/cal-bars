import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CAL_INSTANCE_CONFIG, TEST_INSTANCE_CONFIG } from '../js/instance-config.mjs';
import { CONFIG_META_NAMES } from '../js/config.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const buildRoot = join(repositoryRoot, '.instance-build');
const defaultOutput = join(buildRoot, 'test');
const sourceEntries = ['index.html', 'js', 'css', 'assets', 'styles', 'data', 'tests'];
const fixturePath = join(repositoryRoot, 'tests', 'fixtures', 'test-instance-snapshot.synthetic.json');
const activeAssignment = 'export const ACTIVE_INSTANCE_CONFIG = CAL_INSTANCE_CONFIG;';
const testAssignment = 'export const ACTIVE_INSTANCE_CONFIG = TEST_INSTANCE_CONFIG;';
const socialStart = '<!-- CGB current-game social metadata: start -->';
const socialEnd = '<!-- CGB current-game social metadata: end -->';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function assertSafeOutput(outputPath) {
  const output = resolve(outputPath);
  const relativePath = relative(buildRoot, output);
  if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === '..' || resolve(output) === resolve(repositoryRoot)) {
    throw new Error(`Refusing output outside ${relative(repositoryRoot, buildRoot)}: ${output}`);
  }
  return output;
}

function hexRgb(hex) {
  const normalized = String(hex).replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function brandColorPairs() {
  const pairs = [];
  for (const section of ['semanticColors', 'legacyColors']) {
    const source = CAL_INSTANCE_CONFIG.brand[section];
    const target = TEST_INSTANCE_CONFIG.brand[section];
    for (const [key, sourceValue] of Object.entries(source)) {
      const targetValue = target[key];
      if (sourceValue && targetValue && sourceValue.toLowerCase() !== targetValue.toLowerCase()) {
        pairs.push([sourceValue, targetValue]);
      }
    }
  }
  return pairs;
}

function materializeColors(text) {
  let output = text;
  for (const [sourceHex, targetHex] of brandColorPairs()) {
    output = output.replace(new RegExp(escapeRegExp(sourceHex), 'gi'), targetHex);
    const [sr, sg, sb] = hexRgb(sourceHex);
    const [tr, tg, tb] = hexRgb(targetHex);
    output = output.replace(
      new RegExp(`(rgba?\\(\\s*)${sr}\\s*,\\s*${sg}\\s*,\\s*${sb}`, 'gi'),
      `$1${tr}, ${tg}, ${tb}`
    );
  }
  return output;
}

function setMetaContent(html, name, value) {
  const tagPattern = new RegExp(`<meta\\b[^>]*\\bname=["']${escapeRegExp(name)}["'][^>]*>`, 'i');
  if (!tagPattern.test(html)) return html;
  return html.replace(tagPattern, (tag) => {
    const content = `content="${escapeHtml(value)}"`;
    return /\bcontent=["'][^"']*["']/i.test(tag)
      ? tag.replace(/\bcontent=["'][^"']*["']/i, content)
      : tag.replace(/>$/, ` ${content}>`);
  });
}

function materializeStaticHtml(sourceHtml, snapshot) {
  const instance = TEST_INSTANCE_CONFIG;
  const defaultGame = snapshot.games[0];
  const locationCount = snapshot.venues.length;
  const watchPartyCount = snapshot.watchParties.filter((party) => party.game_id === defaultGame.game_id).length;
  const socialTitle = `${instance.identity.schoolShortName} vs. ${defaultGame.opponent_name} · ${locationCount} locations mapped · ${watchPartyCount} Watch ${watchPartyCount === 1 ? 'Party' : 'Parties'}`;
  const socialAsset = 'assets/social-cards/test-sample-tech.svg';
  const socialImage = `${instance.site.canonicalUrl.replace(/\/$/, '')}/${socialAsset}`;
  const socialBlock = `${socialStart}\n  <meta property="og:title" content="${escapeHtml(socialTitle)}">\n  <meta property="og:description" content="${escapeHtml(instance.social.description)}">\n  <meta property="og:image" content="${escapeHtml(socialImage)}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta property="og:url" content="${escapeHtml(instance.site.canonicalUrl)}">\n  <meta property="og:type" content="website">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="${escapeHtml(socialTitle)}">\n  <meta name="twitter:description" content="${escapeHtml(instance.social.description)}">\n  <meta name="twitter:image" content="${escapeHtml(socialImage)}">\n  ${socialEnd}`;

  let html = materializeColors(sourceHtml);
  html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(instance.site.description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${escapeHtml(instance.site.canonicalUrl)}">`);
  html = html.replace(new RegExp(`${escapeRegExp(socialStart)}[\\s\\S]*?${escapeRegExp(socialEnd)}`), socialBlock);
  html = html.replace(/(<link\b[^>]*\bid="cgb-loading-cover-preload"[^>]*\bhref=")[^"]*(")/i, `$1${socialAsset}$2`);
  html = html.replace(/(<img\b[^>]*\bid="map-fallback-card"[^>]*\bsrc=")[^"]*(")/i, `$1${socialAsset}$2`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(instance.site.title)}</title>`);
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">\n    ${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: instance.identity.productName, url: instance.site.canonicalUrl, description: instance.site.structuredDescription }, null, 2).replaceAll('\n', '\n    ')}\n  </script>`
  );
  html = html.replace(/(<link\b[^>]*\brel="icon"[^>]*\bhref=")[^"]*(")/i, `$1${instance.brand.assets.favicon}$2`);
  html = html.replaceAll(CAL_INSTANCE_CONFIG.brand.assets.mark, instance.brand.assets.mark);
  html = html.replaceAll(CAL_INSTANCE_CONFIG.site.social.xUrl, instance.site.social.xUrl);
  html = html.replaceAll(CAL_INSTANCE_CONFIG.site.social.xHandle, instance.site.social.xHandle);
  html = html.replaceAll(CAL_INSTANCE_CONFIG.site.affiliationDisclaimer, instance.site.affiliationDisclaimer);
  html = html.replaceAll('CAL GOLDEN BARS', instance.social.brandLabel);
  html = html.replaceAll('Cal Golden Bars', instance.identity.productName);
  html = html.replaceAll('CAL BAR', instance.terminology.designatedVenueBadge);
  html = html.replaceAll('Cal Bars', instance.terminology.designatedVenuePlural);
  html = html.replaceAll('Cal Bar', instance.terminology.designatedVenueSingular);
  html = html.replaceAll('COMMUNITY LOCATION', instance.terminology.communityLocationBadge);
  html = html.replaceAll('Community Locations', instance.terminology.communityLocationPlural);
  html = html.replaceAll('Community Location', instance.terminology.communityLocationSingular);
  html = html.replaceAll('Find your Cal crowd', instance.copy.findCrowd);
  html = html.replaceAll('Cal fans', 'Test U fans');
  html = html.replaceAll('Cal gathering locations', 'Test U gathering locations');
  html = html.replaceAll('Cal activity', 'Test U activity');
  html = html.replaceAll('Bears', instance.identity.fanPlural);
  html = html.replaceAll('Bear', instance.identity.fanSingular);

  for (const name of Object.values(CONFIG_META_NAMES)) {
    if (name === CONFIG_META_NAMES.mapTilerKey) continue;
    html = setMetaContent(html, name, '');
  }
  return html;
}

function buildSocialCardSvg(snapshot) {
  const instance = TEST_INSTANCE_CONFIG;
  const game = snapshot.games[0];
  const parties = snapshot.watchParties.filter((party) => party.game_id === game.game_id).length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">\n  <title id="title">${escapeHtml(instance.social.brandLabel)} social preview</title>\n  <desc id="desc">${escapeHtml(instance.social.description)}</desc>\n  <rect width="1200" height="630" fill="${instance.brand.semanticColors.loadingBackground}"/>\n  <path fill="${instance.brand.semanticColors.secondary}" d="M90 130 170 168 225 125 280 168l80-38-30 126-105 100-105-100-30-126Z"/>\n  <text x="420" y="170" fill="${instance.brand.semanticColors.secondary}" font-family="Arial,sans-serif" font-size="42" font-weight="700">${escapeHtml(instance.social.brandLabel)}</text>\n  <text x="420" y="290" fill="#fff" font-family="Arial,sans-serif" font-size="88" font-weight="800">${escapeHtml(instance.identity.schoolShortName)} vs. ${escapeHtml(game.opponent_name)}</text>\n  <text x="420" y="390" fill="#fff" font-family="Arial,sans-serif" font-size="48" font-weight="700">${snapshot.venues.length} LOCATIONS · ${parties} WATCH ${parties === 1 ? 'PARTY' : 'PARTIES'}</text>\n  <text x="420" y="475" fill="#fff" font-family="Arial,sans-serif" font-size="38">${escapeHtml(instance.social.headline)}</text>\n  <text x="420" y="525" fill="#fff" opacity=".86" font-family="Arial,sans-serif" font-size="26">Fictional local portability fixture</text>\n</svg>\n`;
}

function buildSharePage(snapshot) {
  const instance = TEST_INSTANCE_CONFIG;
  const game = snapshot.games[0];
  const parties = snapshot.watchParties.filter((party) => party.game_id === game.game_id).length;
  const title = `${instance.identity.schoolShortName} vs. ${game.opponent_name} · ${snapshot.venues.length} locations mapped · ${parties} Watch ${parties === 1 ? 'Party' : 'Parties'}`;
  const origin = instance.site.canonicalUrl.replace(/\/$/, '');
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="robots" content="noindex,nofollow">\n  <title>${escapeHtml(title)}</title>\n  <meta name="description" content="${escapeHtml(instance.social.description)}">\n  <meta property="og:title" content="${escapeHtml(title)}">\n  <meta property="og:description" content="${escapeHtml(instance.social.description)}">\n  <meta property="og:image" content="${origin}/assets/social-cards/test-sample-tech.svg">\n  <meta property="og:url" content="${origin}/share/sample-tech/">\n</head>\n<body>Fictional local portability fixture.</body>\n</html>\n`;
}

async function materializeTextTree(root, extension, transform) {
  const { readdir } = await import('node:fs/promises');
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && path.endsWith(extension)) {
        const source = await readFile(path, 'utf8');
        const updated = transform(source, path);
        if (updated !== source) await writeFile(path, updated, 'utf8');
      }
    }
  }
  await walk(root);
}

export async function materializeTestInstance({ outputPath = defaultOutput } = {}) {
  const output = assertSafeOutput(outputPath);
  const snapshot = JSON.parse(await readFile(fixturePath, 'utf8'));

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const entry of sourceEntries) {
    await cp(join(repositoryRoot, entry), join(output, entry), { recursive: true });
  }

  const instanceConfigPath = join(output, 'js', 'instance-config.mjs');
  const instanceSource = await readFile(instanceConfigPath, 'utf8');
  if (!instanceSource.includes(activeAssignment)) throw new Error('Production active-instance assignment changed; refusing to guess.');
  await writeFile(instanceConfigPath, instanceSource.replace(activeAssignment, testAssignment), 'utf8');

  await materializeTextTree(join(output, 'css'), '.css', materializeColors);
  await materializeTextTree(join(output, 'js'), '.mjs', (source) => {
    let updated = source;
    for (const key of Object.keys(CAL_INSTANCE_CONFIG.storage)) {
      updated = updated.replaceAll(CAL_INSTANCE_CONFIG.storage[key], TEST_INSTANCE_CONFIG.storage[key]);
    }
    return materializeColors(updated);
  });
  const appJsPath = join(output, 'js', 'app.js');
  let appJs = await readFile(appJsPath, 'utf8');
  for (const key of Object.keys(CAL_INSTANCE_CONFIG.storage)) {
    appJs = appJs.replaceAll(CAL_INSTANCE_CONFIG.storage[key], TEST_INSTANCE_CONFIG.storage[key]);
  }
  await writeFile(appJsPath, materializeColors(appJs), 'utf8');

  await cp(join(output, 'styles', 'dataviz-with-cgb-states.json'), join(output, 'styles', 'dataviz-test-instance.json'));
  await writeFile(join(output, 'data', 'fallback-v2.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await writeFile(join(output, 'tests', 'fixtures', 'public-snapshot.synthetic.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  const sourceIndex = await readFile(join(output, 'index.html'), 'utf8');
  await writeFile(join(output, 'index.html'), materializeStaticHtml(sourceIndex, snapshot), 'utf8');

  const socialCardPath = join(output, 'assets', 'social-cards', 'test-sample-tech.svg');
  await mkdir(dirname(socialCardPath), { recursive: true });
  await writeFile(socialCardPath, buildSocialCardSvg(snapshot), 'utf8');
  const sharePath = join(output, 'share', 'sample-tech', 'index.html');
  await mkdir(dirname(sharePath), { recursive: true });
  await writeFile(sharePath, buildSharePage(snapshot), 'utf8');

  const manifest = {
    version: 1,
    fixture: true,
    default_game_slug: 'sample-tech',
    games: [{
      game_id: snapshot.games[0].game_id,
      slug: 'sample-tech',
      title: `${TEST_INSTANCE_CONFIG.identity.schoolShortName} vs. ${snapshot.games[0].opponent_name}`,
      locations_mapped: snapshot.venues.length,
      watch_parties: snapshot.watchParties.length,
      image: 'assets/social-cards/test-sample-tech.svg',
      page: 'share/sample-tech/index.html'
    }]
  };
  await writeFile(join(output, 'assets', 'social-cards', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return output;
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const [instanceId = 'test', outputArgument] = process.argv.slice(2);
  if (instanceId !== 'test') {
    console.error('Only the fictional test instance may be materialized by this milestone. Production remains the checked-in Cal root.');
    process.exitCode = 2;
  } else {
    materializeTestInstance({ outputPath: outputArgument || defaultOutput })
      .then((output) => console.log(`Materialized fictional test instance at ${relative(repositoryRoot, output)}.`))
      .catch((error) => {
        console.error(`Instance materialization failed: ${error.message}`);
        process.exitCode = 1;
      });
  }
}
