import assert from 'node:assert/strict';
import test from 'node:test';
import { win32 } from 'node:path';
import { findBrowser } from '../scripts/browser-discovery.mjs';

test('browser discovery accepts an explicit executable path', () => {
  const configured = win32.join('C:\\', 'Browser', 'chrome.exe');
  assert.equal(findBrowser({
    env: { CHROME_BIN: configured },
    platform: 'win32',
    fileExists: (candidate) => candidate === configured
  }), configured);
});

test('browser discovery finds standard Windows Chrome and Edge installations', () => {
  const installed = win32.join('C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe');
  assert.equal(findBrowser({
    env: { ProgramFiles: 'C:\\Program Files' },
    platform: 'win32',
    fileExists: (candidate) => candidate === installed
  }), installed);
});

test('browser discovery uses the platform executable locator as a fallback', () => {
  assert.equal(findBrowser({
    env: {},
    platform: 'linux',
    fileExists: () => false,
    locateExecutable: (candidate) => {
      if (candidate === 'chromium') return '/usr/bin/chromium\n';
      throw new Error('not found');
    }
  }), '/usr/bin/chromium');
});

test('browser discovery reports when no compatible executable exists', () => {
  assert.throws(() => findBrowser({
    env: {},
    platform: 'linux',
    fileExists: () => false,
    locateExecutable: () => { throw new Error('not found'); }
  }), /No Chromium-compatible browser found/);
});
