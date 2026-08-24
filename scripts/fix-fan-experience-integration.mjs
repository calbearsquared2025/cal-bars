import { readFile, writeFile } from 'node:fs/promises';

async function patch(path, transform) {
  const current = await readFile(path, 'utf8');
  const next = transform(current);
  if (next !== current) await writeFile(path, next);
}

await patch('apps-script/Code.gs', (text) => {
  text = text.replace(
    "const fanExperiencesRaw = readSheetObjects_(workbook, CGB_FAN_EXPERIENCE_RAW_TAB);",
    "const fanExperiencesRaw = readSheetObjects_(workbook, 'Fan_Experiences_Raw');"
  );

  if (!text.includes('function buildPublishedFanExperiences_(')) {
    const helper = `function fanExperienceSnapshotValue_(row, aliases) {\n  for (let index = 0; index < aliases.length; index += 1) {\n    const value = row && row[aliases[index]];\n    if (value !== undefined && value !== null && String(value).trim() !== '') return value;\n  }\n  return '';\n}\n\nfunction cleanFanExperienceSnapshotText_(value) {\n  return String(value === null || value === undefined ? '' : value)\n    .replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, '')\n    .replace(/\\s+/g, ' ')\n    .trim()\n    .slice(0, 500)\n    .trim();\n}\n\nfunction fanExperienceSubmissionYear_(timestamp, parsedTimestamp) {\n  const match = String(timestamp || '').match(/\\b(20\\d{2})\\b/);\n  if (match) return Number(match[1]);\n  if (!Number.isFinite(parsedTimestamp)) return null;\n  const year = new Date(parsedTimestamp).getUTCFullYear();\n  return year >= 2000 && year <= 2100 ? year : null;\n}\n\nfunction buildPublishedFanExperiences_(rows, publishedVenueIds) {\n  const timestampAliases = ['Timestamp', 'timestamp', 'response_timestamp'];\n  const venueIdAliases = ['Venue ID', 'Selected Venue ID', 'venue_id'];\n\n  return (rows || []).map(function(row, index) {\n    const venueId = String(fanExperienceSnapshotValue_(row, venueIdAliases) || '').trim();\n    const text = cleanFanExperienceSnapshotText_(row && row.public_text);\n    const timestamp = fanExperienceSnapshotValue_(row, timestampAliases);\n    const parsedTimestamp = Date.parse(String(timestamp || ''));\n    return {\n      venue_id: venueId,\n      text: text,\n      year: fanExperienceSubmissionYear_(timestamp, parsedTimestamp),\n      moderation_status: String((row && row.moderation_status) || '').trim(),\n      timestamp_sort: Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0,\n      row_sort: index\n    };\n  }).filter(function(row) {\n    return row.moderation_status === 'published' &&\n      /^venue_[a-f0-9]{24}$/.test(row.venue_id) &&\n      publishedVenueIds.has(row.venue_id) &&\n      Number.isInteger(row.year) && row.year >= 2000 && row.year <= 2100 &&\n      row.text.length > 0 && row.text.length <= 500;\n  }).sort(function(a, b) {\n    return b.timestamp_sort - a.timestamp_sort || b.row_sort - a.row_sort;\n  }).map(function(row) {\n    return { venue_id: row.venue_id, text: row.text, year: row.year };\n  });\n}\n\n`;
    const anchor = 'function getWorkbook_() {';
    if (!text.includes(anchor)) throw new Error('Code.gs helper anchor missing');
    text = text.replace(anchor, helper + anchor);
  }

  if (!text.includes('function fanExperienceSubmissionYear_(')) {
    const anchor = 'function buildPublishedFanExperiences_(rows, publishedVenueIds) {';
    const helper = `function fanExperienceSubmissionYear_(timestamp, parsedTimestamp) {\n  const match = String(timestamp || '').match(/\\b(20\\d{2})\\b/);\n  if (match) return Number(match[1]);\n  if (!Number.isFinite(parsedTimestamp)) return null;\n  const year = new Date(parsedTimestamp).getUTCFullYear();\n  return year >= 2000 && year <= 2100 ? year : null;\n}\n\n`;
    if (!text.includes(anchor)) throw new Error('Fan Experience snapshot builder anchor missing');
    text = text.replace(anchor, helper + anchor);
  }

  text = text.replace(
    '      text: text,\n      moderation_status:',
    '      text: text,\n      year: fanExperienceSubmissionYear_(timestamp, parsedTimestamp),\n      moderation_status:'
  );
  text = text.replace(
    '      publishedVenueIds.has(row.venue_id) &&\n      row.text.length > 0',
    '      publishedVenueIds.has(row.venue_id) &&\n      Number.isInteger(row.year) && row.year >= 2000 && row.year <= 2100 &&\n      row.text.length > 0'
  );
  text = text.replace(
    '    return { venue_id: row.venue_id, text: row.text };',
    '    return { venue_id: row.venue_id, text: row.text, year: row.year };'
  );
  return text;
});

await patch('apps-script/FanExperienceAutomation.gs', (text) => {
  const marker = '\nfunction fanExperienceRawValue_(';
  const index = text.indexOf(marker);
  return index >= 0 ? `${text.slice(0, index).trimEnd()}\n` : text;
});

await patch('scripts/validate-v2-data.mjs', (text) => {
  text = text.replace(
    "/[^\\P{Cc}\\t\\n\\r]/u.test(experience.text)",
    "/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/.test(experience.text)"
  );
  text = text.replace(
    "JSON.stringify(['text', 'venue_id'])",
    "JSON.stringify(['text', 'venue_id', 'year'])"
  );
  text = text.replace(
    'errors.push(`${path} may contain only venue_id and text`);',
    'errors.push(`${path} may contain only venue_id, text, and year`);'
  );
  if (!text.includes('`${path}.year must be a four-digit integer`')) {
    text = text.replace(
      "  if (!venueIds.has(experience.venue_id)) errors.push(`${path}.venue_id does not reference a public venue`);\n",
      "  if (!venueIds.has(experience.venue_id)) errors.push(`${path}.venue_id does not reference a public venue`);\n  if (!Number.isInteger(experience.year) || experience.year < 2000 || experience.year > 2100) {\n    errors.push(`${path}.year must be a four-digit integer`);\n  }\n"
    );
  }
  return text;
});

await patch('css/venue-profile.css', (text) => {
  text = text.replace(
    'background: color-mix(in srgb, var(--cgb-blue-100, #e8f1fb) 76%, white);',
    'background: #f1f6fb;'
  );

  const marker = '/* BEARS SAY typography polish */';
  if (!text.includes(marker)) {
    text += `\n${marker}\nbody[data-view="detail"] .detail-fan-experiences h2 {\n  margin-bottom: 8px;\n}\n\nbody[data-view="detail"] .detail-fan-experiences__quote {\n  font-size: 18px;\n  font-weight: 400;\n  line-height: 1.45;\n}\n\nbody[data-view="detail"] .detail-fan-experiences__quote[data-year]::before {\n  content: attr(data-year);\n  display: block;\n  margin-bottom: 5px;\n  color: var(--cgb-ink-500);\n  font-size: var(--text-xs);\n  font-weight: 400;\n  line-height: 1.2;\n}\n\nbody[data-view="detail"] .detail-fan-experiences__share {\n  font-size: 15px;\n}\n`;
  }
  return text;
});
