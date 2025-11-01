const STORAGE_KEY = 'exp-upload-ok';

const parseStored = raw => {
  if (raw === null || raw === undefined) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value === 'boolean' ? value : null;
  } catch (error) {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  }
};

const readFromStorage = getter => {
  if (typeof getter !== 'function') return null;
  try {
    return getter(STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

export const readConsentState = () => {
  if (typeof window === 'undefined') return null;
  const fromLocal = typeof localStorage !== 'undefined' ? readFromStorage(key => localStorage.getItem(key)) : null;
  if (fromLocal !== null) return parseStored(fromLocal);
  const fromSession = typeof sessionStorage !== 'undefined' ? readFromStorage(key => sessionStorage.getItem(key)) : null;
  if (fromSession !== null) return parseStored(fromSession);
  return null;
};

const writeToStorage = (setter, value) => {
  if (typeof setter !== 'function') return false;
  try {
    setter(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

export const persistConsentState = value => {
  if (typeof window === 'undefined') return false;
  const boolValue = !!value;
  let stored = false;
  if (typeof localStorage !== 'undefined') {
    stored = writeToStorage((key, data) => localStorage.setItem(key, data), boolValue) || stored;
  }
  if (typeof sessionStorage !== 'undefined') {
    stored = writeToStorage((key, data) => sessionStorage.setItem(key, data), boolValue) || stored;
  }
  return stored;
};

export const clearStoredConsent = () => {
  if (typeof window === 'undefined') return;
  const remove = remover => {
    try {
      remover(STORAGE_KEY);
    } catch (error) {
      /* ignore */
    }
  };
  if (typeof localStorage !== 'undefined') {
    remove(key => localStorage.removeItem(key));
  }
  if (typeof sessionStorage !== 'undefined') {
    remove(key => sessionStorage.removeItem(key));
  }
};

const buildModal = () => {
  const overlay = document.createElement('div');
  overlay.className = 'consent-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'consent-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'consent-dialog-title');

  dialog.innerHTML = `
    <h2 id="consent-dialog-title">Datenfreigabe</h2>
    <p>
      Dieses Experiment kann deine Sessions anonym hochladen (siehe Datenschutz).<br />
      Du kannst das Uploaden erlauben oder nur lokal speichern.
    </p>
    <div class="consent-actions">
      <button type="button" class="consent-btn" data-action="deny">Nur lokal</button>
      <button type="button" class="consent-btn primary" data-action="allow">Upload erlauben</button>
    </div>
    <p class="consent-note">
      Entscheidung jederzeit anpassbar. Ohne Zustimmung bleibt alles lokal.
    </p>
  `;

  overlay.appendChild(dialog);
  return { overlay, dialog };
};

const defaultOnChange = () => {};

export function initializeConsent(root = document.getElementById('consent-modal'), options = {}) {
  if (!root || typeof document === 'undefined') {
    const current = readConsentState();
    return {
      open: () => {},
      close: () => {},
      getConsent: () => current,
      setConsent: () => current,
      clear: () => {},
      subscribe: () => () => {},
    };
  }

  root.innerHTML = '';
  const { overlay, dialog } = buildModal();
  root.appendChild(overlay);

  let consentState = readConsentState();
  const listeners = new Set();
  const onChange = typeof options.onChange === 'function' ? options.onChange : defaultOnChange;
  let isOpen = false;

  const notify = (value, meta = {}) => {
    onChange(value, meta);
    listeners.forEach(listener => {
      try {
        listener(value, meta);
      } catch (error) {
        /* ignore */
      }
    });
    document.dispatchEvent(new CustomEvent('psi-consent-change', {
      detail: { value, meta },
    }));
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleKeyDown);
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', handleKeyDown);
    const focusTarget = dialog.querySelector('[data-action="allow"]');
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
  };

  const setConsent = (value, meta = {}) => {
    const next = !!value;
    if (consentState === next) {
      close();
      return consentState;
    }
    consentState = next;
    persistConsentState(consentState);
    close();
    notify(consentState, meta);
    return consentState;
  };

  const handleBackdropClick = event => {
    if (event.target === overlay) {
      close();
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  overlay.addEventListener('click', handleBackdropClick);
  dialog.addEventListener('click', event => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'allow') {
      setConsent(true, { source: 'ui' });
    } else if (action === 'deny') {
      setConsent(false, { source: 'ui' });
    }
  });

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    const next = parseStored(event.newValue);
    if (next === null || next === consentState) return;
    consentState = next;
    notify(consentState, { source: 'storage' });
  });

  if (consentState === null) {
    requestAnimationFrame(() => open());
  }

  return {
    open,
    close,
    getConsent: () => consentState,
    setConsent,
    clear: () => {
      consentState = null;
      clearStoredConsent();
      notify(consentState, { source: 'clear' });
    },
    subscribe: listener => {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
