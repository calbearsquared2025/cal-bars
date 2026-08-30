#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const VENUE_TAGS = Object.freeze([
  '21_plus', 'audio_on', 'food', 'cal_beer', 'large_crowd', 'cal_memorabilia'
]);
export const WATCH_PARTY_TAGS = Object.freeze(['rsvp_requested', 'cal_specials']);

function validateTagField(record, field, allowed, path, errors) {
  if (!(field in record)) return;
  const value = record[field];
  if (!Array.isArray(value)) {
    errors.push(`${path}.${field} must be an array when present`);
    return;
  }
  const seen = new Set();
  let lastIndex = -1;
  value.forEach((tag, index) => {
    if (typeof tag !== 'string' || !allowed.includes(tag)) {
      errors.push(`${path}.${field}[${index}] has unsupported tag: ${JSON.stringify(tag)}`);
      return;
    }
    if (seen.has(tag)) errors.push(`${path}.${field}[${index}] duplicates ${tag}`);
    seen.add(tag);
    const canonicalIndex = allowed.indexOf(tag);
    if (canonicalIndex < lastIndex) errors.push(`${path}.${field} must use canonical tag order`);
    lastIndex = canonicalIndex;
  });
}

export function validateContributionTags(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== 'object') return ['snapshot must be an object'];
  const venues = Array.isArray(snapshot.venues) ? snapshot.venues : [];
  const watchParties = Array.isArray(snapshot.watchParties) ? snapshot.watchParties : [];
  venues.forEach((venue, index) => {
    if (venue && typeof venue === 'object') {
      validateTagField(venue, 'venue_tags', VENUE_TAGS, `venues[${index}]`, errors);
    }
  });
  watchParties.forEach((party, index) => {
    if (party && typeof party === 'object') {
      validateTagField(party, 'feature_tags', WATCH_PARTY_TAGS, `watchParties[${index}]`, errors);
    }
  });
  return errors;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/validate-contribution-tags.mjs <snapshot.json>');
  const snapshot = JSON.parse(await readFile(file, 'utf8'));
  const errors = validateContributionTags(snapshot);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('Structured contribution tag validation passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
