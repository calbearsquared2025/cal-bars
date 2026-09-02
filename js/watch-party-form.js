import { initializeCalBarNominationEntry } from './cal-bar-nomination.js';
import { syncDesktopProfileFinalBalance } from './desktop-profile-final-balance.mjs';
import { initializeListingUpdateEntry } from './listing-update.js';
import { initializePhotoFormEntry } from './photo-form.js';
import './external-watch-party-cta.js';
import { getWatchParty } from './core.mjs';
import {
  buildWatchPartyPrefillUrl,
  resolveWatchPartyFormContext
} from './watch-party-form-core.mjs';
import {
  WATCH_PARTY_ATTENDANCE_CHOICES,
  closeWaitingFormWindow,
  navigateWaitingFormWindow,
  requestWatchPartyAttendance
} from './watch-party-attendance-handoff.mjs';

const CTA_SELECTOR = '[data-watch-party-form-entry-point]';
const SECTION_SELECTOR = '[data-watch-party-form-section]';
const CONFIG_META_NAMES = Object.freeze({
  formUrl: 'cgb-watch-party-form-url',
  venueIdEntry: 'cgb-watch-party-venue-id-entry',
  venueNameEntry: 'cgb-watch-party-venue-name-entry',
  gameIdEntry: 'cgb-watch-party-game-id-entry'
});

function metaContent(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

export function readWatchPartyFormConfig(documentObject = document) {
  return {
    formUrl: metaContent(CONFIG_META_NAMES.formUrl, documentObject),
    venueIdEntry: metaContent(CONFIG_META_NAMES.venueIdEntry, documentObject),
    venueNameEntry: metaContent(CONFIG_META_NAMES.venueNameEntry, documentObject),
    gameIdEntry: metaContent(CONFIG_META_NAMES.gameIdEntry, documentObject)
  };
}

function removeExistingEntryPoint(detail) {
  detail.querySelector(SECTION_SELECTOR)?.remove();
  detail.querySelector(CTA_SELECTOR)?.remove();
  detail.querySelector('.preview-note')?.remove();
}

function syncDetailContributionVisibility(detail) {
  const section = detail.querySelector(':scope > .detail-contribution');
  if (section) section.hidden = !section.querySelector('.detail-contribution__actions > a[href]');
}

function createWatchPartySection(documentObject, { href, onActivate }) {
  const section = documentObject.createElement('section');
  section.className = 'detail-watch-party-cta';
  section.dataset.watchPartyFormSection = 'true';

  const title = documentObject.createElement('strong');
  title.className = 'detail-watch-party-cta__title';
  title.textContent = 'Watch Party';

  const prompt = documentObject.createElement('p');
  prompt.className = 'detail-watch-party-cta__prompt';
  prompt.textContent = 'No Watch Party listed for this game. Organizing one or know of one? Add it so other Bears can find it.';

  const link = documentObject.createElement('a');
  link.className = 'detail-watch-party-cta__action';
  link.dataset.watchPartyFormEntryPoint = 'true';
  link.dataset.cgbFormTitle = 'Add a Watch Party';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Add a Watch Party';
  link.addEventListener('click', onActivate);

  section.append(title, prompt, link);
  return section;
}

function createAdditionalWatchPartyAction(documentObject, { href, onActivate }) {
  const link = documentObject.createElement('a');
  link.className = 'detail-contribution__action';
  link.dataset.watchPartyFormEntryPoint = 'true';
  link.dataset.cgbFormTitle = 'Add a Watch Party';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Add another Watch Party';
  link.addEventListener('click', onActivate);
  return link;
}

async function launchWatchPartyForm({
  app,
  context,
  href,
  documentObject,
  windowObject
}) {
  const handoff = await requestWatchPartyAttendance({
    documentObject,
    windowObject,
    reserveWindow: false
  });
  if (!handoff) return false;

  if (handoff.choice === WATCH_PARTY_ATTENDANCE_CHOICES.attend) {
    const ensureAttendance = windowObject.CGBFanIntent?.ensureAttendance;
    if (typeof ensureAttendance !== 'function') {
      closeWaitingFormWindow(handoff.windowRef);
      app?.showStatus?.('Attendance is temporarily unavailable. Try again or continue without checking in.', 5000);
      return false;
    }

    const saved = await ensureAttendance(context.venueId, context.gameId);
    if (!saved) {
      closeWaitingFormWindow(handoff.windowRef);
      app?.showStatus?.('Attendance was not saved. Try again or continue without checking in.', 5000);
      return false;
    }
  }

  const opened = windowObject.CGBGoogleFormHost?.open?.(href, {
    title: 'Add a Watch Party'
  }) || navigateWaitingFormWindow(handoff.windowRef, href, windowObject);
  if (!opened) app?.showStatus?.('Could not open the Watch Party form. Try again.', 5000);
  return opened;
}

export function renderWatchPartyFormEntryPoint({
  app = window.CGBApp,
  documentObject = document,
  windowObject = window
} = {}) {
  const detail = documentObject.querySelector('#venue-detail');
  if (!detail) return '';

  removeExistingEntryPoint(detail);

  const state = app?.getState?.();
  const context = resolveWatchPartyFormContext({
    snapshot: state?.snapshot,
    gameId: state?.gameId,
    selectedVenueId: state?.selectedVenueId,
    detailMode: state?.detailMode
  });
  const href = buildWatchPartyPrefillUrl(
    readWatchPartyFormConfig(documentObject),
    context
  );

  if (!href) {
    syncDetailContributionVisibility(detail);
    return '';
  }

  const existingParty = getWatchParty(
    state?.snapshot,
    context?.gameId,
    context?.venueId
  );
  const maintenance = detail.querySelector(':scope > .detail-contribution');
  if (!maintenance) return '';

  const onActivate = (event) => {
    event.preventDefault();
    launchWatchPartyForm({ app, context, href, documentObject, windowObject });
  };

  if (existingParty) {
    const actions = maintenance.querySelector(':scope > .detail-contribution__actions');
    if (!actions) return '';
    const link = createAdditionalWatchPartyAction(documentObject, { href, onActivate });
    const secondAction = actions.children[1] || null;
    actions.insertBefore(link, secondAction);
    maintenance.hidden = false;
  } else {
    const section = createWatchPartySection(documentObject, { href, onActivate });
    maintenance.before(section);
  }

  syncDesktopProfileFinalBalance({ detail, documentObject, windowObject });
  syncDetailContributionVisibility(detail);
  return href;
}

function initializeWatchPartyFormEntryPoint() {
  const app = window.CGBApp;
  if (!app?.subscribe) return;

  // Let the other maintenance-action owners render first so an existing-party action can
  // deterministically occupy the requested second row on every app render.
  initializeCalBarNominationEntry({ app, documentObject: document });
  initializePhotoFormEntry({ app, documentObject: document });
  initializeListingUpdateEntry({ app, documentObject: document });

  const render = () => renderWatchPartyFormEntryPoint({ app, documentObject: document, windowObject: window });
  app.subscribe('rendered', render);
  app.subscribe('ready', render);
  render();
}

initializeWatchPartyFormEntryPoint();
