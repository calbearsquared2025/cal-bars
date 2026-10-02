import { initializeCalBarNominationEntry } from './cal-bar-nomination.js';
import { initializeListingUpdateEntry } from './listing-update.js';
import { initializePhotoFormEntry } from './photo-form.js';
import './external-watch-party-cta.js';
import { getWatchParty } from './core.mjs';
import {
  buildWatchPartyFormGameLabel,
  buildWatchPartyPrefillUrl,
  resolveWatchPartyFormContext
} from './watch-party-form-core.mjs';
import { readRuntimeConfig } from './config.mjs';

const CTA_SELECTOR = '[data-watch-party-form-entry-point]';
const SECTION_SELECTOR = '[data-watch-party-form-section]';
export function readWatchPartyFormConfig(documentObject = document) {
  return readRuntimeConfig({ documentObject }).forms.watchParty;
}

function nativeWatchPartyContext(app, documentObject = document, { allowSelectedTray = false } = {}) {
  const state = app?.getState?.();
  const context = resolveWatchPartyFormContext({
    snapshot: state?.snapshot,
    gameId: state?.gameId,
    selectedVenueId: state?.selectedVenueId,
    detailMode: allowSelectedTray ? true : state?.detailMode
  });
  if (!context) return { context: null, href: '' };
  const selectedGame = state?.snapshot?.games?.find((game) => game?.game_id === context.gameId) || null;
  const selectedSeason = selectedGame?.season;
  const availableGames = (state?.snapshot?.games || [])
    .filter((game) =>
      String(game?.game_status || '').toLowerCase() === 'upcoming' &&
      (selectedSeason === undefined || selectedSeason === null || game?.season === selectedSeason)
    )
    .map((game) => ({
      gameId: String(game?.game_id || '').trim(),
      gameLabel: buildWatchPartyFormGameLabel(game),
      scheduleOrder: Number(game?.schedule_order || 0),
      gameDate: String(game?.game_date || '')
    }))
    .filter((game) => game.gameId && game.gameLabel)
    .sort((a, b) => a.scheduleOrder - b.scheduleOrder || a.gameDate.localeCompare(b.gameDate));

  const nativeContext = Object.freeze({
    ...context,
    availableGames: Object.freeze(availableGames.map(({ gameId, gameLabel }) => Object.freeze({ gameId, gameLabel })))
  });
  const href = buildWatchPartyPrefillUrl(
    readWatchPartyFormConfig(documentObject),
    context
  );
  return { context: nativeContext, href };
}

export async function openSelectedWatchPartyForm({
  app = window.CGBApp,
  documentObject = document,
  windowObject = window
} = {}) {
  const { context, href } = nativeWatchPartyContext(app, documentObject, { allowSelectedTray: true });
  if (!context) return false;
  return launchWatchPartyForm({ app, context, href, windowObject });
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

  const promptLead = documentObject.createElement('span');
  promptLead.className = 'detail-watch-party-cta__prompt-lead';
  promptLead.textContent = 'No Watch Party listed for this game. Organizing or know of one?';

  const promptTail = documentObject.createElement('span');
  promptTail.className = 'detail-watch-party-cta__prompt-tail';
  promptTail.textContent = 'so other Bears can find it.';

  const link = documentObject.createElement('a');
  link.className = 'detail-watch-party-cta__action';
  link.dataset.watchPartyFormEntryPoint = 'true';
  link.dataset.cgbFormTitle = 'Add a Watch Party';
  link.href = href || '#';
  if (href) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  link.setAttribute('aria-label', 'Add a Watch Party');

  const desktopLabel = documentObject.createElement('span');
  desktopLabel.className = 'detail-watch-party-cta__action-label detail-watch-party-cta__action-label--desktop';
  desktopLabel.textContent = 'Add it';

  const mobileLabel = documentObject.createElement('span');
  mobileLabel.className = 'detail-watch-party-cta__action-label detail-watch-party-cta__action-label--mobile';
  mobileLabel.textContent = 'Add a Watch Party';

  link.append(desktopLabel, mobileLabel);
  link.addEventListener('click', onActivate);
  prompt.append(promptLead, link, promptTail);

  section.append(title, prompt);
  return section;
}

function createAdditionalWatchPartyAction(documentObject, { href, onActivate }) {
  const link = documentObject.createElement('a');
  link.className = 'detail-contribution__action';
  link.dataset.watchPartyFormEntryPoint = 'true';
  link.dataset.cgbFormTitle = 'Add a Watch Party';
  link.href = href || '#';
  if (href) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  link.textContent = 'Add another Watch Party';
  link.addEventListener('click', onActivate);
  return link;
}

async function launchWatchPartyForm({
  app,
  context,
  href,
  windowObject
}) {
  try {
    const module = await import('./watch-party-create.mjs');
    const opened = module.openNativeWatchPartyForm({
      context,
      fallbackUrl: href
    });
    if (!opened) throw new Error('native_watch_party_unavailable');
    return true;
  } catch (error) {
    console.error('Native Watch Party form failed to open.', error);
    if (href) {
      const opened = windowObject.CGBGoogleFormHost?.open?.(href, {
        title: 'Add a Watch Party'
      }) || Boolean(windowObject.open?.(href, '_blank', 'noopener,noreferrer'));
      if (opened) return true;
    }
    app?.showStatus?.('Could not open the Watch Party form. Try again.', 5000);
    return false;
  }
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

  if (!context) {
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
    const live = nativeWatchPartyContext(app, documentObject);
    launchWatchPartyForm({
      app,
      context: live.context || context,
      href: live.href || href,
      windowObject
    });
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
