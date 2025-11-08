import { mountPsychokinesis, unmountPsychokinesis } from './experiments/psychokinesis.js';
import { mountPrecognition, unmountPrecognition } from './experiments/precognition.js';
import { mountItk, unmountItk } from './experiments/itk.js';
import { mountDetector, unmountDetector } from './experiments/detector.js';
import { mountBtcAudio, unmountBtcAudio } from './experiments/btc-audio.js';
import { initializeConsent } from './helpers/consent.js';
import { initializeToasts, triggerDataExport } from './helpers/data.js';

const ROUTES = {
  psychokinesis: {
    label: 'Psychokinese',
    mount: mountPsychokinesis,
    unmount: unmountPsychokinesis,
  },
  precognition: {
    label: 'Präkognition',
    mount: mountPrecognition,
    unmount: unmountPrecognition,
  },
  itk: {
    label: 'Transkommunikation',
    mount: mountItk,
    unmount: unmountItk,
  },
  detector: {
    label: 'Anomaly Detector',
    mount: mountDetector,
    unmount: unmountDetector,
  },
  'btc-audio': {
    label: 'Bitcoin Hash → Akustische Frequenzmuster',
    mount: mountBtcAudio,
    unmount: unmountBtcAudio,
  },
};

const DEFAULT_ROUTE = 'psychokinesis';

const navRoot = document.getElementById('nav');
const appRoot = document.getElementById('app-root');
const consentRoot = document.getElementById('consent-modal');
const toastRoot = document.getElementById('toast-root');
let navOverlayRoot = null;
let navOverlayListenersBound = false;
let navOverlayOpen = false;
let navOverlayLastFocus = null;

const { showToast } = initializeToasts(toastRoot);
const consentController = initializeConsent(consentRoot, {
  onChange(value, meta) {
    updateConsentButton(value);
    const variant = value ? 'success' : 'info';
    const message = value ? 'Anonymer Upload aktiviert' : 'Upload bleibt lokal';
    const metaSource = meta && meta.source ? meta.source : 'system';
    showToast(message, {
      variant,
      duration: 3200,
      description: metaSource === 'storage' ? 'Von einem anderen Tab übernommen.' : undefined,
    });
  },
});

const routeContext = {
  consentController,
  triggerDataExport,
  showToast,
};

let activeRoute = null;

function renderNav() {
  if (!navRoot) return;
  const links = Object.entries(ROUTES)
    .map(([slug, route]) => {
      const label = route && route.label ? route.label : slug;
      return `<a class="app-nav__link" href="#/${slug}" data-route="${slug}">${label}</a>`;
    })
    .join('\n      ');
  navRoot.innerHTML = `
    <nav class="app-nav" aria-label="Navigation">
      ${links}
      <span class="app-nav__spacer"></span>
      <button type="button" class="app-nav__button secondary" data-action="experiments">Experimente</button>
      <button type="button" class="app-nav__button" data-action="consent"></button>
      <button type="button" class="app-nav__button secondary" data-action="export">Export</button>
      <a class="app-nav__link app-nav__link--secondary" href="/privacy.html">Datenschutz</a>
    </nav>
  `;
  ensureNavOverlayRoot();
}

function updateConsentButton(consented) {
  if (!navRoot) return;
  const button = navRoot.querySelector('[data-action="consent"]');
  if (!button) return;
  const granted = consented === null ? false : !!consented;
  button.dataset.state = granted ? 'granted' : 'denied';
  button.textContent = granted ? 'Upload aktiv' : 'Upload aus';
  if (consented === null) {
    button.title = 'Upload-Einstellung wählen';
  } else {
    button.title = granted ? 'Uploads deaktivieren oder ändern' : 'Uploads aktivieren';
  }
}

function highlightRoute(slug) {
  if (!navRoot) return;
  navRoot.querySelectorAll('[data-route]').forEach(link => {
    const isActive = link.dataset.route === slug;
    link.classList.toggle('app-nav__link--active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function ensureNavOverlayRoot() {
  if (navOverlayRoot) return navOverlayRoot;
  navOverlayRoot = document.getElementById('nav-overlay');
  if (!navOverlayRoot) {
    navOverlayRoot = document.createElement('div');
    navOverlayRoot.id = 'nav-overlay';
    navOverlayRoot.className = 'nav-overlay';
    navOverlayRoot.setAttribute('hidden', '');
    document.body.appendChild(navOverlayRoot);
  }
  if (!navOverlayListenersBound) {
    navOverlayRoot.addEventListener('click', handleNavOverlayClick);
    navOverlayListenersBound = true;
  }
  return navOverlayRoot;
}

function handleNavOverlayClick(event) {
  const overlay = ensureNavOverlayRoot();
  if (!overlay) return;
  const dismissTarget = event.target.closest('[data-overlay-dismiss]');
  if (dismissTarget) {
    event.preventDefault();
    closeNavOverlay();
    return;
  }
  const routeTarget = event.target.closest('[data-route]');
  if (routeTarget) {
    const route = routeTarget.dataset.route;
    if (!route) return;
    event.preventDefault();
    window.location.hash = `#/${route}`;
    closeNavOverlay();
  }
}

function handleNavOverlayKeydown(event) {
  if (!navOverlayOpen) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeNavOverlay();
  }
}

function openNavOverlay() {
  const overlay = ensureNavOverlayRoot();
  if (!overlay || navOverlayOpen) return;
  const cards = Object.entries(ROUTES)
    .map(([slug, route]) => {
      const label = route && route.label ? route.label : slug;
      return `
        <li class="nav-overlay__grid-item">
          <button type="button" class="nav-overlay__card" data-route="${slug}">
            <span class="nav-overlay__card-title">${label}</span>
          </button>
        </li>`;
    })
    .join('');
  overlay.innerHTML = `
    <div class="nav-overlay__backdrop" data-overlay-dismiss="true"></div>
    <div class="nav-overlay__panel" role="dialog" aria-modal="true" aria-labelledby="nav-overlay-title">
      <header class="nav-overlay__header">
        <h2 id="nav-overlay-title">Experimente</h2>
        <p class="nav-overlay__subtitle">Wähle ein Experiment aus</p>
      </header>
      <ul class="nav-overlay__grid" role="list">
        ${cards}
      </ul>
    </div>
  `;
  navOverlayLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlay.classList.add('visible');
  overlay.removeAttribute('hidden');
  navOverlayOpen = true;
  document.addEventListener('keydown', handleNavOverlayKeydown, true);
  const firstCard = overlay.querySelector('[data-route]');
  if (firstCard && typeof firstCard.focus === 'function') {
    requestAnimationFrame(() => firstCard.focus());
  }
}

function closeNavOverlay() {
  if (!navOverlayOpen) return;
  const overlay = ensureNavOverlayRoot();
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.setAttribute('hidden', '');
  overlay.innerHTML = '';
  navOverlayOpen = false;
  document.removeEventListener('keydown', handleNavOverlayKeydown, true);
  if (navOverlayLastFocus && typeof navOverlayLastFocus.focus === 'function') {
    navOverlayLastFocus.focus();
  }
  navOverlayLastFocus = null;
}

function parseRoute(hash) {
  const raw = typeof hash === 'string' && hash.length ? hash : '#';
  const trimmed = raw.startsWith('#') ? raw.slice(1) : raw;
  const clean = trimmed.replace(/^\/+/, '');
  const slug = clean.split(/[?#]/)[0];
  if (!slug) return DEFAULT_ROUTE;
  return ROUTES[slug] ? slug : DEFAULT_ROUTE;
}

function mountRoute(slug) {
  const route = ROUTES[slug] || ROUTES[DEFAULT_ROUTE];
  if (!route) return;
  if (activeRoute && typeof activeRoute.unmount === 'function') {
    activeRoute.unmount(appRoot, routeContext);
  }
  route.mount(appRoot, routeContext);
  activeRoute = route;
  highlightRoute(slug);
}

function handleRouteChange() {
  if (navOverlayOpen) {
    closeNavOverlay();
  }
  const slug = parseRoute(window.location.hash);
  if (!slug) return;
  if (ROUTES[slug] !== activeRoute) {
    mountRoute(slug);
  } else {
    highlightRoute(slug);
  }
}

function setupNavHandlers() {
  if (!navRoot) return;
  navRoot.addEventListener('click', event => {
    const targetButton = event.target.closest('button[data-action]');
    if (targetButton) {
      event.preventDefault();
      const action = targetButton.dataset.action;
      if (action === 'experiments') {
        openNavOverlay();
      } else if (action === 'consent') {
        consentController.open();
      } else if (action === 'export') {
        triggerDataExport();
        showToast('Export geöffnet', { variant: 'info', duration: 2400 });
      }
      return;
    }
    const anchor = event.target.closest('a[data-route]');
    if (anchor) {
      const route = anchor.dataset.route;
      if (!route) return;
      event.preventDefault();
      window.location.hash = `#/${route}`;
    }
  });
}

function bootstrap() {
  renderNav();
  setupNavHandlers();
  updateConsentButton(consentController.getConsent());
  handleRouteChange();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}

window.addEventListener('hashchange', handleRouteChange);
