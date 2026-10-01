import { ACTIVE_INSTANCE_CONFIG } from './instance-config.mjs';

const ABOUT_VARIANTS = new Set(['surface', 'dialog', 'standalone']);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function lowerFirst(value) {
  const text = String(value || '');
  return text ? text[0].toLowerCase() + text.slice(1) : text;
}

function contactHref(instance) {
  const email = String(instance.site.contactEmail || '').trim();
  return email ? `mailto:${email}` : instance.site.support.url;
}

export function aboutHeading(instance = ACTIVE_INSTANCE_CONFIG, variant = 'surface') {
  const heading = instance.site.about.heading;
  return variant === 'surface' ? heading : `About ${heading}`;
}

export function renderAboutContentHtml(
  instance = ACTIVE_INSTANCE_CONFIG,
  { variant = 'surface' } = {}
) {
  if (!ABOUT_VARIANTS.has(variant)) {
    throw new Error(`Unknown About content variant "${variant}".`);
  }

  const about = instance.site.about;
  const productName = instance.identity.productName;
  const productShortName = instance.identity.productShortName;
  const fanPlural = instance.identity.fanPlural;
  const designatedVenuePlural = instance.terminology.designatedVenuePlural;
  const supportLabel = instance.site.support.label;
  const supportAction = `supporting ${productShortName}`;
  const contactLabel = `Contact ${productName}.`;
  const supportContext = lowerFirst(instance.copy.findCrowd);
  const introClass = variant === 'standalone' ? ' class="lead"' : '';
  const contactLink = `<a href="${escapeHtml(contactHref(instance))}">${escapeHtml(contactLabel)}</a>`;
  const contactLine = variant === 'standalone'
    ? `${escapeHtml(about.hostPrompt)} ${contactLink}`
    : `${escapeHtml(about.hostPrompt)}<span class="about-contact-line">${contactLink}</span>`;

  const paragraphs = [
    `<p${introClass}><strong>${escapeHtml(about.intro)}</strong></p>`,
    `<p>Find <strong>${escapeHtml(designatedVenuePlural)}</strong> — ${escapeHtml(about.communityDescription)}</p>`,
    `<p>Planning to watch at your local bar? Mark <strong>“I’ll be here”</strong> so other ${escapeHtml(fanPlural)} know where to find you.</p>`,
    '<p>Organizing a gathering for a specific game? <strong>Add a Watch Party</strong> so fans nearby can join you.</p>',
    `<p>${contactLine}</p>`,
    `<p>${escapeHtml(about.ownerLine)}</p>`
  ];

  if (variant !== 'standalone') {
    paragraphs.push(
      '<div class="about-support">',
      `  <span class="eyebrow">${escapeHtml(supportLabel)}</span>`,
      `  <p>If ${escapeHtml(productName)} has helped you ${escapeHtml(supportContext)}, consider <button class="text-button" type="button" data-support-open>${escapeHtml(supportAction)}</button>.</p>`,
      '</div>'
    );
  }

  if (variant === 'surface') {
    paragraphs.push(
      '<p class="about-privacy-link"><button id="about-privacy-button" class="text-button" type="button" aria-haspopup="dialog" aria-controls="privacy-dialog">Privacy</button></p>'
    );
  }

  return paragraphs.join('\n');
}

export function hydrateAboutContent(
  documentObject = typeof document === 'undefined' ? undefined : document,
  instance = ACTIVE_INSTANCE_CONFIG
) {
  if (!documentObject?.querySelectorAll) return;

  documentObject.querySelectorAll('[data-about-heading]').forEach((node) => {
    const variant = node.dataset.aboutHeading || 'surface';
    node.textContent = aboutHeading(instance, variant);
  });

  documentObject.querySelectorAll('[data-about-content]').forEach((node) => {
    const variant = node.dataset.aboutContent || 'surface';
    node.innerHTML = renderAboutContentHtml(instance, { variant });
  });
}

function sourceAboutContent(documentObject) {
  return documentObject?.querySelector?.('#about-surface .about-surface__content') || null;
}

export function cloneAboutContent(documentObject = document) {
  const source = sourceAboutContent(documentObject);
  if (!source) return null;

  const clone = source.cloneNode(true);
  clone.classList.add('my-cgb-about-content');

  const privacy = clone.querySelector('#about-privacy-button');
  if (privacy) {
    privacy.removeAttribute('id');
    privacy.dataset.myCgbAboutPrivacy = 'true';
  }

  const support = clone.querySelector('[data-support-open]');
  if (support) {
    support.removeAttribute('data-support-open');
    support.dataset.myCgbAboutSupport = 'true';
  }

  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.addEventListener('click', (event) => {
    const privacyTrigger = event.target.closest?.('[data-my-cgb-about-privacy]');
    if (privacyTrigger) {
      event.preventDefault();
      documentObject.querySelector('#about-privacy-button')?.click();
      return;
    }

    const supportTrigger = event.target.closest?.('[data-my-cgb-about-support]');
    if (supportTrigger) {
      event.preventDefault();
      documentObject.querySelector('#about-surface [data-support-open]')?.click();
    }
  });

  return clone;
}

hydrateAboutContent();
