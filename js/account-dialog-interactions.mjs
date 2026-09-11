const ACCOUNT_DIALOG_SELECTOR = '.accounts-dialog, .account-contribution-dialog';
const boundDialogs = new WeakSet();
const openerByDialog = new WeakMap();
let currentExternalTrigger = null;

function focusSafely(node) {
  if (!node?.isConnected || node.disabled) return;
  try {
    node.focus({ preventScroll: true });
  } catch (_) {
    node.focus?.();
  }
}

function bindDialog(dialog) {
  if (!dialog || boundDialogs.has(dialog)) return;
  boundDialogs.add(dialog);
  dialog.addEventListener('close', () => {
    const opener = openerByDialog.get(dialog);
    openerByDialog.delete(dialog);
    window.requestAnimationFrame(() => focusSafely(opener));
  });
}

function captureOpenDialog(dialog) {
  if (!dialog?.open) return;
  bindDialog(dialog);
  if (currentExternalTrigger && !dialog.contains(currentExternalTrigger)) {
    openerByDialog.set(dialog, currentExternalTrigger);
    currentExternalTrigger = null;
  }
}

function scanDialogs(root = document) {
  root.querySelectorAll?.(ACCOUNT_DIALOG_SELECTOR).forEach((dialog) => {
    bindDialog(dialog);
    captureOpenDialog(dialog);
  });
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest?.('button, a');
  if (!trigger) return;

  if (trigger.matches('.accounts-email-cancel')) {
    window.queueMicrotask(() => {
      focusSafely(document.querySelector('[data-account-provider="email"]'));
    });
  }

  if (!trigger.closest(ACCOUNT_DIALOG_SELECTOR)) {
    currentExternalTrigger = trigger;
    window.queueMicrotask(() => {
      scanDialogs();
      currentExternalTrigger = null;
    });
  }
}, { capture: true });

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'attributes' && mutation.target.matches?.(ACCOUNT_DIALOG_SELECTOR)) {
      captureOpenDialog(mutation.target);
      continue;
    }
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches(ACCOUNT_DIALOG_SELECTOR)) {
        bindDialog(node);
        captureOpenDialog(node);
      }
      scanDialogs(node);
    });
  }
});

observer.observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['open']
});

scanDialogs();
