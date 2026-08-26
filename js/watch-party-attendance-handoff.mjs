const DIALOG_ID = 'watch-party-attendance-handoff';

export const WATCH_PARTY_ATTENDANCE_CHOICES = Object.freeze({
  attend: 'attend',
  share: 'share'
});

export function openWaitingFormWindow(windowObject = window) {
  let opened = null;
  try {
    opened = windowObject.open('', '_blank');
  } catch (_) {
    return null;
  }
  try {
    if (opened) opened.opener = null;
    if (opened?.document) {
      opened.document.title = 'Loading Watch Party submission form';
      opened.document.body.textContent = 'Loading Watch Party submission form…';
    }
  } catch (_) {}
  return opened;
}

export function closeWaitingFormWindow(opened) {
  try { opened?.close?.(); } catch (_) {}
}

export function navigateWaitingFormWindow(opened, href, windowObject = window) {
  if (!href) return false;
  try {
    if (opened && !opened.closed) {
      opened.location.href = href;
      return true;
    }
  } catch (_) {}

  try {
    windowObject.location.assign(href);
    return true;
  } catch (_) {
    return false;
  }
}

function buildDialog(documentObject) {
  documentObject.querySelector(`#${DIALOG_ID}`)?.remove();

  const dialog = documentObject.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'watch-party-attendance-handoff';
  dialog.setAttribute('aria-labelledby', `${DIALOG_ID}-title`);
  dialog.setAttribute('aria-describedby', `${DIALOG_ID}-copy`);

  const panel = documentObject.createElement('div');
  panel.className = 'watch-party-attendance-handoff__panel';

  const close = documentObject.createElement('button');
  close.type = 'button';
  close.className = 'watch-party-attendance-handoff__close';
  close.setAttribute('aria-label', 'Cancel Watch Party submission');
  close.textContent = '×';

  const eyebrow = documentObject.createElement('p');
  eyebrow.className = 'watch-party-attendance-handoff__eyebrow';
  eyebrow.textContent = 'WATCH PARTY SUBMISSION';

  const title = documentObject.createElement('h2');
  title.id = `${DIALOG_ID}-title`;
  title.textContent = 'Loading Watch Party submission form…';

  const copy = documentObject.createElement('p');
  copy.id = `${DIALOG_ID}-copy`;
  copy.className = 'watch-party-attendance-handoff__copy';
  copy.textContent = 'Before we open it, will you be at this Watch Party?';

  const actions = documentObject.createElement('div');
  actions.className = 'watch-party-attendance-handoff__actions';

  const attend = documentObject.createElement('button');
  attend.type = 'button';
  attend.className = 'primary-button';
  attend.dataset.watchPartyAttendanceChoice = WATCH_PARTY_ATTENDANCE_CHOICES.attend;
  attend.textContent = 'Yes, I’ll be there';

  const share = documentObject.createElement('button');
  share.type = 'button';
  share.className = 'secondary-button';
  share.dataset.watchPartyAttendanceChoice = WATCH_PARTY_ATTENDANCE_CHOICES.share;
  share.textContent = 'No, I’m sharing it';

  actions.append(attend, share);
  panel.append(close, eyebrow, title, copy, actions);
  dialog.append(panel);
  documentObject.body.append(dialog);
  return { dialog, close, attend, share };
}

export function requestWatchPartyAttendance({
  documentObject = document,
  windowObject = window,
  reserveWindow = true
} = {}) {
  if (!documentObject?.body || typeof documentObject.createElement !== 'function') {
    return Promise.resolve(null);
  }

  const { dialog, close, attend, share } = buildDialog(documentObject);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (choice = null, opened = null) => {
      if (settled) return;
      settled = true;
      try { if (dialog.open) dialog.close(); } catch (_) {}
      dialog.remove();
      resolve(choice ? Object.freeze({ choice, windowRef: opened }) : null);
    };
    const waitingWindow = () => reserveWindow ? openWaitingFormWindow(windowObject) : null;

    close.addEventListener('click', () => finish());
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish();
    });

    attend.addEventListener('click', () => {
      finish(WATCH_PARTY_ATTENDANCE_CHOICES.attend, waitingWindow());
    });
    share.addEventListener('click', () => {
      finish(WATCH_PARTY_ATTENDANCE_CHOICES.share, waitingWindow());
    });

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
}
