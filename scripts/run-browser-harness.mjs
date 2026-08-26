import { spawn } from 'node:child_process';
import { createReadStream, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { findBrowser } from './browser-discovery.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const snapshot = JSON.parse(readFileSync(join(root, 'tests/fixtures/public-snapshot.synthetic.json'), 'utf8'));
snapshot.fanCounts = [];
const fanExperienceVenue = snapshot.venues.find((venue) => venue.slug === 'golden-bear-test-pub-berkeley');
snapshot.fanExperiences = fanExperienceVenue ? [{
  venue_id: fanExperienceVenue.venue_id,
  text: 'Synthetic Bears Say experience for browser coverage.',
  display_name: 'Synthetic Bear',
  year: 2026
}] : [];
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
  const prelude = `<script>
    (() => {
      const snapshot = ${snapshotJson};
      if (!sessionStorage.getItem('cgb_smoke_session')) {
        for (const key of ['cgb_v2_last_good_snapshot', 'cgb_v2_browser_id', 'cgb_v2_fan_intent_selections']) localStorage.removeItem(key);
        sessionStorage.setItem('cgb_smoke_session', '1');
      }
      localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
      const selections = new Map();
      const browserId = localStorage.getItem('cgb_v2_browser_id');
      const stored = JSON.parse(localStorage.getItem('cgb_v2_fan_intent_selections') || '{}');
      if (browserId) Object.entries(stored).forEach(([gameId, venueId]) => selections.set(browserId + '\\u0000' + gameId, { gameId, venueId }));
      const nativeFetch = window.fetch.bind(window);
      const counts = () => {
        const values = new Map();
        selections.forEach(({ gameId, venueId }) => {
          const key = gameId + '\\u0000' + venueId;
          const current = values.get(key) || { game_id: gameId, venue_id: venueId, count: 0 };
          current.count += 1;
          values.set(key, current);
        });
        return [...values.values()];
      };
      const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      window.fetch = async (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname.endsWith('/data/fallback-v2.json')) return json(snapshot);
        if (url.hostname === 'api.maptiler.com') return json({ features: [] });
        if (url.pathname !== '/__cgb_mock_api__') return nativeFetch(input, init);
        const method = String(init.method || input?.method || 'GET').toUpperCase();
        if (method !== 'POST') return json({ ...snapshot, fanCounts: counts() });
        let operation;
        try { operation = JSON.parse(String(init.body || '{}')); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
        const { action, browserId: requestBrowserId, gameId, venueId } = operation || {};
        if (!['join', 'withdraw', 'move'].includes(action) || !requestBrowserId || !gameId || !venueId) return json({ ok: false, error: 'invalid_request' }, 400);
        const key = requestBrowserId + '\\u0000' + gameId;
        if (action === 'withdraw') selections.delete(key);
        else selections.set(key, { gameId, venueId });
        return json({
          ok: true,
          action,
          selection: action === 'withdraw' ? null : { game_id: gameId, venue_id: venueId, status: 'attending' },
          fanCounts: counts(),
          venueHistoryCounts: Array.isArray(snapshot.venueHistoryCounts) ? snapshot.venueHistoryCounts : []
        });
      };
    })();
  </script>`;
  const driver = `<output id="cgb-smoke-result">CGB_SMOKE_RUNNING</output><script type="module" src="/tests/browser/map-legend-smoke-guard.mjs"></script><script type="module" src="/tests/browser/smoke-runtime-harness.mjs"></script>`;
  const html = productionIndex
    .replace('<script src="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js" defer></script>', '<script src="/tests/browser/maplibre-runtime-mock.js" defer></script>')
    .replace('</head>', `${prelude}\n</head>`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__cgb_smoke__') return smokePage(response, request.url || '/');
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

async function run({ mode, marker, windowSize }) {
  const profile = mkdtempSync(join(tmpdir(), 'cgb-smoke-'));
  const url = `http://127.0.0.1:${address.port}/__cgb_smoke__?__cgb_smoke=${mode}`;
  const child = spawn(browser, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--metrics-recording-only', '--no-first-run', `--user-data-dir=${profile}`,
    `--window-size=${windowSize}`, '--virtual-time-budget=25000', '--dump-dom', url
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
    console.log(`${mode} browser smoke passed.`);
    return true;
  }
  console.error(`${mode} browser smoke failed.`);
  const match = stdout.match(/<output id="cgb-smoke-result">([\s\S]*?)<\/output>/i);
  console.error(match?.[1]?.replace(/<[^>]*>/g, '').trim() || stdout.slice(-10000));
  if (stderr) console.error(stderr.slice(-3000));
  return false;
}

try {
  const mobile = await run({ mode: 'mobile', marker: 'CGB_SMOKE_MOBILE_PASS', windowSize: '390,844' });
  const desktop = await run({ mode: 'desktop', marker: 'CGB_SMOKE_DESKTOP_PASS', windowSize: '1440,1000' });
  if (!mobile || !desktop) process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
}
