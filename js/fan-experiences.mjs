import { FAN_EXPERIENCE_FORM_CONFIG } from './fan-experience-form-config.mjs';
import {
  buildFanExperienceFormPrefillUrl,
  resolveFanExperienceVenue
} from './fan-experience-form-core.mjs';

const SECTION_SELECTOR = '[data-fan-experiences]';

function clean(value) {
  return String(value ?? '').trim();
}

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

export function readFanExperienceFormConfig(documentObject = document) {
  return {
    formUrl: meta('cgb-fan-experience-form-url', documentObject) || FAN_EXPERIENCE_FORM_CONFIG.formUrl,
    venueIdEntry: meta('cgb-fan-experience-form-venue-id-entry', documentObject) || FAN_EXPERIENCE_FORM_CONFIG.venueIdEntry,
    venueNameEntry: meta('cgb-fan-experience-form-venue-name-entry', documentObject) || FAN_EXPERIENCE_FORM_CONFIG.venueNameEntry
  };
}

export function fanExperiencesForVenue(snapshot, venueId) {
  const resolvedVenueId = clean(venueId);
  const rows = Array.isArray(snapshot?.fanExperiences) ? snapshot.fanExperiences : [];
  return rows
    .filter((item) => clean(item?.venue_id) === resolvedVenueId && clean(item?.text))
    .map((item) => Object.freeze({
      venue_id: resolvedVenueId,
      text: clean(item.text)
    }));
}

export function visibleFanExperiences(experiences, expanded = false) {
  const rows = Array.isArray(experiences) ? experiences : [];
  return expanded ? rows : rows.slice(0, 2);
}

function createShareLink(documentObject, href) {
  if (!href) return null;
  const link = documentObject.createElement('a');
  link.className = 'detail-fan-experiences__share';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Share your experience';
  return link;
}

function createQuote(documentObject, item) {
  const quote = documentObject.createElement('p');
  quote.className = 'detail-fan-experiences__quote';
  quote.textContent = item.text;
  return quote;
}

function placeSection(detail, section) {
  const editorial = detail.querySelector(':scope > .detail-editorial');
  if (editorial) {
    editorial.after(section);
    return;
  }
  const hero = detail.querySelector(':scope > .detail-hero');
  if (hero) hero.after(section);
  else detail.prepend(section);
}

export function renderFanExperiences({ app = window.CGBApp, documentObject = document } = {}) {
  documentObject.querySelectorAll(SECTION_SELECTOR).forEach((section) => section.remove());
  const detail = documentObject.querySelector('#venue-detail');
  const state = app?.getState?.();
  if (!detail || !state?.detailMode) return null;

  const venue = resolveFanExperienceVenue(state.snapshot, state.selectedVenueId);
  if (!venue) return null;

  const experiences = fanExperiencesForVenue(state.snapshot, venue.venueId);
  const href = buildFanExperienceFormPrefillUrl(readFanExperienceFormConfig(documentObject), venue);
  const section = documentObject.createElement('section');
  section.className = 'detail-fan-experiences';
  section.dataset.fanExperiences = 'true';
  section.dataset.experienceCount = String(experiences.length);

  const heading = documentObject.createElement('h2');
  heading.textContent = 'BEARS SAY';
  section.append(heading);

  if (!experiences.length) {
    const prompt = documentObject.createElement('p');
    prompt.className = 'detail-fan-experiences__prompt';
    prompt.textContent = 'Watched a Cal game here?';
    const guidance = documentObject.createElement('p');
    guidance.className = 'detail-fan-experiences__guidance';
    guidance.textContent = 'Tell other Bears what to expect.';
    section.append(prompt, guidance);
    const share = createShareLink(documentObject, href);
    if (share) section.append(share);
    placeSection(detail, section);
    return section;
  }

  const quotes = documentObject.createElement('div');
  quotes.className = 'detail-fan-experiences__quotes';
  section.append(quotes);

  let expanded = false;
  const renderQuotes = () => {
    quotes.replaceChildren(...visibleFanExperiences(experiences, expanded)
      .map((item) => createQuote(documentObject, item)));
  };
  renderQuotes();

  if (experiences.length > 2) {
    const toggle = documentObject.createElement('button');
    toggle.type = 'button';
    toggle.className = 'detail-fan-experiences__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'See all experiences';
    toggle.addEventListener('click', () => {
      expanded = !expanded;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'Show fewer' : 'See all experiences';
      renderQuotes();
    });
    section.append(toggle);
  }

  const share = createShareLink(documentObject, href);
  if (share) section.append(share);
  placeSection(detail, section);
  return section;
}
