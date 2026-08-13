import { createIcon } from './icons.mjs';

const STYLE_ID = 'cgb-release-candidate-styles';

function installStyles(root = document) {
  if (root.getElementById(STYLE_ID)) return;
  const style = root.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body[data-view="detail"] .detail-hero .detail-local-map {
      margin-top: 10px !important;
    }

    body[data-view="detail"] .detail-photo-contribution {
      min-height: 32px;
      display: inline-flex;
      align-items: center;
      margin: 3px 0 0;
      padding: 4px 0;
      color: var(--cgb-navy-900);
      background: transparent;
      border: 0;
      font: inherit;
      font-size: var(--text-xs);
      font-weight: 800;
      line-height: 1.2;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
      cursor: pointer;
    }

    body[data-view="detail"] .detail-about {
      margin: 14px 16px 0;
      padding: 0 1px;
    }

    body[data-view="detail"] .detail-about h2 {
      margin: 0 0 5px;
      color: var(--cgb-navy-950);
      font-family: var(--font-display);
      font-size: .78rem;
      font-weight: 800;
      line-height: 1.2;
    }

    body[data-view="detail"] .detail-about__copy {
      margin: 0;
      color: var(--cgb-ink-700);
      font-size: var(--text-sm);
      line-height: 1.48;
    }
  `;
  root.head.append(style);
}

function parsePlannedCount(copy) {
  const raw = String(copy || '').trim();
  const match = raw.match(/^(\d+)\s+Bear(?:s)?\s+planning to watch here/i);
  return { raw, count: match ? Number(match[1]) : 0 };
}

function refineSelectedAttendance(root = document) {
  const element = root.querySelector('#map-view .tray--selected .selected-card .bear-count');
  if (!element) return;
  const source = element.dataset.originalCopy || element.textContent.trim();
  const { raw, count } = parsePlannedCount(source);
  element.dataset.originalCopy = raw;
  element.classList.toggle('bear-count--empty', count === 0);
  element.setAttribute('aria-label', raw || 'No Bears planning to watch here yet. Be the first.');

  const icon = createIcon('users', { className: 'ui-icon bear-count__icon' });
  if (count === 0) {
    const prompt = document.createElement('strong');
    prompt.className = 'bear-count__prompt';
    prompt.textContent = 'Be the first.';
    element.replaceChildren(icon, prompt);
    return;
  }

  const numeral = document.createElement('span');
  numeral.className = 'bear-count__number';
  numeral.textContent = String(count);
  const label = document.createElement('span');
  label.className = 'bear-count__label';
  label.textContent = count === 1 ? 'Bear planning to watch here' : 'Bears planning to watch here';
  element.replaceChildren(icon, numeral, label);
}

function refineDetailAttendance(root = document) {
  const element = root.querySelector('#venue-detail > .activity-card > strong');
  if (!element) return;
  const source = element.dataset.originalCopy || element.textContent.trim();
  const { raw, count } = parsePlannedCount(source);
  element.dataset.originalCopy = raw;
  element.setAttribute('aria-label', raw);
  if (!count) {
    element.textContent = raw;
    return;
  }
  const numeral = document.createElement('span');
  numeral.className = 'bear-count__number';
  numeral.textContent = String(count);
  const label = document.createElement('span');
  label.className = 'bear-count__label';
  label.textContent = count === 1 ? 'Bear planning to watch here' : 'Bears planning to watch here';
  element.replaceChildren(numeral, label);
}

function refineDetailLink(root = document) {
  const link = root.querySelector('#map-view .tray--selected .selected-card .selected-card__details');
  if (!link || /view venue details/i.test(link.textContent)) return;
  const icon = link.querySelector('.ui-icon') || createIcon('details');
  link.replaceChildren(icon, document.createTextNode('View venue details'));
}

function refineDetailPartyOrder(root = document) {
  const detail = root.querySelector('#venue-detail');
  const activity = detail?.querySelector(':scope > .activity-card');
  if (!detail || !activity) return;
  detail.querySelectorAll(':scope > .party-module').forEach((party) => activity.before(party));
}

function refinePhotoContribution(root = document) {
  root.querySelector('.detail-photo-contribution')?.remove();
  const state = window.CGBApp?.getState?.();
  if (!state?.detailMode) return;
  const detail = root.querySelector('#venue-detail');
  const localMap = detail?.querySelector(':scope > .detail-hero > .detail-local-map');
  const source = detail?.querySelector(':scope > .detail-contribution [data-photo-form-entry]');
  if (!localMap || !source) return;

  const venue = state.snapshot?.venues?.find((item) => item.venue_id === state.selectedVenueId);
  const button = root.createElement('button');
  button.type = 'button';
  button.className = 'detail-photo-contribution';
  button.textContent = venue?.photo_url ? 'Add a photo' : 'Add the first photo';
  button.addEventListener('click', () => source.click());
  localMap.after(button);
}

function refine() {
  refineSelectedAttendance();
  refineDetailAttendance();
  refineDetailLink();
  refineDetailPartyOrder();
  refinePhotoContribution();
}

function schedule() {
  requestAnimationFrame(() => requestAnimationFrame(refine));
}

function initialize() {
  installStyles();
  schedule();
  window.setTimeout(schedule, 80);
  window.CGBApp?.subscribe?.('rendered', schedule);
  window.CGBApp?.subscribe?.('ready', schedule);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
