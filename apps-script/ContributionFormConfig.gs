/**
 * Owner-only synchronization for the four live structured contribution Forms.
 *
 * The Forms are resolved through their existing response sheets and public URLs.
 * Private edit URLs, response-sheet IDs, and response data are never logged or
 * committed. Prefill questions are retained in place so their entry IDs remain
 * stable; approved non-prefill questions are reused and updated in place when
 * they clearly match the repository contract.
 */

const CGB_CONTRIBUTION_VENUE_FORM_TAG_CHOICES = Object.freeze([
  '21+',
  'AUDIO ON — game sound is usually on',
  'FOOD AVAILABLE',
  "Serves Cal beer (Oski's Gold, Coach Ron Golden Ale)",
  'LARGE CROWD — typically 10+ Cal fans',
  'CAL MEMORABILIA — Cal flags, signs, memorabilia, or similar'
]);

const CGB_CONTRIBUTION_WATCH_PARTY_FORM_TAG_CHOICES = Object.freeze([
  '21+',
  'AUDIO ON — game sound is expected/on',
  'FOOD AVAILABLE',
  "Serves Cal beer (Oski's Gold, Coach Ron Golden Ale)",
  'LARGE CROWD — typically 10+ Cal fans',
  'CAL MEMORABILIA — Cal flags, signs, memorabilia, or similar',
  'RSVP REQUESTED',
  'CAL SPECIALS — special food, drink, or pricing for the Cal group'
]);

const CGB_CONTRIBUTION_QUESTION_ALIASES = Object.freeze({
  structured_tags: Object.freeze(['What should Bears know about this Watch Party?']),
  freeform: Object.freeze(['In one or two sentences, what makes this venue feel like a Cal destination?'])
});

const CGB_CONTRIBUTION_FORM_CONTRACTS = Object.freeze({
  venue_details: Object.freeze({
    title: 'Tell us about this location',
    publicUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdlXsf9M0Rzru8F_0orKqSu-rc4HSY8NxzAUQxMlMSEFkmhTQ/viewform',
    description: 'Share what you know about this location. Structured details can improve the public listing automatically; freeform context stays private for review.',
    confirmation: 'Thanks. Your information was received and will help us improve this listing.',
    prefill: Object.freeze([
      Object.freeze({ key: 'venue_name', aliases: Object.freeze(['Venue Name', 'Venue name']), kind: 'text', expectedEntry: 'entry.2017964730' }),
      Object.freeze({ key: 'venue_id', aliases: Object.freeze(['Venue ID', 'Selected Venue ID']), kind: 'text', expectedEntry: 'entry.272269917' })
    ]),
    questions: Object.freeze([
      Object.freeze({ key: 'venue_name', prefill: true, kind: 'text', title: 'Venue Name', required: true, help: 'Pre-filled from the selected location. Please do not change this field.' }),
      Object.freeze({ key: 'relationship', kind: 'multiple_choice', title: 'Your relationship to this venue', required: true, choices: Object.freeze(['Venue owner or staff', 'Alumni group organizer', 'Attendee', 'Other']) }),
      Object.freeze({ key: 'frequency', kind: 'multiple_choice', title: 'How often do Cal fans gather here?', required: true, choices: Object.freeze(['Most Cal football games', 'Several times per season', 'At least once per season', 'Other']) }),
      Object.freeze({ key: 'structured_tags', kind: 'checkbox', title: 'Which of these describe this location?', required: false, choices: CGB_CONTRIBUTION_VENUE_FORM_TAG_CHOICES }),
      Object.freeze({ key: 'freeform', kind: 'paragraph', title: 'Anything else we should know about this venue?', required: false, help: 'What makes this place special for Cal fans, or what should someone know before watching a game here?' }),
      Object.freeze({ key: 'email', kind: 'text', title: 'Your email (optional, kept private)', required: false }),
      Object.freeze({ key: 'venue_id', prefill: true, kind: 'text', title: 'Venue ID', required: true, help: 'Pre-filled internal reference. Please do not change this field.' })
    ])
  }),

  venue_update: Object.freeze({
    title: 'Add or update location details',
    publicUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScmbHEKu6Rz2zvIJhLp4Gs2gniMrqR1vRazHU-EstWFEy7L-A/viewform',
    description: 'Add useful location details or flag something that needs correction. Safe structured additions may update automatically; destructive or identity changes remain private for review.',
    confirmation: 'Thank you. Your contribution was received.',
    prefill: Object.freeze([
      Object.freeze({ key: 'venue_name', aliases: Object.freeze(['Venue name', 'Venue Name']), kind: 'text', expectedEntry: 'entry.1985686020' }),
      Object.freeze({ key: 'venue_id', aliases: Object.freeze(['Venue ID', 'Selected Venue ID']), kind: 'text', expectedEntry: 'entry.1316297830' })
    ]),
    questions: Object.freeze([
      Object.freeze({ key: 'venue_name', prefill: true, kind: 'text', title: 'Venue Name', required: true, help: 'Pre-filled from the selected location. Please do not change this field.' }),
      Object.freeze({ key: 'update_category', kind: 'multiple_choice', title: 'What are you sharing?', required: true, choices: Object.freeze(['Add missing information', 'Correct existing information', 'Location closed or moved', 'Other']) }),
      Object.freeze({ key: 'structured_tags', kind: 'checkbox', title: 'Which of these describe this location?', required: false, choices: CGB_CONTRIBUTION_VENUE_FORM_TAG_CHOICES }),
      Object.freeze({ key: 'freeform', kind: 'paragraph', title: 'Anything else we should add or change?', required: false }),
      Object.freeze({ key: 'name', kind: 'text', title: 'Name (optional)', required: false, help: 'Optional and kept private.' }),
      Object.freeze({ key: 'email', kind: 'text', title: 'Email (optional)', required: false, help: 'Optional and kept private.' }),
      Object.freeze({ key: 'venue_id', prefill: true, kind: 'text', title: 'Venue ID', required: true, help: 'Pre-filled internal reference. Please do not change this field.' })
    ])
  }),

  watch_party_submission: Object.freeze({
    title: 'Add a Watch Party',
    publicUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdPF2mVRnIaZtyIwgFB2j9LvrHnl6jENkX6u9_dj1Zew5TTiQ/viewform',
    description: 'Add an organized Cal Watch Party so other Bears can find it. Routine valid submissions publish automatically.',
    confirmation: 'Thanks. Your Watch Party was received and will be published automatically when the structured submission is valid.',
    prefill: Object.freeze([
      Object.freeze({ key: 'venue_name', aliases: Object.freeze(['Venue Name', 'Venue name']), kind: 'text', expectedEntry: 'entry.307282250' }),
      Object.freeze({ key: 'games', aliases: Object.freeze(['Which game or games will have a Watch Party here?', 'Game(s)', 'Game IDs']), kind: 'checkbox', expectedEntry: 'entry.1519015315' }),
      Object.freeze({ key: 'venue_id', aliases: Object.freeze(['Venue ID (existing)', 'Venue ID']), kind: 'text', expectedEntry: 'entry.1451856849' })
    ]),
    questions: Object.freeze([
      Object.freeze({ key: 'venue_name', prefill: true, kind: 'text', title: 'Venue Name', required: true, help: 'Pre-filled from the selected location. Please do not change this field.' }),
      Object.freeze({ key: 'games', prefill: true, kind: 'checkbox', title: 'Which game or games will have a Watch Party here?', required: true }),
      Object.freeze({ key: 'organizer_name', kind: 'text', title: 'Organizer or host name', required: true }),
      Object.freeze({ key: 'organizer_type', kind: 'multiple_choice', title: 'Who is organizing or hosting this Watch Party?', required: true, choices: Object.freeze(['Alumni group', 'Venue', 'Other organization', 'Individual or group of fans', 'Not sure']) }),
      Object.freeze({ key: 'official_url', kind: 'text', title: 'Official event or RSVP link', required: false }),
      Object.freeze({ key: 'relationship', kind: 'multiple_choice', title: 'What is your relationship to this Watch Party?', required: true, choices: Object.freeze(['I am organizing it as an individual or group of fans', 'I am sharing a public event organized by someone else', 'I represent the venue hosting it', 'I represent the alumni group or organization hosting it']) }),
      Object.freeze({ key: 'event_start', kind: 'text', title: 'Event start or suggested arrival time', required: false, help: 'Optional. Include the time zone, for example 4:30 PM PT or 7:00 PM ET.' }),
      Object.freeze({ key: 'structured_tags', kind: 'checkbox', title: 'Which of these details apply?', required: false, choices: CGB_CONTRIBUTION_WATCH_PARTY_FORM_TAG_CHOICES }),
      Object.freeze({ key: 'freeform', kind: 'paragraph', title: 'Anything else fans should know?', required: false }),
      Object.freeze({ key: 'email', kind: 'text', title: 'Contact Email', required: false, help: 'Optional and kept private.' }),
      Object.freeze({ key: 'venue_id', prefill: true, kind: 'text', title: 'Venue ID (existing)', required: true, help: 'Pre-filled internal reference. Please do not change this field.' })
    ])
  }),

  watch_party_update: Object.freeze({
    title: 'Add or update Watch Party details',
    publicUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfmI00iDXigPXuNcadbwA8JZf8B5Lr0cWvXYCZGKu9WCSHEDA/viewform',
    description: 'Add useful Watch Party details or flag something that needs correction. Safe structured additions may update automatically; cancellation, move, organizer, and event-link changes remain private for review.',
    confirmation: 'Thank you. Your Watch Party contribution was received.',
    prefill: Object.freeze([
      Object.freeze({ key: 'venue_name', aliases: Object.freeze(['Venue name', 'Venue Name']), kind: 'text', expectedEntry: 'entry.541323117' }),
      Object.freeze({ key: 'game', aliases: Object.freeze(['Game']), kind: 'text', expectedEntry: 'entry.456782239' }),
      Object.freeze({ key: 'watch_party_id', aliases: Object.freeze(['Watch Party ID']), kind: 'text', expectedEntry: 'entry.703629381' })
    ]),
    questions: Object.freeze([
      Object.freeze({ key: 'venue_name', prefill: true, kind: 'text', title: 'Venue Name', required: true, help: 'Pre-filled from the selected Watch Party. Please do not change this field.' }),
      Object.freeze({ key: 'game', prefill: true, kind: 'text', title: 'Game', required: true, help: 'Pre-filled from the selected Watch Party. Please do not change this field.' }),
      Object.freeze({ key: 'update_category', kind: 'multiple_choice', title: 'What are you sharing?', required: true, choices: Object.freeze(['Add missing information', 'Correct existing information', 'Event canceled or moved', 'Organizer / event link update', 'Other']) }),
      Object.freeze({ key: 'structured_tags', kind: 'checkbox', title: 'Which of these details apply?', required: false, choices: CGB_CONTRIBUTION_WATCH_PARTY_FORM_TAG_CHOICES }),
      Object.freeze({ key: 'event_start', kind: 'text', title: 'Event start or suggested arrival time', required: false, help: 'Optional. Include the time zone, for example 4:30 PM PT or 7:00 PM ET.' }),
      Object.freeze({ key: 'freeform', kind: 'paragraph', title: 'Anything else we should add or change?', required: false }),
      Object.freeze({ key: 'name', kind: 'text', title: 'Name (optional)', required: false, help: 'Optional and kept private.' }),
      Object.freeze({ key: 'email', kind: 'text', title: 'Email (optional)', required: false, help: 'Optional and kept private.' }),
      Object.freeze({ key: 'watch_party_id', prefill: true, kind: 'text', title: 'Watch Party ID', required: true, help: 'Pre-filled internal reference. Please do not change this field.' })
    ])
  })
});

/**
 * Owner-only entry point. Run once after deploying this Apps Script version.
 * It is safe to run again: prefill and approved non-prefill questions are reused,
 * schema columns are reused, and the spreadsheet trigger is deduplicated.
 */
function syncContributionForms() {
  const workbook = getWorkbook_();
  const resolved = resolveContributionForms_(workbook);
  const before = inspectResolvedContributionForms_(resolved, workbook);
  assertContributionPrefillIds_(before);

  const schema = setupContributionTagSchema_();
  Object.keys(resolved).forEach(function(key) {
    ensureContributionAdminHeaders_(resolved[key].sheet);
  });

  const reports = {};
  Object.keys(CGB_CONTRIBUTION_FORM_CONTRACTS).forEach(function(key) {
    reports[key] = syncOneContributionForm_(
      resolved[key].form,
      CGB_CONTRIBUTION_FORM_CONTRACTS[key],
      workbook
    );
  });

  const after = inspectResolvedContributionForms_(resolved, workbook);
  assertContributionPrefillIds_(after);
  const trigger = ensureContributionFormSubmitTrigger_(workbook);
  clearPublicSnapshotCache_();

  const result = {
    ok: true,
    schema: schema,
    trigger: trigger,
    forms: after,
    changes: reports
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/** Owner-only read-only preflight/report helper. */
function inspectContributionFormsForReview() {
  const workbook = getWorkbook_();
  const resolved = resolveContributionForms_(workbook);
  const report = inspectResolvedContributionForms_(resolved, workbook);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

/** Plain-data contract helper used by repository tests. */
function getContributionFormContractsForReview() {
  return JSON.parse(JSON.stringify(CGB_CONTRIBUTION_FORM_CONTRACTS));
}

/** Plain-data reuse planner used by repository tests; it does not call FormApp. */
function planContributionFormQuestionsForReview(existingQuestions, contractKey) {
  const contract = CGB_CONTRIBUTION_FORM_CONTRACTS[contractKey];
  if (!contract) throw new Error('Unknown contribution Form contract: ' + contractKey);
  const available = (existingQuestions || []).map(function(item, index) {
    return {
      id: String(item.id === undefined ? index : item.id),
      title: String(item.title || ''),
      kind: String(item.kind || '')
    };
  });
  const used = new Set();
  const retained = [];
  const added = [];

  contract.questions.filter(function(question) { return !question.prefill; }).forEach(function(question) {
    const titles = contributionQuestionMatchTitles_(question);
    const match = available.find(function(item) {
      return !used.has(item.id) && item.kind === question.kind &&
        titles.indexOf(normalizeContributionFormTitle_(item.title)) >= 0;
    });
    if (match) {
      used.add(match.id);
      retained.push({ key: question.key, id: match.id });
    } else {
      added.push(question.key);
    }
  });

  return {
    retained: retained,
    added: added,
    removed: available.filter(function(item) { return !used.has(item.id); }).map(function(item) { return item.id; })
  };
}

function resolveContributionForms_(workbook) {
  const contracts = CGB_CONTRIBUTION_FORM_CONTRACTS;
  const resolved = {};
  workbook.getSheets().forEach(function(sheet) {
    const editUrl = typeof sheet.getFormUrl === 'function' ? sheet.getFormUrl() : '';
    if (!editUrl) return;
    let form;
    try { form = FormApp.openByUrl(editUrl); } catch (_) { return; }
    const publishedUrl = normalizeContributionPublicFormUrl_(form.getPublishedUrl());
    Object.keys(contracts).forEach(function(key) {
      if (normalizeContributionPublicFormUrl_(contracts[key].publicUrl) !== publishedUrl) return;
      if (resolved[key]) throw new Error('Multiple response sheets resolve to contribution Form: ' + key);
      resolved[key] = { form: form, sheet: sheet };
    });
  });

  const missing = Object.keys(contracts).filter(function(key) { return !resolved[key]; });
  if (missing.length) {
    throw new Error('Unable to resolve existing contribution Form response sheets: ' + missing.join(', '));
  }
  return resolved;
}

function normalizeContributionPublicFormUrl_(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^https:\/\/docs\.google\.com\/forms\/d\/e\/([^/?#]+)\/(?:viewform|formResponse)/i);
  return match ? 'https://docs.google.com/forms/d/e/' + match[1] + '/viewform' : raw.split('?')[0];
}

function inspectResolvedContributionForms_(resolved, workbook) {
  const output = {};
  Object.keys(CGB_CONTRIBUTION_FORM_CONTRACTS).forEach(function(key) {
    const contract = CGB_CONTRIBUTION_FORM_CONTRACTS[key];
    const form = resolved[key].form;
    const prefill = findContributionPrefillItems_(form, contract);
    output[key] = {
      title: form.getTitle(),
      publicUrl: normalizeContributionPublicFormUrl_(form.getPublishedUrl()),
      responseTab: resolved[key].sheet.getName(),
      prefillEntries: buildContributionPrefillEntryReport_(form, contract, prefill, workbook)
    };
  });
  return output;
}

function assertContributionPrefillIds_(report) {
  Object.keys(CGB_CONTRIBUTION_FORM_CONTRACTS).forEach(function(key) {
    const contract = CGB_CONTRIBUTION_FORM_CONTRACTS[key];
    contract.prefill.forEach(function(prefill) {
      const actual = report[key] && report[key].prefillEntries[prefill.key];
      if (actual !== prefill.expectedEntry) {
        throw new Error(
          'Prefill entry drift for ' + key + '.' + prefill.key + ': expected ' +
          prefill.expectedEntry + ', found ' + (actual || '(missing)') +
          '. No Form changes were intentionally applied for this mismatch.'
        );
      }
    });
  });
}

function findContributionPrefillItems_(form, contract) {
  const items = form.getItems();
  const found = {};
  contract.prefill.forEach(function(prefill) {
    const aliases = prefill.aliases.map(normalizeContributionFormTitle_);
    const matches = items.filter(function(item) {
      return aliases.indexOf(normalizeContributionFormTitle_(item.getTitle())) >= 0;
    });
    if (matches.length !== 1) {
      throw new Error('Expected exactly one retained prefill question for ' + contract.title + ': ' + prefill.key);
    }
    const expectedType = prefill.kind === 'checkbox' ? FormApp.ItemType.CHECKBOX : FormApp.ItemType.TEXT;
    if (matches[0].getType() !== expectedType) {
      throw new Error('Prefill question type mismatch for ' + contract.title + ': ' + prefill.key);
    }
    found[prefill.key] = matches[0];
  });
  return found;
}

function normalizeContributionFormTitle_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function contributionQuestionMatchTitles_(question) {
  return [question.title].concat(CGB_CONTRIBUTION_QUESTION_ALIASES[question.key] || [])
    .map(normalizeContributionFormTitle_);
}

function buildContributionPrefillEntryReport_(form, contract, itemsByKey, workbook) {
  let response = form.createResponse();
  const samples = {};
  contract.prefill.forEach(function(prefill, index) {
    const item = itemsByKey[prefill.key];
    if (prefill.kind === 'checkbox') {
      const choices = contributionGameChoices_(workbook, item);
      if (!choices.length) throw new Error('Watch Party game question has no available choices.');
      samples[prefill.key] = choices[0];
      response = response.withItemResponse(item.asCheckboxItem().createResponse([choices[0]]));
    } else {
      const sample = 'CGB_PREFILL_' + String(index + 1) + '_' + prefill.key.toUpperCase();
      samples[prefill.key] = sample;
      response = response.withItemResponse(item.asTextItem().createResponse(sample));
    }
  });
  const url = response.toPrefilledUrl();
  const entries = {};
  Object.keys(samples).forEach(function(key) {
    entries[key] = extractContributionEntryId_(url, samples[key]);
  });
  return entries;
}

function contributionGameChoices_(workbook, item) {
  const canonical = readSheetObjects_(workbook, 'Games')
    .filter(function(game) { return String(game.game_status || '').trim() === 'upcoming'; })
    .sort(function(a, b) { return Number(a.schedule_order || 0) - Number(b.schedule_order || 0); })
    .map(function(game) { return buildMinimalWatchPartyGameLabel_(game); })
    .filter(Boolean);
  if (canonical.length) return canonical;
  if (!item || item.getType() !== FormApp.ItemType.CHECKBOX) return [];
  return item.asCheckboxItem().getChoices().map(function(choice) { return choice.getValue(); });
}

function extractContributionEntryId_(prefilledUrl, expectedValue) {
  const query = String(prefilledUrl || '').split('?')[1] || '';
  const pairs = query.split('&');
  for (let i = 0; i < pairs.length; i += 1) {
    const separator = pairs[i].indexOf('=');
    if (separator < 0) continue;
    const key = decodeURIComponent(pairs[i].slice(0, separator).replace(/\+/g, ' '));
    const value = decodeURIComponent(pairs[i].slice(separator + 1).replace(/\+/g, ' '));
    if (/^entry\.\d+$/.test(key) && value === expectedValue) return key;
  }
  return '';
}

function contributionQuestionItemType_(kind) {
  if (kind === 'paragraph') return FormApp.ItemType.PARAGRAPH_TEXT;
  if (kind === 'checkbox') return FormApp.ItemType.CHECKBOX;
  if (kind === 'multiple_choice') return FormApp.ItemType.MULTIPLE_CHOICE;
  return FormApp.ItemType.TEXT;
}

function findReusableContributionQuestion_(items, question, usedIds) {
  const titles = contributionQuestionMatchTitles_(question);
  return items.find(function(item) {
    return !usedIds.has(item.getId()) &&
      item.getType() === contributionQuestionItemType_(question.kind) &&
      titles.indexOf(normalizeContributionFormTitle_(item.getTitle())) >= 0;
  }) || null;
}

function syncOneContributionForm_(form, contract, workbook) {
  const retainedPrefill = findContributionPrefillItems_(form, contract);
  const existing = form.getItems();
  const usedIds = new Set(Object.keys(retainedPrefill).map(function(key) {
    return retainedPrefill[key].getId();
  }));
  const itemByKey = Object.assign({}, retainedPrefill);
  let added = 0;

  form.setTitle(contract.title);
  form.setDescription(contract.description);
  form.setConfirmationMessage(contract.confirmation);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(false);
  form.setShuffleQuestions(false);

  contract.questions.forEach(function(question) {
    if (question.prefill) {
      configureContributionQuestion_(itemByKey[question.key], question, workbook);
      return;
    }
    const reusable = findReusableContributionQuestion_(existing, question, usedIds);
    if (reusable) {
      itemByKey[question.key] = reusable;
      usedIds.add(reusable.getId());
      configureContributionQuestion_(reusable, question, workbook);
      return;
    }
    const created = createContributionFormQuestion_(form, question);
    itemByKey[question.key] = created;
    usedIds.add(created.getId());
    added += 1;
  });

  let removed = 0;
  for (let index = existing.length - 1; index >= 0; index -= 1) {
    if (usedIds.has(existing[index].getId())) continue;
    form.deleteItem(existing[index]);
    removed += 1;
  }

  contract.questions.forEach(function(question, index) {
    form.moveItem(itemByKey[question.key], index);
  });

  return { removedQuestions: removed, addedQuestions: added, totalQuestions: contract.questions.length };
}

function configureContributionQuestion_(item, question, workbook) {
  if (!item) throw new Error('Missing contribution question: ' + question.key);
  let typed;
  if (question.kind === 'paragraph') {
    typed = typeof item.asParagraphTextItem === 'function' ? item.asParagraphTextItem() : item;
  } else if (question.kind === 'checkbox') {
    typed = typeof item.asCheckboxItem === 'function' ? item.asCheckboxItem() : item;
  } else if (question.kind === 'multiple_choice') {
    typed = typeof item.asMultipleChoiceItem === 'function' ? item.asMultipleChoiceItem() : item;
  } else {
    typed = typeof item.asTextItem === 'function' ? item.asTextItem() : item;
  }

  typed.setTitle(question.title);
  typed.setRequired(Boolean(question.required));
  if (typeof typed.setHelpText === 'function') typed.setHelpText(question.help || '');

  if (question.kind === 'checkbox' && question.prefill) {
    const choices = contributionGameChoices_(workbook, item);
    if (!choices.length) throw new Error('No upcoming Games are available for the Watch Party Form.');
    typed.setChoiceValues(choices);
  } else if (question.choices && typeof typed.setChoiceValues === 'function') {
    typed.setChoiceValues(question.choices.slice());
  }
}

function createContributionFormQuestion_(form, question) {
  let item;
  if (question.kind === 'paragraph') item = form.addParagraphTextItem();
  else if (question.kind === 'checkbox') item = form.addCheckboxItem();
  else if (question.kind === 'multiple_choice') item = form.addMultipleChoiceItem();
  else item = form.addTextItem();
  configureContributionQuestion_(item, question, null);
  return item;
}

function ensureContributionFormSubmitTrigger_(workbook) {
  const triggers = ScriptApp.getProjectTriggers();
  let contribution = triggers.filter(function(trigger) {
    return trigger.getHandlerFunction() === 'onContributionFormSubmit';
  });
  const obsolete = triggers.filter(function(trigger) {
    return trigger.getHandlerFunction() === 'onWatchPartyFormSubmit';
  });

  // Establish the unified trigger before removing the old Watch Party trigger so
  // a trigger-creation failure cannot leave live submissions without a handler.
  let created = false;
  if (!contribution.length) {
    const createdTrigger = ScriptApp.newTrigger('onContributionFormSubmit')
      .forSpreadsheet(workbook)
      .onFormSubmit()
      .create();
    contribution = [createdTrigger];
    created = true;
  }

  contribution.slice(1).forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });
  obsolete.forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });

  return {
    handler: 'onContributionFormSubmit',
    created: created,
    removedObsoleteWatchPartyTriggers: obsolete.length,
    removedDuplicateTriggers: Math.max(0, contribution.length - 1)
  };
}
