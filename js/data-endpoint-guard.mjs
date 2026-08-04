export const DATA_ENDPOINT_OVERRIDE_KEY = 'cgb_v2_public_data_url';

function cleanHostname(hostname) {
  return String(hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
}

export function allowsDataEndpointOverride(hostname) {
  const value = cleanHostname(hostname);
  return value === 'localhost' ||
    value === '127.0.0.1' ||
    value === '::1' ||
    value.endsWith('.app.github.dev') ||
    value.endsWith('.githubpreview.dev');
}

export function clearDisallowedDataEndpointOverride({
  hostname,
  storage,
  key = DATA_ENDPOINT_OVERRIDE_KEY
} = {}) {
  if (allowsDataEndpointOverride(hostname) || !storage) return false;
  try {
    if (storage.getItem(key) === null) return false;
    storage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

if (typeof window !== 'undefined') {
  clearDisallowedDataEndpointOverride({
    hostname: window.location?.hostname,
    storage: window.localStorage
  });
}
