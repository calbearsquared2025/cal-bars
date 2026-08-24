import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [index, profile, refinement, detailCss] = await Promise.all([
  read('../index.html'),
  read('../js/venue-profile-enhancement.mjs'),
  read('../js/icon-upgrade.mjs'),
  read('../css/venue-detail.css')
]);

test('no-photo local map stays hidden and busy until its MapLibre load event', () => {
  assert.match(profile, /function createLocalMapFallback[\s\S]*className = 'detail-local-map'[\s\S]*setAttribute\('aria-busy', 'true'\)/);
  assert.match(detailCss, /\.detail-local-map\s*\{[^}]*visibility: hidden !important;/);
  assert.match(detailCss, /\.detail-local-map\.is-ready\s*\{[^}]*visibility: visible !important;/);
  assert.match(refinement, /function revealDetailLocalMap\(container\)[\s\S]*classList\.add\('is-ready'\)[\s\S]*setAttribute\('aria-busy', 'false'\)/);
  assert.match(refinement, /map\.on\('load', \(\) => \{[\s\S]*detailLocalMap !== map[\s\S]*revealDetailLocalMap\(container\)/);
});

test('one refinement owner manages the local MapLibre instance and photo-present Profiles remove it', () => {
  assert.equal((refinement.match(/new window\.maplibregl\.Map/g) || []).length, 1);
  assert.match(refinement, /if \(!container\) \{[\s\S]*destroyDetailLocalMap\(\)[\s\S]*return;/);
  assert.match(refinement, /if \(detailLocalMap && detailLocalMapContainer === container && detailLocalMapVenueId === venue\.venue_id\) \{\s*return;/);
  assert.match(refinement, /if \(detailLocalMap !== map \|\| detailLocalMapContainer !== container \|\| detailLocalMapVenueId !== venue\.venue_id\) return;/);
  assert.match(profile, /if \(showPhoto\) \{[\s\S]*hero\.querySelector\(':scope > \.detail-local-map'\)\?\.remove\(\)/);
});

test('no-photo rerenders reuse the existing local-map container and matching runtime', () => {
  assert.match(profile, /function ensureLocalMapFallback[\s\S]*const existing = hero\.querySelector\(':scope > \.detail-local-map'\)[\s\S]*if \(existing\) \{[\s\S]*hero\.prepend\(existing\)[\s\S]*return true;/);
  assert.match(refinement, /if \(detailLocalMap && detailLocalMapContainer === container && detailLocalMapVenueId === venue\.venue_id\) \{\s*return;/);
  assert.match(refinement, /destroyDetailLocalMap\(\);[\s\S]*detailLocalMapContainer = container;[\s\S]*detailLocalMapVenueId = venue\.venue_id;/);
});

test('direct mobile Detail routes wait for settled local media before revealing', () => {
  assert.match(index, /directVenueRoute[\s\S]*matchMedia\('\(max-width: 899px\)'\)\.matches[\s\S]*dataset\.view = 'detail'[\s\S]*dataset\.detailState = 'pending'/);
  assert.match(index, /id="detail-view"[^>]*aria-busy="true"/);
  assert.match(detailCss, /body\[data-view="detail"\]\[data-detail-state="pending"\] #detail-view\s*\{[^}]*opacity: 0 !important;[^}]*visibility: hidden !important;[^}]*pointer-events: none !important;/);
  assert.match(refinement, /function revealPendingDetailViewWhenSettled\(\)[\s\S]*localMap && !localMap\.classList\.contains\('is-ready'\)[\s\S]*photo && \(!photo\.complete \|\| photo\.naturalWidth === 0\)[\s\S]*dataset\.detailState === 'pending'[\s\S]*dataset\.detailState = 'ready'[\s\S]*setAttribute\('aria-busy', 'false'\)/);
  assert.match(refinement, /map\.on\('load', \(\) => \{[\s\S]*revealDetailLocalMap\(container\);[\s\S]*revealPendingDetailViewWhenSettled\(\)/);
});
