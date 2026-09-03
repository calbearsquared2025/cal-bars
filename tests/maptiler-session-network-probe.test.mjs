import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createReadStream, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { findBrowser } from '../scripts/browser-discovery.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
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

function redactSid(value) {
  return value ? `${value.slice(0, 8)}…` : '(none)';
}

function collectUrls(value, urls = []) {
  if (typeof value === 'string') {
    if (value.startsWith('http://') || value.startsWith('https://')) urls.push(value);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, urls));
    return urls;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectUrls(item, urls));
  }
  return urls;
}

function probePage(response) {
  const installer = `<script>
    window.__installCgbSessionProbe = () => {
      const sdk = window.maptilersdk;
      if (!sdk?.Map || window.__cgbSessionProbeInstalled) return;
      window.__cgbSessionProbeInstalled = true;
      window.__cgbSessionProbeMaps = [];
      const NativeMap = sdk.Map;
      sdk.Map = class CgbSessionProbeMap extends NativeMap {
        constructor(options) {
          super(options);
          window.__cgbSessionProbeMaps.push(this);
        }
      };
    };
  </script>`;
  const sdkTag = '<script src="https://cdn.maptiler.com/maptiler-sdk-js/v4.1.0/maptiler-sdk.umd.min.js" defer></script>';
  const instrumentedSdkTag = '<script src="https://cdn.maptiler.com/maptiler-sdk-js/v4.1.0/maptiler-sdk.umd.min.js" defer onload="window.__installCgbSessionProbe()"></script>';
  const driver = `<output id="cgb-session-probe">CGB_SESSION_PROBE_RUNNING</output><script type="module">
    const out = document.querySelector('#cgb-session-probe');
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    async function waitForMap() {
      for (let i = 0; i < 120; i += 1) {
        const map = window.__cgbSessionProbeMaps?.[0];
        if (map && typeof map.getMaptilerSessionId === 'function') return map;
        await wait(100);
      }
      throw new Error('Primary MapTiler map was not captured');
    }
    async function waitForIdle(map) {
      await Promise.race([
        new Promise((resolve) => map.once('idle', resolve)),
        wait(2500)
      ]);
    }
    async function exercise(map) {
      await waitForIdle(map);
      const moves = [
        { center: [-122.2727, 37.8715], zoom: 9 },
        { center: [-118.2437, 34.0522], zoom: 11 },
        { center: [-74.0060, 40.7128], zoom: 10 },
        { center: [-122.4194, 37.7749], zoom: 12 }
      ];
      for (const move of moves) {
        map.jumpTo(move);
        await waitForIdle(map);
      }
      map.zoomOut({ duration: 0 });
      await waitForIdle(map);
      map.zoomIn({ duration: 0 });
      await waitForIdle(map);
    }
    try {
      const map = await waitForMap();
      const sid = map.getMaptilerSessionId();
      await exercise(map);
      const phase = sessionStorage.getItem('cgb_mtsid_probe_phase') || 'first';
      await fetch('/__cgb_session_probe_event__?phase=' + encodeURIComponent(phase) + '&sid=' + encodeURIComponent(sid), { cache: 'no-store' });
      if (phase === 'first') {
        sessionStorage.setItem('cgb_mtsid_probe_phase', 'second');
        location.reload();
      } else {
        out.textContent = 'CGB_SESSION_PROBE_COMPLETE';
      }
    } catch (error) {
      out.textContent = 'CGB_SESSION_PROBE_ERROR:' + (error?.message || String(error));
    }
  </script>`;
  const html = productionIndex
    .replace('</head>', `${installer}\n</head>`)
    .replace(sdkTag, instrumentedSdkTag)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

test('real MapTiler traffic uses one mtsid per page session and refresh rotates it', { timeout: 120000 }, async () => {
  const probeEvents = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/__cgb_session_probe__') return probePage(response);
    if (url.pathname === '/__cgb_session_probe_event__') {
      probeEvents.push({ phase: url.searchParams.get('phase'), sid: url.searchParams.get('sid') || '' });
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
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
  const profile = mkdtempSync(join(tmpdir(), 'cgb-maptiler-session-'));
  const netlogPath = join(profile, 'netlog.json');
  const url = `http://127.0.0.1:${address.port}/__cgb_session_probe__`;
  const child = spawn(browser, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--disable-default-apps', '--disable-extensions', '--disable-sync', '--metrics-recording-only',
    '--no-first-run', `--user-data-dir=${profile}`, '--window-size=1440,1000',
    `--log-net-log=${netlogPath}`, '--net-log-capture-mode=Everything',
    '--virtual-time-budget=45000', '--dump-dom', url
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  try {
    const exitCode = await new Promise((resolve) => child.once('close', resolve));
    assert.equal(exitCode, 0, `Chrome exited ${exitCode}: ${stderr.slice(-2000)}`);
    assert.match(stdout, /CGB_SESSION_PROBE_COMPLETE/, `Probe did not complete: ${stdout.slice(-4000)} ${stderr.slice(-1000)}`);

    const first = probeEvents.find((event) => event.phase === 'first');
    const second = probeEvents.find((event) => event.phase === 'second');
    assert.ok(first?.sid, 'No first-page MapTiler session id was reported');
    assert.ok(second?.sid, 'No refreshed-page MapTiler session id was reported');
    assert.notEqual(first.sid, second.sid, 'Hard refresh did not generate a new MapTiler session id');

    const netlog = JSON.parse(readFileSync(netlogPath, 'utf8'));
    const rawUrls = collectUrls(netlog);
    const maptilerTileRequests = [];
    for (const rawUrl of rawUrls) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.hostname !== 'api.maptiler.com' || !parsed.pathname.includes('/tiles/')) continue;
        maptilerTileRequests.push({ path: parsed.pathname, mtsid: parsed.searchParams.get('mtsid') || '' });
      } catch (_) {}
    }
    assert.ok(maptilerTileRequests.length > 0, 'No real api.maptiler.com tile/source requests were captured');
    const missing = maptilerTileRequests.filter((request) => !request.mtsid);
    assert.equal(missing.length, 0, `${missing.length} MapTiler tile/source requests did not contain mtsid`);

    const ids = new Set(maptilerTileRequests.map((request) => request.mtsid));
    assert.ok(ids.has(first.sid), 'First page session id was not present on real MapTiler tile/source traffic');
    assert.ok(ids.has(second.sid), 'Refreshed page session id was not present on real MapTiler tile/source traffic');
    assert.deepEqual([...ids].sort(), [first.sid, second.sid].sort(), 'Tile/source traffic used an unexpected additional session id');

    const firstCount = maptilerTileRequests.filter((request) => request.mtsid === first.sid).length;
    const secondCount = maptilerTileRequests.filter((request) => request.mtsid === second.sid).length;
    assert.ok(firstCount >= 3, `Only ${firstCount} tile/source requests used the initial session id`);
    assert.ok(secondCount >= 3, `Only ${secondCount} tile/source requests used the refreshed session id`);

    console.log(`MapTiler session probe PASS: ${maptilerTileRequests.length} tile/source requests; first ${redactSid(first.sid)} on ${firstCount}; refreshed ${redactSid(second.sid)} on ${secondCount}; refresh rotated session id.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  }
});
