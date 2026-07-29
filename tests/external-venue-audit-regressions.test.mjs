import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const externalVenueScript = await readFile(
  new URL('../apps-script/ExternalVenue.gs', import.meta.url),
  'utf8'
);

function addressNormalizer() {
  const context = vm.createContext({
    Array,
    Error,
    JSON,
    Map,
    Math,
    Number,
    Object,
    RegExp,
    Set,
    String,
    console
  });
  vm.runInContext(
    `${externalVenueScript}\n` +
    'globalThis.__normalizeExternalAddress = normalizeExternalAddressParts_;',
    context
  );
  return context.__normalizeExternalAddress;
}

test('US state names and abbreviations normalize to the same canonical address', () => {
  const normalize = addressNormalizer();
  const canonicalCalBar = {
    address_line_1: '5352 College Avenue',
    address_line_2: '',
    city: 'Oakland',
    region: 'CA',
    postal_code: '94618',
    country_code: 'US'
  };
  const actualMapTilerShape = {
    address_line_1: '5352 College Ave',
    address_line_2: '',
    city: 'Oakland',
    region: 'California',
    postal_code: '94618',
    country_code: 'US'
  };

  assert.equal(normalize(actualMapTilerShape), normalize(canonicalCalBar));
});

test('non-US region text is preserved instead of applying US state aliases', () => {
  const normalize = addressNormalizer();
  const ontario = normalize({
    address_line_1: '1 Front Street',
    city: 'Toronto',
    region: 'Ontario',
    postal_code: 'M5J 2X2',
    country_code: 'CA'
  });
  const california = normalize({
    address_line_1: '1 Front Street',
    city: 'Toronto',
    region: 'California',
    postal_code: 'M5J 2X2',
    country_code: 'CA'
  });

  assert.notEqual(ontario, california);
});
