import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const productionIndex = readFileSync(join(repositoryRoot, 'index.html'), 'utf8');
const mockSelections = new Map();

function findBrowser() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate.includes('/')) return candidate;
      return execFileSync('which', [candidate], { encoding: 'utf8' }).trim();
    } catch (_) {}
  }
  throw new Error('No Chromium-compatible browser found for the browser harness.');
}

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(repositoryRoot, relative || 'index.html');
  if (!candidate.startsWith(repositoryRoot)) return null;
  return candidate;
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function sendProductionHarness(response) {
  const prelude = `<script>
    for (const key of ['cgb_v2_last_good_snapshot', 'cgb_v2_browser_id', 'cgb_v2_fan_intent_selections']) localStorage.removeItem(key);
    localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
  </script>`;
  const driver = `
    <output id="cgb-production-runtime-result">CGB_PRODUCTION_RUNTIME_RUNNING</output>
    <script type="module" src="/tests/browser/production-runtime-harness.mjs"></script>
  `;
  const html = productionIndex
    .replace('</head>', `${prelude}\n</head>`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(html);
}

function aggregateMockFanCounts() {
  const counts = new Map();
  mockSelections.forEach(({ gameId, venueId }) => {
    const key = `${gameId}\u0000${venueId}`;
    const current = counts.get(key) || { game_id: gameId, venue_id: venueId, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  return [...counts.values()];
}

function currentRuntimeSnapshot() {
  return {
    ...runtimeSnapshot,
    fanCounts: aggregateMockFanCounts()
  };
}

function handleMockWrite(request, response) {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    let operation;
    try { operation = JSON.parse(body || '{}'); } catch (_) {
      sendJson(response, { ok: false, error: 'invalid_json' }, 400);
      return;
    }

    const { action, browserId, gameId, venueId } = operation || {};
    if (!['join', 'withdraw', 'move'].includes(action) || !browserId || !gameId || !venueId) {
      sendJson(response, { ok: false, error: 'invalid_request' }, 400);
      return;
    }

    const key = `${browserId}\u0000${gameId}`;
    if (action === 'withdraw') mockSelections.delete(key);
    else mockSelections.set(key, { gameId, venueId });

    sendJson(response, {
      ok: true,
      action,
      selection: action === 'withdraw'
        ? null
        : { game_id: gameId, venue_id: venueId, status: 'attending' },
      fanCounts: aggregateMockFanCounts(),
      venueHistoryCounts: Array.isArray(runtimeSnapshot.venueHistoryCounts)
        ? runtimeSnapshot.venueHistoryCounts
        : []
    });
  });
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__cgb_mock_api__') {
    if (request.method === 'POST') handleMockWrite(request, response);
    else sendJson(response, currentRuntimeSnapshot());
    return;
  }
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

async function runHarness({ path, marker, label, virtualTimeBudget }) {
  const url = `http://127.0.0.1:${address.port}${path}`;
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
    '--window-size=390,844',
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

  mockSelections.clear();
  passed = await runHarness({
    path: '/__cgb_production_runtime__?__cgb_harness=main',
    marker: 'CGB_PRODUCTION_RUNTIME_HARNESS_PASS',
    label: 'Production runtime regression harness',
    virtualTimeBudget: 18000
  }) && passed;

  mockSelections.clear();
  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=golden-bear-test-pub-berkeley&game=game_2026_01&__cgb_harness=direct',
    marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Production direct-route refresh harness',
    virtualTimeBudget: 10000
  }) && passed;
} finally {
  server.close();
}

if (!passed) process.exit(1);

console.log('Browser harnesses passed: reduced external-venue fixture plus the real index.html production module graph, high-risk mobile state transitions, and direct venue cold-load/refresh behavior.');
