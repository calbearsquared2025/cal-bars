const GOOGLE_FORM_PATH = '/forms/';
const FORM_TITLES = new Map([
  ['cgb-watch-party-form-url', 'Add a Watch Party'],
  ['cgb-cal-bar-nomination-form-url', 'Tell us about this location'],
  ['cgb-listing-update-form-url', 'Add or update location details'],
  ['cgb-watch-party-issue-form-url', 'Add or update Watch Party details']
]);
let host = null;

export function embeddedGoogleFormUrl(href) {
  try {
    const url = new URL(String(href || '').trim());
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' ||
        !url.pathname.startsWith(GOOGLE_FORM_PATH) || !url.pathname.endsWith('/viewform')) return '';
    url.searchParams.set('embedded', 'true');
    return url.toString();
  } catch (_) {
    return '';
  }
}

function titleFor(href, trigger, documentObject) {
  const explicit = String(trigger?.dataset?.cgbFormTitle || '').trim();
  if (explicit) return explicit;
  for (const [metaName, title] of FORM_TITLES) {
    const configured = documentObject.querySelector(`meta[name="${metaName}"]`)?.content?.trim();
    if (!configured) continue;
    try {
      const candidate = new URL(href);
      const known = new URL(configured);
      if (candidate.origin === known.origin && candidate.pathname === known.pathname) return title;
    } catch (_) {}
  }
  return String(trigger?.textContent || '').trim().replace(/!$/, '') || 'Contribute';
}

function ensureHost(documentObject, windowObject) {
  if (host?.documentObject === documentObject) return host;
  if (!documentObject?.body || !windowObject?.HTMLDialogElement) return null;

  if (!documentObject.querySelector('link[href="css/google-form-host.css"]')) {
    const stylesheet = documentObject.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'css/google-form-host.css';
    documentObject.head.append(stylesheet);
  }

  const dialog = documentObject.createElement('dialog');
  dialog.id = 'cgb-google-form-dialog';
  dialog.className = 'cgb-google-form-dialog';
  dialog.setAttribute('aria-labelledby', 'cgb-google-form-title');
  dialog.innerHTML = `
    <div class="cgb-google-form-shell">
      <header class="cgb-google-form-header">
        <div class="cgb-google-form-heading"><span class="eyebrow">Contribute</span><h2 id="cgb-google-form-title">Contribute</h2></div>
        <button class="cgb-google-form-close" type="button" aria-label="Close form"><span class="cgb-google-form-close__glyph" aria-hidden="true">×</span></button>
      </header>
      <iframe class="cgb-google-form-frame" title="Contribute" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <p class="cgb-google-form-fallback">Having trouble with the embedded form? <a data-google-form-external="true" target="_blank" rel="noopener noreferrer">Open it in Google Forms</a>.</p>
    </div>`;
  documentObject.body.append(dialog);

  host = {
    documentObject,
    dialog,
    title: dialog.querySelector('#cgb-google-form-title'),
    frame: dialog.querySelector('.cgb-google-form-frame'),
    close: dialog.querySelector('.cgb-google-form-close'),
    fallback: dialog.querySelector('.cgb-google-form-fallback a'),
    trigger: null
  };

  const close = () => { if (dialog.open) dialog.close(); };
  host.close.addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    host.frame.removeAttribute('src');
    host.trigger?.focus?.({ preventScroll: true });
    host.trigger = null;
  });
  return host;
}

export function openGoogleForm(href, { title = '', trigger = null, documentObject = document, windowObject = window } = {}) {
  const embedded = embeddedGoogleFormUrl(href);
  const state = embedded && ensureHost(documentObject, windowObject);
  if (!state) return false;
  const resolvedTitle = String(title || '').trim() || titleFor(href, trigger, documentObject);
  state.trigger = trigger;
  state.title.textContent = resolvedTitle;
  state.frame.title = resolvedTitle;
  state.frame.src = embedded;
  state.fallback.href = href;
  if (!state.dialog.open) state.dialog.showModal();
  return true;
}

export function initializeGoogleFormHost({ documentObject = document, windowObject = window } = {}) {
  const state = ensureHost(documentObject, windowObject);
  if (!state) return false;
  if (documentObject.documentElement.dataset.googleFormHostInitialized === 'true') return true;
  documentObject.documentElement.dataset.googleFormHostInitialized = 'true';

  documentObject.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const trigger = event.target.closest?.('a[href]');
    if (!trigger || trigger.dataset.googleFormExternal === 'true') return;
    const href = trigger.href || '';
    if (!embeddedGoogleFormUrl(href)) return;
    if (!openGoogleForm(href, { trigger, documentObject, windowObject })) return;
    event.preventDefault();
  });

  windowObject.CGBGoogleFormHost = Object.freeze({
    open(href, options = {}) { return openGoogleForm(href, { ...options, documentObject, windowObject }); },
    close() { if (state.dialog.open) state.dialog.close(); }
  });
  return true;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeGoogleFormHost(), { once: true });
  else initializeGoogleFormHost();
}
