import { stableListQueryAfterTyping } from './external-search-state-guard-core.mjs';

export function initializeExternalSearchStateGuard({
  app = window.CGBApp,
  documentObject = document
} = {}) {
  const input = documentObject.querySelector('#location-query');
  const form = documentObject.querySelector('#location-search');
  if (!input || !form || !app?.getState || !app?.render) return;

  let stableListQuery = String(app.getState()?.listQuery || '');

  input.addEventListener('focus', () => {
    stableListQuery = String(app.getState()?.listQuery || '');
  });

  input.addEventListener('input', () => {
    queueMicrotask(() => {
      const state = app.getState?.();
      if (!state || documentObject.activeElement !== input) return;
      const restored = stableListQueryAfterTyping({
        inputValue: input.value,
        renderedListQuery: state.listQuery,
        stableListQuery
      });
      if (restored === state.listQuery) return;
      state.listQuery = restored;
      app.render();
    });
  });

  form.addEventListener('submit', () => {
    queueMicrotask(() => {
      stableListQuery = String(app.getState()?.listQuery || '');
    });
  });
}
