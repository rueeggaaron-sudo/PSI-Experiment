const template = `
<main class="itk">
  <section class="block itk__intro">
    <h1>Instrumentelle Transkommunikation (ITK)</h1>
    <p class="lead">Ein visuelles Rauschfeld dient als neutraler Stimulus. Es gibt keine versteckten Inputs – jeder Frame entsteht rein zufällig.</p>
  </section>

  <section class="block itk__experiment" aria-label="Experiment">
    <div class="itk-generator" data-itk-root tabindex="0">
      <div class="itk-generator__canvas-wrap">
        <canvas id="itk-canvas" width="680" height="480" role="img" aria-label="Visuelles Rauschfeld"></canvas>
        <div class="itk-consent" data-itk-consent hidden>
          <div class="itk-consent__card">
            <h2>Experiment starten</h2>
            <p>Teilnahme freiwillig &amp; anonym. Daten bleiben lokal, Export nur auf Wunsch.</p>
            <button type="button" class="itk-button" data-action="accept-consent">Experiment starten</button>
          </div>
        </div>
      </div>
      <div class="itk-controls" data-itk-controls>
        <div class="itk-controls__primary">
          <button type="button" class="itk-button" data-action="toggle" aria-label="Experiment starten oder stoppen">Start</button>
          <button type="button" class="itk-button" data-action="screenshot" aria-label="Screenshot des aktuellen Rauschfeldes speichern" disabled>Screenshot</button>
          <button type="button" class="itk-button" data-action="record" aria-label="5 Sekunden Rauschfeld aufnehmen" hidden>5&nbsp;s Aufnahme</button>
          <button type="button" class="itk-button" data-action="audio" aria-pressed="false" aria-label="Weißes Rauschen aktivieren oder stummschalten">Audio aus</button>
        </div>
        <div class="itk-controls__secondary">
          <fieldset class="itk-fieldset">
            <legend>FPS</legend>
            <label><input type="radio" name="fps" value="15">15</label>
            <label><input type="radio" name="fps" value="25">25</label>
            <label><input type="radio" name="fps" value="30">30</label>
          </fieldset>
          <fieldset class="itk-fieldset">
            <legend>Skalierung</legend>
            <label><input type="radio" name="scale" value="1">1×</label>
            <label><input type="radio" name="scale" value="2">2×</label>
          </fieldset>
          <div class="itk-status" aria-live="polite">
            <span data-itk-fps>FPS: --</span>
            <span data-itk-duration>Dauer: 0.0&nbsp;s</span>
          </div>
        </div>
        <div class="itk-controls__exports">
          <button type="button" class="itk-button secondary" data-action="export-json" disabled>Export JSON</button>
          <button type="button" class="itk-button secondary" data-action="export-csv" disabled>Export CSV</button>
        </div>
      </div>
    </div>
    <div class="itk-note" data-itk-note>
      <p class="note">Space-Taste startet oder stoppt das Experiment. FPS/Skalierung &amp; Audio-Einstellungen werden lokal gespeichert.</p>
      <p class="note">Bei aktiviertem <em>prefers-reduced-motion</em> bleibt das Experiment gestoppt und die Ziel-FPS werden auf 15 begrenzt.</p>
    </div>
  </section>

  <section class="block">
    <h2>Einordnung</h2>
    <p>Instrumentelle Transkommunikation (ITK) beschreibt den Versuch, mittels technischer Geräte Informationen aus unbekannten Quellen zu empfangen. Dieses Experiment stellt dazu ein neutrales visuelles Rauschfeld bereit, das ausschließlich aus kryptografischem Zufall gespeist wird.</p>
  </section>

  <section class="block">
    <h2>Methodik</h2>
    <p>Jeder Frame entsteht über <code>crypto.getRandomValues()</code>. Für jeden Pixel gilt R = G = B, Alpha = 255. Das Feld bleibt damit strikt probabilistisch und frei von eingebetteten Signalen.</p>
    <p>Der Loop verwendet <code>requestAnimationFrame</code> sowie eine Ziel-FPS-Regelung. Bilddaten werden gepuffert und wiederverwendet, um unnötige Allokationen zu vermeiden.</p>
  </section>

  <section class="block">
    <h2>Nutzung</h2>
    <p>Nach dem Consent kann das Rauschfeld mit „Start“ aktiviert werden. Wähle die gewünschte Bildrate (15/25/30 FPS) und Skalierung (1×/2×). Optional lässt sich ein weißes Rauschen zuschalten. Screenshots und (wenn verfügbar) eine 5&nbsp;s-Aufnahme können für spätere Auswertung gespeichert werden.</p>
    <p>Die Live-FPS-Anzeige hilft, Performance einzuschätzen. Während einer Session werden Dauer und Durchschnitts-FPS protokolliert.</p>
  </section>

  <section class="block">
    <h2>Datenschutz</h2>
    <p>Teilnahme ist freiwillig, anonym und erfordert keine personenbezogenen Angaben. Alle Einstellungen und Sessions werden lokal im Browser gespeichert. Exporte stehen als JSON oder CSV zur Verfügung. Ein Upload erfolgt nur, wenn diese Funktion an anderer Stelle explizit aktiviert wurde.</p>
  </section>
</main>
<footer class="itk-footer">
  <span>experiment_type: "itk" – Sessions lokal gespeichert.</span>
  <a href="/privacy.html">Datenschutz</a>
</footer>
`;

const SETTINGS_KEY = 'psi-itk-settings';
const SESSIONS_KEY = 'psi-itk-sessions';
const CONSENT_KEY = 'psi-itk-consent';

const DEFAULT_SETTINGS = {
  fps: 25,
  scale: 1,
  audio: false,
};

const MIN_BASE_WIDTH = 680;
const MIN_BASE_HEIGHT = 480;
const RECORD_DURATION_MS = 5000;

let teardown = null;

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return value == null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // ignore storage errors
  }
}

function detectReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    return false;
  }
}

function formatCsv(rows) {
  if (!rows.length) return '';
  const header = Object.keys(rows[0]);
  const escape = value => {
    if (value == null) return '';
    const text = String(value);
    if (/[,"\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const csvRows = [header.join(',')];
  rows.forEach(row => {
    csvRows.push(header.map(key => escape(row[key])).join(','));
  });
  return csvRows.join('\n');
}

function prepareSessionRecord(metrics, settings) {
  if (!metrics) return null;
  return {
    experiment_type: 'itk',
    session_id: new Date(metrics.startedAt).toISOString(),
    canvas_width: metrics.width,
    canvas_height: metrics.height,
    fps_target: metrics.fpsTarget,
    fps_observed_mean: Number(metrics.avgFps.toFixed(2)),
    duration_seconds: Number((metrics.durationMs / 1000).toFixed(2)),
    settings: {
      audio: !!settings.audio,
      scale: Number(settings.scale || 1),
    },
  };
}

function createNoiseLoop({ canvas, initialSettings, onFrameUpdate, prefersReducedMotion }) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) return null;

  let running = false;
  let frameHandle = null;
  let frameInterval = 1000 / Math.max(1, initialSettings.fps || DEFAULT_SETTINGS.fps);
  let lastFrameTime = 0;
  let startTime = 0;
  let startEpoch = 0;
  let frameCount = 0;
  let width = MIN_BASE_WIDTH;
  let height = MIN_BASE_HEIGHT;
  let imageData = null;
  let pixelView = null;
  let noiseBuffer = null;
  const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
  const maxCryptoChunk = 65536;

  const updateCanvasScale = scale => {
    const safeScale = Math.max(1, Number(scale) || 1);
    width = Math.max(MIN_BASE_WIDTH, Math.round(MIN_BASE_WIDTH * safeScale * deviceScale));
    height = Math.max(MIN_BASE_HEIGHT, Math.round(MIN_BASE_HEIGHT * safeScale * deviceScale));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${Math.round(MIN_BASE_WIDTH * safeScale)}px`;
    canvas.style.height = `${Math.round(MIN_BASE_HEIGHT * safeScale)}px`;
    imageData = ctx.createImageData(width, height);
    pixelView = new Uint32Array(imageData.data.buffer);
    noiseBuffer = new Uint8Array(width * height);
  };

  const updateFps = fps => {
    const safeFps = Math.max(1, Math.min(60, Number(fps) || DEFAULT_SETTINGS.fps));
    frameInterval = 1000 / safeFps;
  };

  const step = timestamp => {
    if (!running) return;
    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }
    const delta = timestamp - lastFrameTime;
    if (delta < frameInterval) {
      frameHandle = requestAnimationFrame(step);
      return;
    }
    lastFrameTime = timestamp;

    if (!noiseBuffer || !pixelView) {
      frameHandle = requestAnimationFrame(step);
      return;
    }

    if (hasCrypto) {
      for (let offset = 0; offset < noiseBuffer.length; offset += maxCryptoChunk) {
        const chunk = noiseBuffer.subarray(offset, Math.min(offset + maxCryptoChunk, noiseBuffer.length));
        crypto.getRandomValues(chunk);
      }
    } else {
      for (let i = 0; i < noiseBuffer.length; i += 1) {
        noiseBuffer[i] = Math.floor(Math.random() * 256);
      }
    }
    for (let i = 0; i < noiseBuffer.length; i += 1) {
      const value = noiseBuffer[i];
      pixelView[i] = (255 << 24) | (value << 16) | (value << 8) | value;
    }

    ctx.putImageData(imageData, 0, 0);
    frameCount += 1;

    if (typeof onFrameUpdate === 'function' && startTime) {
      const now = performance.now();
      const durationMs = now - startTime;
      const avgFps = durationMs > 0 ? (frameCount * 1000) / durationMs : 0;
      onFrameUpdate({
        frameCount,
        durationMs,
        avgFps,
        fpsTarget: Math.round(1000 / frameInterval),
        width,
        height,
      });
    }

    frameHandle = requestAnimationFrame(step);
  };

  const start = () => {
    if (running) return;
    if (prefersReducedMotion) {
      updateFps(Math.min(initialSettings.fps || DEFAULT_SETTINGS.fps, 15));
    }
    running = true;
    startTime = performance.now();
    frameCount = 0;
    lastFrameTime = 0;
    startEpoch = Date.now();
    frameHandle = requestAnimationFrame(step);
  };

  const stop = () => {
    running = false;
    if (frameHandle) {
      cancelAnimationFrame(frameHandle);
      frameHandle = null;
    }
  };

  const teardownLoop = () => {
    stop();
  };

  updateCanvasScale(initialSettings.scale || 1);
  updateFps(initialSettings.fps || DEFAULT_SETTINGS.fps);

  return {
    start,
    stop,
    updateCanvasScale,
    updateFps,
    isRunning: () => running,
    getMetrics: () => ({
      frameCount,
      durationMs: startTime ? performance.now() - startTime : 0,
      avgFps: frameCount && startTime ? (frameCount * 1000) / (performance.now() - startTime) : 0,
      fpsTarget: Math.round(1000 / frameInterval),
      width,
      height,
      startedAt: startEpoch || Date.now(),
    }),
    teardown: teardownLoop,
  };
}

function setupAudio(initialState = false) {
  const support = typeof window !== 'undefined' && typeof window.AudioContext === 'function';
  if (!support) {
    return {
      supported: false,
      toggle: () => false,
      setEnabled: () => false,
      isEnabled: () => false,
      teardown: () => {},
    };
  }

  let context;
  try {
    context = new AudioContext({ latencyHint: 'interactive' });
  } catch (error) {
    return {
      supported: false,
      toggle: () => false,
      setEnabled: () => false,
      isEnabled: () => false,
      teardown: () => {},
    };
  }
  const gain = context.createGain();
  gain.gain.value = initialState ? 0.35 : 0;
  gain.connect(context.destination);

  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gain);
  source.start(0);

  let enabled = !!initialState;

  const ensureRunning = () => {
    if (context.state === 'suspended') {
      context.resume();
    }
  };

  const setEnabled = value => {
    enabled = !!value;
    gain.gain.setTargetAtTime(enabled ? 0.35 : 0, context.currentTime, 0.08);
    if (enabled) {
      ensureRunning();
    }
    return enabled;
  };

  const toggle = () => {
    setEnabled(!enabled);
    return enabled;
  };

  const teardownAudio = () => {
    try {
      source.stop();
    } catch (error) {
      // ignore
    }
    try {
      context.close();
    } catch (error) {
      // ignore
    }
  };

  return {
    supported: true,
    toggle,
    setEnabled,
    isEnabled: () => enabled,
    resume: ensureRunning,
    teardown: teardownAudio,
  };
}

function setupRecorder(canvas) {
  if (!canvas || typeof canvas.captureStream !== 'function' || typeof window === 'undefined') {
    return { supported: false, record: () => Promise.reject(new Error('unsupported')), teardown: () => {} };
  }
  const supportsMediaRecorder = typeof window.MediaRecorder === 'function';
  if (!supportsMediaRecorder) {
    return { supported: false, record: () => Promise.reject(new Error('unsupported')), teardown: () => {} };
  }

  let recorder = null;
  let chunks = [];

  const record = () => new Promise((resolve, reject) => {
    try {
      const stream = canvas.captureStream();
      chunks = [];
      const options = typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? { mimeType: 'video/webm;codecs=vp9' }
        : undefined;
      recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = event => {
        if (event.data && event.data.size) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        stream.getTracks().forEach(track => track.stop());
        resolve(blob);
      };
      recorder.onerror = event => {
        reject(event.error || new Error('Record error'));
      };
      recorder.start();
      const timeout = setTimeout(() => {
        if (recorder && recorder.state === 'recording') {
          recorder.stop();
        }
      }, RECORD_DURATION_MS);
      recorder.onstop = ((originalHandler) => event => {
        try {
          clearTimeout(timeout);
        } catch (error) {
          // ignore
        }
        if (typeof originalHandler === 'function') {
          originalHandler(event);
        }
      })(recorder.onstop);
    } catch (error) {
      reject(error);
    }
  });

  const teardownRecorder = () => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    chunks = [];
    recorder = null;
  };

  return {
    supported: true,
    record,
    teardown: teardownRecorder,
  };
}

export function mountItk(root) {
  if (!root) return;
  root.innerHTML = template;
  const container = root.querySelector('[data-itk-root]');
  const canvas = root.querySelector('#itk-canvas');
  const toggleBtn = root.querySelector('[data-action="toggle"]');
  const screenshotBtn = root.querySelector('[data-action="screenshot"]');
  const recordBtn = root.querySelector('[data-action="record"]');
  const audioBtn = root.querySelector('[data-action="audio"]');
  const exportJsonBtn = root.querySelector('[data-action="export-json"]');
  const exportCsvBtn = root.querySelector('[data-action="export-csv"]');
  const consentOverlay = root.querySelector('[data-itk-consent]');
  const consentBtn = root.querySelector('[data-action="accept-consent"]');
  const fpsDisplay = root.querySelector('[data-itk-fps]');
  const durationDisplay = root.querySelector('[data-itk-duration]');
  const fpsInputs = root.querySelectorAll('input[name="fps"]');
  const scaleInputs = root.querySelectorAll('input[name="scale"]');

  const prefersReducedMotion = detectReducedMotion();

  const storedSettings = loadFromStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(storedSettings || {}),
  };
  if (prefersReducedMotion && settings.fps > 15) {
    settings.fps = 15;
  }
  const consentGiven = loadFromStorage(CONSENT_KEY, false);
  if (!consentGiven && consentOverlay) {
    consentOverlay.hidden = false;
  }

  if (fpsDisplay) {
    fpsDisplay.textContent = `FPS: -- / ${settings.fps}`;
  }
  if (durationDisplay) {
    durationDisplay.innerHTML = 'Dauer: 0.0&nbsp;s';
  }

  let sessionMetrics = null;
  let sessions = loadFromStorage(SESSIONS_KEY, []);
  if (!Array.isArray(sessions)) {
    sessions = [];
  }

  const loop = createNoiseLoop({
    canvas,
    initialSettings: settings,
    prefersReducedMotion,
    onFrameUpdate: ({ durationMs, avgFps, fpsTarget }) => {
      if (fpsDisplay) {
        fpsDisplay.textContent = `FPS: ${avgFps.toFixed(1)} / ${fpsTarget}`;
      }
      if (durationDisplay) {
        durationDisplay.innerHTML = `Dauer: ${(durationMs / 1000).toFixed(1)}&nbsp;s`;
      }
      sessionMetrics = {
        durationMs,
        avgFps,
        fpsTarget,
      };
    },
  });

  if (!loop) {
    if (toggleBtn) toggleBtn.disabled = true;
    if (screenshotBtn) screenshotBtn.disabled = true;
    if (recordBtn) recordBtn.disabled = true;
    if (audioBtn) audioBtn.disabled = true;
    if (exportJsonBtn) exportJsonBtn.disabled = true;
    if (exportCsvBtn) exportCsvBtn.disabled = true;
    if (consentOverlay) {
      consentOverlay.hidden = true;
    }
    teardown = () => {};
    return;
  }

  const recorder = setupRecorder(canvas);
  if (recorder.supported && recordBtn) {
    recordBtn.hidden = false;
  }

  const audio = setupAudio(settings.audio);
  if (!audio.supported && audioBtn) {
    audioBtn.disabled = true;
    audioBtn.textContent = 'Audio n/a';
    audioBtn.setAttribute('aria-disabled', 'true');
  } else if (audioBtn) {
    audioBtn.textContent = audio.isEnabled() ? 'Audio an' : 'Audio aus';
    audioBtn.setAttribute('aria-pressed', audio.isEnabled().toString());
  }

  const updateSettings = next => {
    Object.assign(settings, next);
    saveToStorage(SETTINGS_KEY, settings);
  };

  const updateButtons = running => {
    const consentBlocked = consentOverlay && !consentOverlay.hidden;
    if (toggleBtn) {
      toggleBtn.textContent = running ? 'Stopp' : 'Start';
      toggleBtn.dataset.state = running ? 'running' : 'idle';
      toggleBtn.disabled = consentBlocked && !running;
    }
    if (screenshotBtn) {
      screenshotBtn.disabled = consentBlocked;
    }
    if (recordBtn && recorder.supported) {
      recordBtn.disabled = consentBlocked || !running;
    }
  };

  const stopSession = () => {
    loop.stop();
    updateButtons(false);
    const metrics = loop.getMetrics();
    const durationMs = sessionMetrics && sessionMetrics.durationMs ? sessionMetrics.durationMs : metrics.durationMs;
    const avgFps = sessionMetrics && sessionMetrics.avgFps ? sessionMetrics.avgFps : metrics.avgFps;
    if (durationMs > 0 && metrics.frameCount > 0) {
      const record = prepareSessionRecord({
        ...metrics,
        durationMs,
        avgFps,
      }, settings);
      if (record) {
        sessions.unshift(record);
        sessions = sessions.slice(0, 50);
        saveToStorage(SESSIONS_KEY, sessions);
        updateExportButtons();
      }
    }
    sessionMetrics = null;
  };

  const startSession = () => {
    if (consentOverlay && !consentOverlay.hidden) {
      return;
    }
    loop.start();
    audio.resume && audio.resume();
    updateButtons(true);
    sessionMetrics = null;
    const metrics = loop.getMetrics();
    if (fpsDisplay) {
      fpsDisplay.textContent = `FPS: ${(metrics.avgFps || settings.fps).toFixed(1)} / ${metrics.fpsTarget}`;
    }
    if (durationDisplay) {
      durationDisplay.innerHTML = 'Dauer: 0.0&nbsp;s';
    }
  };

  const handleToggle = () => {
    if (loop.isRunning()) {
      stopSession();
    } else {
      startSession();
    }
  };

  const handleScreenshot = () => {
    if (!canvas) return;
    if (consentOverlay && !consentOverlay.hidden) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `itk-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const handleRecord = async () => {
    if (!recorder.supported) return;
    if (consentOverlay && !consentOverlay.hidden) return;
    if (recordBtn) {
      recordBtn.disabled = true;
      recordBtn.textContent = 'Aufnahme…';
    }
    try {
      const blob = await recorder.record();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `itk-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (error) {
      console.warn('Aufnahme fehlgeschlagen', error);
    } finally {
      if (recordBtn) {
        recordBtn.disabled = false;
        recordBtn.textContent = '5\u00a0s Aufnahme';
      }
    }
  };

  const handleAudioToggle = () => {
    const next = audio.toggle();
    updateSettings({ audio: next });
    if (audioBtn) {
      audioBtn.textContent = next ? 'Audio an' : 'Audio aus';
      audioBtn.setAttribute('aria-pressed', next.toString());
    }
  };

  const updateExportButtons = () => {
    const hasSessions = Array.isArray(sessions) && sessions.length > 0;
    if (exportJsonBtn) exportJsonBtn.disabled = !hasSessions;
    if (exportCsvBtn) exportCsvBtn.disabled = !hasSessions;
  };

  updateExportButtons();

  fpsInputs.forEach(input => {
    const value = Number(input.value);
    if (value === Number(settings.fps)) {
      input.checked = true;
    }
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const nextFps = prefersReducedMotion ? Math.min(value, 15) : value;
      loop.updateFps(nextFps);
      updateSettings({ fps: nextFps });
      if (prefersReducedMotion && value !== nextFps) {
        fpsInputs.forEach(radio => {
          radio.checked = Number(radio.value) === nextFps;
        });
      }
    });
  });

  scaleInputs.forEach(input => {
    const value = Number(input.value);
    if (value === Number(settings.scale)) {
      input.checked = true;
    }
    input.addEventListener('change', () => {
      if (!input.checked) return;
      loop.updateCanvasScale(value);
      updateSettings({ scale: value });
    });
  });

  const handleExport = format => {
    const records = Array.isArray(sessions) ? sessions : [];
    if (!records.length) return;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `itk-sessions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else if (format === 'csv') {
      const flatRows = records.map(rec => ({
        experiment_type: rec.experiment_type,
        session_id: rec.session_id,
        canvas_width: rec.canvas_width,
        canvas_height: rec.canvas_height,
        fps_target: rec.fps_target,
        fps_observed_mean: rec.fps_observed_mean,
        duration_seconds: rec.duration_seconds,
        audio: rec.settings?.audio,
        scale: rec.settings?.scale,
      }));
      const blob = new Blob([formatCsv(flatRows)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `itk-sessions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  const handleConsent = () => {
    saveToStorage(CONSENT_KEY, true);
    if (consentOverlay) {
      consentOverlay.hidden = true;
    }
    updateButtons(loop.isRunning());
  };

  const handleKeydown = event => {
    if (event.code === 'Space') {
      const tag = event.target && event.target.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag.toUpperCase())) {
        return;
      }
      event.preventDefault();
      handleToggle();
    }
  };

  if (toggleBtn) toggleBtn.addEventListener('click', handleToggle);
  if (screenshotBtn) screenshotBtn.addEventListener('click', handleScreenshot);
  if (recordBtn && recorder.supported) recordBtn.addEventListener('click', handleRecord);
  if (audioBtn && audio.supported) audioBtn.addEventListener('click', handleAudioToggle);
  const handleExportJson = () => handleExport('json');
  const handleExportCsv = () => handleExport('csv');

  if (exportJsonBtn) exportJsonBtn.addEventListener('click', handleExportJson);
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', handleExportCsv);
  if (consentBtn) consentBtn.addEventListener('click', handleConsent);

  const keydownTarget = typeof window !== 'undefined' ? window : container;
  if (keydownTarget) keydownTarget.addEventListener('keydown', handleKeydown, { passive: false });

  teardown = () => {
    stopSession();
    loop.teardown();
    audio.teardown();
    recorder.teardown();
    if (toggleBtn) toggleBtn.removeEventListener('click', handleToggle);
    if (screenshotBtn) screenshotBtn.removeEventListener('click', handleScreenshot);
    if (recordBtn && recorder.supported) recordBtn.removeEventListener('click', handleRecord);
    if (audioBtn && audio.supported) audioBtn.removeEventListener('click', handleAudioToggle);
    if (exportJsonBtn) exportJsonBtn.removeEventListener('click', handleExportJson);
    if (exportCsvBtn) exportCsvBtn.removeEventListener('click', handleExportCsv);
    if (consentBtn) consentBtn.removeEventListener('click', handleConsent);
    if (keydownTarget) keydownTarget.removeEventListener('keydown', handleKeydown, { passive: false });
  };

  updateButtons(false);
}

export function unmountItk(root) {
  if (typeof teardown === 'function') {
    teardown();
  }
  teardown = null;
  if (root) {
    root.innerHTML = '';
  }
}
