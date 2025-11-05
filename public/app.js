import { mountPsychokinesis, unmountPsychokinesis } from './experiments/psychokinesis.js';
import { mountPrecognition, unmountPrecognition } from './experiments/precognition.js';
import { mountItk, unmountItk } from './experiments/itk.js';
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
};

const DEFAULT_ROUTE = 'psychokinesis';

const navRoot = document.getElementById('nav');
const appRoot = document.getElementById('app-root');
const consentRoot = document.getElementById('consent-modal');
const toastRoot = document.getElementById('toast-root');

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
      <button type="button" class="app-nav__button" data-action="consent"></button>
      <button type="button" class="app-nav__button secondary" data-action="export">Export</button>
      <a class="app-nav__link app-nav__link--secondary" href="/privacy.html">Datenschutz</a>
    </nav>
  `;
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
    activeRoute.unmount(appRoot);
  }
  route.mount(appRoot);
  activeRoute = route;
  highlightRoute(slug);
}

function handleRouteChange() {
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
      if (action === 'consent') {
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
