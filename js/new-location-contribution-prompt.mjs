import { buildCalBarNominationPrefillUrl } from './cal-bar-nomination-core.mjs';

const DIALOG_ID = 'new-location-success-dialog';

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function contributionUrl(venue, documentObject = document) {
  if (!venue?.venue_id || !venue?.name) return '';
  return buildCalBarNominationPrefillUrl({
    formUrl: meta('cgb-cal-bar-nomination-form-url', documentObject),
    venueNameEntry: meta('cgb-cal-bar-nomination-venue-name-entry', documentObject),
    venueIdEntry: meta('cgb-cal-bar-nomination-venue-id-entry', documentObject)
  }, {
    venueId: venue.venue_id,
    venueName: venue.name,
    venueType: venue.venue_type
  });
}

export function canonicalVenueWasKnown(snapshot, venueId) {
  if (!venueId || !Array.isArray(snapshot?.venues)) return false;
  return snapshot.venues.some((venue) => venue?.venue_id === venueId);
}

function ensureDialog(documentObject = document) {
  let dialog = documentObject.querySelector(`#${DIALOG_ID}`);
  if (dialog) return dialog;

  dialog = documentObject.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'new-location-success-dialog';
  dialog.setAttribute('aria-labelledby', 'new-location-success-title');

  const shell = documentObject.createElement('div');
  shell.className = 'new-location-success-shell';

  const handle = documentObject.createElement('div');
  handle.className = 'new-location-success-handle';
  handle.setAttribute('aria-hidden', 'true');

  const header = documentObject.createElement('header');
  header.className = 'new-location-success-header';
  const eyebrow = documentObject.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Location added';
  const title = documentObject.createElement('h2');
  title.id = 'new-location-success-title';
  header.append(eyebrow, title);

  const prompt = documentObject.createElement('p');
  prompt.className = 'new-location-success-copy';
  prompt.textContent = 'Know this place? Help us complete the listing.';

  const actions = documentObject.createElement('div');
  actions.className = 'new-location-success-actions';
  const contribute = documentObject.createElement('a');
  contribute.id = 'new-location-success-contribute';
  contribute.className = 'primary-button';
  contribute.target = '_blank';
  contribute.rel = 'noopener noreferrer';
  contribute.textContent = 'Tell us about this location';
  const dismiss = documentObject.createElement('button');
  dismiss.id = 'new-location-success-dismiss';
  dismiss.className = 'secondary-button';
  dismiss.type = 'button';
  dismiss.textContent = 'Not now';
  actions.append(contribute, dismiss);

  shell.append(handle, header, prompt, actions);
  dialog.append(shell);
  documentObject.body.append(dialog);

  dismiss.addEventListener('click', () => dialog.close());
  contribute.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  return dialog;
}

export function showNewLocationContributionPrompt(venue, { documentObject = document } = {}) {
  const href = contributionUrl(venue, documentObject);
  if (!href) return false;

  const dialog = ensureDialog(documentObject);
  const title = dialog.querySelector('#new-location-success-title');
  const contribute = dialog.querySelector('#new-location-success-contribute');
  if (!title || !contribute) return false;

  title.textContent = `${venue.name} is now on Cal Golden Bars.`;
  contribute.href = href;

  try {
    if (dialog.open) dialog.close();
    dialog.showModal();
    return true;
  } catch (_) {
    return false;
  }
}
