const styles = `
  .rv-experiment {
    display: grid;
    gap: 24px;
  }
  .rv-experiment h2 {
    margin: 0;
    text-align: center;
  }
  .rv-experiment .lead {
    max-width: 720px;
    margin: 0 auto;
    color: rgba(233, 238, 242, 0.78);
    text-align: center;
  }
  .rv-callout {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 18px 20px;
    background: rgba(15, 20, 24, 0.55);
    max-width: 720px;
    margin: 0 auto;
    line-height: 1.7;
    color: rgba(230, 234, 238, 0.9);
  }
  .rv-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .rv-actions button {
    border-radius: 12px;
    padding: 10px 16px;
    font: inherit;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.08);
    color: inherit;
    transition: background 0.2s ease;
  }
  .rv-actions button:hover,
  .rv-actions button:focus-visible {
    background: rgba(255, 255, 255, 0.18);
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 122, 26, 0.35);
  }
`;

const template = `
  <section class="rv-experiment">
    <header>
      <h2>Remote Viewing</h2>
      <p class="lead">Experiment in Vorbereitung. Ziel: beschreibe ein zufällig gewähltes Zielbild ohne es zu sehen.</p>
    </header>
    <div class="rv-callout">
      <p>Wir erarbeiten ein Setup mit verdeckten Zielbildern, Feedback nach Session und strukturiertem Protokoll. Dieses Preview dient als Platzhalter, damit Navigation und Datenfluss getestet werden können.</p>
      <p>Hast du besondere Anforderungen (z.&nbsp;B. Protokoll nach CRV, Freitext vs. Multiple Choice)? Lass es uns wissen – Feedback hilft bei der Priorisierung.</p>
    </div>
    <div class="rv-actions">
      <button type="button" data-action="consent">Upload-Einstellungen</button>
    </div>
  </section>
`;

let styleInjected = false;

function ensureStyles() {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.dataset.experimentStyle = 'remote-viewing';
  style.textContent = styles;
  document.head.appendChild(style);
  styleInjected = true;
}

export function mount({ container, context = {} }) {
  ensureStyles();
  container.innerHTML = template;
  const consentButton = container.querySelector('button[data-action="consent"]');
  const handler = () => {
    context.services?.consent?.requestConsent?.();
  };
  if (consentButton && typeof handler === 'function') {
    consentButton.addEventListener('click', handler);
  }
  return () => {
    if (consentButton && typeof handler === 'function') {
      consentButton.removeEventListener('click', handler);
    }
    container.innerHTML = '';
  };
}
