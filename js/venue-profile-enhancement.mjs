import './desktop-visual-cohesion.mjs';
import { getWatchParty, haversineMiles } from './core.mjs';
import { syncDesktopPhotoForwardProfile } from './desktop-photo-forward-profile.mjs';
import { createIcon } from './icons.mjs';

function clean(value) {
  return String(value ?? '').trim();
}

const failedPhotoKeys = new Set();
const WIDE_DESKTOP_QUERY = '(min-width: 1100px)';
const VENUE_PHOTO_ASPECT_RATIO = '3 / 2';
const VENUE_PHOTO_OBJECT_FIT = 'cover';

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

export function detailShareLabel({ snapshot, gameId, venueId } = {}) {
  return getWatchParty(snapshot, gameId, venueId) ? 'Share Watch Party' : 'Share';
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
  map.setAttribute('role', 'group');
  map.setAttribute('aria-label', `Local map centered on ${clean(venue.name) || 'this venue'}`);
  map.setAttribute('aria-busy', 'true');
  return map;
}

function ensureLocalMapFallback(hero, documentObject, venue) {
  const detail = hero.closest?.('#venue-detail');
  const existing = hero.querySelector(':scope > .detail-local-map') ||
    detail?.querySelector(':scope > .detail-local-map');
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
  frame.style.setProperty('aspect-ratio', VENUE_PHOTO_ASPECT_RATIO, 'important');
  frame.style.overflow = 'hidden';
  const image = documentObject.createElement('img');
  image.className = 'detail-photo__image';
  image.alt = presentation.alt;
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.display = 'block';
  image.style.setProperty('object-fit', VENUE_PHOTO_OBJECT_FIT, 'important');
  image.style.setProperty('object-position', 'center', 'important');
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
  const activity = detail.querySelector(':scope > .activity-card');
  (activity || hero).after(section);
  return true;
}

function profileMedia(detail, hero) {
  return hero.querySelector(':scope > .detail-photo, :scope > .detail-local-map') ||
    detail.querySelector(':scope > .detail-photo, :scope > .detail-local-map');
}

function addressLabel(venue) {
  const street = [venue?.address_line_1, venue?.address_line_2].filter(Boolean).join(', ');
  return (street
    ? [street, venue?.city, venue?.region, venue?.postal_code].filter(Boolean).join(', ')
    : [venue?.city, venue?.region].filter(Boolean).join(', ')) || clean(venue?.name);
}

function desktopDistanceCopy(state, venue) {
  const origin = state?.origin;
  if (origin?.label !== 'your location') return '';
  const distance = haversineMiles(origin.lat, origin.lon, venue?.latitude, venue?.longitude);
  if (!Number.isFinite(distance)) return '';
  if (distance < 0.1) return 'Nearby';
  return `${distance.toFixed(distance < 10 ? 1 : 0)} mi away`;
}

function createAddressSeparator(documentObject) {
  const separator = documentObject.createElement('span');
  separator.className = 'detail-address__separator';
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '·';
  return separator;
}

function arrangeDesktopVenueIdentity({ detail, hero, venue, state, wideDesktop, documentObject }) {
  const address = hero.querySelector(':scope > .detail-address');
  if (!address) return false;

  if (!wideDesktop) {
    if (address.dataset.desktopIdentity !== 'true') return false;
    const directions = address.querySelector('.detail-directions-inline');
    if (!directions) return false;
    directions.classList.remove('detail-directions-inline--desktop');
    directions.replaceChildren(
      createIcon('directions', { documentObject }),
      documentObject.createTextNode(addressLabel(venue))
    );
    address.replaceChildren(directions);
    delete address.dataset.desktopIdentity;
    delete address.dataset.desktopDistance;
    return false;
  }

  const distanceCopy = desktopDistanceCopy(state, venue);
  if (address.dataset.desktopIdentity === 'true' && address.dataset.desktopDistance === distanceCopy) return true;
  const directions = address.querySelector('.detail-directions-inline');
  if (!directions) return false;

  const location = documentObject.createElement('span');
  location.className = 'detail-address__location';
  const street = [venue?.address_line_1, venue?.address_line_2].filter(Boolean).join(', ');
  const locality = [venue?.city, venue?.region].filter(Boolean).join(', ');

  if (street) {
    const streetLine = documentObject.createElement('span');
    streetLine.className = 'detail-address__street';
    streetLine.textContent = street;
    location.append(streetLine);
  }

  const localityRow = documentObject.createElement('span');
  localityRow.className = 'detail-address__locality-row';
  if (locality) {
    const localityText = documentObject.createElement('span');
    localityText.className = 'detail-address__locality';
    localityText.textContent = locality;
    localityRow.append(localityText);
  }

  if (distanceCopy) {
    const distanceGroup = documentObject.createElement('span');
    distanceGroup.className = 'detail-address__distance-group';
    if (locality) distanceGroup.append(createAddressSeparator(documentObject));
    const distanceText = documentObject.createElement('span');
    distanceText.className = 'detail-address__distance';
    distanceText.textContent = distanceCopy;
    distanceGroup.append(distanceText);
    localityRow.append(distanceGroup);
  }

  const directionsGroup = documentObject.createElement('span');
  directionsGroup.className = 'detail-address__directions-group';
  if (locality || distanceCopy) directionsGroup.append(createAddressSeparator(documentObject));
  directions.classList.add('detail-directions-inline--desktop');
  directions.replaceChildren(documentObject.createTextNode('Directions'));
  directionsGroup.append(directions);
  localityRow.append(directionsGroup);
  location.append(localityRow);

  address.replaceChildren(location);
  address.dataset.desktopIdentity = 'true';
  address.dataset.desktopDistance = distanceCopy;
  return true;
}

export function arrangeDesktopVenueMedia({
  state = globalThis.window?.CGBApp?.getState?.(),
  documentObject = globalThis.document,
  windowObject = globalThis.window
} = {}) {
  if (!state?.detailMode || !documentObject) return false;
  const detail = documentObject.querySelector('#venue-detail');
  const hero = detail?.querySelector(':scope > .detail-hero');
  const venue = state.snapshot?.venues?.find((item) => clean(item?.venue_id) === clean(state.selectedVenueId));
  if (!detail || !hero || !venue) return false;

  const media = profileMedia(detail, hero);
  const activity = detail.querySelector(':scope > .activity-card');
  const editorial = detail.querySelector(':scope > .detail-editorial');
  const fanExperiences = detail.querySelector(':scope > .detail-fan-experiences');
  const parties = [...detail.querySelectorAll(':scope > .party-module')];
  const wideDesktop = windowObject?.matchMedia?.(WIDE_DESKTOP_QUERY)?.matches === true;
  arrangeDesktopVenueIdentity({ detail, hero, venue, state, wideDesktop, documentObject });

  if (!wideDesktop) {
    detail.removeAttribute('data-desktop-profile-arrangement');
    if (activity) {
      parties.forEach((party) => detail.insertBefore(party, activity));
      if (editorial) activity.after(editorial);
      if (fanExperiences) (editorial || activity).after(fanExperiences);
    }
    if (media) {
      media.classList.remove('detail-profile-media--desktop');
      if (media.parentElement !== hero) hero.prepend(media);
    }
    return syncDesktopPhotoForwardProfile({ state, documentObject, windowObject });
  }

  detail.dataset.desktopProfileArrangement = 'identity-editorial-party-attendance-community-media';
  let cursor = hero;
  if (editorial) {
    cursor.after(editorial);
    cursor = editorial;
  }
  parties.forEach((party) => {
    cursor.after(party);
    cursor = party;
  });
  if (activity) {
    cursor.after(activity);
    cursor = activity;
  }
  if (fanExperiences) {
    cursor.after(fanExperiences);
    cursor = fanExperiences;
  }

  if (media) {
    media.classList.add('detail-profile-media--desktop');
    if (media.previousElementSibling !== cursor) cursor.after(media);
  }
  syncDesktopPhotoForwardProfile({ state, documentObject, windowObject });
  return true;
}

function syncDetailShareLabel(detail, state, venue) {
  const share = detail.querySelector('.detail-primary-actions .detail-share');
  if (!share) return false;
  const label = detailShareLabel({
    snapshot: state.snapshot,
    gameId: state.gameId,
    venueId: venue.venue_id
  });
  share.textContent = label;
  share.setAttribute('aria-label', label);
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
  const existingPhoto = hero.querySelector(':scope > .detail-photo') ||
    detail.querySelector(':scope > .detail-photo');
  const existingLocalMap = hero.querySelector(':scope > .detail-local-map') ||
    detail.querySelector(':scope > .detail-local-map');

  hero.classList.toggle('detail-hero--has-photo', showPhoto);
  hero.classList.toggle('detail-hero--no-photo', !showPhoto);

  if (showPhoto) {
    existingLocalMap?.remove();
    let photo = existingPhoto;
    if (existingPhoto?.dataset.photoUrl !== presentation.photoUrl) {
      existingPhoto?.remove();
      photo = createPhotoFigure(documentObject, venue, presentation, onPhotoError);
    }
    if (photo) hero.prepend(photo);
  } else {
    existingPhoto?.remove();
    if (existingLocalMap) hero.prepend(existingLocalMap);
    else if (clean(venue.photo_url)) ensureLocalMapFallback(hero, documentObject, venue);
  }

  moveEditorialDescription(detail, hero, documentObject);
  syncDetailShareLabel(detail, state, venue);
  return true;
}
