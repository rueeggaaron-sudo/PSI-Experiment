const template = `
  <main class="btc-audio" aria-labelledby="btcAudioTitle">
    <header class="btc-audio__intro">
      <h1 id="btcAudioTitle">BTC Audio Sonifikation (MVP)</h1>
      <p class="btc-audio__consent-hint" data-consent-hint>
        Audio &amp; Datenzugriff starten erst nach deinem Opt-in. Daten bleiben lokal, BTC-Kurs wird nur gelesen.
      </p>
      <div class="btc-audio__consent" data-consent-overlay>
        <p>Teilnahme freiwillig &amp; anonym. Audio wird lokal generiert, BTC-Preise stammen aus einer öffentlichen API.</p>
        <button type="button" class="btc-audio__consent-button" data-action="accept-consent">Ich stimme zu</button>
      </div>
    </header>

    <section class="btc-audio__status" aria-live="polite">
      <div class="btc-audio__status-line">
        <span>Status: <strong data-status-state>Gestoppt</strong></span>
        <span>Quelle: <strong data-status-source>BTC</strong></span>
        <span>Letztes Update: <strong data-status-updated>--</strong></span>
        <span>Wert: <strong data-status-value>--</strong></span>
      </div>
      <p class="btc-audio__status-message" data-status-message role="status"></p>
      <p class="btc-audio__status-error" data-status-error role="alert" hidden></p>
    </section>

    <section class="btc-audio__controls" aria-label="Steuerung">
      <fieldset class="btc-audio__fieldset" aria-label="Quelle">
        <legend>Quelle</legend>
        <label><input type="radio" name="btc-audio-source" value="btc" checked>BTC&nbsp;Live</label>
        <label><input type="radio" name="btc-audio-source" value="local">Lokal</label>
      </fieldset>

      <div class="btc-audio__sliders">
        <label class="btc-audio__slider">
          Tempo
          <input id="btc-audio-tempo" type="range" min="40" max="240" value="120" step="1">
          <output for="btc-audio-tempo" data-output="tempo">120&nbsp;BPM</output>
        </label>
        <label class="btc-audio__slider">
          Lautstärke
          <input id="btc-audio-volume" type="range" min="0" max="1" value="0.4" step="0.01">
          <output for="btc-audio-volume" data-output="volume">40&nbsp;%</output>
        </label>
        <label class="btc-audio__slider">
          Intervall
          <input id="btc-audio-interval" type="range" min="5" max="120" value="30" step="1">
          <output for="btc-audio-interval" data-output="interval">30&nbsp;s</output>
        </label>
      </div>

      <div class="btc-audio__buttons" role="group" aria-label="Start und Stopp">
        <button type="button" data-action="start" disabled>Start</button>
        <button type="button" data-action="stop" disabled>Stopp</button>
      </div>
    </section>

    <section class="btc-audio__visual" aria-label="Visualisierung">
      <canvas id="btc-audio-canvas" width="640" height="200" role="img" aria-label="Zeitverlauf des Quellwertes"></canvas>
    </section>
  </main>
`;

const BTC_ENDPOINT = 'https://api.coindesk.com/v1/bpi/currentprice/USD.json';
const MAX_POINTS = 160;

let activeTeardown = null;

export function mount({ root, navigate } = {}) {
  unmount();
  if (!root) return;

  root.innerHTML = template;

  const consentOverlay = root.querySelector('[data-consent-overlay]');
  const consentHint = root.querySelector('[data-consent-hint]');
  const acceptConsentBtn = root.querySelector('[data-action="accept-consent"]');
  const startBtn = root.querySelector('[data-action="start"]');
  const stopBtn = root.querySelector('[data-action="stop"]');
  const statusState = root.querySelector('[data-status-state]');
  const statusSource = root.querySelector('[data-status-source]');
  const statusUpdated = root.querySelector('[data-status-updated]');
  const statusValue = root.querySelector('[data-status-value]');
  const statusMessage = root.querySelector('[data-status-message]');
  const statusError = root.querySelector('[data-status-error]');
  const sourceRadios = Array.from(root.querySelectorAll('input[name="btc-audio-source"]'));
  const tempoInput = root.querySelector('#btc-audio-tempo');
  const volumeInput = root.querySelector('#btc-audio-volume');
  const intervalInput = root.querySelector('#btc-audio-interval');
  const tempoOutput = root.querySelector('output[data-output="tempo"]');
  const volumeOutput = root.querySelector('output[data-output="volume"]');
  const intervalOutput = root.querySelector('output[data-output="interval"]');
  const canvas = root.querySelector('#btc-audio-canvas');
  const canvasCtx = canvas?.getContext('2d');

  if (
    !consentOverlay ||
    !consentHint ||
    !acceptConsentBtn ||
    !startBtn ||
    !stopBtn ||
    !statusState ||
    !statusSource ||
    !statusUpdated ||
    !statusValue ||
    !statusMessage ||
    !statusError ||
    !tempoInput ||
    !volumeInput ||
    !intervalInput ||
    !tempoOutput ||
    !volumeOutput ||
    !intervalOutput ||
    !canvas ||
    !canvasCtx
  ) {
    return;
  }

  const state = {
    consentGiven: false,
    running: false,
    source: 'btc',
    tempo: Number(tempoInput.value) || 120,
    volume: Number(volumeInput.value) || 0.4,
    interval: Number(intervalInput.value) || 30,
    lastValue: null,
    lastUpdated: null,
    audioCtx: null,
    masterGain: null,
    fetchTimer: null,
    tickTimer: null,
    fetchController: null,
    visualData: [],
    localPhase: 0,
  };

  const cleanupFns = [];

  const clearCanvas = () => {
    canvasCtx.fillStyle = '#050711';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.strokeStyle = 'rgba(113, 255, 202, 0.5)';
    canvasCtx.lineWidth = 2;
  };

  const drawVisual = () => {
    clearCanvas();
    const points = state.visualData;
    if (!points.length) {
      return;
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = canvas.width;
    const height = canvas.height;
    canvasCtx.beginPath();
    points.forEach((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * (width - 20) + 10;
      const normalized = (value - min) / range;
      const y = height - 20 - normalized * (height - 40);
      if (index === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
    });
    canvasCtx.stroke();
  };

  const updateStatus = ({
    stateText,
    sourceText,
    updated,
    value,
    message,
  } = {}) => {
    if (typeof stateText === 'string') {
      statusState.textContent = stateText;
    }
    if (typeof sourceText === 'string') {
      statusSource.textContent = sourceText;
    }
    if (typeof updated === 'string') {
      statusUpdated.textContent = updated;
    }
    if (typeof value === 'string') {
      statusValue.textContent = value;
    }
    if (typeof message === 'string') {
      statusMessage.textContent = message;
    }
  };

  const setError = message => {
    if (!message) {
      statusError.hidden = true;
      statusError.textContent = '';
      return;
    }
    statusError.hidden = false;
    statusError.textContent = message;
  };

  const setButtons = running => {
    startBtn.disabled = running || !state.consentGiven;
    stopBtn.disabled = !running;
  };

  const ensureAudioContext = async () => {
    if (!state.audioCtx) {
      try {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        setError('AudioContext konnte nicht initialisiert werden.');
        throw error;
      }
      state.masterGain = state.audioCtx.createGain();
      state.masterGain.gain.value = state.volume;
      state.masterGain.connect(state.audioCtx.destination);
    }
    if (state.audioCtx.state === 'suspended') {
      await state.audioCtx.resume();
    }
    return state.audioCtx;
  };

  const triggerTone = value => {
    if (!state.audioCtx || !state.masterGain) return;
    const freqBase = 220;
    const freq = Number.isFinite(value)
      ? Math.max(110, Math.min(880, freqBase + Math.log(value) * 12))
      : 330;
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain).connect(state.masterGain);
    const now = state.audioCtx.currentTime;
    const volume = Math.max(0, Math.min(1, state.volume));
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.3);
  };

  const appendValue = value => {
    if (!Number.isFinite(value)) return;
    state.visualData.push(value);
    if (state.visualData.length > MAX_POINTS) {
      state.visualData.splice(0, state.visualData.length - MAX_POINTS);
    }
    drawVisual();
    updateStatus({
      value: `${value.toFixed(2)} USD`,
      updated: state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : '--',
    });
  };

  const stopFetchLoop = () => {
    if (state.fetchTimer) {
      clearInterval(state.fetchTimer);
      state.fetchTimer = null;
    }
    if (state.fetchController) {
      state.fetchController.abort();
      state.fetchController = null;
    }
  };

  const stopTickLoop = () => {
    if (state.tickTimer) {
      clearInterval(state.tickTimer);
      state.tickTimer = null;
    }
  };

  const stopAll = async ({ closeAudio = false } = {}) => {
    state.running = false;
    stopFetchLoop();
    stopTickLoop();
    setButtons(false);
    updateStatus({ stateText: 'Gestoppt', message: 'Bereit.' });
    if (closeAudio && state.audioCtx) {
      const ctx = state.audioCtx;
      state.audioCtx = null;
      state.masterGain = null;
      try {
        await ctx.close();
      } catch (error) {
        // ignore close errors
      }
    }
  };

  const handleBtcFetch = async () => {
    stopFetchLoop();
    const controller = new AbortController();
    state.fetchController = controller;
    const fetchInterval = Math.max(5, state.interval) * 1000;

    const loadPrice = async () => {
      try {
        setError('');
        updateStatus({ message: 'Hole BTC-Kurs…' });
        const response = await fetch(BTC_ENDPOINT, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        const price = Number(json?.bpi?.USD?.rate_float);
        if (!Number.isFinite(price)) {
          throw new Error('Kein Kurs verfügbar');
        }
        state.lastValue = price;
        state.lastUpdated = Date.now();
        appendValue(price);
        updateStatus({ message: 'Live-Modus aktiv.' });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setError(`BTC-Kurs konnte nicht geladen werden: ${error.message}`);
        updateStatus({ message: 'Fallback auf letzten Wert.' });
      }
    };

    await loadPrice();
    if (!controller.signal.aborted) {
      state.fetchTimer = setInterval(loadPrice, fetchInterval);
    }
  };

  const generateLocalValue = () => {
    state.localPhase += (state.tempo / 60) * 0.1;
    const sinus = Math.sin(state.localPhase);
    const noise = (Math.random() - 0.5) * 200;
    const baseline = 20000;
    const span = 5000;
    const value = baseline + sinus * span + noise;
    state.lastUpdated = Date.now();
    state.lastValue = value;
    return value;
  };

  const runTick = () => {
    if (!state.running) return;
    let value = null;
    if (state.source === 'btc') {
      value = state.lastValue;
      if (!Number.isFinite(value)) {
        return;
      }
    } else {
      value = generateLocalValue();
      appendValue(value);
    }
    triggerTone(value);
  };

  const startTickLoop = () => {
    stopTickLoop();
    const tempo = Math.max(40, state.tempo);
    const delay = Math.max(100, Math.round((60_000 / tempo)));
    state.tickTimer = setInterval(runTick, delay);
  };

  const startAll = async () => {
    if (!state.consentGiven) {
      consentOverlay.hidden = false;
      return;
    }
    if (state.running) return;
    try {
      await ensureAudioContext();
    } catch (error) {
      return;
    }
    state.running = true;
    setButtons(true);
    setError('');
    updateStatus({ stateText: 'Laufend', message: 'Audio läuft…' });
    clearCanvas();
    state.visualData.length = 0;
    state.lastValue = null;
    state.lastUpdated = null;
    if (state.source === 'btc') {
      updateStatus({ sourceText: 'BTC' });
      handleBtcFetch();
    } else {
      updateStatus({ sourceText: 'Lokal' });
      appendValue(generateLocalValue());
    }
    startTickLoop();
  };

  const handleConsent = () => {
    state.consentGiven = true;
    consentOverlay.hidden = true;
    consentHint.textContent = 'Consent erteilt – du kannst das Experiment jederzeit stoppen.';
    setButtons(state.running);
    startBtn.disabled = false;
    startBtn.focus({ preventScroll: true });
  };

  const handleSourceChange = event => {
    if (!event?.target?.value) return;
    const value = event.target.value;
    state.source = value;
    updateStatus({ sourceText: value === 'btc' ? 'BTC' : 'Lokal' });
    if (state.running) {
      if (value === 'btc') {
        handleBtcFetch();
      } else {
        stopFetchLoop();
        appendValue(generateLocalValue());
      }
    }
  };

  const handleTempoInput = event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    state.tempo = value;
    tempoOutput.textContent = `${value}\u00A0BPM`;
    if (state.running) {
      startTickLoop();
    }
  };

  const handleVolumeInput = event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    state.volume = value;
    volumeOutput.textContent = `${Math.round(value * 100)}\u00A0%`;
    if (state.masterGain && state.audioCtx) {
      const now = state.audioCtx.currentTime;
      state.masterGain.gain.cancelScheduledValues(now);
      state.masterGain.gain.setTargetAtTime(value, now, 0.02);
    }
  };

  const handleIntervalInput = event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    state.interval = value;
    intervalOutput.textContent = `${value}\u00A0s`;
    if (state.running && state.source === 'btc') {
      handleBtcFetch();
    }
  };

  const handleStop = () => {
    stopAll();
  };

  const handleNavigate = event => {
    if (!navigate) return;
    const target = event?.target?.closest('[data-link]');
    if (target && target.dataset.link) {
      navigate(target.dataset.link);
    }
  };

  clearCanvas();
  tempoOutput.textContent = `${state.tempo}\u00A0BPM`;
  volumeOutput.textContent = `${Math.round(state.volume * 100)}\u00A0%`;
  intervalOutput.textContent = `${state.interval}\u00A0s`;

  acceptConsentBtn.addEventListener('click', handleConsent);
  cleanupFns.push(() => acceptConsentBtn.removeEventListener('click', handleConsent));

  startBtn.addEventListener('click', startAll);
  cleanupFns.push(() => startBtn.removeEventListener('click', startAll));

  stopBtn.addEventListener('click', handleStop);
  cleanupFns.push(() => stopBtn.removeEventListener('click', handleStop));

  tempoInput.addEventListener('input', handleTempoInput);
  cleanupFns.push(() => tempoInput.removeEventListener('input', handleTempoInput));

  volumeInput.addEventListener('input', handleVolumeInput);
  cleanupFns.push(() => volumeInput.removeEventListener('input', handleVolumeInput));

  intervalInput.addEventListener('input', handleIntervalInput);
  cleanupFns.push(() => intervalInput.removeEventListener('input', handleIntervalInput));

  sourceRadios.forEach(radio => {
    const handler = handleSourceChange;
    radio.addEventListener('change', handler);
    cleanupFns.push(() => radio.removeEventListener('change', handler));
  });

  root.addEventListener('click', handleNavigate);
  cleanupFns.push(() => root.removeEventListener('click', handleNavigate));

  updateStatus({ message: 'Consent erforderlich.' });

  activeTeardown = () => {
    cleanupFns.splice(0).forEach(fn => {
      try {
        fn();
      } catch (error) {
        // ignore cleanup errors
      }
    });
    root.innerHTML = '';
    const stopResult = stopAll({ closeAudio: true });
    if (stopResult && typeof stopResult.catch === 'function') {
      stopResult.catch(() => {});
    }
  };
}

export function unmount() {
  if (typeof activeTeardown === 'function') {
    const teardown = activeTeardown;
    activeTeardown = null;
    return teardown();
  }
}

