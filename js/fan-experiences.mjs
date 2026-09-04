import { FAN_EXPERIENCE_FORM_CONFIG } from './fan-experience-form-config.mjs';
import {
  buildFanExperienceFormPrefillUrl,
  resolveFanExperienceVenue
} from './fan-experience-form-core.mjs';
import {
  buildCalBarNominationPrefillUrl,
  resolveCalBarNominationVenue
} from './cal-bar-nomination-core.mjs';

const SECTION_SELECTOR = '[data-fan-experiences]';
const MOBILE_WHAT_TO_KNOW_STYLE_ID = 'cgb-mobile-what-to-know';
const VENUE_TAG_ORDER = Object.freeze([
  '21_plus', 'all_ages', 'audio_on', 'food', 'cal_beer', 'large_crowd', 'cal_memorabilia'
]);
const VENUE_TAG_LABELS = Object.freeze({
  '21_plus': '21+',
  all_ages: 'ALL AGES',
  audio_on: 'AUDIO ON',
  food: 'FOOD',
  cal_beer: 'CAL BEER',
  large_crowd: 'LARGE CROWD',
  cal_memorabilia: 'CAL MEMORABILIA'
});

function clean(value) {
  return String(value ?? '').trim();
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

function readVenueContributionConfig(documentObject) {
  return {
    formUrl: meta('cgb-cal-bar-nomination-form-url', documentObject),
    venueIdEntry: meta('cgb-cal-bar-nomination-venue-id-entry', documentObject),
    venueNameEntry: meta('cgb-cal-bar-nomination-venue-name-entry', documentObject)
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
  link.textContent = 'Add your experience';
  return link;
}

function createVenueTagList(documentObject, tags) {
  if (!tags.length) return null;
  const list = documentObject.createElement('div');
  list.className = 'detail-fan-experiences__tags';
  list.dataset.venueTags = 'true';
  list.setAttribute('aria-label', 'Community venue details');

  tags.forEach((item) => {
    const tag = documentObject.createElement('span');
    tag.className = 'detail-fan-experiences__tag';
    tag.dataset.venueTag = item.value;
    tag.textContent = item.label;
    list.append(tag);
  });
  return list;
}

function installMobileWhatToKnowStyles(documentObject) {
  if (!documentObject?.head || documentObject.getElementById?.(MOBILE_WHAT_TO_KNOW_STYLE_ID)) return;
  const style = documentObject.createElement('style');
  style.id = MOBILE_WHAT_TO_KNOW_STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      body[data-view="map"][data-command-surface="map"] #tray-selected > .selected-card > .selected-card__what-to-know {
        margin: 2px 0 12px;
        padding: 0;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected .selected-card__what-to-know-header {
        display: flex;
        align-items: baseline;
        justify-content: flex-start;
        gap: 8px;
        margin: 0;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected .selected-card__what-to-know-title {
        margin: 0;
        color: var(--cgb-ink-500);
        font-family: var(--font-ui);
        font-size: .68rem;
        font-weight: 800;
        letter-spacing: .055em;
        line-height: 1.15;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected .selected-card__what-to-know-link {
        flex: 0 0 auto;
        padding: 0;
        color: var(--cgb-ink-500);
        font-family: var(--font-ui);
        font-size: .62rem;
        font-weight: 700;
        line-height: 1.2;
        text-decoration: none;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected .selected-card__what-to-know-tags {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        margin: 6px 0 0;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected .selected-card__what-to-know-tag {
        min-height: 22px;
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        color: var(--cgb-navy-900);
        background: var(--cgb-gold-50);
        border-radius: var(--radius-pill);
        font-family: var(--font-ui);
        font-size: .64rem;
        font-weight: 700;
        line-height: 1.1;
      }

      body[data-view="map"][data-command-surface="map"] #tray-selected .selected-card__what-to-know-empty {
        margin: 4px 0 0;
        color: var(--cgb-ink-500);
        font-size: .66rem;
        line-height: 1.25;
      }
    }
  `;
  documentObject.head.append(style);
}

function refreshProfileOnReturn(link, documentObject) {
  const windowObject = documentObject?.defaultView || globalThis.window;
  if (!link || !windowObject?.addEventListener) return;
  link.addEventListener('click', () => {
    windowObject.addEventListener('focus', () => {
      windowObject.CGBSnapshotRefresh?.refresh?.();
    }, { once: true });
  });
}

function syncMobileWhatToKnow({ detail, state, venue, documentObject }) {
  const existing = documentObject.querySelector('[data-mobile-what-to-know]');
  existing?.remove();
  if (!detail?.classList?.contains('venue-detail--selected-continuation')) return null;

  const card = documentObject.querySelector('#tray-selected > .selected-card');
  const header = card?.querySelector(':scope > .selected-card__header');
  if (!card || !header) return null;

  installMobileWhatToKnowStyles(documentObject);
  const section = documentObject.createElement('section');
  section.className = 'selected-card__what-to-know';
  section.dataset.mobileWhatToKnow = 'true';

  const heading = documentObject.createElement('div');
  heading.className = 'selected-card__what-to-know-header';
  const title = documentObject.createElement('h3');
  title.className = 'selected-card__what-to-know-title';
  title.textContent = 'WHAT TO KNOW';
  heading.append(title);

  const venueContext = resolveCalBarNominationVenue(state.snapshot, state.selectedVenueId);
  const href = buildCalBarNominationPrefillUrl(readVenueContributionConfig(documentObject), venueContext);
  if (href) {
    const link = documentObject.createElement('a');
    link.className = 'selected-card__what-to-know-link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Add info →';
    refreshProfileOnReturn(link, documentObject);
    heading.append(link);
  }
  section.append(heading);

  const tags = venueTagsForVenue(venue);
  if (tags.length) {
    const list = documentObject.createElement('div');
    list.className = 'selected-card__what-to-know-tags';
    list.setAttribute('aria-label', 'Community venue details');
    tags.forEach((item) => {
      const tag = documentObject.createElement('span');
      tag.className = 'selected-card__what-to-know-tag';
      tag.dataset.venueTag = item.value;
      tag.textContent = item.label;
      list.append(tag);
    });
    section.append(list);
  } else {
    const empty = documentObject.createElement('p');
    empty.className = 'selected-card__what-to-know-empty';
    empty.textContent = 'Nothing shared yet.';
    section.append(empty);
  }

  header.after(section);
  return section;
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

function finalizeMobileCommunityPresentation({ detail, state, venue, documentObject }) {
  syncMobileWhatToKnow({ detail, state, venue, documentObject });
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
  heading.textContent = 'YOU SAY';
  section.append(heading);

  const mobileContinuation = detail.classList?.contains('venue-detail--selected-continuation') === true;
  if (!mobileContinuation) {
    const tagList = createVenueTagList(documentObject, venueTags);
    if (tagList) section.append(tagList);
  }

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
    finalizeMobileCommunityPresentation({ detail, state, venue, documentObject });
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
  finalizeMobileCommunityPresentation({ detail, state, venue, documentObject });
  return section;
}
