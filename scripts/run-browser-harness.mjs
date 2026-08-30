import { spawn } from 'node:child_process';
import { createReadStream, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { findBrowser } from './browser-discovery.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = JSON.parse(readFileSync(join(root, 'tests/fixtures/public-snapshot.synthetic.json'), 'utf8'));
const snapshotJson = JSON.stringify(snapshot).replaceAll('<', '\\u003c');
const productionIndex = readFileSync(join(root, 'index.html'), 'utf8');
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.png', 'image/png'], ['.svg', 'image/svg+xml']
]);

function safePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(root, relative || 'index.html');
  return candidate.startsWith(root) ? candidate : null;
}

function smokePage(response, requestUrl) {
  const smokeMode = new URL(requestUrl || '/', 'http://127.0.0.1').searchParams.get('__cgb_smoke') || 'mobile';
  const prelude = `<script>
    (() => {
      const snapshot = ${snapshotJson};
      const efficiencyMode = new URLSearchParams(location.search).get('__cgb_smoke') === 'external-search-efficiency';
      const hierarchy = [
        { id: 'municipality.1', place_type: ['municipality'], text: 'Long Beach', place_designation: 'city' },
        { id: 'region.1', place_type: ['region'], text: 'California' },
        { id: 'postal_code.1', place_type: ['postal_code'], text: '90815' },
        { id: 'country.1', place_type: ['country'], text: 'United States', short_code: 'us' }
      ];
      const addressFeature = {
        id: 'address.12345',
        place_type: ['address'],
        center: [-118.1258, 33.7765],
        address: '2123',
        text: 'N Bellflower Blvd',
        place_name: '2123 N Bellflower Blvd, Long Beach, California 90815, United States',
        context: hierarchy
      };
      const poiFeature = (name, id, city = 'Long Beach') => ({
        id,
        place_type: ['poi'],
        center: [-118.1258, 33.7765],
        text: name,
        place_name: name + ', 2123 N Bellflower Blvd, ' + city + ', California 90815, United States',
        relevance: 1,
        context: city === 'Long Beach' ? hierarchy : [
          { id: 'municipality.2', place_type: ['municipality'], text: city, place_designation: 'city' },
          { id: 'region.2', place_type: ['region'], text: 'California' },
          { id: 'postal_code.2', place_type: ['postal_code'], text: '94607' },
          { id: 'country.2', place_type: ['country'], text: 'United States', short_code: 'us' }
        ]
      });
      localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
      window.__cgbMapTilerRequests = [];
      const nativeFetch = window.fetch.bind(window);
      const json = (payload) => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      window.fetch = async (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname === '/__cgb_mock_api__' || url.pathname.endsWith('/data/fallback-v2.json')) {
          if (String(init.method || 'GET').toUpperCase() === 'POST') {
            const request = JSON.parse(init.body || '{}');
            const venueId = 'venue_manual_browser_test';
            const fanCounts = (snapshot.fanCounts || []).filter((row) => !(row.game_id === request.gameId && row.venue_id === venueId));
            fanCounts.push({ game_id: request.gameId, venue_id: venueId, count: 1 });
            return json({
              ok: true,
              action: 'joinExternalVenue',
              schemaVersion: '2.0',
              venue: {
                venue_id: venueId,
                slug: 'district-4-pizza-long-beach',
                name: request.externalPlace?.name || 'District 4 Pizza',
                address_line_1: '2123 N Bellflower Blvd',
                address_line_2: '',
                city: 'Long Beach',
                region: 'CA',
                postal_code: '90815',
                country_code: 'US',
                latitude: 33.7765,
                longitude: -118.1258,
                website_url: '',
                venue_type: 'community_location',
                verification_status: 'user_added',
                alumni_owned: 'unknown',
                short_description: '',
                photo_url: '',
                photo_caption: '',
                photo_credit: '',
                photo_credit_url: '',
                updated_at: '2026-08-30T09:00:00Z'
              },
              selection: { game_id: request.gameId, venue_id: venueId, status: 'attending' },
              fanCounts,
              venueHistoryCounts: snapshot.venueHistoryCounts || [],
              generatedAt: '2026-08-30T09:00:00Z'
            });
          }
          return json(snapshot);
        }
        if (url.hostname === 'api.maptiler.com') {
          const query = decodeURIComponent(url.pathname)
            .replace('/geocoding/', '')
            .replace('.json', '');
          window.__cgbMapTilerRequests.push({
            query,
            types: url.searchParams.get('types'),
            autocomplete: url.searchParams.get('autocomplete'),
            proximity: url.searchParams.get('proximity')
          });
          if (url.searchParams.get('types') === 'address' && !query.toLowerCase().includes('no such address')) {
            return json({ features: [addressFeature] });
          }
          if (!efficiencyMode) return json({ features: [] });
          const normalized = query.toLowerCase().trim().split(' ').filter(Boolean).join(' ');
          if (normalized === 'district 4 pizza') return json({ features: [poiFeature('District 4 Pizza', 'poi.district4')] });
          if (normalized === 'cache test venue') return json({ features: [poiFeature('Cache Test Venue', 'poi.cache')] });
          if (normalized === 'geo strong venue') return json({ features: [poiFeature('Geo Strong Venue', 'poi.geo')] });
          if (normalized === 'weak venue long beach') return json({ features: [poiFeature('Pizza Hut', 'poi.weak', 'Oakland')] });
          return json({ features: [] });
        }
        return nativeFetch(input, init);
      };
    })();
  </script>`;
  const harness = smokeMode === 'external-search-efficiency'
    ? '/tests/browser/external-search-efficiency-runtime-harness.mjs'
    : smokeMode.startsWith('manual-')
      ? '/tests/browser/manual-place-runtime-harness.mjs'
      : '/tests/browser/smoke-runtime-harness.mjs';
  const driver = `<output id="cgb-smoke-result">CGB_SMOKE_RUNNING</output><script type="module" src="${harness}"></script>`;
  const html = productionIndex
    .replace('<script src="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js" defer></script>', '<script src="/tests/browser/maplibre-runtime-mock.js" defer></script>')
    .replace('</head>', `${prelude}\n</head>`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__cgb_smoke__') return smokePage(response, request.url);
  const filePath = safePath(request.url || '/');
  try {
    if (!filePath || !statSync(filePath).isFile()) throw new Error('not_found');
    response.writeHead(200, { 'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(filePath).pipe(response);
  } catch (_) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const browser = findBrowser();
const address = server.address();

async function run({ mode, marker, windowSize, label = mode, virtualTimeBudget = 3000 }) {
  const profile = mkdtempSync(join(tmpdir(), 'cgb-smoke-'));
  const url = `http://127.0.0.1:${address.port}/__cgb_smoke__?__cgb_smoke=${mode}`;
  const child = spawn(browser, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--metrics-recording-only', '--no-first-run', `--user-data-dir=${profile}`,
    `--window-size=${windowSize}`, `--virtual-time-budget=${virtualTimeBudget}`, '--dump-dom', url
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exitCode = await new Promise((resolve) => child.once('close', resolve));
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  if (exitCode === 0 && stdout.includes(marker)) {
    console.log(`${label} browser smoke passed.`);
    return true;
  }
  console.error(`${label} browser smoke failed.`);
  const match = stdout.match(/<output id="cgb-smoke-result">([\s\S]*?)<\/output>/i);
  console.error(match?.[1]?.replace(/<[^>]*>/g, '').trim() || stdout.slice(-10000));
  if (stderr) console.error(stderr.slice(-3000));
  return false;
}

try {
  const mobile = await run({ mode: 'mobile', marker: 'CGB_SMOKE_MOBILE_PASS', windowSize: '390,844', label: '390px mobile' });
  const smallMobile = await run({ mode: 'mobile', marker: 'CGB_SMOKE_MOBILE_PASS', windowSize: '320,700', label: '320px mobile' });
  const desktop = await run({ mode: 'desktop', marker: 'CGB_SMOKE_DESKTOP_PASS', windowSize: '1440,1000', label: 'desktop' });
  const manualHere = await run({ mode: 'manual-mobile-here', marker: 'CGB_MANUAL_MOBILE_HERE_PASS', windowSize: '390,844', label: 'manual known-location mobile', virtualTimeBudget: 20000 });
  const manualAddress = await run({ mode: 'manual-mobile-address', marker: 'CGB_MANUAL_MOBILE_ADDRESS_PASS', windowSize: '390,844', label: 'manual address mobile', virtualTimeBudget: 20000 });
  const manualDenied = await run({ mode: 'manual-mobile-denied', marker: 'CGB_MANUAL_MOBILE_DENIED_PASS', windowSize: '390,844', label: 'manual denied-location mobile', virtualTimeBudget: 20000 });
  const manualDesktop = await run({ mode: 'manual-desktop-address', marker: 'CGB_MANUAL_DESKTOP_ADDRESS_PASS', windowSize: '1440,1000', label: 'manual address desktop', virtualTimeBudget: 20000 });
  const externalSearchEfficiency = await run({
    mode: 'external-search-efficiency',
    marker: 'CGB_EXTERNAL_SEARCH_EFFICIENCY_PASS',
    windowSize: '390,844',
    label: 'external search efficiency',
    virtualTimeBudget: 30000
  });
  if (!mobile || !smallMobile || !desktop || !manualHere || !manualAddress || !manualDenied || !manualDesktop || !externalSearchEfficiency) process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
}
