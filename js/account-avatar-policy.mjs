function applyAvatarPolicy(root) {
  const avatars = [];
  if (root?.matches?.('img.accounts-avatar')) avatars.push(root);
  root?.querySelectorAll?.('img.accounts-avatar').forEach((avatar) => avatars.push(avatar));
  avatars.forEach((avatar) => {
    avatar.referrerPolicy = 'no-referrer';
  });
}

function initializeAccountAvatarPolicy() {
  applyAvatarPolicy(document);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node?.nodeType === Node.ELEMENT_NODE) applyAvatarPolicy(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

initializeAccountAvatarPolicy();
