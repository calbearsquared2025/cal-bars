import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const [controller, iconUpgrade, activity, photo, nomination, watchParty] = await Promise.all([
  readFile(new URL('js/issue-121-controller.mjs', root), 'utf8'),
  readFile(new URL('js/icon-upgrade.mjs', root), 'utf8'),
  readFile(new URL('js/venue-activity-core.mjs', root), 'utf8'),
  readFile(new URL('js/photo-form.js', root), 'utf8'),
  readFile(new URL('js/cal-bar-nomination.js', root), 'utf8'),
  readFile(new URL('js/watch-party-form.js', root), 'utf8')
]);

test('the issue 121 controller loads before legacy refinements and the obsolete final pass is retired', async () => {
  assert.match(iconUpgrade, /^import '\.\/issue-121-controller\.mjs';/);
  assert.doesNotMatch(iconUpgrade, /map-profile-final-pass/);
  await assert.rejects(access(new URL('js/map-profile-final-pass.mjs', root)));
});

test('normal Search submit has one capture owner while typeahead input only cancels stale area searches', () => {
  assert.match(controller, /document\.addEventListener\('submit', handleSearchSubmit, \{ capture: true \}\)/);
  assert.match(controller, /state\(\)\?\.searchMode !== 'existing'/);
  assert.match(controller, /event\.stopImmediatePropagation\(\)/);
  assert.match(controller, /if \(matches\.length && !explicitPlaceFieldMatch\)[\s\S]*renderPartialMatches\(query, matches\)/);
  assert.match(controller, /const origin = await fetchUsArea\(query, sequence\)/);
  assert.match(controller, /showMobileSurface\('map'\)/);
  assert.match(controller, /showNoResult\(query\)/);
  assert.match(controller, /document\.addEventListener\('input', handleSearchInput/);
  const inputHandler = controller.match(/function handleSearchInput[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(inputHandler, /easeTo|flyTo|jumpTo|setCenter/);
});

test('invalid Search preserves prior usable state instead of forcing an empty List', () => {
  assert.match(controller, /const previous = \{[\s\S]*origin: current\.origin,[\s\S]*listQuery: current\.listQuery/);
  assert.match(controller, /current\.origin = previous\.origin/);
  assert.match(controller, /current\.listQuery = previous\.listQuery/);
  assert.match(controller, /No mapped location found/);
  assert.doesNotMatch(controller.match(/catch \(error\) \{[\s\S]*?\n  \}/)?.[0] || '', /showMobileSurface\('list'\)/);
});

test('tray handle is a bidirectional toggle without replacing drag pointer handling', () => {
  assert.match(controller, /handleTrayPointerDown/);
  assert.match(controller, /handleTrayPointerUp/);
  assert.match(controller, /distance > TRAY_DRAG_THRESHOLD/);
  assert.match(controller, /const expanded = current\.selectedVenueId \? 'selected' : 'full'/);
  assert.match(controller, /setTrayState\(current\.trayState === 'peek' \? expanded : 'peek'\)/);
  assert.match(controller, /aria-expanded/);
});

test('desktop selected state forces the consolidated Venue Profile and frames the marker around the profile rail', () => {
  assert.match(controller, /current\.detailMode = true/);
  assert.match(controller, /current\.trayState = 'selected'/);
  assert.match(controller, /padding: \{ top: 24, right: trayWidth \+ 48, bottom: 24, left: 24 \}/);
  assert.match(controller, /retainPadding: false/);
  assert.match(controller, /#tray-selected > \.selected-card[\s\S]*display: none !important/);
});

test('zero attendance remains compact and obsolete season recruitment copy is gone', () => {
  assert.match(controller, /primary\.textContent = 'Be the first\.'/);
  assert.match(controller, /attendance\.textContent = count === 1 \? '1 Bear' : `\$\{count\} Bears`/);
  assert.doesNotMatch(activity, /Be part of the/);
  assert.match(activity, /Bears watched Cal games here last season\./);
});

test('Venue Profile action hierarchy separates Watch Party planning from listing maintenance', () => {
  assert.match(controller, /detail-watch-party-cta/);
  assert.match(controller, /Planning a Watch Party\?/);
  assert.match(watchParty, /Plan a Watch Party/);
  assert.match(watchParty, /detail-watch-party-cta > \.detail-watch-party-cta__action/);
  assert.doesNotMatch(watchParty, /detail-contribution__actions/);
  assert.match(controller, /\.detail-watch-party-cta__link[\s\S]*justify-content: flex-start;[\s\S]*text-align: left;/);
});

test('listing-maintenance and photo wording match the approved contribution hierarchy', () => {
  assert.match(nomination, /Tell us what makes this Cal Bar special/);
  assert.match(nomination, /Is this your local Cal Bar\? Tell us why/);
  assert.match(photo, /label: 'Submit a Photo'/);
  assert.match(photo, /label: 'Add a Photo!'/);
  assert.match(controller, /Do Cal fans gather here regularly\? Tell us what makes it a Cal Bar\./);
});

test('mobile Add separates selected-place actions from global Add location', () => {
  assert.match(controller, /add-selected-place-group/);
  assert.match(controller, /title\.textContent = 'For this place'/);
  assert.match(controller, /eyebrow\.textContent = 'Add somewhere else'/);
  assert.match(controller, /title\.textContent = 'Add a new location'/);
  assert.match(controller, /selectedGroup\.hidden = !venue/);
  assert.match(controller, /globalGroup\.querySelector\('\.add-actions--global'\)\.append\(addLocation\)/);
});

test('Add surface observer copy updates are idempotent and cannot self-trigger indefinitely', () => {
  assert.match(controller, /function setTextIfChanged\(node, nextText\)/);
  assert.match(controller, /if \(node && node\.textContent !== nextText\) node\.textContent = nextText/);
  const addGroups = controller.match(/function ensureAddGroups\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(addGroups, /setTextIfChanged\(title, 'Tell us what makes this Cal Bar special'\)/);
  assert.match(addGroups, /setTextIfChanged\(helper, 'Share what makes this a recurring Cal gathering place\.'\)/);
  assert.match(addGroups, /setTextIfChanged\(title, 'Is this your local Cal Bar\? Tell us why'\)/);
  assert.match(addGroups, /setTextIfChanged\(helper, 'Do Cal fans gather here regularly\? Tell us what makes it a Cal Bar\.'\)/);
  assert.doesNotMatch(addGroups, /if \(title\) title\.textContent =/);
  assert.doesNotMatch(addGroups, /if \(helper\) helper\.textContent =/);
});

test('desktop tray sizing distinguishes zero, one, and many results', () => {
  assert.match(controller, /tray\.dataset\.resultCount = count === 0 \? 'zero' : count === 1 \? 'one' : 'many'/);
  assert.match(controller, /venue-tray\[data-result-count="zero"\]\.tray--full/);
  assert.match(controller, /venue-tray\[data-result-count="one"\]\.tray--full/);
});

test('profile polish covers title descenders, mobile directions, integrated actions, and footer copy', () => {
  assert.match(controller, /#venue-detail \.detail-hero h1[\s\S]*padding-bottom: \.08em/);
  assert.match(controller, /#venue-detail \.detail-address-actions[\s\S]*align-items: baseline/);
  assert.match(controller, /#venue-detail \.detail-primary-actions[\s\S]*align-items: stretch/);
  assert.match(controller, /Enjoying Cal Golden Bars\?/);
  assert.match(controller, /buy me a beer\./);
  assert.match(controller, /\[data-support-open\] > span:first-child[\s\S]*font-weight: 400/);
});