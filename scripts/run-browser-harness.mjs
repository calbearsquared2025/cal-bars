import { spawn } from 'node:child_process';
import { createReadStream, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { findBrowser } from './browser-discovery.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml']
]);
const runtimeSnapshot = JSON.parse(readFileSync(
  join(repositoryRoot, 'tests/fixtures/public-snapshot.synthetic.json'),
  'utf8'
));
const runtimeSnapshotJson = JSON.stringify(runtimeSnapshot).replaceAll('<', '\\u003c');
const productionIndex = readFileSync(join(repositoryRoot, 'index.html'), 'utf8');

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(repositoryRoot, relative || 'index.html');
  if (!candidate.startsWith(repositoryRoot)) return null;
  return candidate;
}

function acceptancePrelude(requestUrl) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const seed = url.searchParams.get('__cgb_seed') || '';
  const seedVenueSlug = url.searchParams.get('__cgb_seed_venue') || '';
  return `<script>
    (() => {
      const snapshot = ${runtimeSnapshotJson};
      const slugify = (value) => String(value || '')
        .normalize('NFKD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[’']/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      for (const key of ['cgb_v2_last_good_snapshot', 'cgb_v2_browser_id', 'cgb_v2_fan_intent_selections']) {
        localStorage.removeItem(key);
      }
      localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
      if (${JSON.stringify(seed)} === 'fan-intent') {
        const requestedGame = slugify(new URLSearchParams(location.search).get('game'));
        const game = snapshot.games.find((item) => slugify(item.opponent_name) === requestedGame) || snapshot.games[0];
        const venue = snapshot.venues.find((item) => item.slug === ${JSON.stringify(seedVenueSlug)});
        if (game && venue) {
          localStorage.setItem('cgb_v2_browser_id', 'browser_1234567890abcdef');
          localStorage.setItem('cgb_v2_fan_intent_selections', JSON.stringify({ [game.game_id]: venue.venue_id }));
        }
      }
      const nativeFetch = window.fetch.bind(window);
      const selections = new Map();
      let fanCounts = Array.isArray(snapshot.fanCounts) ? snapshot.fanCounts.map((item) => ({ ...item })) : [];
      const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      const countFor = (gameId, venueId) => fanCounts.find((item) => item.game_id === gameId && item.venue_id === venueId)?.count || 0;
      const setCount = (gameId, venueId, count) => {
        fanCounts = fanCounts.filter((item) => !(item.game_id === gameId && item.venue_id === venueId));
        if (count > 0) fanCounts.push({ game_id: gameId, venue_id: venueId, count });
      };
      window.fetch = async (input, init = {}) => {
        const target = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (target.hostname === 'api.maptiler.com' && target.pathname.startsWith('/geocoding/')) {
          return jsonResponse({ features: [] });
        }
        if (target.pathname.endsWith('/data/fallback-v2.json')) return jsonResponse({ ...snapshot, fanCounts });
        if (target.pathname !== '/__cgb_mock_api__') return nativeFetch(input, init);
        const method = String(init.method || input?.method || 'GET').toUpperCase();
        if (method !== 'POST') return jsonResponse({ ...snapshot, fanCounts });
        let operation;
        try { operation = JSON.parse(String(init.body || '{}')); } catch (_) {
          return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
        }
        const { action, browserId, gameId, venueId } = operation || {};
        if (!['join', 'withdraw', 'move'].includes(action) || !browserId || !gameId || !venueId) {
          return jsonResponse({ ok: false, error: 'invalid_request' }, 400);
        }
        const key = browserId + '\\u0000' + gameId;
        const previous = selections.get(key);
        if (previous?.venueId && previous.venueId !== venueId) {
          setCount(gameId, previous.venueId, Math.max(0, countFor(gameId, previous.venueId) - 1));
        }
        if (action === 'withdraw') {
          if (previous?.venueId) setCount(gameId, previous.venueId, Math.max(0, countFor(gameId, previous.venueId) - 1));
          selections.delete(key);
        } else {
          if (!previous || previous.venueId !== venueId) setCount(gameId, venueId, countFor(gameId, venueId) + 1);
          selections.set(key, { gameId, venueId });
        }
        return jsonResponse({
          ok: true,
          action,
          selection: action === 'withdraw' ? null : { game_id: gameId, venue_id: venueId, status: 'attending' },
          fanCounts,
          venueHistoryCounts: Array.isArray(snapshot.venueHistoryCounts) ? snapshot.venueHistoryCounts : []
        });
      };
    })();
  </script>`;
}

function sendAcceptanceHarness(response, requestUrl = '/') {
  const prelude = acceptancePrelude(requestUrl);
  const driver = `
    <output id="cgb-browser-acceptance-result">CGB_BROWSER_ACCEPTANCE_RUNNING</output>
    <script type="module" src="/tests/browser/current-behavior-acceptance.mjs"></script>
  `;
  const html = productionIndex
    .replace(
      '<script src="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js" defer></script>',
      '<script src="/tests/browser/maplibre-runtime-mock.js" defer></script>'
    )
    .replace('</head>', `${prelude}\n</head>`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(html);
}

function sendFirstPaintHarness(response) {
  const simulatedControls = `
    <div class="maplibregl-ctrl-top-right" data-first-paint-controls>
      <div class="maplibregl-ctrl maplibregl-ctrl-group">
        <button class="maplibregl-ctrl-zoom-in" type="button">+</button>
        <button class="maplibregl-ctrl-zoom-out" type="button">-</button>
      </div>
    </div>
  `;
  const driver = `
    <output id="cgb-first-paint-result">CGB_FIRST_PAINT_RUNNING</output>
    <script>
      (() => {
        const failures = [];
        const tray = document.querySelector('#venue-tray');
        const trayRect = tray?.getBoundingClientRect();
        const handle = document.querySelector('#tray-handle');
        const chevron = document.querySelector('.tray-summary__chevron');
        const zoom = document.querySelector('.maplibregl-ctrl-zoom-in');
        const visible = (node) => {
          if (!node || node.hidden) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        if (!visible(document.querySelector('#map-view'))) failures.push('map shell is not visible at first paint');
        if (!visible(handle)) failures.push('tray handle is not visible at first paint');
        if (visible(chevron)) failures.push('obsolete tray chevron is visible at first paint');
        if (visible(zoom)) failures.push('MapLibre zoom controls are visible at first paint');
        if (!trayRect || Math.abs(trayRect.left) > 1 || Math.abs(trayRect.right - innerWidth) > 1) failures.push('mobile tray is not full width at first paint');
        document.querySelector('#cgb-first-paint-result').textContent = failures.length
          ? 'CGB_STATIC_FIRST_PAINT_FAIL: ' + failures.join('; ')
          : 'CGB_STATIC_FIRST_PAINT_PASS';
      })();
    </script>
  `;
  const html = productionIndex
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace('<div id="map-fallback"', `${simulatedControls}\n<div id="map-fallback"`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(html);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__cgb_acceptance__') {
    sendAcceptanceHarness(response, request.url || '/');
    return;
  }
  if (pathname === '/__cgb_first_paint__') {
    sendFirstPaintHarness(response);
    return;
  }
  const filePath = safeFilePath(request.url || '/');
  try {
    if (!filePath || !statSync(filePath).isFile()) throw new Error('not_found');
    response.writeHead(200, {
      'Content-Type': MIME_TYPES.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
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

const address = server.address();
const browser = findBrowser();

function extractOutput(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<output id="${escaped}">([\\s\\S]*?)<\\/output>`, 'i'));
  return match?.[1]
    ?.replace(/<[^>]*>/g, '')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&')
    .trim() || '';
}

async function runBrowser({ path, marker, label, windowSize = '390,844', virtualTimeBudget = 30000, outputId = 'cgb-browser-acceptance-result' }) {
  const url = `http://127.0.0.1:${address.port}${path}`;
  const profileDirectory = mkdtempSync(join(tmpdir(), 'cgb-browser-acceptance-'));
  const child = spawn(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    `--user-data-dir=${profileDirectory}`,
    `--window-size=${windowSize}`,
    `--virtual-time-budget=${virtualTimeBudget}`,
    '--dump-dom',
    url
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  const exitCode = await new Promise((resolve) => child.once('close', resolve));
  rmSync(profileDirectory, { recursive: true, force: true, maxRetries: 3 });
  if (exitCode !== 0 || !stdout.includes(marker)) {
    console.error(`${label} failed.`);
    const output = extractOutput(stdout, outputId);
    if (output) console.error(output);
    else console.error(stdout.slice(-12000));
    if (stderr) console.error(stderr.slice(-4000));
    return false;
  }
  console.log(`${label} passed.`);
  return true;
}

const scenarios = [
  {
    key: 'first-paint',
    path: '/__cgb_first_paint__',
    marker: 'CGB_STATIC_FIRST_PAINT_PASS',
    label: 'Static mobile first-paint acceptance',
    outputId: 'cgb-first-paint-result',
    virtualTimeBudget: 5000
  },
  {
    key: 'external',
    path: '/tests/browser/external-venue-harness.html',
    marker: 'M4B_BROWSER_HARNESS_PASS',
    label: 'External-location attendance split acceptance',
    outputId: 'cgb-browser-result',
    virtualTimeBudget: 12000
  },
  {
    key: 'mobile-flow',
    path: '/__cgb_acceptance__?game=ucla&__cgb_acceptance=mobile-flow',
    marker: 'CGB_BROWSER_ACCEPTANCE_PASS:mobile-flow',
    label: 'Mobile map → Locations → Profile acceptance'
  },
  {
    key: 'mobile-direct',
    path: '/__cgb_acceptance__?venue=golden-bear-test-pub-berkeley&game=ucla&__cgb_acceptance=mobile-direct',
    marker: 'CGB_BROWSER_ACCEPTANCE_PASS:mobile-direct',
    label: 'Mobile direct Profile acceptance'
  },
  {
    key: 'restored-fan-intent',
    path: '/__cgb_acceptance__?game=ucla&__cgb_acceptance=restored-fan-intent&__cgb_seed=fan-intent&__cgb_seed_venue=golden-bear-test-pub-berkeley',
    marker: 'CGB_BROWSER_ACCEPTANCE_PASS:restored-fan-intent',
    label: 'Stored Fan Intent restoration acceptance'
  },
  {
    key: 'desktop-flow',
    path: '/__cgb_acceptance__?game=ucla&__cgb_acceptance=desktop-flow',
    marker: 'CGB_BROWSER_ACCEPTANCE_PASS:desktop-flow',
    label: 'Desktop Locations → full Venue Profile acceptance',
    windowSize: '1440,900'
  },
  {
    key: 'small-profile',
    path: '/__cgb_acceptance__?venue=bear-territory-test-cafe-alameda&game=ucla&__cgb_acceptance=compact-profile',
    marker: 'CGB_BROWSER_ACCEPTANCE_PASS:compact-profile',
    label: 'Small portrait Profile acceptance',
    windowSize: '320,700'
  },
  {
    key: 'landscape-profile',
    path: '/__cgb_acceptance__?venue=california-test-grill-san-francisco&game=syracuse&__cgb_acceptance=compact-profile',
    marker: 'CGB_BROWSER_ACCEPTANCE_PASS:compact-profile',
    label: 'Short landscape Profile acceptance',
    windowSize: '844,390'
  }
];

const focused = process.env.CGB_BROWSER_HARNESS_ONLY || '';
let passed = true;
try {
  const selected = focused ? scenarios.filter((scenario) => scenario.key === focused) : scenarios;
  if (focused && selected.length === 0) {
    console.error(`Unknown CGB_BROWSER_HARNESS_ONLY value: ${focused}`);
    passed = false;
  }
  for (const scenario of selected) {
    passed = await runBrowser(scenario) && passed;
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

if (!passed) process.exitCode = 1;
