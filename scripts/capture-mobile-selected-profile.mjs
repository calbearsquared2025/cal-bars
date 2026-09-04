import { execFileSync, spawn } from 'node:child_process';
import { createReadStream, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(process.cwd());
const outputDir = resolve(process.argv[2] || join(root, 'artifacts/mobile-selected-profile'));
mkdirSync(outputDir, { recursive: true });
const snapshot = JSON.parse(readFileSync(join(root, 'tests/fixtures/public-snapshot.synthetic.json'), 'utf8'));
const snapshotJson = JSON.stringify(snapshot).replaceAll('<', '\\u003c');
const productionIndex = readFileSync(join(root, 'index.html'), 'utf8');
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.png', 'image/png'], ['.svg', 'image/svg+xml']
]);

function findBrowser() {
  const candidates = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const located = execFileSync('which', [candidate], { encoding: 'utf8' })
        .split(/\r?\n/).map((value) => value.trim()).find(Boolean);
      if (located) return located;
    } catch (_) {}
  }
  throw new Error('No Chromium-compatible browser found.');
}

function awaitClose(child) {
  return new Promise((resolvePromise) => child.once('close', resolvePromise));
}

function safePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(root, relative || 'index.html');
  return candidate.startsWith(root) ? candidate : null;
}

function screenshotPage(response, requestUrl) {
  const url = new URL(requestUrl || '/', 'http://127.0.0.1');
  const venueId = url.searchParams.get('venue') || 'ven_000001';
  const prelude = `<script>
    (() => {
      const snapshot = ${snapshotJson};
      const targetVenueId = ${JSON.stringify(venueId)};
      localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
      const nativeFetch = window.fetch.bind(window);
      const json = (payload) => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      window.fetch = async (input, init = {}) => {
        const requestUrl = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (requestUrl.pathname === '/__cgb_mock_api__' || requestUrl.pathname.endsWith('/data/fallback-v2.json')) return json(snapshot);
        if (requestUrl.hostname === 'api.maptiler.com') return json({ features: [] });
        if (requestUrl.origin !== location.origin) throw new Error('Unexpected external request: ' + requestUrl.href);
        return nativeFetch(input, init);
      };
      const sleep = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));
      const waitFor = async (predicate, timeout = 4500) => {
        const deadline = performance.now() + timeout;
        while (performance.now() < deadline) {
          try { if (predicate()) return true; } catch (_) {}
          await sleep();
        }
        return false;
      };
      window.addEventListener('load', async () => {
        await waitFor(() => window.CGBApp?.getState?.()?.snapshot && document.querySelector('#mobile-list-button'));
        document.querySelector('#mobile-list-button')?.click();
        await waitFor(() => document.querySelector('#tray-list:not([hidden])'));
        const card = document.querySelector('#location-list .location-card[data-venue-id="' + targetVenueId + '"]');
        card?.click();
        await waitFor(() => window.CGBApp?.getState?.()?.selectedVenueId === targetVenueId && document.querySelector('#tray-selected:not([hidden])'));
        await sleep(800);
        document.documentElement.dataset.screenshotReady = 'true';
      }, { once: true });
    })();
  </script>`;
  const html = productionIndex
    .replace('<link rel="preconnect" href="https://cdn.maptiler.com">', '')
    .replace('<link rel="preconnect" href="https://api.maptiler.com">', '')
    .replace('<link href="https://cdn.maptiler.com/maptiler-sdk-js/v4.1.0/maptiler-sdk.css" rel="stylesheet">', '')
    .replace('<script src="https://cdn.maptiler.com/maptiler-sdk-js/v4.1.0/maptiler-sdk.umd.min.js" defer></script>', '<script src="/tests/browser/maplibre-runtime-mock.js" defer></script>')
    .replace('</head>', `${prelude}\n</head>`);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__cgb_screenshot__') return screenshotPage(response, request.url);
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

await new Promise((resolvePromise, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolvePromise);
});

const browser = findBrowser();
const address = server.address();
const cases = [
  ['positive', 'ven_000002'],
  ['zero', 'ven_000004'],
  ['watch-party', 'ven_000001']
];

try {
  for (const [label, venueId] of cases) {
    const profile = mkdtempSync(join(tmpdir(), 'cgb-shot-'));
    const output = join(outputDir, `${label}.png`);
    const url = `http://127.0.0.1:${address.port}/__cgb_screenshot__?venue=${venueId}`;
    const child = spawn(browser, [
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
      '--disable-sync', '--metrics-recording-only', '--no-first-run', `--user-data-dir=${profile}`,
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      '--window-size=390,844', '--virtual-time-budget=7000', `--screenshot=${output}`, url
    ], { stdio: 'inherit' });
    const code = await awaitClose(child);
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
    if (code !== 0) throw new Error(`Screenshot capture failed for ${label} (${code}).`);
  }
} finally {
  await new Promise((resolvePromise) => server.close(resolvePromise));
}
