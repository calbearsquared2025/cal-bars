import { CGB_ACCOUNTS_CONFIG } from './accounts-config.mjs';
import { accountsConfigIsReady } from './accounts-core.mjs';

const STYLE_ATTR = 'data-cgb-my-cgb-render-controller-style';
const FAN_INTENT_READY_TIMEOUT_MS = 4000;
let generation = 0;
let preparedSignedInSession = false;
let signedInSessionActive = false;

function enabled() {
  return accountsConfigIsReady(CGB_ACCOUNTS_CONFIG);
}

function injectStyles() {
  if (document.querySelector(`link[${STYLE_ATTR}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/my-cgb-render-controller.css';
  link.setAttribute(STYLE_ATTR, 'true');
  document.head.append(link);
}

function accountShell() {
  return document.querySelector('.accounts-shell');
}

function signedInSurface() {
  return document.querySelector('.accounts-signed-in');
}

function signedOutSurface() {
  return document.querySelector('.accounts-signed-out');
}

function fanIntentReady() {
  return Boolean(window.CGBApp?.getState?.()?.fanIntent?.browserId);
}

function waitForFanIntentReady() {
  if (fanIntentReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ready) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('cgb:fan-intent-ready', handleReady);
      resolve(ready);
    };
    const handleReady = () => finish(true);
    const timer = window.setTimeout(() => finish(fanIntentReady()), FAN_INTENT_READY_TIMEOUT_MS);
    window.addEventListener('cgb:fan-intent-ready', handleReady, { once: true });
  });
}

function ensureBootstrapStatus(shell) {
  let status = shell?.querySelector('.my-cgb-bootstrap-status');
  if (status || !shell) return status;
  status = document.createElement('p');
  status.className = 'my-cgb-bootstrap-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading My CGB…';
  status.hidden = true;
  shell.querySelector('.accounts-status')?.insertAdjacentElement('afterend', status);
  return status;
}

function ensureFixedSignedInStructure() {
  const surface = signedInSurface();
  const identity = surface?.querySelector('.accounts-identity');
  if (!surface || !identity) return false;

  let summary = surface.querySelector('.accounts-profile-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'accounts-profile-summary';
    summary.setAttribute('aria-label', 'Profile and attendance privacy');
  }
  if (identity.nextElementSibling !== summary) identity.insertAdjacentElement('afterend', summary);

  let season = surface.querySelector('.accounts-season');
  if (!season) {
    season = document.createElement('section');
    season.className = 'accounts-section accounts-season';
    season.setAttribute('aria-labelledby', 'accounts-season-title');
    season.innerHTML = `
      <div class="accounts-section__heading">
        <div>
          <span class="eyebrow">Your season</span>
          <h3 id="accounts-season-title">CGB Season</h3>
        </div>
      </div>
      <div class="accounts-season-content">
        <p class="accounts-empty" data-season-loading="true">Loading your season…</p>
      </div>`;
  }
  if (summary.nextElementSibling !== season) summary.insertAdjacentElement('afterend', season);
  return true;
}

function setPending(pending) {
  const shell = accountShell();
  const signedIn = signedInSurface();
  const signedOut = signedOutSurface();
  if (!shell || !signedIn || !signedOut) return;
  const status = ensureBootstrapStatus(shell);

  if (pending) {
    shell.dataset.myCgbPending = 'true';
    signedIn.hidden = true;
    signedOut.hidden = true;
    if (status) status.hidden = false;
    return;
  }

  shell.removeAttribute('data-my-cgb-pending');
  if (status) status.hidden = true;
  signedIn.hidden = !signedInSessionActive;
  signedOut.hidden = signedInSessionActive;
}

function accountStateStillCurrent(runGeneration) {
  return runGeneration === generation &&
    signedInSessionActive &&
    window.CGBAccounts?.isSignedIn?.() === true;
}

async function prepareAccountExtras(runGeneration) {
  try {
    await waitForFanIntentReady();
    if (!accountStateStillCurrent(runGeneration)) return;
    const attendanceResponse = await window.CGBAccountAttendance?.sync?.();
    if (!accountStateStillCurrent(runGeneration)) return;
    const hydrated = window.CGBAccountHistory?.acceptAttendanceResponse?.(attendanceResponse);
    if (!hydrated) await window.CGBAccountHistory?.refresh?.({ force: true });
    if (!accountStateStillCurrent(runGeneration)) return;
    window.CGBAccountProfilePolish?.sync?.();
  } catch (error) {
    if (!accountStateStillCurrent(runGeneration)) return;
    console.error('CGB My CGB background preparation failed.', error);
  }
}

function prepareSignedIn(profile) {
  signedInSessionActive = true;
  window.CGBAccountProfilePolish?.setProfile?.(profile || null);
  ensureFixedSignedInStructure();

  if (preparedSignedInSession) {
    window.CGBAccountProfilePolish?.sync?.();
    setPending(false);
    return;
  }

  const runGeneration = ++generation;
  setPending(true);
  window.CGBAccountHistory?.setAccountState?.(true);
  window.CGBAccountHistory?.render?.();
  window.CGBAccountProfilePolish?.sync?.();

  preparedSignedInSession = true;
  setPending(false);
  void prepareAccountExtras(runGeneration);
}

function handleAccountState(event) {
  const signedIn = event?.detail?.signedIn === true;
  const profile = signedIn ? event.detail?.profile || null : null;

  if (signedIn) {
    prepareSignedIn(profile);
    return;
  }

  generation += 1;
  signedInSessionActive = false;
  preparedSignedInSession = false;
  window.CGBAccountHistory?.setAccountState?.(false);
  window.CGBAccountProfilePolish?.setProfile?.(null);
  setPending(false);
}

export function initializeMyCgbRenderController() {
  if (!enabled()) return false;
  injectStyles();
  ensureFixedSignedInStructure();
  setPending(true);
  window.addEventListener('cgb:account-state', handleAccountState);

  if (window.CGBAccounts?.isSignedIn?.()) {
    prepareSignedIn(window.CGBAccounts.getProfile?.() || null);
  }
  return true;
}

window.CGBMyCgbRenderController = Object.freeze({
  syncStructure: ensureFixedSignedInStructure,
  isReady: () => preparedSignedInSession
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMyCgbRenderController, { once: true });
} else {
  initializeMyCgbRenderController();
}
