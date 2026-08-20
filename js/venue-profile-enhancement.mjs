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
  map.setAttribute('aria-busy', 'true');
  return map;
}

function ensureLocalMapFallback(hero, documentObject, venue) {
  const existing = hero.querySelector(':scope > .detail-local-map');
  if (existing) {
    hero.prepend(existing);
    return true;
  }
  const map = createLocalMapFallback(documentObject, venue);
  if (!map) return false;
  hero.prepend(map);
  return true;
}

function createPhotoFigure(documentObject, venue, presentation, onPhotoError) {
  const figure = documentObject.createElement('figure');
  figure.className = 'detail-photo';
  figure.dataset.photoUrl = presentation.photoUrl;
  figure.style.width = 'min(100%, 520px)';
  figure.style.margin = '10px auto 0';

  const frame = documentObject.createElement('div');
  frame.className = 'detail-photo__frame';
  frame.style.width = '100%';
  frame.style.aspectRatio = '1 / 1';
  frame.style.overflow = 'hidden';
  const image = documentObject.createElement('img');
  image.className = 'detail-photo__image';
  image.alt = presentation.alt;
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.display = 'block';
  image.style.objectFit = 'cover';
  image.style.objectPosition = 'center';
  image.decoding = 'async';
  image.loading = 'eager';
  image.addEventListener('error', () => {
    failedPhotoKeys.add(photoKey(venue, presentation.photoUrl));
    figure.remove();
    const hero = documentObject.querySelector('#venue-detail > .detail-hero');
    if (!hero) return;
    hero.classList.remove('detail-hero--has-photo');
    hero.classList.add('detail-hero--no-photo');
    ensureLocalMapFallback(hero, documentObject, venue);
    onPhotoError?.();
  }, { once: true });
  image.src = presentation.photoUrl;
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

function moveEditorialDescription(detail, hero, documentObject) {
  const description = hero.querySelector(':scope > .detail-description');
  if (!description) return false;

  let section = detail.querySelector(':scope > .detail-editorial');
  if (!section) {
    section = documentObject.createElement('section');
    section.className = 'detail-editorial';
    const heading = documentObject.createElement('h2');
    heading.textContent = 'CGB SAYS';
    section.append(heading);
  }
  description.className = 'detail-editorial__copy';
  section.append(description);
  hero.after(section);
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

  if (showPhoto) {
    hero.querySelector(':scope > .detail-local-map')?.remove();
    let photo = existingPhoto;
    if (existingPhoto?.dataset.photoUrl !== presentation.photoUrl) {
      existingPhoto?.remove();
      photo = createPhotoFigure(documentObject, venue, presentation, onPhotoError);
    }
    hero.prepend(photo);
  } else {
    existingPhoto?.remove();
    const localMap = hero.querySelector(':scope > .detail-local-map');
    if (localMap) hero.prepend(localMap);
    else if (clean(venue.photo_url)) ensureLocalMapFallback(hero, documentObject, venue);
  }

  moveEditorialDescription(detail, hero, documentObject);
  return true;
}
