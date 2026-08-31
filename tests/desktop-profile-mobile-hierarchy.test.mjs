import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop What to know reuses venue tags and the existing prefilled Add info refresh flow', async () => {
  const source = await read('js/desktop-profile-mobile-hierarchy.mjs');

  assert.match(source, /const DESKTOP_QUERY = '\(min-width: 900px\)'/);
  assert.match(source, /detail\?\.dataset\?\.profilePresentation === 'desktop'/);
  assert.match(source, /venueTagsForVenue\(venue\)/);
  assert.match(source, /title\.textContent = 'WHAT TO KNOW'/);
  assert.match(source, /link\.textContent = 'Add info →'/);
  assert.match(source, /buildCalBarNominationPrefillUrl\(contributionConfig\(documentObject\), venueContext\)/);
  assert.match(source, /CGBSnapshotRefresh\?\.refresh\?\.\(\)/);
  assert.match(source, /empty\.textContent = 'Nothing shared yet\.'/);
});

test('desktop removes persistent venue tags from You Say while leaving the mobile What to know implementation untouched', async () => {
  const [desktopSource, mobileSource] = await Promise.all([
    read('js/desktop-profile-mobile-hierarchy.mjs'),
    read('js/fan-experiences.mjs')
  ]);

  assert.match(desktopSource, /detail\.querySelector\(':scope > \.detail-fan-experiences > \[data-venue-tags\]'\)\?\.remove\(\)/);
  assert.match(desktopSource, /@media \(min-width: 900px\)/);
  assert.doesNotMatch(desktopSource, /@media \(max-width: 899px\)/);

  assert.match(mobileSource, /section\.dataset\.mobileWhatToKnow = 'true'/);
  assert.match(mobileSource, /title\.textContent = 'WHAT TO KNOW'/);
  assert.match(mobileSource, /link\.textContent = 'Add info →'/);
  assert.match(mobileSource, /header\.after\(section\)/);
  assert.match(mobileSource, /placeMobileDeferredPhoto\(detail, section\)/);
});

test('desktop Fan Intent reuses the mobile selected attendance view model and class/wording contract', async () => {
  const [desktopSource, mobileSource] = await Promise.all([
    read('js/desktop-profile-mobile-hierarchy.mjs'),
    read('js/selected-profile-renderer.mjs')
  ]);

  assert.match(desktopSource, /import \{ selectedAttendanceViewModel \} from '\.\/selected-profile-renderer\.mjs'/);
  assert.match(desktopSource, /selectedAttendanceViewModel\(\{ state, game, venue \}\)/);

  for (const className of [
    'bear-count__number',
    'bear-count__label',
    'bear-count__attending',
    'bear-count__context',
    'bear-count--empty',
    'bear-count__prompt'
  ]) {
    assert.match(desktopSource, new RegExp(className));
    assert.match(mobileSource, new RegExp(className));
  }

  assert.match(desktopSource, /label\.textContent = view\.number === 1 \? 'BEAR' : 'BEARS'/);
  assert.match(desktopSource, /attending\.textContent = 'ATTENDING'/);
  assert.match(desktopSource, /context\.textContent = 'ON CGB'/);
  assert.match(desktopSource, /prompt\.textContent = 'Be the first\.'/);
  assert.match(mobileSource, /label\.textContent = view\.number === 1 \? 'BEAR' : 'BEARS'/);
  assert.match(mobileSource, /attending\.textContent = 'ATTENDING'/);
  assert.match(mobileSource, /context\.textContent = 'ON CGB'/);
  assert.match(mobileSource, /prompt\.textContent = 'Be the first\.'/);
});

test('desktop opening places CGB Says above Fan Intent before What to know and Watch Party', async () => {
  const [source, enhancementSource] = await Promise.all([
    read('js/desktop-profile-mobile-hierarchy.mjs'),
    read('js/venue-profile-enhancement.mjs')
  ]);

  assert.match(enhancementSource, /syncDesktopProfileMobileHierarchy\(\{ state, documentObject, windowObject \}\)/);
  assert.match(source, /let cursor = hero;/);
  assert.match(source, /if \(editorial\) \{[\s\S]*?cursor\.after\(editorial\);[\s\S]*?cursor = editorial;/);
  assert.match(source, /if \(activity\) \{[\s\S]*?cursor\.after\(activity\);[\s\S]*?cursor = activity;/);
  assert.match(source, /if \(whatToKnow\) \{[\s\S]*?cursor\.after\(whatToKnow\);[\s\S]*?cursor = whatToKnow;/);
  assert.match(source, /parties\.forEach\(\(party\) => \{[\s\S]*?cursor\.after\(party\);[\s\S]*?cursor = party;/);
  assert.match(source, /if \(community\) \{[\s\S]*?cursor\.after\(community\);[\s\S]*?cursor = community;/);
  assert.match(source, /if \(media\) \{[\s\S]*?cursor\.after\(media\);[\s\S]*?cursor = media;/);
  assert.match(source, /if \(contribution\) cursor\.after\(contribution\)/);
  assert.match(source, /desktopProfileArrangement = 'identity-editorial-attendance-what-to-know-party-community-media-contribution'/);
});

test('wide desktop naturally stacks CGB Says and Fan Intent beside venue identity and releases the sticky profile header', async () => {
  const source = await read('js/desktop-profile-mobile-hierarchy.mjs');

  assert.match(source, /@media \(min-width: 1100px\)/);
  assert.match(source, /#venue-detail\[data-profile-presentation="desktop"\]\s*\{[\s\S]*?display:\s*flow-root\s*!important;/);
  assert.match(source, /> \.detail-hero\.detail-hero--has-photo,[\s\S]*?position:\s*static\s*!important;[\s\S]*?float:\s*left;[\s\S]*?width:\s*50%\s*!important;/);
  assert.match(source, /> \.detail-editorial\s*\{[\s\S]*?position:\s*static\s*!important;[\s\S]*?float:\s*right;[\s\S]*?clear:\s*right;[\s\S]*?width:\s*50%\s*!important;/);
  assert.match(source, /> \.activity-card\s*\{[\s\S]*?float:\s*right;[\s\S]*?clear:\s*right;[\s\S]*?width:\s*50%\s*!important;/);
  assert.match(source, /> \.detail-what-to-know\s*\{[\s\S]*?clear:\s*both;/);
});

test('desktop Bear-count spacing keeps BEARS, ATTENDING, and ON CGB aligned beside a smaller numeral', async () => {
  const source = await read('js/desktop-profile-mobile-hierarchy.mjs');

  assert.match(source, /\.bear-count__number\s*\{[\s\S]*?grid-row:\s*1 \/ 4;[\s\S]*?font-size:\s*1\.95rem\s*!important;/);
  assert.match(source, /\.bear-count__attending,[\s\S]*?\.bear-count__context\s*\{[\s\S]*?grid-column:\s*2;/);
  assert.match(source, /\.bear-count__context\s*\{[\s\S]*?grid-row:\s*3;/);
  assert.match(source, /padding:\s*6px 18px 12px 37px\s*!important;/);
});

test('desktop command labels render in uppercase without changing mobile labels', async () => {
  const source = await read('js/desktop-profile-mobile-hierarchy.mjs');

  assert.match(source, /@media \(min-width: 900px\)[\s\S]*?\.mobile-command-bar \.mobile-command > span:last-child\s*\{[\s\S]*?text-transform:\s*uppercase;/);
  assert.doesNotMatch(source, /@media \(max-width: 899px\)[\s\S]*?text-transform:\s*uppercase/);
});

test('desktop hierarchy does not widen the existing selected panel', async () => {
  const css = await read('css/venue-profile.css');
  assert.match(css, /#map-view > #venue-tray\.venue-tray\.tray--selected\s*\{[\s\S]*?width:\s*clamp\(500px, 36vw, 520px\)\s*!important;/);
});
