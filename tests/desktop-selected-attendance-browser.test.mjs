import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createReadStream, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { findBrowser } from '../scripts/browser-discovery.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const productionIndex = readFileSync(join(root, 'index.html'), 'utf8');
const snapshot = JSON.parse(readFileSync(join(root, 'tests/fixtures/public-snapshot.synthetic.json'), 'utf8'));
const snapshotJson = JSON.stringify(snapshot).replaceAll('<', '\\u003c');
const TARGET_VENUE_ID = 'ven_000003';
const TARGET_GAME_ID = 'game_64902a48440e55522742d631';
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

function testPage(response) {
  const prelude = `<script>
    (() => {
      const snapshot = ${snapshotJson};
      localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
      const nativeFetch = window.fetch.bind(window);
      const json = (payload) => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      window.fetch = async (input) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname === '/__cgb_mock_api__' || url.pathname.endsWith('/data/fallback-v2.json')) return json(snapshot);
        if (url.hostname === 'api.maptiler.com') return json({ features: [] });
        if (url.origin !== location.origin) throw new Error('Unexpected external request: ' + url.href);
        return nativeFetch(input);
      };
    })();
  </script><style>
    @media (min-width: 900px) {
      #tray-selected { scrollbar-gutter: stable !important; }
    }
  </style>`;
  const driver = `<output id="attendance-test-result">RUNNING</output><script>
    (() => {
      const output = document.querySelector('#attendance-test-result');
      const sleep = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));
      const visible = (node) => {
        if (!node || node.hidden) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
      };
      const waitFor = async (predicate, timeout = 5000) => {
        const deadline = performance.now() + timeout;
        while (performance.now() < deadline) {
          try { if (predicate()) return true; } catch (_) {}
          await sleep();
        }
        return false;
      };
      (async () => {
        try {
          const ready = await waitFor(() =>
            document.querySelector('#app')?.getAttribute('aria-busy') === 'false' &&
            window.CGBApp?.getState?.()?.snapshot &&
            window.matchMedia('(min-width: 900px)').matches);
          if (!ready) throw new Error('app_not_ready');

          const appState = window.CGBApp.getState();
          appState.gameId = '${TARGET_GAME_ID}';
          appState.selectedVenueId = '${TARGET_VENUE_ID}';
          appState.detailMode = false;
          window.CGBApp.showSelectedVenue?.();
          window.CGBApp.render?.();

          const selectedReady = await waitFor(() => {
            const hero = document.querySelector('#venue-detail[data-profile-presentation="desktop"] > .detail-hero');
            const numeral = hero?.querySelector('.activity-card strong.bear-count .bear-count__number');
            const bar = document.querySelector('.mobile-command-bar');
            return visible(document.querySelector('#tray-selected')) && visible(hero) && visible(numeral) && visible(bar);
          });
          if (!selectedReady) throw new Error('desktop_positive_attendance_not_rendered');

          await sleep(100);
          const selected = document.querySelector('#tray-selected');
          const hero = document.querySelector('#venue-detail[data-profile-presentation="desktop"] > .detail-hero');
          const attendance = hero?.querySelector('.activity-card strong.bear-count');
          const numeral = attendance?.querySelector('.bear-count__number');
          const bar = document.querySelector('.mobile-command-bar');
          const numeralStyle = getComputedStyle(numeral);
          const numeralRect = numeral.getBoundingClientRect();
          const heroRect = hero.getBoundingClientRect();
          const barRect = bar.getBoundingClientRect();
          output.textContent = JSON.stringify({
            text: numeral.textContent.trim(),
            label: attendance?.querySelector('.bear-count__label')?.textContent?.trim() || '',
            attending: attendance?.querySelector('.bear-count__attending')?.textContent?.trim() || '',
            context: attendance?.querySelector('.bear-count__context')?.textContent?.trim() || '',
            color: numeralStyle.color,
            numeralWidth: numeralRect.width,
            numeralHeight: numeralRect.height,
            scrollbarWidth: Math.max(0, selected.offsetWidth - selected.clientWidth),
            heroLeft: heroRect.left,
            heroRight: heroRect.right,
            barLeft: barRect.left,
            barRight: barRect.right
          });
        } catch (error) {
          output.textContent = JSON.stringify({ error: String(error?.message || error) });
        }
      })();
    })();
  </script>`;
  const html = productionIndex
    .replace('<link rel="preconnect" href="https://cdn.maptiler.com">', '')
    .replace('<link rel="preconnect" href="https://api.maptiler.com">', '')
    .replace('<link href="https://cdn.maptiler.com/maptiler-sdk-js/v4.1.0/maptiler-sdk.css" rel="stylesheet">', '')
    .replace('<script src="https://cdn.maptiler.com/maptiler-sdk-js/v4.1.0/maptiler-sdk.umd.min.js" defer></script>', '<script src="/tests/browser/maplibre-runtime-mock.js" defer></script>')
    .replace('</head>', `${prelude}\n</head>`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

async function runBrowser() {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    if (pathname === '/__desktop_attendance_test__') return testPage(response);
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

  const profile = mkdtempSync(join(tmpdir(), 'cgb-desktop-attendance-'));
  try {
    const browser = findBrowser();
    const port = server.address().port;
    const child = spawn(browser, [
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
      '--disable-sync', '--metrics-recording-only', '--no-first-run', `--user-data-dir=${profile}`,
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      '--window-size=1200,800', '--virtual-time-budget=7000', '--dump-dom',
      `http://127.0.0.1:${port}/__desktop_attendance_test__`
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const exitCode = await new Promise((resolve) => child.once('close', resolve));
    assert.equal(exitCode, 0, stderr.slice(-4000));
    const match = stdout.match(/<output id="attendance-test-result">([\s\S]*?)<\/output>/i);
    assert.ok(match, 'Desktop attendance browser result should be present in dumped DOM');
    return JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  } finally {
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
    await new Promise((resolve) => server.close(resolve));
  }
}

test('desktop selected profile shows the attendee numeral and aligns its hero with the command bar', { timeout: 22000 }, async () => {
  const result = await runBrowser();
  assert.equal(result.error, undefined, result.error);
  assert.equal(result.text, '2');
  assert.equal(result.label, 'BEARS');
  assert.equal(result.attending, 'ATTENDING');
  assert.equal(result.context, 'ON CGB');
  assert.match(result.color, /^rgba?\(255, 255, 255(?:, 1)?\)$/);
  assert.ok(result.numeralWidth > 0 && result.numeralHeight > 0, 'Desktop attendee numeral should have visible geometry');
  assert.ok(result.scrollbarWidth > 0, `Test should reserve a desktop scrollbar gutter, got ${result.scrollbarWidth}`);
  assert.ok(Math.abs(result.heroLeft - result.barLeft) <= 1, `Expected aligned left edges, got hero ${result.heroLeft} and bar ${result.barLeft}`);
  assert.ok(Math.abs(result.heroRight - result.barRight) <= 1, `Expected aligned right edges, got hero ${result.heroRight} and bar ${result.barRight}`);
});