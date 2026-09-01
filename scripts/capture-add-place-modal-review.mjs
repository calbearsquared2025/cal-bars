import { spawn } from 'node:child_process';
import { createReadStream, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { findBrowser } from './browser-discovery.mjs';

const [beforeArg, afterArg, outputArg] = process.argv.slice(2);
if (!beforeArg || !afterArg || !outputArg) {
  console.error('Usage: node scripts/capture-add-place-modal-review.mjs <before-root> <after-root> <output-dir>');
  process.exit(2);
}

const beforeRoot = resolve(beforeArg);
const afterRoot = resolve(afterArg);
const outputDir = resolve(outputArg);
const browser = findBrowser();
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.png', 'image/png'], ['.svg', 'image/svg+xml']
]);
const viewports = [
  { label: 'mobile-390', width: 390, height: 844 },
  { label: 'desktop-1440', width: 1440, height: 1000 }
];

mkdirSync(outputDir, { recursive: true });

function safePath(root, requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(root, relative || 'index.html');
  return candidate.startsWith(root) ? candidate : null;
}

function reviewPage(root, response) {
  const snapshot = JSON.parse(readFileSync(join(root, 'tests/fixtures/public-snapshot.synthetic.json'), 'utf8'));
  const snapshotJson = JSON.stringify(snapshot).replaceAll('<', '\\u003c');
  const productionIndex = readFileSync(join(root, 'index.html'), 'utf8');
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
  const driver = `<script>
    (() => {
      const sleep = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
      const visible = (node) => {
        if (!node || node.hidden) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
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
        await waitFor(() => document.querySelector('#app')?.getAttribute('aria-busy') === 'false' && window.CGBApp?.getState?.()?.snapshot && window.CGBExternalVenueSearch && document.querySelector('#manual-venue-name'));
        const mobile = matchMedia('(max-width: 899px)').matches;
        if (mobile) {
          document.querySelector('#mobile-search-button')?.click();
          await waitFor(() => visible(document.querySelector('#search-surface')));
        }
        const current = window.CGBApp.getState();
        current.searchMode = 'add-location';
        current.nearbyOrigin = { lat: 33.7765, lon: -118.1258, label: 'your location' };
        current.origin = null;
        document.body.dataset.searchMode = 'add-location';
        const input = document.querySelector('#location-query');
        input.value = 'District 4 Pizza';
        window.CGBExternalVenueSearch.searchCurrentQuery({ immediate: true, finalized: true });
        await waitFor(() => visible(document.querySelector('.search-result-group--external .missing-location-link')));
        document.querySelector('.search-result-group--external .missing-location-link')?.click();
        await waitFor(() => document.querySelector('#external-venue-dialog')?.open && visible(document.querySelector('.external-venue-manual')));
        [...document.querySelectorAll('.external-venue-manual .secondary-button')]
          .find((button) => button.textContent.trim() === 'Enter address')?.click();
        await waitFor(() => visible(document.querySelector('#manual-venue-address')));
        document.querySelector('#manual-venue-address').value = '2123 N Bellflower Blvd, Long Beach, CA 90815';
        document.body.dataset.reviewReady = 'true';
      })();
    })();
  </script>`;
  const html = productionIndex
    .replace('<script src="https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.js" defer></script>', '<script src="/tests/browser/maplibre-runtime-mock.js" defer></script>')
    .replace('</head>', `${prelude}\n</head>`)
    .replace('</body>', `${driver}\n</body>`);
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(html);
}

async function serveAndCapture(root, label) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    if (pathname === '/__cgb_add_place_review__') return reviewPage(root, response);
    if (pathname === '/__cgb_mock_api__') {
      const snapshot = readFileSync(join(root, 'tests/fixtures/public-snapshot.synthetic.json'), 'utf8');
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(snapshot);
    }
    const filePath = safePath(root, request.url || '/');
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

  try {
    const port = server.address().port;
    for (const viewport of viewports) {
      const output = join(outputDir, `${label}-${viewport.label}.png`);
      const profile = join(outputDir, `.chrome-${label}-${viewport.label}`);
      const args = [
        '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
        '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
        '--disable-sync', '--hide-scrollbars', '--metrics-recording-only', '--no-first-run',
        '--run-all-compositor-stages-before-draw', `--user-data-dir=${profile}`,
        `--window-size=${viewport.width},${viewport.height}`, '--virtual-time-budget=10000',
        `--screenshot=${output}`, `http://127.0.0.1:${port}/__cgb_add_place_review__`
      ];
      const child = spawn(browser, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      const exitCode = await new Promise((resolvePromise) => child.once('close', resolvePromise));
      if (exitCode !== 0) {
        console.error(stderr.slice(-4000));
        throw new Error(`Screenshot capture failed for ${label} ${viewport.label}`);
      }
      console.log(`Captured ${label} ${viewport.label}: ${output}`);
    }
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

await serveAndCapture(beforeRoot, 'before');
await serveAndCapture(afterRoot, 'after');
