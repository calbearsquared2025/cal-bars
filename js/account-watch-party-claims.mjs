import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import {
  accountsConfigIsReady,
  fanErrorCopy,
  validateFanWatchPartyClaimResponse
} from './accounts-core.mjs';
import { appState, subscribeAppEvent } from './app-state.mjs';

let accountSignedIn = false;
let renderRevision = 0;
let dialog = null;
let dialogContext = null;
let partyModuleObserver = null;
let partyModuleRenderQueued = false;

function injectStyles() {
  if (document.querySelector('link[data-cgb-account-contributions-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/account-contributions.css';
  link.dataset.cgbAccountContributionsStyle = 'true';
  document.head.append(link);
}

function clean(value) {
  return String(value ?? '').trim();
}

function selectedWatchParty() {
  if (!appState.snapshot || !appState.gameId || !appState.selectedVenueId) return null;
  return (appState.snapshot.watchParties || []).find((party) =>
    party?.game_id === appState.gameId &&
    party?.venue_id === appState.selectedVenueId &&
    party?.event_status !== 'cancelled' &&
    party?.publication_status !== 'archived'
  ) || null;
}

function selectedVenue() {
  return (appState.snapshot?.venues || []).find((venue) => venue?.venue_id === appState.selectedVenueId) || null;
}

function selectedGame() {
  return (appState.snapshot?.games || []).find((game) => game?.game_id === appState.gameId) || null;
}

function claimTarget(context) {
  return [...document.querySelectorAll('.party-module[data-watch-party-id]')]
    .find((module) => module.dataset.watchPartyId === context?.watchPartyId) || null;
}

function clearClaimUi() {
  document.querySelectorAll('[data-account-watch-party-claim]').forEach((node) => node.remove());
}

function makeClaimButton(label, context, { disabled = false } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'account-watch-party-claim';
  button.dataset.accountWatchPartyClaim = context.watchPartyId;
  button.textContent = label;
  button.disabled = disabled;
  return button;
}

function makeClaimStatus(label, context) {
  const status = document.createElement('span');
  status.dataset.accountWatchPartyClaim = context.watchPartyId;
  status.className = 'account-watch-party-claim-status';
  status.textContent = label;
  return status;
}

function claimContext() {
  const party = selectedWatchParty();
  const venue = selectedVenue();
  const game = selectedGame();
  if (!party || !venue || !game) return null;
  return Object.freeze({
    watchPartyId: clean(party.watch_party_id),
    venueName: clean(venue.name),
    opponentName: clean(game.opponent_name),
    organizerName: clean(party.organizer_name)
  });
}

function renderSignedOutClaim(context, target) {
  const button = makeClaimButton('Claim this Watch Party', context);
  button.addEventListener('click', () => {
    document.querySelector('#cgb-account-button')?.click();
  });
  target.append(button);
}

function renderState(context, target, state) {
  if (state.managementRole === 'owner' || state.managementRole === 'manager') {
    target.append(makeClaimStatus('You manage this Watch Party.', context));
    return;
  }
  if (state.claimStatus === 'pending') {
    target.append(makeClaimStatus('Your claim is pending review.', context));
    return;
  }
  const button = makeClaimButton('Claim this Watch Party', context);
  button.addEventListener('click', () => openClaimDialog(context));
  target.append(button);
}

function nodeContainsPartyModule(node) {
  if (node?.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.matches?.('.party-module[data-watch-party-id]')) return true;
  return Boolean(node.querySelector?.('.party-module[data-watch-party-id]'));
}

function queueClaimRender() {
  if (partyModuleRenderQueued) return;
  partyModuleRenderQueued = true;
  queueMicrotask(() => {
    partyModuleRenderQueued = false;
    void renderClaimUi();
  });
}

function observePartyModuleReplacement() {
  if (partyModuleObserver || !document.body) return;
  partyModuleObserver = new MutationObserver((mutations) => {
    const partyModuleAdded = mutations.some((mutation) =>
      [...mutation.addedNodes].some(nodeContainsPartyModule));
    if (partyModuleAdded) queueClaimRender();
  });
  partyModuleObserver.observe(document.body, { childList: true, subtree: true });
}

async function renderClaimUi() {
  const revision = ++renderRevision;
  clearClaimUi();
  const context = claimContext();
  const target = claimTarget(context);
  if (!context || !target || !context.watchPartyId) return;

  if (!accountSignedIn || !window.CGBAccounts?.isSignedIn?.()) {
    renderSignedOutClaim(context, target);
    return;
  }

  const loading = makeClaimButton('Checking claim status…', context, { disabled: true });
  target.append(loading);
  try {
    const payload = await window.CGBAccounts.request('getFanWatchPartyClaimState', {
      watchPartyId: context.watchPartyId
    });
    if (revision !== renderRevision || claimContext()?.watchPartyId !== context.watchPartyId) return;
    if (payload?.ok !== true) throw new Error(payload?.error || 'fan_backend_unavailable');
    const state = validateFanWatchPartyClaimResponse(payload);
    if (!state) throw new Error('fan_backend_unavailable');
    const liveTarget = claimTarget(context);
    if (!liveTarget) return;
    clearClaimUi();
    renderState(context, liveTarget, state);
  } catch (_) {
    if (revision !== renderRevision || claimContext()?.watchPartyId !== context.watchPartyId) return;
    const liveTarget = claimTarget(context);
    if (!liveTarget) return;
    clearClaimUi();
    const retry = makeClaimButton('Claim this Watch Party', context);
    retry.addEventListener('click', () => openClaimDialog(context), { once: true });
    liveTarget.append(retry);
  }
}

function buildDialog() {
  const element = document.createElement('dialog');
  element.className = 'account-contribution-dialog';
  element.setAttribute('aria-labelledby', 'cgb-watch-party-claim-title');
  element.innerHTML = `
    <div class="account-contribution-shell">
      <header class="account-contribution-header">
        <div>
          <span class="eyebrow">Watch Party</span>
          <h2 id="cgb-watch-party-claim-title">Claim this Watch Party</h2>
          <p class="account-contribution-context"></p>
        </div>
        <button type="button" class="icon-button" data-claim-close aria-label="Close">×</button>
      </header>
      <form class="account-contribution-form" data-watch-party-claim-form>
        <label class="account-contribution-field">
          <span class="account-contribution-label">Who are you?</span>
          <input name="claimantName" type="text" maxlength="120" required autocomplete="name" placeholder="Your name or role">
        </label>
        <label class="account-contribution-field">
          <span class="account-contribution-label">What is your relationship to this Watch Party?</span>
          <select name="relationship" required>
            <option value="">Choose one</option>
            <option value="organizer">Organizer / host</option>
            <option value="alumni_group_representative">Alumni group / organization representative</option>
            <option value="venue_representative">Venue owner / manager / representative</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label class="account-contribution-field">
          <span class="account-contribution-label">Anything we should know? <small>optional</small></span>
          <textarea name="explanation" maxlength="1200" rows="4" placeholder="Briefly explain your connection to the event."></textarea>
        </label>
        <label class="account-contribution-field">
          <span class="account-contribution-label">Supporting link <small>optional</small></span>
          <input name="supportingUrl" type="url" maxlength="2048" inputmode="url" placeholder="https://…">
        </label>
        <p class="account-contribution-note">CGB attaches your signed-in account and verified email privately so the claim can be reviewed. They are not added to the public Watch Party listing.</p>
        <p class="account-contribution-note" data-claim-status role="status" aria-live="polite"></p>
        <button class="primary-button account-contribution-submit" type="submit">Submit claim</button>
      </form>
    </div>`;
  element.querySelector('[data-claim-close]')?.addEventListener('click', () => element.close());
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  element.querySelector('[data-watch-party-claim-form]')?.addEventListener('submit', handleClaimSubmit);
  document.body.append(element);
  return element;
}

function openClaimDialog(context) {
  if (!window.CGBAccounts?.isSignedIn?.()) {
    document.querySelector('#cgb-account-button')?.click();
    return;
  }
  dialog ||= buildDialog();
  dialogContext = context;
  const contextNode = dialog.querySelector('.account-contribution-context');
  contextNode.textContent = [
    context.venueName,
    context.opponentName ? `vs. ${context.opponentName}` : '',
    context.organizerName ? `Hosted by ${context.organizerName}` : ''
  ].filter(Boolean).join(' · ');
  const form = dialog.querySelector('[data-watch-party-claim-form]');
  form.reset();
  const profileName = clean(window.CGBAccounts?.getProfile?.()?.displayName);
  if (profileName && profileName !== 'Bear') form.elements.claimantName.value = profileName;
  dialog.querySelector('[data-claim-status]').textContent = '';
  dialog.showModal();
  form.elements.claimantName.focus();
}

async function handleClaimSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  const status = form.querySelector('[data-claim-status]');
  const context = dialogContext;
  if (!context || !window.CGBAccounts?.isSignedIn?.()) return;
  submit.disabled = true;
  status.textContent = 'Submitting claim…';
  try {
    const data = new FormData(form);
    const payload = await window.CGBAccounts.request('submitFanWatchPartyClaim', {
      watchPartyId: context.watchPartyId,
      claimantName: clean(data.get('claimantName')),
      relationship: clean(data.get('relationship')),
      explanation: clean(data.get('explanation')),
      supportingUrl: clean(data.get('supportingUrl'))
    });
    if (payload?.ok !== true) throw new Error(payload?.error || 'fan_backend_unavailable');
    const result = validateFanWatchPartyClaimResponse(payload);
    if (!result || result.claimStatus !== 'pending') throw new Error('fan_backend_unavailable');
    status.textContent = 'Claim submitted for review.';
    window.setTimeout(() => {
      if (dialog?.open) dialog.close();
      void renderClaimUi();
    }, 450);
  } catch (error) {
    status.textContent = fanErrorCopy(error?.message || 'fan_backend_unavailable');
  } finally {
    submit.disabled = false;
  }
}

export function initializeAccountWatchPartyClaims() {
  if (!accountsConfigIsReady(CGB_ACCOUNTS_CONFIG)) return false;
  injectStyles();
  observePartyModuleReplacement();
  subscribeAppEvent('rendered', () => { void renderClaimUi(); });
  window.addEventListener('cgb:account-state', (event) => {
    accountSignedIn = event.detail?.signedIn === true;
    void renderClaimUi();
  });
  accountSignedIn = window.CGBAccounts?.isSignedIn?.() === true;
  void renderClaimUi();
  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountWatchPartyClaims, { once: true });
} else {
  initializeAccountWatchPartyClaims();
}
