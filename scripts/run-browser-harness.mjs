import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml']
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
  throw new Error('No Chromium-compatible browser found for the browser harness.');
}

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = join(repositoryRoot, relative || 'index.html');
  if (!candidate.startsWith(repositoryRoot)) return null;
  return candidate;
}

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
const url = `http://127.0.0.1:${address.port}/tests/browser/external-venue-harness.html`;
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
  '--virtual-time-budget=6000',
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
server.close();

if (exitCode !== 0 || !stdout.includes('M4B_BROWSER_HARNESS_PASS')) {
  console.error('Milestone 4B browser harness failed.');
  console.error(stdout.slice(-5000));
  console.error(stderr.slice(-5000));
  process.exit(1);
}

console.log('Milestone 4B browser harness passed: existing search, external selection without creation, combined mocked write, canonical Venue insertion, authoritative count, and selected state.');
