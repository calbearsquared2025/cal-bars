export const COMMAND_SURFACES = Object.freeze([
  'map',
  'search',
  'add',
  'list',
  'about',
  'my-cgb'
]);

const COMMAND_SURFACE_SET = new Set(COMMAND_SURFACES);
const PRIMARY_SURFACES = Object.freeze({
  search: '#search-surface',
  add: '#add-surface',
  about: '#about-surface'
});

function validateCommandSurface(next, { optional = false } = {}) {
  if (optional && !next) return;
  if (!COMMAND_SURFACE_SET.has(next)) throw new TypeError(`Unknown command surface: ${next}`);
}

export function setCommandSurface(documentObject, next) {
  validateCommandSurface(next);
  if (!documentObject?.body) return false;
  documentObject.body.dataset.commandSurface = next;
  return true;
}

export function setPrimarySurfaceVisibility(documentObject, next) {
  validateCommandSurface(next, { optional: true });
  if (!documentObject?.querySelector) return false;
  Object.entries(PRIMARY_SURFACES).forEach(([surface, selector]) => {
    const element = documentObject.querySelector(selector);
    if (element) element.hidden = surface !== next;
  });
  return true;
}

export function setActiveCommand(documentObject, next) {
  validateCommandSurface(next, { optional: true });
  if (!documentObject?.querySelectorAll) return false;
  documentObject.querySelectorAll('.mobile-command').forEach((button) => {
    const active = Boolean(next) && (
      button.dataset.command === next || button.id === `mobile-${next}-button`
    );
    button.classList.toggle('mobile-command--active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  return true;
}
