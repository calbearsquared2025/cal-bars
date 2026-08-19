import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('Venue Detail photo/profile enhancement uses one fixed square crop with media first', async () => {
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
  assert.match(profile, /hero\.prepend\(photo\)/);
  assert.match(profile, /hero\.prepend\(localMap\)/);
  assert.doesNotMatch(profile, /detailIdentityAnchor|placeMediaAfterIdentity/);
  assert.match(profile, /frame\.style\.aspectRatio = '1 \/ 1'/);
  assert.match(profile, /image\.style\.objectFit = 'cover'/);
  assert.doesNotMatch(profile, /venuePhotoOrientation|naturalWidth|naturalHeight|photoOrientation|--detail-photo-aspect/);
  assert.match(css, /detail-hero--has-photo/);
  assert.match(css, /aspect-ratio: 1 \/ 1/);
  assert.match(css, /object-fit: cover/);
  assert.match(css, /body\[data-view="detail"\] \.back-link[\s\S]*min-height: 32px !important/);
  assert.match(css, /background: rgba\(255, 255, 255, \.92\) !important/);
  assert.match(css, /detail-hero--no-photo,[\s\S]*detail-hero--has-photo[\s\S]*background: var\(--cgb-white\) !important/);
  assert.doesNotMatch(css, /data-photo-orientation|--detail-photo-aspect/);
});

test('existing no-photo local map and compact description behavior remain in app renderer', async () => {
  const app = await source('js/app.js');
  assert.match(app, /if \(venue\.photo_url \|\| !\[latitude, longitude\]\.every\(Number\.isFinite\)\) return null/);
  assert.match(app, /location-card__description/);
  assert.match(app, /else if \(venue\.short_description\)/);
  assert.match(app, /venue\.short_description && !legacyActivitySeason\(venue\)/);
});

test('Detail finishing treatment uses the approved contribution grid and folds selected presence into activity', async () => {
  const [detailCss, fanIntent, fanIntentCore] = await Promise.all([
    source('css/venue-detail.css'),
    source('js/fan-intent.js'),
    source('js/fan-intent-core.mjs')
  ]);
  assert.match(detailCss, /\.detail-contribution__actions\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(detailCss, /body\[data-view="detail"\] \.mobile-command-bar\s*\{\s*display: grid !important;/);
  assert.doesNotMatch(detailCss, /body\[data-view="detail"\] \.back-link\s*\{\s*display: none !important;/);
  assert.match(detailCss, /@media \(min-width: 900px\)[\s\S]*body\[data-view="detail"\] \.back-link/);
  assert.match(fanIntent, /const share = row\?\.querySelector\(':scope > button\.secondary-button'\)/);
  assert.match(fanIntent, /const label = isSelected \? 'Invite more' : 'Share'/);
  assert.match(fanIntent, /share\.replaceChildren/);
  assert.doesNotMatch(fanIntent, /syncDetailShareAction/);
  assert.match(fanIntent, /presence\.textContent = detailPresenceCopy\(count\)/);
  assert.match(fanIntentCore, /You’re the first Bear here\./);
  assert.match(fanIntentCore, /You’re one of them\./);
  assert.doesNotMatch(fanIntent, /renderPostJoinInvitation|post-join-invitation|post-join-share/);
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
  assert.match(config, /1FAIpQLSecvY5Pm73oPNRe4viSATCWYeERxwyDGYHwGpvPZHzQ03BmDg/);
  assert.match(config, /venueNameEntry: 'entry\.1077046729'/);
  assert.match(config, /venueIdEntry: 'entry\.893543394'/);
  assert.match(bootstrap, /initializePhotoFormEntry/);
});

test('Apps Script joins the Venue_Photos publication tab into approved public Venue fields', async () => {
  const code = await source('apps-script/Code.gs');
  const publicVenueFields = code.match(/const CGB_PUBLIC_FIELDS[\s\S]*?Venues: \[([\s\S]*?)\]/)?.[1] || '';
  assert.match(publicVenueFields, /photo_url/);
  assert.match(publicVenueFields, /photo_caption/);
  assert.match(publicVenueFields, /photo_credit/);
  assert.match(publicVenueFields, /photo_credit_url/);
  assert.doesNotMatch(publicVenueFields, /file_reference|submitter_email|permission_confirmed|reviewer_note/);
  assert.match(code, /Venue_Photos: \[[\s\S]*?'venue_id', 'photo_url', 'photo_caption', 'photo_credit', 'photo_credit_url'/);
  assert.match(code, /mergePublishedVenuePhotos_\(venuesRaw, venuePhotosRaw\)/);
});

test('public validator accepts only safe public photo URLs and rejects raw photo fields', async () => {
  const validator = await source('scripts/validate-v2-data.mjs');
  assert.match(validator, /photo_credit_url.*must be empty or http\(s\)/);
  assert.match(validator, /'file_reference'/);
  assert.match(validator, /'drive_file_id'/);
  assert.match(validator, /'respondent_email'/);
  assert.match(validator, /'permission_record'/);
  assert.match(validator, /'raw_submission_contents'/);
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
  assert.match(forms, /Form-owned `Photo_Submission` response sheet/);
  assert.doesNotMatch(forms, /photo:process|venue-photo-processing\.md/);
});

test('owner snapshot review clears the public cache before rebuilding', async () => {
  const code = await source('apps-script/Code.gs');
  assert.match(
    code,
    /function buildPublicSnapshotForReview\(\) \{\s*clearPublicSnapshotCache_\(\);\s*const snapshot = buildPublicSnapshot_\(\);/
  );
});
