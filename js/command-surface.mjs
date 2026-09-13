export const COMMAND_SURFACES = Object.freeze([
  'map',
  'search',
  'add',
  'list',
  'about',
  'my-cgb'
]);

const COMMAND_SURFACE_SET = new Set(COMMAND_SURFACES);

export function setCommandSurface(documentObject, next) {
  if (!COMMAND_SURFACE_SET.has(next)) throw new TypeError(`Unknown command surface: ${next}`);
  if (!documentObject?.body) return false;
  documentObject.body.dataset.commandSurface = next;
  return true;
}
