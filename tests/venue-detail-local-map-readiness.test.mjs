import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [app, profile, refinement, detailCss, detailHarness] = await Promise.all([
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
  assert.match(detailHarness, /Fresh no-photo Detail map should remain hidden before MapLibre load/);
  assert.match(detailHarness, /Ready Detail local map should be visible/);
});

test('readiness belongs to one local-map instance and photo-present Detail creates none', () => {
  assert.equal((refinement.match(/new window\.maplibregl\.Map/g) || []).length, 1);
  assert.match(refinement, /if \(detailLocalMap && detailLocalMapContainer === container && detailLocalMapVenueId === venue\.venue_id\) \{\s*return;/);
  assert.match(refinement, /if \(detailLocalMap !== map \|\| detailLocalMapContainer !== container \|\| detailLocalMapVenueId !== venue\.venue_id\) return;/);
  assert.match(app, /if \(venue\.photo_url \|\| !\[latitude, longitude\]\.every\(Number\.isFinite\)\) return null/);
  assert.match(detailHarness, /Photo-present Detail should retain no active local-map instance/);
});
