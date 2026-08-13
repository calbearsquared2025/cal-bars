function clean(value) {
  return String(value ?? '').trim();
}

const failedPhotoKeys = new Set();

export function safeHttpUrl(value) {
  const raw = clean(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

export function venuePhotoAltText(venue = {}) {
  const caption = clean(venue.photo_caption);
  if (caption) return caption;
  const name = clean(venue.name);
  return name ? `Photo of ${name}` : 'Venue photo';
}

export function venuePhotoPresentation(venue = {}) {
  const photoUrl = safeHttpUrl(venue.photo_url);
  if (!photoUrl) return null;
  return Object.freeze({
    photoUrl,
    caption: clean(venue.photo_caption),
    credit: clean(venue.photo_credit),
    creditUrl: safeHttpUrl(venue.photo_credit_url),
    alt: venuePhotoAltText(venue)
  });
}

function photoKey(venue, photoUrl) {
  return `${clean(venue?.venue_id)}::${photoUrl}`;
}

function createLocalMapFallback(documentObject, venue) {
  const latitude = Number(venue?.latitude);
  const longitude = Number(venue?.longitude);
  if (![latitude, longitude].every(Number.isFinite)) return null;
  const map = documentObject.createElement('div');
  map.className = 'detail-local-map';
  map.dataset.venueId = clean(venue.venue_id);
  map.dataset.latitude = String(latitude);
  map.dataset.longitude = String(longitude);
  map.dataset.zoom = '16';
  map.setAttribute('role', 'img');
  map.setAttribute('aria-label', `Local map centered on ${clean(venue.name) || 'this venue'}`);
  return map;
}

function ensureLocalMap(hero, documentObject, venue) {
  let map = hero.querySelector(':scope > .detail-local-map');
  if (!map) {
    map = createLocalMapFallback(documentObject, venue);
    if (!map) return null;
    hero.append(map);
  }
  const addressActions = hero.querySelector(':scope > .detail-address-actions');
  if (addressActions && map.previousElementSibling !== addressActions) addressActions.after(map);
  return map;
}

function createPhotoFigure(documentObject, venue, presentation, onPhotoError) {
  const figure = documentObject.createElement('figure');
  figure.className = 'detail-photo';
  figure.dataset.photoUrl = presentation.photoUrl;

  const frame = documentObject.createElement('div');
  frame.className = 'detail-photo__frame';
  const image = documentObject.createElement('img');
  image.className = 'detail-photo__image';
  image.src = presentation.photoUrl;
  image.alt = presentation.alt;
  image.decoding = 'async';
  image.loading = 'eager';
  image.addEventListener('error', () => {
    failedPhotoKeys.add(photoKey(venue, presentation.photoUrl));
    figure.remove();
    const hero = documentObject.querySelector('#venue-detail > .detail-hero');
    if (!hero) return;
    hero.classList.remove('detail-hero--has-photo');
    hero.classList.add('detail-hero--no-photo');
    ensureLocalMap(hero, documentObject, venue);
    onPhotoError?.();
  }, { once: true });
  frame.append(image);
  figure.append(frame);

  if (presentation.caption || presentation.credit) {
    const metadata = documentObject.createElement('figcaption');
    metadata.className = 'detail-photo__metadata';
    if (presentation.caption) {
      const caption = documentObject.createElement('p');
      caption.className = 'detail-photo__caption';
      caption.textContent = presentation.caption;
      metadata.append(caption);
    }
    if (presentation.credit) {
      const credit = documentObject.createElement('p');
      credit.className = 'detail-photo__credit';
      credit.append(documentObject.createTextNode('Credit: '));
      if (presentation.creditUrl) {
        const link = documentObject.createElement('a');
        link.href = presentation.creditUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = presentation.credit;
        credit.append(link);
      } else {
        const identity = documentObject.createElement('span');
        identity.textContent = presentation.credit;
        credit.append(identity);
      }
      metadata.append(credit);
    }
    figure.append(metadata);
  }

  return figure;
}

function ensureSection(detail, className, headingText, documentObject) {
  let section = detail.querySelector(`:scope > .${className}`);
  if (!section) {
    section = documentObject.createElement('section');
    section.className = className;
    const heading = documentObject.createElement('h2');
    heading.textContent = headingText;
    section.append(heading);
  }
  return section;
}

function placeAfterActivity(detail, section) {
  const activity = detail.querySelector(':scope > .activity-card');
  const about = detail.querySelector(':scope > .detail-about');
  if (section.classList.contains('detail-about')) {
    if (activity) activity.after(section);
    else detail.querySelector(':scope > .detail-hero')?.after(section);
    return;
  }
  if (about) about.after(section);
  else if (activity) activity.after(section);
  else detail.querySelector(':scope > .detail-hero')?.after(section);
}

function moveNeutralDescription(detail, hero, documentObject) {
  const description = hero.querySelector(':scope > .detail-description');
  if (!description) {
    detail.querySelector(':scope > .detail-about')?.remove();
    return false;
  }
  const section = ensureSection(detail, 'detail-about', 'About this location', documentObject);
  description.className = 'detail-about__copy';
  section.append(description);
  placeAfterActivity(detail, section);
  return true;
}

function renderCgbEditorial(detail, venue, documentObject) {
  const copy = clean(venue?.cgb_says);
  const existing = detail.querySelector(':scope > .detail-editorial');
  if (!copy) {
    existing?.remove();
    return false;
  }
  const section = ensureSection(detail, 'detail-editorial', 'CGB SAYS', documentObject);
  let paragraph = section.querySelector(':scope > .detail-editorial__copy');
  if (!paragraph) {
    paragraph = documentObject.createElement('p');
    paragraph.className = 'detail-editorial__copy';
    section.append(paragraph);
  }
  paragraph.textContent = copy;
  placeAfterActivity(detail, section);
  return true;
}

export function enhanceVenueProfile({
  state = globalThis.window?.CGBApp?.getState?.(),
  documentObject = globalThis.document,
  onPhotoError
} = {}) {
  if (!state?.detailMode || !documentObject) return false;
  const venue = state.snapshot?.venues?.find((item) => clean(item?.venue_id) === clean(state.selectedVenueId));
  const detail = documentObject.querySelector('#venue-detail');
  const hero = detail?.querySelector(':scope > .detail-hero');
  if (!venue || !detail || !hero) return false;

  const presentation = venuePhotoPresentation(venue);
  const failed = Boolean(presentation && failedPhotoKeys.has(photoKey(venue, presentation.photoUrl)));
  const showPhoto = Boolean(presentation && !failed);
  const existingPhoto = hero.querySelector(':scope > .detail-photo');

  hero.classList.toggle('detail-hero--has-photo', showPhoto);
  hero.classList.toggle('detail-hero--no-photo', !showPhoto);

  ensureLocalMap(hero, documentObject, venue);

  if (showPhoto) {
    if (existingPhoto?.dataset.photoUrl !== presentation.photoUrl) {
      existingPhoto?.remove();
      hero.insertBefore(createPhotoFigure(documentObject, venue, presentation, onPhotoError), hero.firstChild);
    }
  } else {
    existingPhoto?.remove();
  }

  moveNeutralDescription(detail, hero, documentObject);
  renderCgbEditorial(detail, venue, documentObject);
  return true;
}
