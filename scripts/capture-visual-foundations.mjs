import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = resolve(process.env.CGB_CAPTURE_ROOT || defaultRepositoryRoot);
const outputDirectory = resolve(
  process.env.CGB_CAPTURE_OUTPUT || join(repositoryRoot, 'artifacts', 'visual-foundations')
);
const validateFoundations = process.env.CGB_VALIDATE_FOUNDATIONS === '1';
const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

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
  throw new Error('No Chromium-compatible browser found for screenshot capture.');
}

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(repositoryRoot, relative || 'index.html');
  if (!candidate.startsWith(repositoryRoot)) return null;
  try {
    if (statSync(candidate).isFile()) return candidate;
  } catch (_) {}
  return join(repositoryRoot, 'index.html');
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function waitForDevTools(child) {
  return await new Promise((resolveSocket, reject) => {
    let stderr = '';
    const timeout = setTimeout(
      () => reject(new Error(`DevTools endpoint not found. ${stderr.slice(-2000)}`)),
      15000
    );
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolveSocket(match[1]);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Browser exited before DevTools was ready (${code}). ${stderr.slice(-2000)}`));
    });
  });
}

class CdpSession {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolveSocket, reject) => {
      this.socket.addEventListener('open', resolveSocket, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }
      const listeners = this.events.get(message.method) || [];
      this.events.delete(message.method);
      listeners.forEach((resolveEvent) => resolveEvent(message.params || {}));
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const result = new Promise((resolveResult, reject) => {
      this.pending.set(id, { resolve: resolveResult, reject });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  once(method) {
    return new Promise((resolveEvent) => {
      const listeners = this.events.get(method) || [];
      listeners.push(resolveEvent);
      this.events.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed.');
  }
  return result.result?.value;
}

async function auditFoundations(session, expectedView) {
  const audit = await evaluate(session, `(async () => {
    await Promise.all([
      document.fonts.load('16px "Inter"'),
      document.fonts.load('16px "Source Serif 4"'),
      document.fonts.load('16px "Barlow Condensed"')
    ]);

    const rootStyle = getComputedStyle(document.documentElement);
    const gutter = parseFloat(rootStyle.getPropertyValue('--mobile-content-gutter'));
    const probe = document.createElement('span');
    probe.style.color = rootStyle.getPropertyValue('--cgb-gold-400');
    document.body.append(probe);
    const gold = getComputedStyle(probe).color;
    probe.remove();

    const visible = (element) => {
      if (!element || element.closest('[hidden]')) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < innerHeight
        && rect.left < innerWidth;
    };

    const interactive = Array.from(document.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]'
    )).filter(visible);
    const targetFailures = interactive
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: element.id ? '#' + element.id : element.className || element.tagName,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10
        };
      })
      .filter(({ width, height }) => width < 43.5 || height < 43.5);

    const navigation = Array.from(document.querySelectorAll('.mobile-command'));
    const navigationFailures = navigation.flatMap((button) => {
      const label = button.querySelector('span:last-child');
      const style = getComputedStyle(label || button);
      const rect = button.getBoundingClientRect();
      const failures = [];
      if (!style.fontFamily.includes('Inter')) failures.push(button.id + ': font=' + style.fontFamily);
      const size = parseFloat(style.fontSize);
      if (size < 12 || size > 14) failures.push(button.id + ': size=' + style.fontSize);
      if (rect.width < 43.5 || rect.height < 43.5) failures.push(button.id + ': target=' + rect.width + 'x' + rect.height);
      return failures;
    });

    const active = navigation.filter((button) => button.getAttribute('aria-current') === 'page');
    const expectedActiveId = ${JSON.stringify(expectedView)} === 'search'
      ? 'mobile-search-button'
      : ${JSON.stringify(expectedView)} === 'add'
        ? 'mobile-add-button'
        : ${JSON.stringify(expectedView)} === 'list'
          ? 'mobile-list-button'
          : 'mobile-map-button';
    if (${JSON.stringify(expectedView)} !== 'detail') {
      if (active.length !== 1 || active[0]?.id !== expectedActiveId) {
        navigationFailures.push('active=' + active.map((button) => button.id).join(',') + '; expected=' + expectedActiveId);
      }
      const activeIndicator = active[0] ? getComputedStyle(active[0], '::after') : null;
      if (!activeIndicator || activeIndicator.display !== 'block' || activeIndicator.backgroundColor !== gold) {
        navigationFailures.push('active indicator is not the shared gold bar');
      }
      const addMark = document.querySelector('.mobile-command__add-mark');
      const addBackground = addMark ? getComputedStyle(addMark).backgroundColor : '';
      if (${JSON.stringify(expectedView)} === 'add' ? addBackground !== gold : addBackground === gold) {
        navigationFailures.push('Add gold state does not match semantic selection');
      }
    }

    const gutterSelectors = {
      map: [['.site-header', 'paddingLeft'], ['.map-toolbar', 'left']],
      search: [['.command-surface:not([hidden]) .command-surface__shell', 'paddingLeft']],
      add: [['.command-surface:not([hidden]) .command-surface__shell', 'paddingLeft']],
      list: [['.tray-list__header', 'paddingLeft'], ['.location-card', 'paddingLeft']],
      tray: [['.selected-card', 'paddingLeft']],
      detail: [['.detail-hero', 'paddingLeft'], ['.detail-game-context', 'marginLeft']]
    };
    const gutterFailures = (gutterSelectors[${JSON.stringify(expectedView)}] || []).flatMap(([selector, property]) => {
      const element = document.querySelector(selector);
      if (!element) return ['missing gutter target ' + selector];
      const value = parseFloat(getComputedStyle(element)[property]);
      return Math.abs(value - gutter) <= 1.5 ? [] : [selector + ' ' + property + '=' + value + '; expected=' + gutter];
    });

    return {
      fonts: {
        inter: document.fonts.check('16px "Inter"'),
        sourceSerif: document.fonts.check('16px "Source Serif 4"'),
        barlowCondensed: document.fonts.check('16px "Barlow Condensed"')
      },
      targetFailures,
      navigationFailures,
      gutterFailures,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  })()`);

  const failures = [];
  if (!audit.fonts.inter || !audit.fonts.sourceSerif || !audit.fonts.barlowCondensed) {
    failures.push(`font loading: ${JSON.stringify(audit.fonts)}`);
  }
  if (audit.targetFailures.length) failures.push(`targets: ${JSON.stringify(audit.targetFailures)}`);
  if (audit.navigationFailures.length) failures.push(`navigation: ${audit.navigationFailures.join('; ')}`);
  if (audit.gutterFailures.length) failures.push(`gutters: ${audit.gutterFailures.join('; ')}`);
  if (audit.horizontalOverflow) failures.push('horizontal viewport overflow');
  if (failures.length) throw new Error(`${expectedView} visual-foundation audit failed — ${failures.join(' | ')}`);
}

async function capture(session, name, expectedView) {
  await evaluate(session, 'document.fonts?.ready || Promise.resolve()');
  await wait(350);
  if (validateFoundations) await auditFoundations(session, expectedView);
  const result = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(join(outputDirectory, `${name}.png`), Buffer.from(result.data, 'base64'));
}

async function activate(session, selector) {
  const activated = await evaluate(
    session,
    `(() => { const element = document.querySelector(${JSON.stringify(selector)}); element?.click(); return Boolean(element); })()`
  );
  if (!activated) throw new Error(`Unable to activate ${selector}.`);
  await wait(650);
}

await mkdir(outputDirectory, { recursive: true });
const server = createServer((request, response) => {
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

await new Promise((resolveServer, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveServer);
});

const address = server.address();
const browser = findBrowser();
const profileDirectory = await mkdtemp(join(tmpdir(), 'cgb-visual-foundations-'));
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
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDirectory}`,
  '--window-size=390,844',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

let session;
try {
  const browserSocket = await waitForDevTools(child);
  const devToolsPort = new URL(browserSocket).port;
  const pageUrl = `http://127.0.0.1:${address.port}/`;
  const target = await fetch(
    `http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(pageUrl)}`,
    { method: 'PUT' }
  ).then((response) => response.json());
  session = new CdpSession(target.webSocketDebuggerUrl);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844
  });
  const initialLoad = session.once('Page.loadEventFired');
  await session.send('Page.reload', { ignoreCache: true });
  await initialLoad;
  await wait(5500);

  await capture(session, 'map', 'map');
  await activate(session, '#mobile-search-button');
  await capture(session, 'search', 'search');
  await activate(session, '#mobile-add-button');
  await capture(session, 'add', 'add');
  await activate(session, '#mobile-list-button');
  await capture(session, 'list', 'list');

  const selected = await evaluate(session, `(() => {
    const row = document.querySelector('.location-card, .location-list button');
    row?.click();
    return Boolean(row);
  })()`);
  if (!selected) throw new Error('Unable to select a venue for the tray screenshot.');
  await wait(1000);
  await capture(session, 'tray', 'tray');

  const detailLoad = session.once('Page.loadEventFired');
  const navigated = await evaluate(session, `(() => {
    const state = window.CGBApp?.getState?.();
    const venue = state?.snapshot?.venues?.find((item) => item.venue_id === state.selectedVenueId)
      || state?.snapshot?.venues?.[0];
    if (!venue?.slug) return false;
    const game = state?.gameId ? '?game=' + encodeURIComponent(state.gameId) : '';
    location.href = '/venue/' + encodeURIComponent(venue.slug) + game;
    return true;
  })()`);
  if (!navigated) throw new Error('Unable to navigate to a Venue Detail route.');
  await detailLoad;
  await wait(2500);
  await capture(session, 'venue-detail', 'detail');

  console.log(
    `Captured Map, Search, Add, List, Tray, and Venue Detail at 390x844 in ${outputDirectory}`
      + (validateFoundations ? ' with computed visual-foundation checks.' : '.')
  );
} finally {
  session?.close();
  child.kill('SIGTERM');
  server.close();
  await rm(profileDirectory, { recursive: true, force: true });
}
