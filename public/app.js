import { loadConsentState, persistConsentState, clearConsentState } from './shared/consent.js';
import { initSubmitHandler, createExperimentSubmitter } from './shared/data.js';

const experiments = [
  {
    key: 'psychokinese',
    title: 'Psychokinese',
    path: '/psychokinese',
    version: '2024.10',
    loader: () => import('./experiments/psychokinese.js'),
  },
  {
    key: 'remote-viewing',
    title: 'Remote Viewing (Preview)',
    path: '/remote-viewing',
    version: '0.1-stub',
    loader: () => import('./experiments/remote-viewing.js'),
  },
];

const defaultKey = 'psychokinese';
const experimentMap = new Map(experiments.map(exp => [exp.key, exp]));

const navEl = document.getElementById('experiment-nav');
const mainEl = document.getElementById('app-main');
const rootEl = document.getElementById('experiment-root');
const consentToggle = document.getElementById('consent-toggle');
const consentOverlay = document.getElementById('consent-overlay');
const consentStatus = document.getElementById('consent-status');
const consentAccept = document.getElementById('consent-accept');
const consentRevoke = document.getElementById('consent-revoke');
const consentCancel = document.getElementById('consent-cancel');

let consentState = loadConsentState();
let cleanupCurrent = null;
let activeKey = null;
let loadToken = 0;
let lastFocusElement = null;
const consentListeners = new Set();

const notifyConsentChange = value => {
  consentListeners.forEach(fn => {
    try { fn(value); } catch (error) { console.warn(error); }
  });
};

const updateConsentState = value => {
  consentState = persistConsentState(value);
  updateConsentUI();
  notifyConsentChange(consentState);
};

const consent = {
  hasConsent: () => !!consentState,
  requestConsent: () => openConsentOverlay(),
  onChange: fn => {
    if (typeof fn === 'function') consentListeners.add(fn);
    return () => consentListeners.delete(fn);
  },
};

initSubmitHandler({ getConsent: () => consentState });

function storageKeyFor(key) {
  return `psi::${key}::sessions`;
}

function buildNav() {
  navEl.innerHTML = '';
  experiments.forEach(exp => {
    const link = document.createElement('a');
    link.href = exp.path;
    link.textContent = exp.title;
    link.dataset.key = exp.key;
    link.setAttribute('role', 'tab');
    link.addEventListener('click', event => {
      event.preventDefault();
      navigateTo(exp.key, { push: true });
    });
    navEl.appendChild(link);
  });
}

function setNavActive(key) {
  const items = navEl.querySelectorAll('a[data-key]');
  items.forEach(item => {
    const isActive = item.dataset.key === key;
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

function resolveKeyFromLocation() {
  const stateKey = history.state && history.state.experiment;
  if (stateKey && experimentMap.has(stateKey)) {
    return stateKey;
  }
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return defaultKey;
  }
  const candidate = segments[0].toLowerCase();
  if (experimentMap.has(candidate)) {
    return candidate;
  }
  return defaultKey;
}

function updateHistory(key, { replace = false } = {}) {
  const exp = experimentMap.get(key);
  if (!exp) return;
  const state = { experiment: exp.key };
  if (replace) {
    history.replaceState(state, '', exp.path);
  } else {
    history.pushState(state, '', exp.path);
  }
}

function setBusy(isBusy) {
  mainEl.setAttribute('aria-busy', isBusy ? 'true' : 'false');
}

async function loadExperiment(exp, token) {
  setBusy(true);
  rootEl.innerHTML = '';
  try {
    const module = await exp.loader();
    if (token !== loadToken) return;
    if (cleanupCurrent) {
      try { cleanupCurrent(); } catch (error) { console.warn(error); }
      cleanupCurrent = null;
    }
    rootEl.innerHTML = '';
    const submit = createExperimentSubmitter(exp.key, exp.version);
    const context = {
      experimentKey: exp.key,
      experimentMeta: exp,
      storageKey: storageKeyFor(exp.key),
      services: {
        submit,
        consent,
      },
    };
    const cleanup = module && typeof module.mount === 'function'
      ? module.mount({ container: rootEl, context })
      : null;
    cleanupCurrent = typeof cleanup === 'function' ? cleanup : null;
    activeKey = exp.key;
    document.title = `${exp.title} – PSI Experimente`;
    setNavActive(exp.key);
    requestAnimationFrame(() => {
      try { mainEl.focus(); } catch (error) { /* ignore */ }
    });
  } catch (error) {
    console.error('Experiment konnte nicht geladen werden', error);
    rootEl.innerHTML = '<p class="note">Experiment konnte nicht geladen werden.</p>';
  } finally {
    if (token === loadToken) {
      setBusy(false);
    }
  }
}

function navigateTo(key, { push = false, replace = false } = {}) {
  const exp = experimentMap.get(key) || experimentMap.get(defaultKey);
  if (!exp) return;
  const shouldUpdateHistory = push || replace;
  if (shouldUpdateHistory) {
    updateHistory(exp.key, { replace });
  }
  const token = ++loadToken;
  loadExperiment(exp, token);
}

function updateConsentUI() {
  if (!consentToggle || !consentStatus || !consentRevoke) return;
  if (consentState) {
    consentToggle.textContent = 'Upload erlaubt';
    consentToggle.setAttribute('aria-pressed', 'true');
    consentStatus.textContent = 'Uploads sind aktuell erlaubt. Widerruf stoppt alle zukünftigen Übermittlungen.';
    consentRevoke.disabled = false;
  } else {
    consentToggle.textContent = 'Upload gesperrt';
    consentToggle.setAttribute('aria-pressed', 'false');
    consentStatus.textContent = 'Uploads sind aktuell gesperrt. Ohne Freigabe bleiben alle Sessions lokal gespeichert.';
    consentRevoke.disabled = true;
  }
}

function openConsentOverlay() {
  if (!consentOverlay) return;
  lastFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  consentOverlay.hidden = false;
  consentOverlay.setAttribute('aria-hidden', 'false');
  const focusTarget = consentOverlay.querySelector('button:not([disabled])');
  if (focusTarget) {
    focusTarget.focus();
  }
}

function closeConsentOverlay() {
  if (!consentOverlay) return;
  consentOverlay.hidden = true;
  consentOverlay.setAttribute('aria-hidden', 'true');
  if (lastFocusElement) {
    try { lastFocusElement.focus(); } catch (error) { /* ignore */ }
    lastFocusElement = null;
  }
}

if (consentOverlay) {
  consentOverlay.addEventListener('click', event => {
    if (event.target === consentOverlay) {
      closeConsentOverlay();
    }
  });
  consentOverlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeConsentOverlay();
    }
  });
}

if (consentToggle) {
  consentToggle.addEventListener('click', () => openConsentOverlay());
}

if (consentAccept) {
  consentAccept.addEventListener('click', () => {
    updateConsentState(true);
    closeConsentOverlay();
  });
}

if (consentRevoke) {
  consentRevoke.addEventListener('click', () => {
    updateConsentState(false);
    clearConsentState();
    closeConsentOverlay();
  });
}

if (consentCancel) {
  consentCancel.addEventListener('click', () => closeConsentOverlay());
}

updateConsentUI();
buildNav();

const initialKey = resolveKeyFromLocation();
const initialExp = experimentMap.get(initialKey) || experimentMap.get(defaultKey);
if (window.location.pathname === '/' && initialExp) {
  updateHistory(initialExp.key, { replace: true });
}
navigateTo(initialExp.key, { replace: true });

window.addEventListener('popstate', () => {
  const key = resolveKeyFromLocation();
  navigateTo(key, { replace: false });
});
