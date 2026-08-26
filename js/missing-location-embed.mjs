const TRIGGER_SELECTOR = '.missing-location-link, #add-missing-location-link';
const GOOGLE_FORMS_HOST = 'docs.google.com';
const GOOGLE_FORMS_PATH_PREFIX = '/forms/';
const STYLESHEET_PATH = 'css/missing-location-embed.css';

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
          <h2 id="missing-location-form-title">Suggest a missing location</h2>
        </div>
        <button class="missing-location-form-close" type="button" aria-label="Close missing location form">Close</button>
      </header>
      <iframe
        class="missing-location-form-frame"
        title="Suggest a missing Cal Golden Bars location"
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

export function initializeMissingLocationEmbed({
  documentObject = document,
  windowObject = window
} = {}) {
  if (!documentObject?.body || !windowObject?.HTMLDialogElement) return false;
  if (documentObject.documentElement.dataset.missingLocationEmbedInitialized === 'true') return true;
  documentObject.documentElement.dataset.missingLocationEmbedInitialized = 'true';

  ensureStylesheet(documentObject);
  const dialog = createDialog(documentObject);
  const frame = dialog.querySelector('.missing-location-form-frame');
  const fallback = dialog.querySelector('.missing-location-form-fallback a');
  const closeButton = dialog.querySelector('.missing-location-form-close');
  let activeTrigger = null;

  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };

  closeButton.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    frame.removeAttribute('src');
    activeTrigger?.focus?.({ preventScroll: true });
    activeTrigger = null;
  });

  documentObject.addEventListener('click', (event) => {
    const trigger = event.target.closest?.(TRIGGER_SELECTOR);
    if (!trigger || modifiedClick(event)) return;

    const href = trigger.href || trigger.getAttribute('href') || '';
    const embeddedUrl = buildEmbeddedGoogleFormUrl(href);
    if (!embeddedUrl) return;

    event.preventDefault();
    activeTrigger = trigger;
    frame.src = embeddedUrl;
    fallback.href = href;
    if (!dialog.open) dialog.showModal();
    windowObject.gtag?.('event', 'missing_location_form_opened', { presentation: 'embedded' });
  });

  return true;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeMissingLocationEmbed(), { once: true });
  } else {
    initializeMissingLocationEmbed();
  }
}
