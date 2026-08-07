import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { posix, win32 } from 'node:path';

function windowsBrowserPaths(env) {
  const roots = [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA].filter(Boolean);
  return roots.flatMap((root) => [
    win32.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    win32.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ]);
}

export function findBrowser({
  env = process.env,
  platform = process.platform,
  fileExists = existsSync,
  locateExecutable = (name) => execFileSync(
    platform === 'win32' ? 'where.exe' : 'which',
    [name],
    { encoding: 'utf8' }
  )
} = {}) {
  const path = platform === 'win32' ? win32 : posix;
  const candidates = [
    env.CHROME_BIN,
    ...(platform === 'win32' ? windowsBrowserPaths(env) : []),
    ...(platform === 'win32'
      ? ['chrome.exe', 'msedge.exe', 'chromium.exe']
      : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'])
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (fileExists(candidate)) return candidate;
      continue;
    }

    try {
      const located = locateExecutable(candidate)
        .split(/\r?\n/)
        .map((value) => value.trim())
        .find(Boolean);
      if (located) return located;
    } catch (_) {}
  }

  throw new Error('No Chromium-compatible browser found for the browser harness.');
}
