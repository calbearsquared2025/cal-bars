export const DESKTOP_REVIEW_PREVIEW_WIDTH = 1024;
export const DESKTOP_REVIEW_PREVIEW_VALUE = 'desktop';
export const DESKTOP_REVIEW_VIEWPORT_CONTENT = `width=${DESKTOP_REVIEW_PREVIEW_WIDTH}, viewport-fit=cover`;

export function desktopReviewPreviewRequested(search = '') {
  const params = new URLSearchParams(String(search || ''));
  return params.has('preview') &&
    (params.get('preview') === '' || params.get('preview') === DESKTOP_REVIEW_PREVIEW_VALUE);
}

export function applyDesktopReviewPreview({
  windowObject = globalThis.window,
  documentObject = globalThis.document
} = {}) {
  if (!windowObject || !documentObject || !desktopReviewPreviewRequested(windowObject.location?.search)) {
    return false;
  }

  const viewport = documentObject.querySelector?.('meta[name="viewport"]');
  if (!viewport) return false;

  viewport.setAttribute('content', DESKTOP_REVIEW_VIEWPORT_CONTENT);
  documentObject.documentElement?.setAttribute?.('data-preview', DESKTOP_REVIEW_PREVIEW_VALUE);
  return true;
}

export function desktopReviewPreviewUrl(href = '') {
  const url = new URL(href);
  // Keep the short flag bare (not ?preview=) when retaining it across navigation.
  // The old ?preview=desktop URL remains accepted for existing bookmarks.
  url.searchParams.delete('preview');
  const existingQuery = url.searchParams.toString();
  return `${url.pathname}?${existingQuery ? `${existingQuery}&` : ''}preview${url.hash}`;
}
