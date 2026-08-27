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

function smokePage(response) {
  const prelude = `<script>
    (() => {
      const snapshot = ${snapshotJson};
      localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
      const nativeFetch = window.fetch.bind(window);
      const json = (payload) => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      window.fetch = async (input, init = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname === '/__cgb_mock_api__' || url.pathname.endsWith('/data/fallback-v2.json')) return json(snapshot);
        if (url.hostname === 'api.maptiler.com') return json({ features: [] });
        return nativeFetch(input, init);
      };
    })();
  </script>`;
  const driver = `<output id="cgb-smoke-result">CGB_SMOKE_RUNNING</output><script type="module" src="/tests/browser/smoke-runtime-harness.mjs"></script>`;
  const html = productionIndex
    .replace('<script src="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js" defer></script>', '<script src="/tests/browser/maplibre-runtime-mock.js" defer></script>')
    .replace('</head>', `${prelude}\n</head>`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__cgb_smoke__') return smokePage(response);
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

async function run({ mode, marker, windowSize, label = mode }) {
  const profile = mkdtempSync(join(tmpdir(), 'cgb-smoke-'));
  const url = `http://127.0.0.1:${address.port}/__cgb_smoke__?__cgb_smoke=${mode}`;
  const child = spawn(browser, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--metrics-recording-only', '--no-first-run', `--user-data-dir=${profile}`,
    `--window-size=${windowSize}`, '--virtual-time-budget=3000', '--dump-dom', url
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
  if (!mobile || !smallMobile || !desktop) process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
}
