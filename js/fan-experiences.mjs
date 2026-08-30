import { FAN_EXPERIENCE_FORM_CONFIG } from './fan-experience-form-config.mjs';
import {
  buildFanExperienceFormPrefillUrl,
  resolveFanExperienceVenue
} from './fan-experience-form-core.mjs';

const SECTION_SELECTOR = '[data-fan-experiences]';
const VENUE_TAG_ORDER = Object.freeze([
  '21_plus', 'audio_on', 'food', 'cal_beer', 'large_crowd', 'cal_memorabilia'
]);
const VENUE_TAG_LABELS = Object.freeze({
  '21_plus': '21+',
  audio_on: 'AUDIO ON',
  food: 'FOOD',
  cal_beer: 'CAL BEER',
  large_crowd: 'LARGE CROWD',
  cal_memorabilia: 'CAL MEMORABILIA'
});

function clean(value) {
  return String(value ?? '').trim();
}

function fanExperienceYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

function meta(name, documentObject = document) {
  return documentObject.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
}

function controlledTagValues(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  const raw = clean(value);
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(clean).filter(Boolean);
    } catch (_) {}
  }
  return raw.split(/[|;,\n]+/).map(clean).filter(Boolean);
}

export function venueTagsForVenue(venue = {}) {
  const selected = new Set(controlledTagValues(venue.venue_tags).map((tag) => tag.toLowerCase()));
  return VENUE_TAG_ORDER
    .filter((tag) => selected.has(tag))
    .map((tag) => Object.freeze({ value: tag, label: VENUE_TAG_LABELS[tag] }));
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
      text: clean(item.text),
      display_name: clean(item.display_name),
      year: fanExperienceYear(item.year)
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
  link.textContent = 'Add your experience';
  return link;
}

function createVenueTagList(documentObject, tags) {
  if (!tags.length) return null;
  const list = documentObject.createElement('div');
  list.className = 'detail-fan-experiences__tags';
  list.dataset.venueTags = 'true';
  list.setAttribute('aria-label', 'Community venue details');
  Object.assign(list.style, {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '5px',
    margin: '0 0 12px'
  });

  tags.forEach((item) => {
    const tag = documentObject.createElement('span');
    tag.className = 'detail-fan-experiences__tag';
    tag.dataset.venueTag = item.value;
    tag.textContent = item.label;
    Object.assign(tag.style, {
      minHeight: '22px',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      color: 'var(--cgb-navy-900)',
      background: 'var(--cgb-gold-50)',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-ui)',
      fontSize: '.64rem',
      fontWeight: '700',
      lineHeight: '1.1'
    });
    list.append(tag);
  });
  return list;
}

function createQuote(documentObject, item) {
  const experience = documentObject.createElement('article');
  experience.className = 'detail-fan-experiences__item';

  const quoteRow = documentObject.createElement('div');
  quoteRow.className = 'detail-fan-experiences__quote-row';
  const mark = documentObject.createElement('span');
  mark.className = 'detail-fan-experiences__mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '“';
  const quote = documentObject.createElement('p');
  quote.className = 'detail-fan-experiences__quote';
  quote.textContent = item.text;
  quoteRow.append(mark, quote);

  experience.append(quoteRow);

  if (item.display_name || item.year) {
    const attribution = documentObject.createElement('p');
    attribution.className = 'detail-fan-experiences__attribution';
    if (item.display_name) {
      const name = documentObject.createElement('strong');
      name.className = 'detail-fan-experiences__name';
      name.textContent = item.display_name;
      attribution.append(name);
    }
    if (item.year) {
      if (item.display_name) attribution.append(documentObject.createTextNode(' · '));
      const year = documentObject.createElement('span');
      year.className = 'detail-fan-experiences__year';
      year.textContent = String(item.year);
      attribution.append(year);
    }
    experience.append(attribution);
  }

  return experience;
}

function placeSection(detail, section) {
  const hero = detail.querySelector(':scope > .detail-hero');
  const editorial = detail.querySelector(':scope > .detail-editorial');

  if (editorial) {
    editorial.after(section);
    return;
  }
  if (hero) hero.after(section);
  else detail.prepend(section);
}

export function renderFanExperiences({ app = window.CGBApp, documentObject = document } = {}) {
  documentObject.querySelectorAll(SECTION_SELECTOR).forEach((section) => section.remove());
  const detail = documentObject.querySelector('#venue-detail');
  const state = app?.getState?.();
  if (!detail || !state?.detailMode) return null;

  const venueContext = resolveFanExperienceVenue(state.snapshot, state.selectedVenueId);
  if (!venueContext) return null;
  const venue = state.snapshot?.venues?.find((item) => clean(item?.venue_id) === venueContext.venueId) || {};
  const venueTags = venueTagsForVenue(venue);
  const experiences = fanExperiencesForVenue(state.snapshot, venueContext.venueId);
  const href = buildFanExperienceFormPrefillUrl(readFanExperienceFormConfig(documentObject), venueContext);
  const section = documentObject.createElement('section');
  section.className = 'detail-fan-experiences';
  section.dataset.fanExperiences = 'true';
  section.dataset.experienceCount = String(experiences.length);
  section.dataset.venueTagCount = String(venueTags.length);

  const heading = documentObject.createElement('h2');
  heading.textContent = 'BEARS SAY';
  section.append(heading);

  const tagList = createVenueTagList(documentObject, venueTags);
  if (tagList) section.append(tagList);

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