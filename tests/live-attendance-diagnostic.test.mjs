import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findBrowser } from '../scripts/browser-discovery.mjs';

const PRODUCTION_URL = 'https://calgoldenbars.com/?game=syracuse&venue=kingfish-pub-and-cafe-oakland';

async function dumpProductionDom() {
  const profile = mkdtempSync(join(tmpdir(), 'cgb-live-attendance-'));
  try {
    const browser = findBrowser();
    const child = spawn(browser, [
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
      '--disable-sync', '--metrics-recording-only', '--no-first-run', `--user-data-dir=${profile}`,
      '--window-size=390,844', '--virtual-time-budget=8000', '--dump-dom', PRODUCTION_URL
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const exitCode = await new Promise((resolve) => child.once('close', resolve));
    assert.equal(exitCode, 0, stderr.slice(-4000));
    return stdout;
  } finally {
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  }
}

test('diagnostic: report deployed Kingfish selected-profile attendance DOM', { timeout: 30000 }, async () => {
  const dom = await dumpProductionDom();
  const heroMatch = dom.match(/<div class="bear-count bear-count--hero[\s\S]*?<\/div>/i);
  const numberMatch = dom.match(/<span class="bear-count__number">([^<]*)<\/span>/i);
  const sourceMatch = dom.match(/<body[^>]*data-data-source="([^"]*)"/i);
  assert.fail(JSON.stringify({
    hasAttendanceHero: Boolean(heroMatch),
    number: numberMatch?.[1]?.trim() || '',
    dataSource: sourceMatch?.[1] || '',
    kingfishPresent: dom.includes('Kingfish Pub &amp; Cafe') || dom.includes('Kingfish Pub & Cafe'),
    beTheFirstPresent: dom.includes('BE THE FIRST')
  }));
});
