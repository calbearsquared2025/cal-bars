export const CGB_AVATAR_PRESETS = Object.freeze([
  Object.freeze({ id: 'anon1', url: 'https://res.cloudinary.com/noouxqko/image/upload/v1789175496/anon1.webp' }),
  Object.freeze({ id: 'anon2', url: 'https://res.cloudinary.com/noouxqko/image/upload/v1789175550/anon2.webp' }),
  Object.freeze({ id: 'anon3', url: 'https://res.cloudinary.com/noouxqko/image/upload/v1789175550/anon3.webp' }),
  Object.freeze({ id: 'anon4', url: 'https://res.cloudinary.com/noouxqko/image/upload/v1789175549/anon4.webp' }),
  Object.freeze({ id: 'anon5', url: 'https://res.cloudinary.com/noouxqko/image/upload/v1789175550/anon5.webp' })
]);

const PRESET_URLS = new Set(CGB_AVATAR_PRESETS.map((preset) => preset.url));
const GOOGLE_PUBLIC_AVATAR_HASH = '#cgb-public-google';

function googlePhotoUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  let url;
  try {
    url = new URL(text);
  } catch (_) {
    return '';
  }
  if (url.protocol !== 'https:') return '';
  const hostname = url.hostname.toLowerCase();
  if (hostname !== 'googleusercontent.com' && !hostname.endsWith('.googleusercontent.com')) return '';
  return url.toString();
}

export function explicitGoogleAvatarUrl(value) {
  const text = String(value || '').trim();
  if (!text.endsWith(GOOGLE_PUBLIC_AVATAR_HASH)) return '';
  return googlePhotoUrl(text) ? text : '';
}

export function tagGoogleAvatarUrl(value) {
  const cleanUrl = googlePhotoUrl(value);
  if (!cleanUrl) return '';
  const url = new URL(cleanUrl);
  url.hash = GOOGLE_PUBLIC_AVATAR_HASH.slice(1);
  return url.toString();
}

export function isCgbAvatarPresetUrl(value) {
  const text = String(value || '').trim();
  return PRESET_URLS.has(text) || Boolean(explicitGoogleAvatarUrl(text));
}
