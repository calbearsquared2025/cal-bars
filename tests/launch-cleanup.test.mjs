import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const removedPaths = [
  'assets/bear_paw.svg',
  'assets/bear_paw_logo.svg',
  'assets/cgbfavicon.png',
  'assets/favicon.svg',
  'assets/social-preview.png',
  'assets/social-preview.png.png',
  'css/external-watch-party-cta.css',
  'css/external-watch-party-plan.css'
];

async function exists(path) {
  try {
    await access(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

test('removes unreferenced launch assets and orphan stylesheets', async () => {
  for (const path of removedPaths) {
    assert.equal(await exists(path), false, `${path} should be removed`);
  }
});

test('removes the obsolete Details icon path', async () => {
  const [icons, sprite, upgrade] = await Promise.all([
    readFile(new URL('js/icons.mjs', root), 'utf8'),
    readFile(new URL('assets/icons.svg', root), 'utf8'),
    readFile(new URL('js/icon-upgrade.mjs', root), 'utf8')
  ]);
  assert.doesNotMatch(icons, /\bdetails:\s*\[/);
  assert.doesNotMatch(sprite, /icon-details/);
  assert.doesNotMatch(upgrade, /label === 'view details'|return 'details'/);
});

test('selected tray density is owned by map-mobile refinement only', async () => {
  const [mobile, finalPass] = await Promise.all([
    readFile(new URL('js/map-mobile-refinement.mjs', root), 'utf8'),
    readFile(new URL('js/map-profile-final-pass.mjs', root), 'utf8')
  ]);
  assert.match(mobile, /let selectedTrayExpanded = false/);
  assert.doesNotMatch(finalPass, /collapsedVenueId|defaultSelectedTrayToCompact|#tray-handle'\)\?\.click/);
});
