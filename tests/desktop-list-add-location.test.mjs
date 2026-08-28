import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../js/search-map-refinement.mjs', import.meta.url), 'utf8');

test('desktop location browser uses a standalone Add location button beside the range controls', () => {
  assert.match(source, /button\.id = 'list-add-location-button'/);
  assert.match(source, /button\.className = 'secondary-button list-add-location-button'/);
  assert.match(source, /actions\.className = 'tray-list__actions'/);
  assert.match(source, /desktopListActions\.append\(toggle\)/);
  assert.match(source, /desktopListActions\.append\(button\)/);
});

test('desktop list Add location is compact and remains visually separate from the range toggle', () => {
  assert.match(source, /function styleDesktopListAddButton\(button\)/);
  assert.match(source, /height: '32px'/);
  assert.match(source, /minHeight: '32px'/);
  assert.match(source, /padding: '0 10px'/);
  assert.match(source, /borderRadius: '8px'/);
  assert.match(source, /fontSize: '\.66rem'/);
  assert.match(source, /whiteSpace: 'nowrap'/);
  assert.match(source, /styleDesktopListAddButton\(button\)/);
});

test('desktop list Add location reuses the canonical Add-location search path and stays off mobile', () => {
  assert.match(
    source,
    /list-add-location-button'[\s\S]*document\.querySelector\('#search-add-location-button'\)\?\.click\(\)/
  );
  assert.match(
    source,
    /if \(isMobile\(\)\) \{[\s\S]*header\.insertBefore\(toggle, desktopListActions\);[\s\S]*desktopListActions\.remove\(\);/
  );
});
