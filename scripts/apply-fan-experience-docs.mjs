import { readFile, writeFile } from 'node:fs/promises';

async function patch(path, transform) {
  const current = await readFile(path, 'utf8');
  const next = transform(current);
  if (next !== current) await writeFile(path, next);
}

await patch('docs/public-data-contract.md', (text) => {
  if (!text.includes('"fanExperiences": []')) {
    text = text.replace(
      '  "venueSeasonCounts": [],\n  "generatedAt":',
      '  "venueSeasonCounts": [],\n  "fanExperiences": [],\n  "generatedAt":'
    );
  }

  const compatibility = 'The live endpoint includes `venueSeasonCounts`. Older last-known-good or static fallback snapshots created before this field was introduced may omit it; the client treats an omitted collection as an empty array.';
  if (text.includes(compatibility) && !text.includes('Older snapshots may also omit `fanExperiences`')) {
    text = text.replace(
      compatibility,
      `${compatibility}\n\nOlder snapshots may also omit \`fanExperiences\`; the client treats a missing collection as an empty array.`
    );
  }

  if (!text.includes('## Public Fan Experience fields')) {
    const section = `## Public Fan Experience fields\n\n\`fanExperiences\` is an optional public collection of anonymous, venue-centric fan experiences. Each item contains exactly:\n\n- \`venue_id\`\n- \`text\`\n- \`year\` — four-digit submission year derived from the private Google Form timestamp\n\nOnly private \`Fan_Experiences_Raw\` rows with \`moderation_status = published\`, a published canonical Venue, a valid submission timestamp, and non-empty valid \`public_text\` may enter the collection. The backend orders experiences newest-first using the private Google Form timestamp. Only the derived year is returned publicly; the full timestamp is never returned. The displayed text is substantively verbatim after technical cleanup and is rendered by the client as plain text.\n\nThe public collection never includes raw \`experience_text\`, moderation fields, full timestamps, Form metadata, contact information, or spreadsheet identifiers.\n\n`;
    text = text.replace('## Aggregate fields\n', `${section}## Aggregate fields\n`);
  } else {
    text = text.replace(
      '- `venue_id`\n- `text`\n\nOnly private `Fan_Experiences_Raw` rows with `moderation_status = published`, a published canonical Venue, and non-empty valid `public_text` may enter the collection. The backend orders experiences newest-first using the private Google Form timestamp, but the timestamp is never returned publicly. The displayed text is substantively verbatim after technical cleanup and is rendered by the client as plain text.\n\nThe public collection never includes raw `experience_text`, moderation fields, timestamps, Form metadata, contact information, or spreadsheet identifiers.',
      '- `venue_id`\n- `text`\n- `year` — four-digit submission year derived from the private Google Form timestamp\n\nOnly private `Fan_Experiences_Raw` rows with `moderation_status = published`, a published canonical Venue, a valid submission timestamp, and non-empty valid `public_text` may enter the collection. The backend orders experiences newest-first using the private Google Form timestamp. Only the derived year is returned publicly; the full timestamp is never returned. The displayed text is substantively verbatim after technical cleanup and is rendered by the client as plain text.\n\nThe public collection never includes raw `experience_text`, moderation fields, full timestamps, Form metadata, contact information, or spreadsheet identifiers.'
    );
  }

  const forbiddenAnchor = '- `idAliases`\n';
  if (text.includes(forbiddenAnchor) && !text.includes('- raw `experience_text` or `public_text`')) {
    text = text.replace(
      forbiddenAnchor,
      `${forbiddenAnchor}- raw \`experience_text\` or \`public_text\`\n- Fan Experience \`moderation_status\` or \`moderation_reason\`\n- Fan Experience response timestamps or Google Form metadata\n`
    );
  }
  return text;
});

await patch('docs/contribution-forms.md', (text) => {
  const staleConfig = `Public Form configuration is intentionally blank in \`js/fan-experience-form-config.mjs\` until the reviewed Form exists. Configure only:\n\n- public Form \`viewform\` URL\n- Venue name entry ID\n- Venue ID entry ID\n\nDo not commit a Form edit URL, response-sheet identifier, or placeholder live IDs. Equivalent \`cgb-fan-experience-form-*\` meta configuration is also supported. Until valid configuration exists, **Share your experience** is safely unavailable.`;
  const liveConfig = `Public Form configuration in \`js/config.mjs\`:\n\n- Form URL: \`https://docs.google.com/forms/d/e/1FAIpQLScVyKUUXqR8sqEPQLIMeVV1TtxI9EiVmMDd3ib-CvLuBKRajg/viewform\`\n- Venue ID: \`entry.120767699\`\n- Venue name: \`entry.202050515\`\n\nDo not commit a Form edit URL, response-sheet identifier, responses, or private Form metadata. Equivalent \`cgb-fan-experience-form-*\` meta configuration remains supported.`;
  text = text.replace(staleConfig, liveConfig);

  if (text.includes('## Share your Cal Game Experience')) return text;
  const section = `## Share your Cal Game Experience\n\nThis focused Form collects one anonymous, venue-centric Fan Experience for the **BEARS SAY** section. It is the deliberate exception to the default no-trigger rule above: install the repository's focused spreadsheet-bound \`onFanExperienceFormSubmit\` trigger after the response tab exists.\n\n${liveConfig}\n\nForm title:\n\n\`Share your Cal Game Experience\`\n\nQuestions, in order:\n\n1. \`Venue name\` — required short answer; prefilled from the canonical Venue Profile.\n2. \`What should other Bears know about watching a Cal game here?\` — required paragraph, maximum 500 characters. Helper: \`Tell us what makes watching Cal here special—the crowd, the watch party, the atmosphere, or anything another Bear should know.\`\n3. \`Venue ID\` — required short answer; prefilled with the canonical Venue ID.\n\nConfirmation text:\n\n\`Thanks for sharing your experience with other Bears.\`\n\nDo not collect a name, email, Game, Watch Party, rating, structured survey answers, account, or response receipt. Keep the Form usable without Google sign-in.\n\nLink responses to the existing private CGB workbook and rename/confirm the Form-owned response tab as \`Fan_Experiences_Raw\`. Google Forms owns the original timestamp, Venue name, experience answer, and Venue ID columns. The Apps Script trigger appends only:\n\n- \`public_text\`\n- \`moderation_status\` — \`published\` or \`held\`\n- \`moderation_reason\`\n\nOn submission, Apps Script validates the canonical Venue ID, performs only technical text cleanup, copies the cleaned value to \`public_text\`, and applies the small deterministic moderation rules in \`apps-script/FanExperienceAutomation.gs\`. Negative but useful feedback is not held merely for being negative. Held rows remain private until manually changed in the Sheet. CGB may edit \`public_text\` or change \`moderation_status\` directly; there is no separate moderation dashboard.\n\nA newly auto-published experience clears the public snapshot cache. After a manual edit or status change that should immediately affect public output, run \`buildPublicSnapshotForReview()\` to clear and rebuild the cache before verification.\n\n`;
  const anchor = '## Suggest a missing location\n';
  if (!text.includes(anchor)) throw new Error('Contribution Forms anchor not found');
  return text.replace(anchor, `${section}${anchor}`);
});
