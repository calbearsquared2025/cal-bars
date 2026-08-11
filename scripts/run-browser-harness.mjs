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
runtimeSnapshot.fanCounts = [];
const runtimeSnapshotJson = JSON.stringify(runtimeSnapshot).replaceAll('<', '\\u003c');
const productionIndex = readFileSync(join(repositoryRoot, 'index.html'), 'utf8');

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(repositoryRoot, relative || 'index.html');
  if (!candidate.startsWith(repositoryRoot)) return null;
  return candidate;
}

function sendProductionHarness(response) {
  const prelude = `<script>
    const cgbPrejoinedReload = sessionStorage.getItem('cgb_prejoined_reload') === 'ready';
    if (!cgbPrejoinedReload) {
      for (const key of ['cgb_v2_last_good_snapshot', 'cgb_v2_browser_id', 'cgb_v2_fan_intent_selections']) localStorage.removeItem(key);
    }
    localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
    (() => {
      const snapshot = ${runtimeSnapshotJson};
      const selections = new Map();
      if (cgbPrejoinedReload) {
        const browserId = localStorage.getItem('cgb_v2_browser_id');
        const storedSelections = JSON.parse(localStorage.getItem('cgb_v2_fan_intent_selections') || '{}');
        Object.entries(storedSelections).forEach(([gameId, venueId]) => {
          selections.set(browserId + '\\u0000' + gameId, { gameId, venueId });
        });
      }
      let failNextJoin = false;
      window.CGBProductionHarness = Object.freeze({
        failNextJoin() { failNextJoin = true; },
        seedOtherSelection(gameId, venueId) {
          selections.set('browser_other_1234567890abcdef' + '\\u0000' + gameId, { gameId, venueId });
        }
      });
      const nativeFetch = window.fetch.bind(window);
      const fanCounts = () => {
        const counts = new Map();
        selections.forEach(({ gameId, venueId }) => {
          const key = gameId + '\\u0000' + venueId;
          const current = counts.get(key) || { game_id: gameId, venue_id: venueId, count: 0 };
          current.count += 1;
          counts.set(key, current);
        });
        return [...counts.values()];
      };
      const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      window.fetch = async (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname !== '/__cgb_mock_api__') return nativeFetch(input, init);
        const method = String(init.method || input?.method || 'GET').toUpperCase();
        if (method !== 'POST') return jsonResponse({ ...snapshot, fanCounts: fanCounts() });
        let operation;
        try { operation = JSON.parse(String(init.body || '{}')); } catch (_) {
          return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
        }
        const { action, browserId, gameId, venueId } = operation || {};
        if (!['join', 'withdraw', 'move'].includes(action) || !browserId || !gameId || !venueId) {
          return jsonResponse({ ok: false, error: 'invalid_request' }, 400);
        }
        if (action === 'join' && failNextJoin) {
          failNextJoin = false;
          return jsonResponse({ ok: false, error: 'temporary_failure' }, 503);
        }
        const key = browserId + '\\u0000' + gameId;
        if (action === 'withdraw') selections.delete(key);
        else selections.set(key, { gameId, venueId });
        return jsonResponse({
          ok: true,
          action,
          selection: action === 'withdraw'
            ? null
            : { game_id: gameId, venue_id: venueId, status: 'attending' },
          fanCounts: fanCounts(),
          venueHistoryCounts: Array.isArray(snapshot.venueHistoryCounts) ? snapshot.venueHistoryCounts : []
        });
      };
    })();
  </script>`;
  const driver = `
    <output id="cgb-production-runtime-result">CGB_PRODUCTION_RUNTIME_RUNNING</output>
    <script type="module" src="/tests/browser/production-runtime-harness.mjs"></script>
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

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__cgb_production_runtime__') {
    sendProductionHarness(response);
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

function extractRuntimeResult(html) {
  const match = html.match(/<output id="cgb-production-runtime-result">([\s\S]*?)<\/output>/i);
  return match?.[1]
    ?.replace(/<[^>]*>/g, '')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&')
    .trim() || '';
}

async function runHarness({ path, marker, label, virtualTimeBudget, windowSize = '390,844' }) {
  const url = `http://127.0.0.1:${address.port}${path}`;
  const profileDirectory = mkdtempSync(join(tmpdir(), 'cgb-browser-harness-'));
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
    const runtimeResult = extractRuntimeResult(stdout);
    if (runtimeResult) console.error(runtimeResult);
    else console.error(stdout.slice(-16000));
    console.error(stderr.slice(-5000));
    return false;
  }

  console.log(`${label} passed.`);
  return true;
}

let passed = true;
try {
  passed = await runHarness({
    path: '/tests/browser/external-venue-harness.html',
    marker: 'M4B_BROWSER_HARNESS_PASS',
    label: 'Milestone 4B browser harness',
    virtualTimeBudget: 6000
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?__cgb_harness=main',
    marker: 'CGB_PRODUCTION_RUNTIME_HARNESS_PASS',
    label: 'Production runtime regression harness',
    virtualTimeBudget: 60000
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=golden-bear-test-pub-berkeley&game=game_9e8f4860c6a256c0fae6007d&__cgb_prejoined=1&__cgb_harness=direct',
    marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Production direct-route refresh harness',
    virtualTimeBudget: 30000
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?__cgb_harness=desktop',
    marker: 'CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS_PASS',
    label: 'Desktop production runtime regression harness',
    virtualTimeBudget: 60000,
    windowSize: '1440,900'
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=golden-bear-test-pub-berkeley&game=game_9e8f4860c6a256c0fae6007d&__cgb_prejoined=1&__cgb_harness=desktop-direct',
    marker: 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Desktop production direct-route refresh harness',
    virtualTimeBudget: 30000,
    windowSize: '1440,900'
  }) && passed;
} finally {
  server.close();
}

if (!passed) process.exit(1);

console.log('Browser harnesses passed: reduced external-venue fixture plus the real index.html production module graph, high-risk mobile and desktop state transitions, and direct venue cold-load/refresh behavior.');
