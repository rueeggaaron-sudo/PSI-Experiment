const STORAGE_KEY = 'psi::consent::upload-ok';

const readFromStorage = getter => {
  if (typeof getter !== 'function') return null;
  try {
    const value = getter(STORAGE_KEY);
    return value === null ? null : JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const loadConsentState = () => {
  if (typeof window === 'undefined') return false;
  const fromMemory = typeof window.__psi_consent === 'boolean' ? window.__psi_consent : null;
  if (typeof fromMemory === 'boolean') return fromMemory;
  const fromLocal = typeof localStorage !== 'undefined'
    ? readFromStorage(key => localStorage.getItem(key))
    : null;
  if (typeof fromLocal === 'boolean') return fromLocal;
  const fromSession = typeof sessionStorage !== 'undefined'
    ? readFromStorage(key => sessionStorage.getItem(key))
    : null;
  if (typeof fromSession === 'boolean') return fromSession;
  return false;
};

export const persistConsentState = value => {
  const normalized = !!value;
  if (typeof window !== 'undefined') {
    window.__psi_consent = normalized;
  }
  let stored = false;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      stored = true;
    } catch (error) {
      stored = false;
    }
  }
  if (!stored && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      stored = true;
    } catch (error) {
      stored = false;
    }
  }
  if (!stored && typeof window !== 'undefined') {
    window.__psi_consent = normalized;
  }
  return normalized;
};

export const clearConsentState = () => {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* noop */ }
  }
  if (typeof sessionStorage !== 'undefined') {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) { /* noop */ }
  }
  if (typeof window !== 'undefined') {
    window.__psi_consent = false;
  }
};
