import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = join(repositoryRoot, 'artifacts', 'visual-foundations');
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
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDevTools(child) {
  return await new Promise((resolve, reject) => {
    let stderr = '';
    const timeout = setTimeout(() => reject(new Error(`DevTools endpoint not found. ${stderr.slice(-2000)}`)), 15000);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
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
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
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
      listeners.forEach((resolve) => resolve(message.params || {}));
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  once(method) {
    return new Promise((resolve) => {
      const listeners = this.events.get(method) || [];
      listeners.push(resolve);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed.');
  return result.result?.value;
}

async function capture(session, name) {
  await evaluate(session, 'document.fonts?.ready || Promise.resolve()');
  await wait(350);
  const result = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(join(outputDirectory, `${name}.png`), Buffer.from(result.data, 'base64'));
}

async function activate(session, selector) {
  await evaluate(session, `document.querySelector(${JSON.stringify(selector)})?.click()`);
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

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
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
  const target = await fetch(`http://127.0.0.1:${devToolsPort}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' }).then((response) => response.json());
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
  await session.send('Page.reload', { ignoreCache: true });
  await session.once('Page.loadEventFired');
  await wait(5500);

  await capture(session, 'map');
  await activate(session, '#mobile-search-button');
  await capture(session, 'search');
  await activate(session, '#mobile-add-button');
  await capture(session, 'add');
  await activate(session, '#mobile-list-button');
  await capture(session, 'list');

  await evaluate(session, `(() => {
    const row = document.querySelector('.location-card, .location-list button, [data-venue-id]');
    row?.click();
  })()`);
  await wait(1000);
  await capture(session, 'tray');

  await evaluate(session, `(() => {
    const state = window.CGBApp?.getState?.();
    const venue = state?.snapshot?.venues?.find((item) => item.venue_id === state.selectedVenueId) || state?.snapshot?.venues?.[0];
    if (!venue?.slug) return false;
    const game = state?.gameId ? '?game=' + encodeURIComponent(state.gameId) : '';
    location.href = '/venue/' + encodeURIComponent(venue.slug) + game;
    return true;
  })()`);
  await session.once('Page.loadEventFired');
  await wait(2500);
  await capture(session, 'venue-detail');

  console.log(`Captured Map, Search, Add, List, Tray, and Venue Detail at 390x844 in ${outputDirectory}.`);
} finally {
  session?.close();
  child.kill('SIGTERM');
  server.close();
  await rm(profileDirectory, { recursive: true, force: true });
}
