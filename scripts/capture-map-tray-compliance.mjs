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
  process.env.CGB_CAPTURE_OUTPUT || join(defaultRepositoryRoot, 'artifacts', 'map-tray-compliance')
);
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
    process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : '',
    process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '',
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate.includes('/') || candidate.includes('\\')) {
        statSync(candidate);
        return candidate;
      }
      return execFileSync(process.platform === 'win32' ? 'where' : 'which', [candidate], {
        encoding: 'utf8'
      }).split(/\r?\n/)[0].trim();
    } catch (_) {}
  }
  throw new Error('No Chromium-compatible browser found. Set CHROME_BIN to Edge or Chrome.');
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
    throw new Error(
      result.exceptionDetails.exception?.description
        || result.exceptionDetails.text
        || 'Runtime evaluation failed.'
    );
  }
  return result.result?.value;
}

async function setViewport(session, width, height, mobile) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
}

async function reload(session, waitMs = 4200) {
  const loaded = session.once('Page.loadEventFired');
  await session.send('Page.reload', { ignoreCache: true });
  await loaded;
  await wait(waitMs);
}

async function capture(session, name) {
  await evaluate(session, 'document.fonts?.ready || Promise.resolve()');
  await wait(300);
  const result = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(join(outputDirectory, `${name}.png`), Buffer.from(result.data, 'base64'));
}

async function selectVenue(session, venueType = '') {
  const selected = await evaluate(session, `(() => {
    const state = window.CGBApp?.getState?.();
    const venue = state?.snapshot?.venues?.find((item) => ${JSON.stringify(venueType)}
      ? item.venue_type === ${JSON.stringify(venueType)}
      : true) || state?.snapshot?.venues?.[0];
    const marker = venue && document.querySelector('.cgb-marker[data-venue-id="' + venue.venue_id + '"]');
    const card = venue && document.querySelector('.location-card[data-venue-id="' + venue.venue_id + '"]');
    const target = marker || card;
    target?.click();
    return venue ? { id: venue.venue_id, name: venue.name, clicked: Boolean(target) } : null;
  })()`);
  if (!selected?.clicked) throw new Error(`Unable to select ${venueType || 'a'} venue.`);
  await wait(900);
  return selected;
}

async function expandTray(session) {
  const expanded = await evaluate(session, `(() => {
    const handle = document.querySelector('#venue-tray.tray--selected #tray-handle');
    handle?.click();
    return document.querySelector('#venue-tray')?.dataset.selectedDensity || '';
  })()`);
  await wait(500);
  return expanded;
}

async function prepareWatchPartyFixture(session) {
  await evaluate(session, `(() => {
    const card = document.querySelector('#tray-selected .selected-card');
    if (!card) return false;
    const badges = card.querySelector('.venue-badges');
    if (badges && !badges.querySelector('.badge--party')) {
      const badge = document.createElement('span');
      badge.className = 'venue-badge badge--party';
      badge.textContent = 'Watch Party';
      badges.prepend(badge);
    }
    card.querySelectorAll(':scope > .party-module').forEach((module) => module.remove());
    const module = document.createElement('section');
    module.className = 'party-module';
    const host = document.createElement('p');
    host.className = 'party-module__host';
    host.textContent = 'Hosted by Cal Alumni Club';
    const restriction = document.createElement('p');
    restriction.className = 'party-module__critical';
    restriction.textContent = '21+ · Reservation recommended';
    module.append(host, restriction);
    const actions = card.querySelector('.action-row');
    card.insertBefore(module, actions || null);
    return true;
  })()`);
  await wait(250);
}

async function prepareZeroActivityFixture(session) {
  await evaluate(session, `(() => {
    const count = document.querySelector('#tray-selected .bear-count');
    if (!count) return false;
    count.classList.add('bear-count--empty');
    count.textContent = 'No Bears are watching here yet. Be the first.';
    count.setAttribute('aria-label', count.textContent);
    document.querySelector('#tray-selected .venue-activity-history')?.remove();
    return true;
  })()`);
  await wait(200);
}

async function prepareTwoLineFixture(session) {
  await evaluate(session, `(() => {
    const title = document.querySelector('#tray-selected .selected-card h2');
    if (!title) return false;
    title.textContent = 'California Golden Bears Alumni Gathering House';
    return true;
  })()`);
  await wait(200);
}

async function prepareSelectedFixture(session) {
  await evaluate(session, `(() => {
    const row = document.querySelector('#tray-selected .action-row');
    const intent = row?.querySelector('.intent-button');
    if (!row || !intent) return false;
    intent.dataset.intentState = 'selected';
    intent.setAttribute('aria-pressed', 'true');
    const main = document.createElement('span');
    main.className = 'intent-button__main';
    main.textContent = 'You’ll be here';
    intent.replaceChildren(main);
    row.querySelector('.intent-undo')?.remove();
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'intent-undo';
    undo.textContent = 'Undo';
    intent.after(undo);
    return true;
  })()`);
  await wait(200);
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
const profileDirectory = await mkdtemp(join(tmpdir(), 'cgb-map-tray-'));
const child = spawn(browser, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--metrics-recording-only',
  '--no-first-run',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDirectory}`,
  '--window-size=1280,900',
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

  await setViewport(session, 390, 844, true);
  await reload(session);
  await capture(session, '01-map-no-selection');

  await selectVenue(session, 'cal_bar');
  await capture(session, '02-compact-tray');
  await expandTray(session);
  await capture(session, '03-expanded-tray');

  await prepareWatchPartyFixture(session);
  await capture(session, '04-expanded-watch-party');

  await reload(session);
  await selectVenue(session, 'cal_bar');
  await expandTray(session);
  await capture(session, '05-expanded-cal-bar');

  await reload(session);
  await selectVenue(session, 'community_location');
  await expandTray(session);
  await capture(session, '06-expanded-community-location');

  await prepareZeroActivityFixture(session);
  await capture(session, '07-expanded-zero-activity');

  await prepareTwoLineFixture(session);
  await capture(session, '08-expanded-two-line-name');

  await reload(session);
  await selectVenue(session, 'cal_bar');
  await expandTray(session);
  await prepareSelectedFixture(session);
  await capture(session, '09-expanded-selected-state');

  await setViewport(session, 1280, 900, false);
  await reload(session);
  await selectVenue(session, 'cal_bar');
  await capture(session, '10-desktop-map-tray');

  console.log(`Captured 10 Map/Tray compliance screenshots in ${outputDirectory}.`);
} finally {
  session?.close();
  child.kill('SIGTERM');
  server.close();
  await rm(profileDirectory, { recursive: true, force: true });
}
