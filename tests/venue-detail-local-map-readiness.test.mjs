import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [index, app, profile, refinement, detailCss, detailHarness] = await Promise.all([
  read('../index.html'),
  read('../js/app.js'),
  read('../js/venue-profile-enhancement.mjs'),
  read('../js/icon-upgrade.mjs'),
  read('../css/venue-detail.css'),
  read('./browser/venue-detail-runtime-harness.mjs')
]);

test('no-photo local map stays hidden and busy until its MapLibre load event', () => {
  assert.match(app, /map\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(profile, /map\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(detailCss, /\.detail-local-map\s*\{[^}]*visibility: hidden !important;/);
  assert.match(detailCss, /\.detail-local-map\.is-ready\s*\{[^}]*visibility: visible !important;/);
  assert.match(refinement, /map\.on\('load', \(\) => \{[\s\S]*detailLocalMap !== map[\s\S]*revealDetailLocalMap\(container\)/);
  assert.match(refinement, /function revealDetailLocalMap\(container\)[\s\S]*classList\.add\('is-ready'\)[\s\S]*setAttribute\('aria-busy', 'false'\)/);
  assert.match(detailHarness, /initial ready Venue local map/);
  assert.match(detailHarness, /Ready Detail local map should be visible/);
});

test('readiness belongs to one local-map instance and photo-present Detail creates none', () => {
  assert.equal((refinement.match(/new window\.maplibregl\.Map/g) || []).length, 1);
  assert.match(refinement, /if \(detailLocalMap && detailLocalMapContainer === container && detailLocalMapVenueId === venue\.venue_id\) \{\s*return;/);
  assert.match(refinement, /if \(detailLocalMap !== map \|\| detailLocalMapContainer !== container \|\| detailLocalMapVenueId !== venue\.venue_id\) return;/);
  assert.match(app, /if \(venue\.photo_url \|\| !\[latitude, longitude\]\.every\(Number\.isFinite\)\) return null/);
  assert.match(detailHarness, /Photo-present Detail should retain no active local-map instance/);
});

test('unchanged snapshot rerenders retain the settled map container and instance', () => {
  assert.match(app, /function takeReusableDetailLocalMap\(venue\)[\s\S]*dataset\.venueId === venue\.venue_id[\s\S]*dataset\.latitude[\s\S]*dataset\.longitude[\s\S]*dataset\.markerKind === markerKind/);
  assert.match(app, /const localMap = takeReusableDetailLocalMap\(venue\) \|\| createDetailLocalMap\(venue\);[\s\S]*venueDetail\.replaceChildren\(\)/);
  assert.match(detailHarness, /Snapshot rerender should retain the settled local-map container/);
  assert.match(detailHarness, /Snapshot rerender should retain exactly one MapLibre instance/);
});

test('direct Detail routes reveal the complete settled view in one paint', () => {
  assert.match(index, /dataset\.view = 'detail';[\s\S]*dataset\.detailState = 'pending'/);
  assert.match(index, /id="detail-view"[^>]*aria-busy="true"/);
  assert.match(detailCss, /body\[data-view="detail"\]\[data-detail-state="pending"\] #detail-view\s*\{[^}]*opacity: 0 !important;[^}]*visibility: hidden !important;[^}]*pointer-events: none !important;/);
  assert.match(refinement, /function revealPendingDetailViewWhenSettled\(\)[\s\S]*localMap && !localMap\.classList\.contains\('is-ready'\)[\s\S]*photo\.complete[\s\S]*photo\.naturalWidth === 0[\s\S]*dataset\.detailState === 'pending'[\s\S]*dataset\.detailState = 'ready'[\s\S]*setAttribute\('aria-busy', 'false'\)/);
  assert.match(refinement, /map\.on\('load', \(\) => \{[\s\S]*revealDetailLocalMap\(container\);[\s\S]*revealPendingDetailViewWhenSettled\(\)/);
  assert.match(detailHarness, /settled Detail first-paint gate/);
  assert.match(detailHarness, /Settled Detail view should clear its busy state/);
});
