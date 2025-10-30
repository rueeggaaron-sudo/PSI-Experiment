(() => {
  const STORAGE_KEY = 'psi_exp_uid';
  const UID_RE = /^[a-z0-9]{12,64}$/;
  const UID_LENGTH = 26;
  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let memoryUid = null;

  const isValidUid = value => typeof value === 'string' && UID_RE.test(value);

  const readStorage = getter => {
    if (typeof getter !== 'function') return null;
    try {
      const value = getter(STORAGE_KEY);
      return isValidUid(value) ? value : null;
    } catch (error) {
      return null;
    }
  };

  const loadExistingUid = () => {
    const fromGlobal = typeof window.__exp_uid === 'string' ? window.__exp_uid : null;
    if (isValidUid(fromGlobal)) return fromGlobal;
    const fromLocal = typeof localStorage !== 'undefined'
      ? readStorage(key => localStorage.getItem(key))
      : null;
    if (fromLocal) return fromLocal;
    const fromSession = typeof sessionStorage !== 'undefined'
      ? readStorage(key => sessionStorage.getItem(key))
      : null;
    if (fromSession) return fromSession;
    return isValidUid(memoryUid) ? memoryUid : null;
  };

  const persistUid = uid => {
    let stored = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, uid);
        stored = true;
      } catch (error) {
        /* ignore */
      }
    }
    if (!stored && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, uid);
        stored = true;
      } catch (error) {
        /* ignore */
      }
    }
    memoryUid = uid;
    return stored;
  };

  const generateUid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(UID_LENGTH);
      crypto.getRandomValues(bytes);
      let out = '';
      for (let i = 0; i < UID_LENGTH; i++) {
        out += ALPHABET[bytes[i] % ALPHABET.length];
      }
      return out;
    }
    let uid = '';
    while (uid.length < UID_LENGTH) {
      uid += Math.random().toString(36).slice(2);
    }
    return uid.slice(0, UID_LENGTH);
  };

  const ensureUid = () => {
    let uid = loadExistingUid();
    if (uid) return uid;
    uid = generateUid();
    if (!isValidUid(uid)) {
      uid = uid.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, UID_LENGTH);
      if (!isValidUid(uid)) {
        uid = generateUid();
      }
    }
    persistUid(uid);
    return uid;
  };

  const installSubmitPatch = uid => {
    const original = window.submitExperimentData;
    if (typeof original !== 'function' || original.__uidWrapped) {
      return;
    }
    const wrapped = async function(rec) {
      const base = (rec && typeof rec === 'object') ? { ...rec } : {};
      const tsValue = base.ts;
      base.ts = (typeof tsValue === 'number' && Number.isFinite(tsValue)) ? Math.round(tsValue) : Date.now();
      base.uid = uid;
      return original.call(this, base);
    };
    wrapped.__uidWrapped = true;
    window.submitExperimentData = wrapped;
  };

  const uid = ensureUid();
  window.__exp_uid = uid;
  window.getExperimentUid = () => uid;

  const tryInstall = () => {
    if (typeof window.submitExperimentData === 'function') {
      installSubmitPatch(uid);
      return true;
    }
    return false;
  };

  if (!tryInstall()) {
    const interval = setInterval(() => {
      if (tryInstall()) clearInterval(interval);
    }, 50);
    const stop = () => clearInterval(interval);
    window.addEventListener('load', () => {
      tryInstall();
      stop();
    }, { once: true });
    setTimeout(stop, 4000);
  }
})();
