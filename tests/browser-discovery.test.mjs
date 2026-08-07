import assert from 'node:assert/strict';
import test from 'node:test';
import { findBrowser } from '../scripts/browser-discovery.mjs';

test('browser discovery treats an injected Windows executable as absolute on every host', () => {
  const configured = 'C:\\Browser\\chrome.exe';
  const checkedPaths = [];
  const locatedNames = [];
  assert.equal(findBrowser({
    env: { CHROME_BIN: configured },
    platform: 'win32',
    fileExists: (candidate) => {
      checkedPaths.push(candidate);
      return candidate === configured;
    },
    locateExecutable: (candidate) => {
      locatedNames.push(candidate);
      throw new Error('absolute paths must not use executable lookup');
    }
  }), configured);
  assert.deepEqual(checkedPaths, [configured]);
  assert.deepEqual(locatedNames, []);
});

test('browser discovery builds deterministic Windows installation paths on every host', () => {
  const installed = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const checkedPaths = [];
  assert.equal(findBrowser({
    env: { ProgramFiles: 'C:\\Program Files' },
    platform: 'win32',
    fileExists: (candidate) => {
      checkedPaths.push(candidate);
      return candidate === installed;
    },
    locateExecutable: () => { throw new Error('not found'); }
  }), installed);
  assert.deepEqual(checkedPaths, [installed]);
  assert.ok(checkedPaths.every((candidate) => !candidate.includes('/')));
});

test('browser discovery preserves POSIX executable path semantics', () => {
  const configured = '/opt/google/chrome';
  assert.equal(findBrowser({
    env: { CHROME_BIN: configured },
    platform: 'linux',
    fileExists: (candidate) => candidate === configured,
    locateExecutable: () => { throw new Error('absolute paths must not use executable lookup'); }
  }), configured);
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
