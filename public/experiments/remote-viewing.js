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
  .rv-note {
    margin: 0 auto;
    max-width: 720px;
    font-size: 15px;
    color: rgba(233, 238, 242, 0.68);
    text-align: center;
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
    <p class="rv-note">Hinweis: Sessions werden anonym auf Vercel Blob gespeichert, um Vergleiche zwischen Versuchsreihen zu ermöglichen.</p>
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
  return () => {
    container.innerHTML = '';
  };
}
