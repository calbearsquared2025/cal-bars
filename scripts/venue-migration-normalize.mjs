import { createHash } from 'node:crypto';

export const VENUE_FIELDS = [
  'venue_id',
  'slug',
  'name',
  'address_line_1',
  'address_line_2',
  'city',
  'region',
  'postal_code',
  'country_code',
  'latitude',
  'longitude',
  'website_url',
  'venue_type',
  'verification_status',
  'alumni_owned',
  'external_source',
  'external_place_id',
  'short_description',
  'photo_url',
  'photo_credit',
  'publication_status',
  'source_submission_id',
  'created_at',
  'updated_at'
];

export const PUBLIC_VENUE_FIELDS = [
  'venue_id',
  'slug',
  'name',
  'address_line_1',
  'address_line_2',
  'city',
  'region',
  'postal_code',
  'country_code',
  'latitude',
  'longitude',
  'website_url',
  'venue_type',
  'verification_status',
  'alumni_owned',
  'short_description',
  'photo_url',
  'photo_credit',
  'updated_at'
];

export const REQUIRED_SOURCE_HEADERS = [
  'name', 'address', 'city', 'state', 'zip', 'lat', 'lon', 'url',
  'promo', 'details', 'tvs', 'affiliation', 'submitted_as', 'place_id'
];

const HOLD_EVENT_ONLY_PATTERNS = [
  /\bofficial\s+20\d{2}\s+big game\s+watch party\b/i,
  /\b20\d{2}\s+big game\s+watch party\b/i,
  /\bbig game\s+20\d{2}\s+watch party\b/i,
  /\bbig game\s+watch party\s+location\b/i,
  /\bbig game\s+watch party\b/i
];

const RECURRING_CAL_BAR_PATTERNS = [
  /\bevery game\b/i,
  /\bevery week\b/i,
  /\bguaranteed every\b/i,
  /\bwatch bar since\b/i,
  /\bfor\s+\d+\+?\s+years\b/i,
  /\bhosts?\s+watch parties\b/i,
  /\bhas\s+watch parties\b/i,
  /\bhave\s+watch parties\b/i,
  /\bhave\s+watch parties\s+here\b/i,
  /\bhas\s+watch parties\s+here\b/i,
  /\bwatch parties\s+here\b/i,
  /\bwatch party site\b/i,
  /\bgame watch bar\b/i,
  /\bofficial game watch\b/i,
  /\bofficial campus bar\b/i,
  /\bofficial home\b/i,
  /\bannual\b.*\bbig game\b/i,
  /\boccasional\b.*\bmeetup\b/i,
  /\bcal fans flock here\b/i
];

export function normalizeWhitespace(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u00a0\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeComparisonText(value) {
  return normalizeWhitespace(value)
    .toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error('CSV contains an unterminated quoted field.');
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeWhitespace);
  return rows.slice(1)
    .filter((values) => values.some((value) => normalizeWhitespace(value) !== ''))
    .map((values, index) => {
      const record = { source_row: index + 2 };
      headers.forEach((header, columnIndex) => {
        record[header] = values[columnIndex] ?? '';
      });
      return record;
    });
}

export function serializeCsv(records, fields) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [fields.map(escape).join(',')];
  for (const record of records) {
    lines.push(fields.map((field) => escape(record[field])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function splitAddress(address) {
  const normalized = normalizeWhitespace(address);
  const match = normalized.match(/^(.*?)(?:\s+)(#(?:suite\s*)?.+)$/i);
  if (!match) return { address_line_1: normalized, address_line_2: '' };
  let addressLine2 = normalizeWhitespace(match[2]);
  addressLine2 = addressLine2.replace(/^#\s*suite\s*/i, 'Suite ');
  return {
    address_line_1: normalizeWhitespace(match[1]),
    address_line_2: addressLine2
  };
}

export function normalizePostalCode(value) {
  const normalized = normalizeWhitespace(value).replace(/\.0$/, '');
  if (/^\d{1,4}$/.test(normalized)) return normalized.padStart(5, '0');
  return normalized.toUpperCase();
}

export function parseCoordinate(value, kind) {
  const normalized = normalizeWhitespace(value);
  if (normalized === '') return { value: null, error: `MISSING_${kind.toUpperCase()}` };
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { value: null, error: `INVALID_${kind.toUpperCase()}` };
  const [minimum, maximum] = kind === 'latitude' ? [-90, 90] : [-180, 180];
  if (parsed < minimum || parsed > maximum) {
    return { value: null, error: `OUT_OF_RANGE_${kind.toUpperCase()}` };
  }
  return { value: Number(parsed.toFixed(7)), error: '' };
}

export function normalizeUrl(value) {
  const raw = normalizeWhitespace(value);
  if (!raw) return { normalized: '', status: 'blank' };
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { normalized: '', status: 'invalid' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { normalized: '', status: 'unsafe_scheme' };
  if (parsed.username || parsed.password) return { normalized: '', status: 'credentials_not_allowed' };
  if (!parsed.hostname || !parsed.hostname.includes('.')) return { normalized: '', status: 'invalid_hostname' };
  parsed.hash = '';
  return { normalized: parsed.toString(), status: 'valid' };
}

export function slugify(value) {
  return normalizeWhitespace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function stableHash(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

export function buildSourceIdentity(row) {
  const placeId = normalizeWhitespace(row.place_id);
  const normalizedAddress = [row.address, row.city, row.state, row.zip]
    .map(normalizeComparisonText)
    .filter(Boolean)
    .join('|');
  const normalizedName = normalizeComparisonText(row.name);
  return placeId ? `place:${placeId}` : `address:${normalizedAddress}|name:${normalizedName}`;
}

export function createVenueId(row) {
  const hex = stableHash(buildSourceIdentity(row)).slice(0, 13);
  const numeric = BigInt(`0x${hex}`).toString(10);
  return `ven_${numeric}`;
}

export function inferClassification(row) {
  const evidenceText = [row.promo, row.details, row.tvs, row.affiliation]
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join(' | ');
  const matchingPatterns = RECURRING_CAL_BAR_PATTERNS
    .filter((pattern) => pattern.test(evidenceText))
    .map((pattern) => pattern.source);

  if (matchingPatterns.length > 0) {
    const lowConfidence = /\boccasional\b/i.test(evidenceText);
    return {
      venue_type: 'cal_bar',
      confidence: lowConfidence ? 'medium' : 'high',
      evidence: matchingPatterns,
      review_required: lowConfidence
    };
  }

  const hasCalSignal = /\b(cal|golden bear|oski|alumni|big game)\b/i.test(evidenceText);
  return {
    venue_type: 'community_location',
    confidence: hasCalSignal ? 'medium' : 'low',
    evidence: [],
    review_required: hasCalSignal
  };
}

export function inferInitialDisposition(row) {
  const requiredChecks = [
    ['name', 'MISSING_NAME'],
    ['address', 'MISSING_ADDRESS'],
    ['city', 'MISSING_CITY'],
    ['state', 'MISSING_REGION']
  ];
  for (const [field, reasonCode] of requiredChecks) {
    if (!normalizeWhitespace(row[field])) return { disposition: 'rejected', reason_code: reasonCode };
  }

  const latitude = parseCoordinate(row.lat, 'latitude');
  const longitude = parseCoordinate(row.lon, 'longitude');
  if (latitude.error || longitude.error) {
    return {
      disposition: 'rejected',
      reason_code: [latitude.error, longitude.error].filter(Boolean).join('+')
    };
  }

  const evidenceText = [row.promo, row.details, row.affiliation]
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join(' | ');
  const isOneOff = HOLD_EVENT_ONLY_PATTERNS.some((pattern) => pattern.test(evidenceText));
  const hasRecurringEvidence = inferClassification(row).venue_type === 'cal_bar';
  if (isOneOff && !hasRecurringEvidence) {
    return {
      disposition: 'held_for_review',
      reason_code: 'EVENT_ONLY_RECURRING_VALUE_UNSUPPORTED'
    };
  }

  return { disposition: 'accepted', reason_code: '' };
}

function normalizeExternalSource(row) {
  const placeId = normalizeWhitespace(row.place_id);
  if (!placeId) return { external_source: '', external_place_id: '' };
  if (/^ChIJ/i.test(placeId)) return { external_source: 'google_places_v1', external_place_id: placeId };
  return { external_source: 'v1_public_source', external_place_id: placeId };
}

function sourceMapLinkStatus(value) {
  const result = normalizeUrl(value);
  if (result.status !== 'valid') return result;
  const hostname = new URL(result.normalized).hostname.toLocaleLowerCase('en-US');
  if (hostname === 'maps.google.com' || hostname.endsWith('.google.com')) {
    return { normalized: '', status: 'source_map_link' };
  }
  return result;
}

export function buildCandidate(row, migrationTimestamp) {
  const classification = inferClassification(row);
  const { address_line_1, address_line_2 } = splitAddress(row.address);
  const latitude = parseCoordinate(row.lat, 'latitude').value;
  const longitude = parseCoordinate(row.lon, 'longitude').value;
  const external = normalizeExternalSource(row);
  const sourceUrl = sourceMapLinkStatus(row.url);
  const alumniOwned = /\balumni-owned\b/i.test(normalizeWhitespace(row.affiliation)) ? 'yes' : 'unknown';
  const baseSlug = slugify(`${row.name} ${row.city}`) || `venue-${stableHash(buildSourceIdentity(row)).slice(0, 8)}`;

  return {
    candidate: {
      venue_id: createVenueId(row),
      slug: baseSlug,
      name: normalizeWhitespace(row.name),
      address_line_1,
      address_line_2,
      city: normalizeWhitespace(row.city),
      region: normalizeWhitespace(row.state).toUpperCase(),
      postal_code: normalizePostalCode(row.zip),
      country_code: 'US',
      latitude,
      longitude,
      website_url: sourceUrl.status === 'valid' ? sourceUrl.normalized : '',
      venue_type: classification.venue_type,
      verification_status: 'cgb_reviewed',
      alumni_owned: alumniOwned,
      external_source: external.external_source,
      external_place_id: external.external_place_id,
      short_description: '',
      photo_url: '',
      photo_credit: '',
      publication_status: 'draft',
      source_submission_id: '',
      created_at: migrationTimestamp,
      updated_at: migrationTimestamp
    },
    classification,
    source_url_status: sourceUrl.status
  };
}

export function applyManualOverride(record, override) {
  if (!override) return record;
  const result = structuredClone(record);
  const allowedDisposition = new Set(['accepted', 'probable_duplicate', 'held_for_review', 'rejected']);
  if (override.disposition !== undefined) {
    if (!allowedDisposition.has(override.disposition)) throw new Error(`Unsupported override disposition: ${override.disposition}`);
    result.disposition = override.disposition;
    result.reason_code = normalizeWhitespace(override.reason_code || 'MANUAL_OVERRIDE');
    result.automated = false;
  }
  for (const field of ['venue_type', 'website_url', 'short_description', 'alumni_owned']) {
    if (override[field] !== undefined) {
      result.candidate[field] = normalizeWhitespace(override[field]);
      result.automated = false;
    }
  }
  result.manual_note = normalizeWhitespace(override.note);
  return result;
}
