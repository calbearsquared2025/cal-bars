import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('Venue Detail photo/profile enhancement is wired into existing render refinements', async () => {
  const [icons, profile, css] = await Promise.all([
    source('js/icon-upgrade.mjs'),
    source('js/venue-profile-enhancement.mjs'),
    source('css/venue-profile.css')
  ]);
  assert.match(icons, /enhanceVenueProfile/);
  assert.match(profile, /detail-photo__image/);
  assert.match(profile, /detail-local-map/);
  assert.match(profile, /CGB SAYS/);
  assert.match(profile, /detail-description/);
  assert.match(css, /detail-hero--has-photo/);
  assert.match(css, /aspect-ratio/);
});

test('existing no-photo local map and compact description behavior remain in app renderer', async () => {
  const app = await source('js/app.js');
  assert.match(app, /if \(venue\.photo_url \|\| !\[latitude, longitude\]\.every\(Number\.isFinite\)\) return null/);
  assert.match(app, /location-card__description/);
  assert.match(app, /else if \(venue\.short_description\)/);
  assert.match(app, /venue\.short_description && !legacyActivitySeason\(venue\)/);
});

test('Submit a Photo is contextual, prefilled, and omitted when configuration is absent', async () => {
  const [adapter, config, bootstrap] = await Promise.all([
    source('js/photo-form.js'),
    source('js/photo-form-config.mjs'),
    source('js/watch-party-form.js')
  ]);
  assert.match(adapter, /Submit a Photo/);
  assert.match(adapter, /state\?\.detailMode/);
  assert.match(adapter, /buildPhotoFormPrefillUrl/);
  assert.match(adapter, /if \(!href\)/);
  assert.match(adapter, /target = '_blank'/);
  assert.match(config, /formUrl: ''/);
  assert.match(bootstrap, /initializePhotoFormEntry/);
});

test('Apps Script exposes only approved Venue photo fields and keeps raw photo intake private', async () => {
  const code = await source('apps-script/Code.gs');
  const publicVenueFields = code.match(/const CGB_PUBLIC_FIELDS[\s\S]*?Venues: \[([\s\S]*?)\]/)?.[1] || '';
  assert.match(publicVenueFields, /photo_url/);
  assert.match(publicVenueFields, /photo_caption/);
  assert.match(publicVenueFields, /photo_credit/);
  assert.match(publicVenueFields, /photo_credit_url/);
  assert.doesNotMatch(publicVenueFields, /file_reference|submitter_email|permission_confirmed|reviewer_note/);
  assert.match(code, /Photo_Submissions_Raw:[\s\S]*photo_credit_url/);
});

test('public validator accepts only safe public photo URLs and rejects raw photo fields', async () => {
  const validator = await source('scripts/validate-v2-data.mjs');
  assert.match(validator, /photo_credit_url.*must be empty or http\(s\)/);
  assert.match(validator, /'file_reference', 'caption', 'review_status', 'reviewed_at'/);
});

test('implementation docs describe static approved assets and the Google sign-in exception', async () => {
  const [contract, forms] = await Promise.all([
    source('docs/public-data-contract.md'),
    source('docs/contribution-forms.md')
  ]);
  assert.match(contract, /assets\/venues/);
  assert.match(contract, /photo_caption/);
  assert.match(contract, /photo_credit_url/);
  assert.doesNotMatch(contract, /photo_url.*reserved for post-launch/);
  assert.match(forms, /Submit a Photo/);
  assert.match(forms, /Google Forms file upload requires sign-in/);
  assert.match(forms, /I took this photo or have permission to share it, and I authorize Cal Golden Bars to display it on the website\./);
  assert.match(forms, /private Google Drive original/);
});
