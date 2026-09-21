function sourceAboutContent(documentObject) {
  return documentObject?.querySelector?.('#about-surface .about-surface__content') || null;
}

export function cloneAboutContent(documentObject = document) {
  const source = sourceAboutContent(documentObject);
  if (!source) return null;

  const clone = source.cloneNode(true);
  clone.classList.add('my-cgb-about-content');

  const privacy = clone.querySelector('#about-privacy-button');
  if (privacy) {
    privacy.removeAttribute('id');
    privacy.dataset.myCgbAboutPrivacy = 'true';
  }

  const support = clone.querySelector('[data-support-open]');
  if (support) {
    support.removeAttribute('data-support-open');
    support.dataset.myCgbAboutSupport = 'true';
  }

  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.addEventListener('click', (event) => {
    const privacyTrigger = event.target.closest?.('[data-my-cgb-about-privacy]');
    if (privacyTrigger) {
      event.preventDefault();
      documentObject.querySelector('#about-privacy-button')?.click();
      return;
    }

    const supportTrigger = event.target.closest?.('[data-my-cgb-about-support]');
    if (supportTrigger) {
      event.preventDefault();
      documentObject.querySelector('#about-surface [data-support-open]')?.click();
    }
  });

  return clone;
}
