const TRIGGER_SELECTOR = 'a[href]';
const GOOGLE_FORMS_HOST = 'docs.google.com';
const GOOGLE_FORMS_PATH_PREFIX = '/forms/';
const STYLESHEET_PATH = 'css/missing-location-embed.css';
const DEFAULT_TITLE = 'Contribute to Cal Golden Bars';
let hostState = null;

export function buildEmbeddedGoogleFormUrl(href) {
  try {
    const url = new URL(String(href || '').trim());
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== GOOGLE_FORMS_HOST ||
      !url.pathname.startsWith(GOOGLE_FORMS_PATH_PREFIX) ||
      !url.pathname.endsWith('/viewform')
    ) {
      return '';
    }
    url.searchParams.set('embedded', 'true');
    return url.toString();
  } catch (_) {
    return '';
  }
}

function formTitleForTrigger(trigger) {
  const explicit = String(trigger?.dataset?.cgbFormTitle || '').trim();
  if (explicit) return explicit;
  if (trigger?.matches?.('.missing-location-link, #add-missing-location-link')) {
    return 'Suggest a missing location';
  }
  if (trigger?.matches?.('[data-watch-party-form-entry-point], [data-external-watch-party-form-retry] a')) {
    return 'Add a Watch Party';
  }
  return String(trigger?.textContent || '').trim().replace(/!$/, '') || DEFAULT_TITLE;
}

function ensureStylesheet(documentObject = document) {
  if (documentObject.querySelector(`link[href="${STYLESHEET_PATH}"]`)) return;
  const link = documentObject.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLESHEET_PATH;
  documentObject.head.append(link);
}

function createDialog(documentObject = document) {
  const dialog = documentObject.createElement('dialog');
  dialog.id = 'missing-location-form-dialog';
  dialog.className = 'missing-location-form-dialog';
  dialog.setAttribute('aria-labelledby', 'missing-location-form-title');
  dialog.innerHTML = `
    <div class="missing-location-form-shell">
      <header class="missing-location-form-header">
        <div>
          <span class="eyebrow">Contribute</span>
          <h2 id="missing-location-form-title">${DEFAULT_TITLE}</h2>
        </div>
        <button class="missing-location-form-close" type="button" aria-label="Close form">Close</button>
      </header>
      <iframe
        class="missing-location-form-frame"
        title="${DEFAULT_TITLE}"
        loading="eager"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
      <p class="missing-location-form-fallback">Having trouble with the embedded form? <a target="_blank" rel="noopener noreferrer">Open it in Google Forms</a>.</p>
    </div>
  `;
  documentObject.body.append(dialog);
  return dialog;
}

function modifiedClick(event) {
  return (typeof event.button === 'number' && event.button !== 0) ||
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function ensureHost({ documentObject = document, windowObject = window } = {}) {
  if (!documentObject?.body || !windowObject?.HTMLDialogElement) return null;
  if (hostState?.documentObject === documentObject) return hostState;

  ensureStylesheet(documentObject);
  const dialog = createDialog(documentObject);
  const state = {
    documentObject,
    dialog,
    frame: dialog.querySelector('.missing-location-form-frame'),
    fallback: dialog.querySelector('.missing-location-form-fallback a'),
    closeButton: dialog.querySelector('.missing-location-form-close'),
    title: dialog.querySelector('#missing-location-form-title'),
    activeTrigger: null
  };

  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };

  state.closeButton.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    state.frame.removeAttribute('src');
    state.activeTrigger?.focus?.({ preventScroll: true });
    state.activeTrigger = null;
  });

  hostState = state;
  return state;
}

export function openGoogleForm(href, {
  title = '',
  trigger = null,
  documentObject = document,
  windowObject = window
} = {}) {
  const embeddedUrl = buildEmbeddedGoogleFormUrl(href);
  if (!embeddedUrl) return false;
  const state = ensureHost({ documentObject, windowObject });
  if (!state) return false;

  const resolvedTitle = String(title || '').trim() || formTitleForTrigger(trigger);
  state.activeTrigger = trigger;
  state.title.textContent = resolvedTitle;
  state.frame.title = resolvedTitle;
  state.frame.src = embeddedUrl;
  state.fallback.href = href;
  if (!state.dialog.open) state.dialog.showModal();
  windowObject.gtag?.('event', 'google_form_opened', {
    presentation: 'embedded',
    form_title: resolvedTitle
  });
  return true;
}

export function initializeGoogleFormEmbed({
  documentObject = document,
  windowObject = window
} = {}) {
  const state = ensureHost({ documentObject, windowObject });
  if (!state) return false;
  if (documentObject.documentElement.dataset.googleFormEmbedInitialized === 'true') return true;
  documentObject.documentElement.dataset.googleFormEmbedInitialized = 'true';

  documentObject.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    const trigger = event.target.closest?.(TRIGGER_SELECTOR);
    if (!trigger || modifiedClick(event)) return;
    const href = trigger.href || trigger.getAttribute('href') || '';
    if (!buildEmbeddedGoogleFormUrl(href)) return;
    if (!openGoogleForm(href, { trigger, documentObject, windowObject })) return;
    event.preventDefault();
  });

  windowObject.CGBGoogleFormHost = Object.freeze({
    open(href, options = {}) {
      return openGoogleForm(href, { ...options, documentObject, windowObject });
    }
  });
  return true;
}

export const initializeMissingLocationEmbed = initializeGoogleFormEmbed;

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeGoogleFormEmbed(), { once: true });
  } else {
    initializeGoogleFormEmbed();
  }
}
