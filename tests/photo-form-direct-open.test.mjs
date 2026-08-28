import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const photoFormSource = readFileSync(new URL('../js/photo-form.js', import.meta.url), 'utf8');
const googleFormHostSource = readFileSync(new URL('../js/missing-location-embed.mjs', import.meta.url), 'utf8');

test('photo upload links bypass the embedded Google Form host', () => {
  assert.match(photoFormSource, /link\.dataset\.googleFormExternal = 'true';/);
  assert.match(photoFormSource, /link\.target = '_blank';/);
  assert.match(photoFormSource, /link\.rel = 'noopener noreferrer';/);
  assert.match(
    googleFormHostSource,
    /trigger\.dataset\.googleFormExternal === 'true'/
  );
});
