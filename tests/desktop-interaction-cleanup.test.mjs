import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [html, shellControls, commandCss] = await Promise.all([
  read('../index.html'),
  read('../js/shell-controls.mjs'),
  read('../css/mobile-command-navigation.css')
]);

test('desktop map toolbar owns a dedicated Add location action', () => {
  assert.match(html, /class="map-actions"[\s\S]*id="near-me-button"[\s\S]*id="desktop-add-location-button"[\s\S]*Add location/);
  assert.match(shellControls, /function showDesktopAddLocation\(\)[\s\S]*setSurface\('map'\)[\s\S]*dom\.searchInput\.value = ''[\s\S]*dom\.searchInput\?\.focus/);
  assert.match(shellControls, /dom\.desktopAddLocationButton\.addEventListener\('click', showDesktopAddLocation\)/);
  assert.doesNotMatch(shellControls, /desktopAddLocationButton\.addEventListener\('click', showAdd\)/);
});

test('desktop rail keeps only Locations and Selected while mobile retains generic Add', () => {
  assert.match(commandCss, /@media \(min-width: 900px\)[\s\S]*\.mobile-command-bar \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(commandCss, /#mobile-search-button,[\s\S]*#mobile-add-button \{[\s\S]*display: none/);
  assert.match(html, /id="mobile-add-button"[\s\S]*data-command="add"[\s\S]*<span>Add<\/span>/);
  assert.match(shellControls, /document\.querySelector\('#mobile-add-button'\)\?\.addEventListener\('click', showAdd\)/);
});

test('desktop Locations teaches the browse workflow before the ranked list', () => {
  assert.match(html, /class="desktop-locations-guidance"[\s\S]*<strong>Find your Cal crowd<\/strong>[\s\S]*Search a city or choose a location below to see where Bears are gathering for the selected game\.[\s\S]*id="location-list"/);
  assert.match(commandCss, /\.desktop-locations-guidance \{[\s\S]*display: none/);
  assert.match(commandCss, /@media \(min-width: 900px\)[\s\S]*\.desktop-locations-guidance \{[\s\S]*display: grid/);
});

test('desktop Add location reuses search instead of the contribution surface', () => {
  const desktopAddSource = shellControls.match(/function showDesktopAddLocation\(\)[\s\S]*?function beginContribution/)?.[0] || '';
  assert.match(desktopAddSource, /setSurface\('map'\)/);
  assert.match(desktopAddSource, /searchInput/);
  assert.doesNotMatch(desktopAddSource, /setSurface\('add'\)|showAdd\(/);
  assert.match(html, /id="add-surface"/);
});
