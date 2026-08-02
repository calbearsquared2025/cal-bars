const GOOGLE_FORMS_HOST = 'docs.google.com';

export function normalizeMissingLocationFormConfig(config = {}) {
  const formUrl = String(config.formUrl || '').trim();
  const placeNameEntry = String(config.placeNameEntry || '').trim();
  if (!formUrl || !/^entry\.\d+$/.test(placeNameEntry)) return null;

  try {
    const url = new URL(formUrl);
    if (url.protocol !== 'https:' || url.hostname !== GOOGLE_FORMS_HOST || !url.pathname.endsWith('/viewform')) {
      return null;
    }
    return { formUrl: url.toString(), placeNameEntry };
  } catch (_) {
    return null;
  }
}

export function buildMissingLocationFormUrl(config, { searchText = '' } = {}) {
  const normalized = normalizeMissingLocationFormConfig(config);
  if (!normalized) return '';

  const url = new URL(normalized.formUrl);
  const query = String(searchText || '').trim();
  if (query) {
    url.searchParams.set('usp', 'pp_url');
    url.searchParams.set(normalized.placeNameEntry, query);
  }
  return url.toString();
}

export function shouldShowMissingLocationFallback({
  existingResultCount = 0,
  externalResultCount = 0,
  normalSearchFinished = false,
  explicitlyRequested = false
} = {}) {
  if (explicitlyRequested) return true;
  return normalSearchFinished && existingResultCount === 0 && externalResultCount === 0;
}
