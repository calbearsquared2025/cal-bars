export function stableListQueryAfterTyping({
  inputValue,
  renderedListQuery,
  stableListQuery
} = {}) {
  const input = String(inputValue || '').trim();
  const rendered = String(renderedListQuery || '').trim();
  const stable = String(stableListQuery || '').trim();
  return input && rendered === input ? stable : rendered;
}
