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

function sendProductionHarness(response, requestUrl = '/') {
  const harnessMode = new URL(requestUrl, 'http://127.0.0.1').searchParams.get('__cgb_harness') || 'main';
  const detailHarness = harnessMode === 'direct' || harnessMode === 'desktop-direct';
  const prelude = `<script>
    const cgbPrejoinedReload = sessionStorage.getItem('cgb_prejoined_reload') === 'ready';
    if (!cgbPrejoinedReload) {
      for (const key of ['cgb_v2_last_good_snapshot', 'cgb_v2_browser_id', 'cgb_v2_fan_intent_selections']) localStorage.removeItem(key);
    }
    localStorage.setItem('cgb_v2_public_data_url', location.origin + '/__cgb_mock_api__');
    (() => {
      const snapshot = ${runtimeSnapshotJson};
      const selections = new Map();
      let mapTilerSearchCalls = 0;
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
        mapTilerSearchCalls() { return mapTilerSearchCalls; },
        seedOtherSelection(gameId, venueId) {
          const syntheticBrowserId = 'browser_' + 'other_1234567890abcdef';
          selections.set(syntheticBrowserId + '\\u0000' + gameId, { gameId, venueId });
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
        if (url.hostname === 'api.maptiler.com' && url.pathname.startsWith('/geocoding/')) {
          mapTilerSearchCalls += 1;
          return jsonResponse({ features: [{
            id: 'poi.test-toast-place',
            text: 'Toast Test Place',
            place_name: 'Toast Test Place, 1 Test Way, Berkeley, California 94704, United States',
            center: [-122.273, 37.8715],
            place_type: ['poi'],
            properties: { country_code: 'us' },
            context: [
              { id: 'postcode.94704', text: '94704' },
              { id: 'place.berkeley', text: 'Berkeley' },
              { id: 'region.california', text: 'California', short_code: 'US-CA' },
              { id: 'country.us', text: 'United States', short_code: 'us' }
            ]
          }] });
        }
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
  const driverScript = detailHarness
    ? '/tests/browser/venue-detail-runtime-harness.mjs'
    : '/tests/browser/production-runtime-harness.mjs';
  const driver = `
    <output id="cgb-production-runtime-result">CGB_PRODUCTION_RUNTIME_RUNNING</output>
    <script type="module" src="${driverScript}"></script>
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
  const zoomControls = `
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
        const bodyStyle = getComputedStyle(document.body);
        const headerStyle = getComputedStyle(document.querySelector('.site-header'));
        const tray = document.querySelector('#venue-tray');
        const trayStyle = getComputedStyle(tray);
        const trayRect = tray.getBoundingClientRect();
        const handleStyle = getComputedStyle(document.querySelector('#tray-handle'));
        const chevronStyle = getComputedStyle(document.querySelector('.tray-summary__chevron'));
        const zoomIn = document.querySelector('.maplibregl-ctrl-zoom-in');

        if (document.body.dataset.view !== 'map') failures.push('missing initial map view');
        if (document.body.dataset.commandSurface !== 'map') failures.push('missing initial command surface');
        if (bodyStyle.position !== 'fixed') failures.push('map shell is not fixed');
        if (Math.abs(parseFloat(headerStyle.height) - 176) > 1) failures.push('header is not 176px');
        if (Math.abs(trayRect.left) > 1 || Math.abs(trayRect.right - innerWidth) > 1) failures.push('tray is not full width');
        if (Math.abs(parseFloat(trayStyle.height) - 96) > 1) failures.push('tray is not 96px');
        if (trayStyle.borderTopLeftRadius !== '22px') failures.push('tray radius is not settled');
        if (handleStyle.display !== 'grid' || Math.abs(parseFloat(handleStyle.height) - 18) > 1) failures.push('compact handle is not settled');
        if (chevronStyle.display !== 'none') failures.push('obsolete chevron is visible');
        if (zoomIn.getClientRects().length !== 0) failures.push('zoom controls are visible');
        if (document.querySelector('style[id^="cgb-"]')) failures.push('runtime refinement style was injected');

        document.querySelector('#cgb-first-paint-result').textContent = failures.length
          ? 'CGB_FIRST_PAINT_FAIL: ' + failures.join('; ')
          : 'CGB_STATIC_MOBILE_FIRST_PAINT_PASS';
      })();
    </script>
  `;
  const html = productionIndex
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace('<div id="map-fallback"', `${zoomControls}\n<div id="map-fallback"`)
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
    sendProductionHarness(response, request.url || '/');
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
const focusedHarness = process.env.CGB_BROWSER_HARNESS_ONLY || '';
try {
  if (focusedHarness === 'external') {
    passed = await runHarness({
      path: '/tests/browser/external-venue-harness.html',
      marker: 'M4B_BROWSER_HARNESS_PASS',
      label: 'Focused external-location attendance split harness',
      virtualTimeBudget: 12000
    }) && passed;
  } else if (focusedHarness === 'nearby') {
    passed = await runHarness({
      path: '/__cgb_production_runtime__?__cgb_harness=nearby-mobile',
      marker: 'CGB_NEARBY_MOBILE_RUNTIME_HARNESS_PASS',
      label: 'Focused mobile Nearby reuse harness',
      virtualTimeBudget: 60000
    }) && passed;

    passed = await runHarness({
      path: '/__cgb_production_runtime__?__cgb_harness=nearby-desktop',
      marker: 'CGB_NEARBY_DESKTOP_RUNTIME_HARNESS_PASS',
      label: 'Focused desktop Nearby reuse harness',
      virtualTimeBudget: 30000,
      windowSize: '1440,900'
    }) && passed;
  } else if (focusedHarness === 'search') {
    passed = await runHarness({
      path: '/__cgb_production_runtime__?__cgb_harness=search-mobile',
      marker: 'CGB_SEARCH_MODE_MOBILE_RUNTIME_HARNESS_PASS',
      label: 'Focused mobile Search mode harness',
      virtualTimeBudget: 30000
    }) && passed;

    passed = await runHarness({
      path: '/__cgb_production_runtime__?__cgb_harness=search-desktop',
      marker: 'CGB_SEARCH_MODE_DESKTOP_RUNTIME_HARNESS_PASS',
      label: 'Focused desktop Search mode harness',
      virtualTimeBudget: 30000,
      windowSize: '1440,900'
    }) && passed;
  } else if (focusedHarness === 'profile') {
    passed = await runHarness({
      path: '/__cgb_production_runtime__?venue=oski-test-taproom-oakland&game=game_2026_02&__cgb_harness=direct&__cgb_focus=contribution-photo',
      marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
      label: 'Focused mobile no-photo Venue Profile harness',
      virtualTimeBudget: 30000
    }) && passed;

    passed = await runHarness({
      path: '/__cgb_production_runtime__?venue=golden-bear-test-pub-berkeley&game=game_2026_01&__cgb_harness=direct&__cgb_focus=contribution-photo',
      marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
      label: 'Focused mobile photo-present Venue Profile harness',
      virtualTimeBudget: 30000
    }) && passed;

    passed = await runHarness({
      path: '/__cgb_production_runtime__?venue=oski-test-taproom-oakland&game=game_2026_02&__cgb_harness=desktop-direct&__cgb_focus=contribution-photo',
      marker: 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE_PASS',
      label: 'Focused desktop no-photo Venue Profile harness',
      virtualTimeBudget: 30000,
      windowSize: '1440,900'
    }) && passed;

    passed = await runHarness({
      path: '/__cgb_production_runtime__?venue=golden-bear-test-pub-berkeley&game=game_2026_01&__cgb_harness=desktop-direct&__cgb_focus=contribution-photo',
      marker: 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE_PASS',
      label: 'Focused desktop photo-present Venue Profile harness',
      virtualTimeBudget: 30000,
      windowSize: '1440,900'
    }) && passed;
  } else {
  passed = await runHarness({
    path: '/__cgb_first_paint__',
    marker: 'CGB_STATIC_MOBILE_FIRST_PAINT_PASS',
    label: 'Static mobile first-paint harness',
    virtualTimeBudget: 3000
  }) && passed;

  passed = await runHarness({
    path: '/tests/browser/external-venue-harness.html',
    marker: 'M4B_BROWSER_HARNESS_PASS',
    label: 'Milestone 4B browser harness',
    virtualTimeBudget: 6000
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=oski-test-taproom-oakland&game=syracuse&__cgb_prejoined=1&__cgb_harness=direct',
    marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Production TBD direct-route refresh harness',
    virtualTimeBudget: 30000
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?game=game_2026_01&__cgb_harness=main',
    marker: 'CGB_PRODUCTION_RUNTIME_HARNESS_PASS',
    label: 'Production runtime regression harness',
    virtualTimeBudget: 60000
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?game=game_2026_01&__cgb_harness=landscape',
    marker: 'CGB_SHORT_LANDSCAPE_RUNTIME_HARNESS_PASS',
    label: 'Short landscape production runtime regression harness',
    virtualTimeBudget: 30000,
    windowSize: '844,390'
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=golden-bear-test-pub-berkeley&game=ucla&__cgb_prejoined=1&__cgb_harness=direct',
    marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Production direct-route refresh harness',
    virtualTimeBudget: 30000
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=bear-territory-test-cafe-alameda&game=ucla&__cgb_harness=direct',
    marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Small-portrait fan-added Watch Party Detail harness',
    virtualTimeBudget: 30000,
    windowSize: '320,700'
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=california-test-grill-san-francisco&game=syracuse&__cgb_harness=direct',
    marker: 'CGB_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Short-landscape plain fan-added Detail harness',
    virtualTimeBudget: 30000,
    windowSize: '844,390'
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?game=game_2026_01&__cgb_harness=desktop',
    marker: 'CGB_DESKTOP_PRODUCTION_RUNTIME_HARNESS_PASS',
    label: 'Desktop production runtime regression harness',
    virtualTimeBudget: 60000,
    windowSize: '1440,900'
  }) && passed;

  passed = await runHarness({
    path: '/__cgb_production_runtime__?venue=golden-bear-test-pub-berkeley&game=ucla&__cgb_prejoined=1&__cgb_harness=desktop-direct',
    marker: 'CGB_DESKTOP_PRODUCTION_DIRECT_ROUTE_PASS',
    label: 'Desktop production direct-route refresh harness',
    virtualTimeBudget: 30000,
    windowSize: '1440,900'
  }) && passed;
  }
} finally {
  server.close();
}

if (!passed) process.exit(1);

console.log(focusedHarness === 'nearby'
  ? 'Focused Nearby browser harnesses passed on mobile and desktop.'
  : focusedHarness === 'search'
    ? 'Focused Search mode browser harnesses passed on mobile and desktop.'
    : focusedHarness === 'profile'
      ? 'Focused Venue Profile photo and contribution harnesses passed on mobile and desktop.'
    : 'Browser harnesses passed: static mobile first paint without refinement modules, the reduced external-venue fixture, the real index.html production module graph, high-risk mobile and desktop state transitions, resolved Venue Detail states, and direct venue cold-load/refresh behavior.');
