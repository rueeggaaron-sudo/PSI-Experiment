const template = `
  <main class="btc-audio" aria-labelledby="btcAudioTitle">
    <section class="block btc-audio__intro">
      <h1 id="btcAudioTitle">Bitcoin Hash → Akustische Frequenzmuster</h1>
      <p class="lead">
        Dieser Prototyp übersetzt Bitcoin-Blockhashes in eine kontinuierliche Klanglandschaft.
        Der finale Aufbau kombiniert Realtime-Hashfeeds mit spektralen Filtern, um hörbare Muster zu erzeugen,
        die anschließend statistisch ausgewertet werden können.
      </p>
      <p>
        Die aktuelle Version dient als Platzhalter, bis die finale Audio-Engine und Auswertelogik
        integriert ist. Du kannst bereits die Upload-Einstellungen prüfen oder einen Export vorbereiten.
      </p>
    </section>

    <section class="block btc-audio__status" aria-live="polite">
      <h2>Status</h2>
      <p class="note">
        Implementierung in Arbeit – die interaktive Oberfläche folgt in einem kommenden Update.
      </p>
      <div class="btc-audio__actions">
        <button type="button" data-action="consent" class="secondary">
          Upload-Einstellungen öffnen
        </button>
        <button type="button" data-action="export" class="secondary">
          Export starten
        </button>
      </div>
    </section>
  </main>
`;

let cleanupHandlers = null;

export function mountBtcAudio(root, context = {}) {
  const target = root || document.getElementById('app-root');
  if (!target) return;

  unmountBtcAudio(target);

  target.innerHTML = template;

  const { consentController, triggerDataExport, showToast } = context || {};
  const consentButton = target.querySelector('[data-action="consent"]');
  const exportButton = target.querySelector('[data-action="export"]');

  const teardowns = [];

  if (consentButton && consentController && typeof consentController.open === 'function') {
    const handleConsentClick = event => {
      event.preventDefault();
      consentController.open({ source: 'btc-audio' });
    };
    consentButton.addEventListener('click', handleConsentClick);
    teardowns.push(() => consentButton.removeEventListener('click', handleConsentClick));
  }

  if (exportButton && typeof triggerDataExport === 'function') {
    const handleExportClick = event => {
      event.preventDefault();
      triggerDataExport();
      if (typeof showToast === 'function') {
        showToast('Export geöffnet', { variant: 'info', duration: 2400 });
      }
    };
    exportButton.addEventListener('click', handleExportClick);
    teardowns.push(() => exportButton.removeEventListener('click', handleExportClick));
  }

  cleanupHandlers = () => {
    teardowns.forEach(fn => {
      try {
        fn();
      } catch (error) {
        // Swallow cleanup errors silently; event listeners are best-effort removed.
      }
    });
    cleanupHandlers = null;
  };
}

export function unmountBtcAudio(root) {
  const target = root || document.getElementById('app-root');
  if (!target) return;
  if (typeof cleanupHandlers === 'function') {
    cleanupHandlers();
  }
  target.innerHTML = '';
}

export { mountBtcAudio as mount, unmountBtcAudio as unmount };

export default {
  mount: mountBtcAudio,
  unmount: unmountBtcAudio,
};

if (typeof window !== 'undefined') {
  window.__psiExperiments = window.__psiExperiments || {};
  window.__psiExperiments['btc-audio'] = {
    mount: mountBtcAudio,
    unmount: unmountBtcAudio,
  };
}
