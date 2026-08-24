import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, replacements) {
  let source = readFileSync(path, 'utf8');
  let next = source;
  for (const [before, after] of replacements) {
    if (!next.includes(before)) {
      throw new Error(`Expected source not found in ${path}: ${before.slice(0, 120)}`);
    }
    next = next.replace(before, after);
  }
  if (next === source) throw new Error(`No changes produced for ${path}`);
  writeFileSync(path, next);
}

patch('apps-script/FanExperienceAutomation.gs', [
  [
    ' * This script appends only publication fields and exposes only venue_id + text.',
    ' * This script appends only deliberate publication fields for the public Fan Experience projection.'
  ],
  [
`const CGB_FAN_EXPERIENCE_MAX_LENGTH = 500;
const CGB_FAN_EXPERIENCE_ADMIN_HEADERS = Object.freeze([
  'public_text',
  'moderation_status',`,
`const CGB_FAN_EXPERIENCE_MAX_LENGTH = 500;
const CGB_FAN_EXPERIENCE_DISPLAY_NAME_MAX_LENGTH = 60;
const CGB_FAN_EXPERIENCE_ADMIN_HEADERS = Object.freeze([
  'public_text',
  'public_display_name',
  'moderation_status',`
  ],
  [
`  experience_text: Object.freeze([
    'What should other Bears know about watching a Cal game here?',
    'experience_text'
  ]),
  venue_id: Object.freeze(['Venue ID', 'Selected Venue ID', 'venue_id'])`,
`  experience_text: Object.freeze([
    'What should other Bears know about watching a Cal game here?',
    'experience_text'
  ]),
  display_name: Object.freeze([
    'Name to display (optional)',
    'Name to display',
    'display_name'
  ]),
  venue_id: Object.freeze(['Venue ID', 'Selected Venue ID', 'venue_id'])`
  ],
  [
`  const venueId = cleanFanExperienceIdentifier_(readFanExperienceFormField_(context.namedValues, 'venue_id'));
  const cleanedText = cleanFanExperienceText_(readFanExperienceFormField_(context.namedValues, 'experience_text'));

  let moderationStatus = 'held';
  let moderationReason = '';
  if (!isKnownCanonicalFanExperienceVenue_(context.workbook, venueId)) {
    moderationReason = 'unknown_venue';
  } else if (!cleanedText) {
    moderationReason = 'empty_experience';
  } else {
    const moderation = moderateFanExperienceText_(cleanedText);
    moderationStatus = moderation.status;
    moderationReason = moderation.reason;
  }

  updateFanExperienceRawFields_(context.sheet, context.rowNumber, headers, {
    public_text: cleanedText,
    moderation_status: moderationStatus,
    moderation_reason: moderationReason
  });`,
`  const venueId = cleanFanExperienceIdentifier_(readFanExperienceFormField_(context.namedValues, 'venue_id'));
  const cleanedText = cleanFanExperienceText_(readFanExperienceFormField_(context.namedValues, 'experience_text'));
  const cleanedDisplayName = cleanFanExperienceDisplayName_(
    readFanExperienceFormField_(context.namedValues, 'display_name')
  );

  let moderationStatus = 'held';
  let moderationReason = '';
  if (!isKnownCanonicalFanExperienceVenue_(context.workbook, venueId)) {
    moderationReason = 'unknown_venue';
  } else if (!cleanedText) {
    moderationReason = 'empty_experience';
  } else {
    const textModeration = moderateFanExperienceText_(cleanedText);
    if (textModeration.status === 'held') {
      moderationStatus = textModeration.status;
      moderationReason = textModeration.reason;
    } else {
      const displayNameModeration = moderateFanExperienceDisplayName_(cleanedDisplayName);
      moderationStatus = displayNameModeration.status;
      moderationReason = displayNameModeration.reason;
    }
  }

  updateFanExperienceRawFields_(context.sheet, context.rowNumber, headers, {
    public_text: cleanedText,
    public_display_name: cleanedDisplayName,
    moderation_status: moderationStatus,
    moderation_reason: moderationReason
  });`
  ],
  [
`function moderateFanExperienceText_(value) {
  const text = cleanFanExperienceText_(value);`,
`function cleanFanExperienceDisplayName_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, '')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, CGB_FAN_EXPERIENCE_DISPLAY_NAME_MAX_LENGTH)
    .trim();
}

function moderateFanExperienceText_(value) {
  const text = cleanFanExperienceText_(value);`
  ],
  [
`  return { status: 'published', reason: '' };
}

function isKnownCanonicalFanExperienceVenue_`,
`  return { status: 'published', reason: '' };
}

function moderateFanExperienceDisplayName_(value) {
  const displayName = cleanFanExperienceDisplayName_(value);
  if (!displayName) return { status: 'published', reason: '' };

  for (let index = 0; index < CGB_FAN_EXPERIENCE_MODERATION_RULES.length; index += 1) {
    const rule = CGB_FAN_EXPERIENCE_MODERATION_RULES[index];
    if (rule.pattern.test(displayName)) {
      return { status: 'held', reason: 'display_name_' + rule.reason };
    }
  }
  if (/(.)\\1{7,}/i.test(displayName) || /\\b([a-z0-9]+)(?:\\s+\\1){4,}\\b/i.test(displayName)) {
    return { status: 'held', reason: 'display_name_junk_or_repetition' };
  }
  return { status: 'published', reason: '' };
}

function isKnownCanonicalFanExperienceVenue_`
  ]
]);

patch('apps-script/Code.gs', [
  [
`function fanExperienceSubmissionYear_(timestamp, parsedTimestamp) {`,
`function cleanFanExperienceSnapshotDisplayName_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, '')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();
}

function fanExperienceSubmissionYear_(timestamp, parsedTimestamp) {`
  ],
  [
`      venue_id: venueId,
      text: text,
      year: fanExperienceSubmissionYear_(timestamp, parsedTimestamp),`,
`      venue_id: venueId,
      text: text,
      display_name: cleanFanExperienceSnapshotDisplayName_(row && row.public_display_name),
      year: fanExperienceSubmissionYear_(timestamp, parsedTimestamp),`
  ],
  [
`    return { venue_id: row.venue_id, text: row.text, year: row.year };`,
`    return { venue_id: row.venue_id, text: row.text, display_name: row.display_name, year: row.year };`
  ]
]);

patch('js/fan-experiences.mjs', [
  [
`      venue_id: resolvedVenueId,
      text: clean(item.text),
      year: fanExperienceYear(item.year)`,
`      venue_id: resolvedVenueId,
      text: clean(item.text),
      display_name: clean(item.display_name),
      year: fanExperienceYear(item.year)`
  ],
  [
`function createQuote(documentObject, item) {
  const quote = documentObject.createElement('p');
  quote.className = 'detail-fan-experiences__quote';
  if (item.year) {
    const year = documentObject.createElement('span');
    year.className = 'detail-fan-experiences__year';
    year.textContent = String(item.year);
    quote.append(year);
  }
  quote.append(documentObject.createTextNode(item.text));
  return quote;
}`,
`function createQuote(documentObject, item) {
  const experience = documentObject.createElement('article');
  experience.className = 'detail-fan-experiences__item';

  const quoteRow = documentObject.createElement('div');
  quoteRow.className = 'detail-fan-experiences__quote-row';
  const mark = documentObject.createElement('span');
  mark.className = 'detail-fan-experiences__mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '“';
  const quote = documentObject.createElement('p');
  quote.className = 'detail-fan-experiences__quote';
  quote.textContent = item.text;
  quoteRow.append(mark, quote);

  const attribution = documentObject.createElement('p');
  attribution.className = 'detail-fan-experiences__attribution';
  const name = documentObject.createElement('strong');
  name.className = 'detail-fan-experiences__name';
  name.textContent = item.display_name || 'Anonymous';
  attribution.append(name);
  if (item.year) {
    attribution.append(documentObject.createTextNode(' · '));
    const year = documentObject.createElement('span');
    year.className = 'detail-fan-experiences__year';
    year.textContent = String(item.year);
    attribution.append(year);
  }

  experience.append(quoteRow, attribution);
  return experience;
}`
  ]
]);

patch('css/venue-profile.css', [
  [
`.venue-detail .detail-fan-experiences__quotes {
  display: grid;
  gap: 10px;
}

.venue-detail .detail-fan-experiences__quote,
.venue-detail .detail-fan-experiences__prompt,
.venue-detail .detail-fan-experiences__guidance {
  margin: 0;
  color: var(--cgb-ink-700);
}

.venue-detail .detail-fan-experiences__quote {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.45;
}

.venue-detail .detail-fan-experiences__year {
  display: block;
  margin-bottom: 5px;
  color: var(--cgb-ink-500);
  font-size: var(--text-xs);
  font-weight: 400;
  line-height: 1.2;
}`,
`.venue-detail .detail-fan-experiences__quotes {
  display: grid;
  gap: 12px;
}

.venue-detail .detail-fan-experiences__item {
  margin: 0;
}

.venue-detail .detail-fan-experiences__quote-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 7px;
}

.venue-detail .detail-fan-experiences__mark {
  color: var(--cgb-gold-500);
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 750;
  line-height: .85;
  transform: translateY(2px);
}

.venue-detail .detail-fan-experiences__quote,
.venue-detail .detail-fan-experiences__prompt,
.venue-detail .detail-fan-experiences__guidance {
  margin: 0;
  color: var(--cgb-ink-700);
}

.venue-detail .detail-fan-experiences__quote {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.45;
}

.venue-detail .detail-fan-experiences__attribution {
  margin: 7px 0 0 25px;
  color: var(--cgb-ink-500);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.25;
}

.venue-detail .detail-fan-experiences__name {
  color: var(--cgb-navy-950);
  font-weight: 750;
}

.venue-detail .detail-fan-experiences__year {
  color: var(--cgb-ink-500);
  font-size: inherit;
  font-weight: 400;
}`
  ],
  [
`.venue-detail .detail-fan-experiences__quote + .detail-fan-experiences__quote {
  padding-top: 10px;
  border-top: 1px solid rgba(1, 1, 51, .09);
}`,
`.venue-detail .detail-fan-experiences__item + .detail-fan-experiences__item {
  padding-top: 12px;
  border-top: 1px solid rgba(1, 1, 51, .09);
}`
  ],
  [
`.venue-detail .detail-fan-experiences__share {
  display: inline-block;
  font-size: 15px;
}`,
`.venue-detail .detail-fan-experiences__share {
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
}`
  ]
]);

patch('scripts/validate-v2-data.mjs', [
  [
`  'experience_text', 'public_text', 'moderation_status', 'moderation_reason',`,
`  'experience_text', 'public_text', 'public_display_name', 'moderation_status', 'moderation_reason',`
  ],
  [
`function validateFanExperience(experience, index, venueIds, errors) {
  const path = \`fanExperiences[\${index}]\`;
  if (!isObject(experience)) return errors.push(\`\${path} must be an object\`);
  const keys = Object.keys(experience).sort();
  if (JSON.stringify(keys) !== JSON.stringify(['text', 'venue_id', 'year'])) {
    errors.push(\`\${path} may contain only venue_id, text, and year\`);
  }
  requireString(experience, 'venue_id', path, errors);
  requireString(experience, 'text', path, errors);
  if (!CANONICAL_ID_PATTERNS.venue.test(experience.venue_id || '')) {
    errors.push(\`\${path}.venue_id must match venue_<24 lowercase hex>\`);
  }
  if (!venueIds.has(experience.venue_id)) errors.push(\`\${path}.venue_id does not reference a public venue\`);
  if (!Number.isInteger(experience.year) || experience.year < 2000 || experience.year > 2100) {
    errors.push(\`\${path}.year must be a four-digit integer\`);
  }
  if (typeof experience.text === 'string') {
    if (experience.text.length > 500) errors.push(\`\${path}.text must be at most 500 characters\`);
    if (/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/.test(experience.text)) errors.push(\`\${path}.text contains control characters\`);
  }
}`,
`function validateFanExperience(experience, index, venueIds, errors) {
  const path = \`fanExperiences[\${index}]\`;
  if (!isObject(experience)) return errors.push(\`\${path} must be an object\`);
  const allowedKeys = new Set(['venue_id', 'text', 'display_name', 'year']);
  const unexpectedKeys = Object.keys(experience).filter((key) => !allowedKeys.has(key));
  if (unexpectedKeys.length) {
    errors.push(\`\${path} may contain only venue_id, text, optional display_name, and year\`);
  }
  requireString(experience, 'venue_id', path, errors);
  requireString(experience, 'text', path, errors);
  if (Object.prototype.hasOwnProperty.call(experience, 'display_name')) {
    requireString(experience, 'display_name', path, errors, { allowEmpty: true });
  }
  if (!CANONICAL_ID_PATTERNS.venue.test(experience.venue_id || '')) {
    errors.push(\`\${path}.venue_id must match venue_<24 lowercase hex>\`);
  }
  if (!venueIds.has(experience.venue_id)) errors.push(\`\${path}.venue_id does not reference a public venue\`);
  if (!Number.isInteger(experience.year) || experience.year < 2000 || experience.year > 2100) {
    errors.push(\`\${path}.year must be a four-digit integer\`);
  }
  if (typeof experience.text === 'string') {
    if (experience.text.length > 500) errors.push(\`\${path}.text must be at most 500 characters\`);
    if (/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/.test(experience.text)) errors.push(\`\${path}.text contains control characters\`);
  }
  if (typeof experience.display_name === 'string') {
    if (experience.display_name.length > 60) errors.push(\`\${path}.display_name must be at most 60 characters\`);
    if (/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/.test(experience.display_name)) errors.push(\`\${path}.display_name contains control characters\`);
  }
}`
  ]
]);

patch('tests/fan-experience-automation.test.mjs', [
  [
`test('useful negative feedback publishes when it does not trigger a safety hold', () => {`,
`test('optional display name is cleaned, allows short names, and holds unsafe attribution', () => {
  context.__value = '  AJ  ';
  assert.equal(call('cleanFanExperienceDisplayName_(__value)'), 'AJ');
  assert.deepEqual(json(call('moderateFanExperienceDisplayName_(__value)')), {
    status: 'published',
    reason: ''
  });
  context.__value = '';
  assert.equal(call('moderateFanExperienceDisplayName_(__value).status'), 'published');
  context.__value = 'bear@example.com';
  assert.equal(call('moderateFanExperienceDisplayName_(__value).reason'), 'display_name_personal_contact_information');
});

test('useful negative feedback publishes when it does not trigger a safety hold', () => {`
  ],
  [
`      public_text: 'Older published experience',
      moderation_status: 'published',`,
`      'Name to display (optional)': 'RAW PRIVATE NAME',
      public_text: 'Older published experience',
      public_display_name: '',
      moderation_status: 'published',`
  ],
  [
`      public_text: '<b>Newest</b> stays plain text',
      moderation_status: 'published',`,
`      public_text: '<b>Newest</b> stays plain text',
      public_display_name: 'Matthew',
      moderation_status: 'published',`
  ],
  [
`    { venue_id: venueId, text: '<b>Newest</b> stays plain text', year: 2026 },
    { venue_id: venueId, text: 'Older published experience', year: 2026 }`,
`    { venue_id: venueId, text: '<b>Newest</b> stays plain text', display_name: 'Matthew', year: 2026 },
    { venue_id: venueId, text: 'Older published experience', display_name: '', year: 2026 }`
  ],
  [
`  for (const privateValue of ['RAW PRIVATE', 'private@example.com', 'moderation_status', 'moderation_reason', 'reviewer_note', 'Timestamp']) {`,
`  for (const privateValue of ['RAW PRIVATE', 'RAW PRIVATE NAME', 'private@example.com', 'public_display_name', 'moderation_status', 'moderation_reason', 'reviewer_note', 'Timestamp']) {`
  ]
]);

patch('tests/fan-experience-data.test.mjs', [
  [
`test('public Fan Experience accepts only venue_id, text, and submission year for a public Venue', () => {
  const snapshot = baseSnapshot();
  snapshot.fanExperiences = [{ venue_id: venueId, text: '<b>Literal text</b>', year: 2026 }];
  assert.deepEqual(validateSnapshot(snapshot), []);
});`,
`test('older public Fan Experience items without display_name remain valid', () => {
  const snapshot = baseSnapshot();
  snapshot.fanExperiences = [{ venue_id: venueId, text: '<b>Literal text</b>', year: 2026 }];
  assert.deepEqual(validateSnapshot(snapshot), []);
});

test('public Fan Experience accepts an optional cleaned display name', () => {
  const snapshot = baseSnapshot();
  snapshot.fanExperiences = [{ venue_id: venueId, text: 'Public text', display_name: 'Matthew', year: 2026 }];
  assert.deepEqual(validateSnapshot(snapshot), []);

  snapshot.fanExperiences[0].display_name = 'x'.repeat(61);
  assert.ok(validateSnapshot(snapshot).some((error) => error.includes('display_name must be at most 60 characters')));
});`
  ],
  [
`    year: 2026,
    experience_text: 'Raw private text',`,
`    year: 2026,
    public_display_name: 'Private staging field',
    experience_text: 'Raw private text',`
  ],
  [
`  assert.ok(errors.some((error) => error.includes('moderation_status is forbidden')));
  assert.ok(errors.some((error) => error.includes('may contain only venue_id, text, and year')));`,
`  assert.ok(errors.some((error) => error.includes('public_display_name is forbidden')));
  assert.ok(errors.some((error) => error.includes('moderation_status is forbidden')));
  assert.ok(errors.some((error) => error.includes('may contain only venue_id, text, optional display_name, and year')));`
  ]
]);

patch('tests/fan-experiences-profile.test.mjs', [
  [
`    { venue_id: venueId, text: 'Newest', year: 2026 },
    { venue_id: venueId, text: 'Second', year: 2026 },
    { venue_id: venueId, text: 'Third', year: 2025 },`,
`    { venue_id: venueId, text: 'Newest', display_name: 'Matthew', year: 2026 },
    { venue_id: venueId, text: 'Second', display_name: '', year: 2026 },
    { venue_id: venueId, text: 'Third', display_name: 'Oski', year: 2025 },`
  ],
  [
`  assert.deepEqual(experiences.map((item) => item.year), [2026, 2026, 2025]);`,
`  assert.deepEqual(experiences.map((item) => item.display_name), ['Matthew', '', 'Oski']);
  assert.deepEqual(experiences.map((item) => item.year), [2026, 2026, 2025]);`
  ],
  [
`  assert.match(sourceText, /year\\.className = 'detail-fan-experiences__year'/);
  assert.match(sourceText, /year\\.textContent = String\\(item\\.year\\)/);
  assert.match(sourceText, /quote\\.append\\(documentObject\\.createTextNode\\(item\\.text\\)\\)/);`,
`  assert.match(sourceText, /mark\\.className = 'detail-fan-experiences__mark'/);
  assert.match(sourceText, /name\\.textContent = item\\.display_name \\|\\| 'Anonymous'/);
  assert.match(sourceText, /year\\.className = 'detail-fan-experiences__year'/);
  assert.match(sourceText, /year\\.textContent = String\\(item\\.year\\)/);
  assert.match(sourceText, /quote\\.textContent = item\\.text/);`
  ],
  [
`  assert.match(css, /\\.detail-fan-experiences__quote\\s*\\{[\\s\\S]*font-size: 18px;[\\s\\S]*font-weight: 400;[\\s\\S]*line-height: 1\\.45;/);
  assert.match(css, /\\.detail-fan-experiences__year\\s*\\{[\\s\\S]*color: var\\(--cgb-ink-500\\);[\\s\\S]*font-size: var\\(--text-xs\\);/);`,
`  assert.match(css, /\\.detail-fan-experiences__mark\\s*\\{[\\s\\S]*font-size: 24px;/);
  assert.match(css, /\\.detail-fan-experiences__quote\\s*\\{[\\s\\S]*font-size: 16px;[\\s\\S]*font-weight: 400;[\\s\\S]*line-height: 1\\.45;/);
  assert.match(css, /\\.detail-fan-experiences__attribution\\s*\\{[\\s\\S]*font-size: 12px;/);
  assert.match(css, /\\.detail-fan-experiences__year\\s*\\{[\\s\\S]*color: var\\(--cgb-ink-500\\);[\\s\\S]*font-size: inherit;/);`
  ],
  [
`  assert.match(css, /\\.detail-fan-experiences__share\\s*\\{[\\s\\S]*font-size: 15px;/);`,
`  assert.match(css, /\\.detail-fan-experiences__share\\s*\\{[\\s\\S]*font-size: 14px;[\\s\\S]*font-weight: 700;/);`
  ]
]);

patch('scripts/run-browser-harness.mjs', [
  [
`  text: 'Synthetic Bears Say experience for browser coverage.',
  year: 2026`,
`  text: 'Synthetic Bears Say experience for browser coverage.',
  display_name: 'Synthetic Bear',
  year: 2026`
  ]
]);

patch('tests/browser/smoke-runtime-harness.mjs', [
  [
`    const year = section?.querySelector('.detail-fan-experiences__year');
    check(visible(year), 'Mobile BEARS SAY should visibly render the submission year');
    check(year?.textContent?.trim() === '2026', 'Mobile BEARS SAY should render the expected submission year');`,
`    const mark = section?.querySelector('.detail-fan-experiences__mark');
    check(visible(mark), 'Mobile BEARS SAY should visibly render the decorative opening quote');
    const attribution = section?.querySelector('.detail-fan-experiences__attribution');
    check(visible(attribution), 'Mobile BEARS SAY should visibly render attribution');
    check(attribution?.textContent?.trim() === 'Synthetic Bear · 2026', 'Mobile BEARS SAY should render display name and year together');
    const year = section?.querySelector('.detail-fan-experiences__year');
    check(visible(year), 'Mobile BEARS SAY should visibly render the submission year');
    check(year?.textContent?.trim() === '2026', 'Mobile BEARS SAY should render the expected submission year');`
  ]
]);

patch('docs/public-data-contract.md', [
  [
`\`fanExperiences\` is an optional public collection of anonymous, venue-centric fan experiences. Each item contains exactly:

- \`venue_id\`
- \`text\`
- \`year\``,
`\`fanExperiences\` is an optional public collection of venue-centric fan experiences with optional submitter-chosen attribution. Each item requires:

- \`venue_id\`
- \`text\`
- \`year\`

and may include:

- \`display_name\` — cleaned optional public attribution, maximum 60 characters; blank or missing values render as **Anonymous**`
  ],
  [
`Only private \`Fan_Experiences_Raw\` rows with \`moderation_status = published\`, a published canonical Venue, non-empty valid \`public_text\`, and a valid Google Form submission timestamp may enter the collection. The backend orders experiences newest-first using the private timestamp and derives the four-digit public \`year\` from that submission date. The full timestamp is never returned publicly. The displayed text is substantively verbatim after technical cleanup and is rendered by the client as plain text.`,
`Only private \`Fan_Experiences_Raw\` rows with \`moderation_status = published\`, a published canonical Venue, non-empty valid \`public_text\`, and a valid Google Form submission timestamp may enter the collection. The backend orders experiences newest-first using the private timestamp and derives the four-digit public \`year\` from that submission date. The full timestamp is never returned publicly. The displayed text is substantively verbatim after technical cleanup and is rendered by the client as plain text. When the submitter supplies the optional Form field \`Name to display (optional)\`, the automation cleans and moderates it into private \`public_display_name\` before the public snapshot projects it as \`display_name\`. Existing or blank-name experiences remain valid and display as **Anonymous**.`
  ],
  [
`The public collection never includes raw \`experience_text\`, moderation fields, full timestamps, Form metadata, contact information, or spreadsheet identifiers.`,
`The public collection never includes raw \`experience_text\`, the raw display-name response, private \`public_text\` or \`public_display_name\` staging fields, moderation fields, full timestamps, Form metadata, contact information, or spreadsheet identifiers.`
  ],
  [
`- raw \`experience_text\` or \`public_text\`
- Fan Experience \`moderation_status\` or \`moderation_reason\``,
`- raw \`experience_text\`, \`public_text\`, or \`public_display_name\`
- raw Fan Experience display-name Form responses
- Fan Experience \`moderation_status\` or \`moderation_reason\``
  ]
]);

patch('docs/contribution-forms.md', [
  [
`This focused Form collects one anonymous, venue-centric Fan Experience for the **BEARS SAY** section. It is the deliberate exception to the default no-trigger rule above: install the repository's focused spreadsheet-bound \`onFanExperienceFormSubmit\` trigger after the response tab exists.`,
`This focused Form collects one venue-centric Fan Experience for the **BEARS SAY** section. Fans may optionally provide a public display name; blank submissions render as **Anonymous**. It is the deliberate exception to the default no-trigger rule above: install the repository's focused spreadsheet-bound \`onFanExperienceFormSubmit\` trigger after the response tab exists.`
  ],
  [
`2. \`What should other Bears know about watching a Cal game here?\` — required paragraph, maximum 500 characters. Helper: \`Tell us what makes watching Cal here special—the crowd, the watch party, the atmosphere, or anything another Bear should know.\`
3. \`Venue ID\` — required short answer; prefilled with the canonical Venue ID.`,
`2. \`What should other Bears know about watching a Cal game here?\` — required paragraph, maximum 500 characters. Helper: \`Tell us what makes watching Cal here special—the crowd, the watch party, the atmosphere, or anything another Bear should know.\`
3. \`Name to display (optional)\` — optional short answer. Treat 60 characters as the public maximum. Blank responses publish as **Anonymous**.
4. \`Venue ID\` — required short answer; prefilled with the canonical Venue ID.`
  ],
  [
`Do not collect a name, email, Game, Watch Party, rating, structured survey answers, account, or response receipt. Keep the Form usable without Google sign-in.`,
`Do not collect an email, Game, Watch Party, rating, structured survey answers, account, or response receipt. \`Name to display (optional)\` is the only public attribution field and must not be treated as a verified identity or attendee name. Keep the Form usable without Google sign-in.`
  ],
  [
`Link responses to the existing private CGB workbook and rename/confirm the Form-owned response tab as \`Fan_Experiences_Raw\`. Google Forms owns the original timestamp, Venue name, experience answer, and Venue ID columns. The Apps Script trigger appends only:

- \`public_text\`
- \`moderation_status\` — \`published\` or \`held\``,
`Link responses to the existing private CGB workbook and rename/confirm the Form-owned response tab as \`Fan_Experiences_Raw\`. Google Forms owns the original timestamp, Venue name, experience answer, optional display-name answer, and Venue ID columns. The Apps Script trigger appends only:

- \`public_text\`
- \`public_display_name\` — cleaned optional public attribution; blank remains blank in the private sheet and renders as **Anonymous** in the client
- \`moderation_status\` — \`published\` or \`held\``
  ],
  [
`On submission, Apps Script validates the canonical Venue ID, performs only technical text cleanup, copies the cleaned value to \`public_text\`, and applies the small deterministic moderation rules in \`apps-script/FanExperienceAutomation.gs\`. Negative but useful feedback is not held merely for being negative. Held rows remain private until manually changed in the Sheet. CGB may edit \`public_text\` or change \`moderation_status\` directly; there is no separate moderation dashboard.`,
`On submission, Apps Script validates the canonical Venue ID, performs only technical cleanup, copies the cleaned experience to \`public_text\`, cleans the optional attribution into \`public_display_name\`, and applies the small deterministic moderation rules in \`apps-script/FanExperienceAutomation.gs\`. An unsafe display name holds the submission just as unsafe experience text does; a blank display name does not. Negative but useful feedback is not held merely for being negative. Held rows remain private until manually changed in the Sheet. CGB may edit \`public_text\`, \`public_display_name\`, or \`moderation_status\` directly; there is no separate moderation dashboard.`
  ]
]);

console.log('Applied BEARS SAY attribution and styling updates.');
