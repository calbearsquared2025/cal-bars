// Keep the chronological schedule intact while showing the next relevant game on open.
export function scrollGameListToCurrent({ documentObject = globalThis.document } = {}) {
  const list = documentObject?.querySelector?.('#game-list');
  const current = list?.querySelector?.('.game-option[data-current="true"]')
    || list?.querySelector?.('.game-option[data-selected="true"]');
  if (!current) return false;

  // Reset retained scroll from a previous open, then align the current game to
  // the top as far as the list's available scroll range allows.
  list.scrollTop = 0;
  list.scrollTop = Math.max(0, current.getBoundingClientRect().top - list.getBoundingClientRect().top);
  return true;
}
