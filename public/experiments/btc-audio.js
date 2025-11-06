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
          <input id="btc-audio-tempo" type="range" min="80" max="200" value="120" step="1">
          <output for="btc-audio-tempo" data-output="tempo">120&nbsp;ms</output>
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
        <button type="button" class="secondary" data-action="export-json" disabled>Export&nbsp;JSON</button>
        <button type="button" class="secondary" data-action="export-csv" disabled>Export&nbsp;CSV</button>
      </div>
    </section>

    <section class="btc-audio__visual" aria-label="Visualisierung">
      <canvas id="btc-audio-canvas" width="640" height="200" role="img" aria-label="Zeitverlauf des Quellwertes"></canvas>
    </section>
  </main>
`;

const BLOCKCHAIN_ENDPOINT = 'https://blockchain.info/latestblock';
const MAX_POINTS = 160;
const BYTE_LOOKAHEAD = 32;
const TEMPO_MIN_MS = 80;
const TEMPO_MAX_MS = 200;
const BYTE_QUEUE_LIMIT = 4096;
const EVENT_LIMIT = 4096;
const BYTE_SCALE = {
  baseMidi: 48,
  range: 36,
  referenceNote: 'A4',
  referenceFrequency: 440,
};

const clampTempo = value => {
  if (!Number.isFinite(value)) return 120;
  return Math.min(TEMPO_MAX_MS, Math.max(TEMPO_MIN_MS, Math.round(value)));
};

const midiToFrequency = midi =>
  BYTE_SCALE.referenceFrequency * Math.pow(2, (midi - 69) / 12);

const byteToMidi = byte => {
  const normalized = Math.min(255, Math.max(0, byte)) / 255;
  return Math.round(BYTE_SCALE.baseMidi + normalized * BYTE_SCALE.range);
};

const byteToFrequency = byte => {
  const midi = byteToMidi(byte);
  return {
    midi,
    frequency: midiToFrequency(midi),
  };
};

const createMappingDetails = () => ({
  type: 'byte_to_equal_tempered',
  reference: `${BYTE_SCALE.referenceNote}=${BYTE_SCALE.referenceFrequency}Hz`,
  midi_range: [BYTE_SCALE.baseMidi, BYTE_SCALE.baseMidi + BYTE_SCALE.range],
  formula: 'frequency = 440 * 2^((midi-69)/12); midi = base + normalized_byte * range',
});

const generateSessionId = () => {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    }
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const getRandomBytes = (length = 32) => {
  const output = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(output);
    return output;
  }
  for (let i = 0; i < length; i += 1) {
    output[i] = Math.floor(Math.random() * 256);
  }
  return output;
};

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
  const exportJsonBtn = root.querySelector('[data-action="export-json"]');
  const exportCsvBtn = root.querySelector('[data-action="export-csv"]');
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
    !exportJsonBtn ||
    !exportCsvBtn ||
    !canvas ||
    !canvasCtx
  ) {
    return;
  }

  const state = {
    consentGiven: false,
    running: false,
    source: 'btc',
    tempo: clampTempo(Number(tempoInput.value) || 120),
    volume: Number(volumeInput.value) || 0.4,
    interval: Number(intervalInput.value) || 30,
    lastValue: null,
    lastHash: null,
    lastUpdated: null,
    audioCtx: null,
    masterGain: null,
    analyser: null,
    fetchTimer: null,
    fetchController: null,
    visualData: [],
    byteQueue: [],
    nextNoteTime: 0,
    schedulerRaf: 0,
    sessionId: null,
    sessionStarted: null,
    events: [],
    eventCounter: 0,
    mappingDetails: createMappingDetails(),
    connection: 'idle',
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

  const setConnectionState = (value, message) => {
    state.connection = value;
    if (message) {
      updateStatus({ message });
    }
  };

  const enqueueBytes = (bytes, meta = {}) => {
    if (!bytes || typeof bytes.forEach !== 'function') return;
    bytes.forEach(byte => {
      state.byteQueue.push({
        byte,
        ...meta,
      });
      if (state.byteQueue.length > BYTE_QUEUE_LIMIT) {
        state.byteQueue.splice(0, state.byteQueue.length - BYTE_QUEUE_LIMIT);
      }
    });
  };

  const clearByteQueue = () => {
    state.byteQueue.length = 0;
  };

  const ensureLocalBytes = () => {
    if (state.source !== 'local') return;
    if (state.byteQueue.length >= BYTE_LOOKAHEAD) return;
    const bytes = getRandomBytes(BYTE_LOOKAHEAD);
    enqueueBytes(bytes, { source: 'local' });
  };

  const consumeByte = () => {
    if (state.source === 'local') {
      ensureLocalBytes();
    }
    if (!state.byteQueue.length) {
      return null;
    }
    return state.byteQueue.shift();
  };

  const stopScheduler = () => {
    if (state.schedulerRaf) {
      cancelAnimationFrame(state.schedulerRaf);
      state.schedulerRaf = 0;
    }
  };

  const schedulerLoop = () => {
    if (!state.running || !state.audioCtx) {
      state.schedulerRaf = 0;
      return;
    }
    const lookahead = Math.max(0.05, state.tempo / 1000);
    const now = state.audioCtx.currentTime;
    if (state.nextNoteTime < now) {
      state.nextNoteTime = now;
    }
    while (state.nextNoteTime <= now + lookahead) {
      const next = consumeByte();
      if (!next) break;
      const scheduledAt = state.nextNoteTime;
      scheduleOscillator({
        byte: next.byte,
        blockHeight: next.blockHeight,
        blockHash: next.blockHash,
        source: next.source || state.source,
        scheduledAt,
      });
      state.nextNoteTime += state.tempo / 1000;
    }
    state.schedulerRaf = requestAnimationFrame(schedulerLoop);
  };

  const startScheduler = () => {
    stopScheduler();
    if (!state.audioCtx) return;
    state.nextNoteTime = state.audioCtx.currentTime + 0.05;
    state.schedulerRaf = requestAnimationFrame(schedulerLoop);
  };

  const buildExportPayload = () => {
    if (!state.sessionId) {
      return null;
    }
    const durationMs = state.sessionStarted ? Date.now() - state.sessionStarted : null;
    const mapping = state.mappingDetails || createMappingDetails();
    return {
      session_id: state.sessionId,
      experiment_type: 'btc_audio',
      started_at: state.sessionStarted ? new Date(state.sessionStarted).toISOString() : null,
      duration_ms: durationMs,
      source: state.source,
      connection: state.connection,
      tempo_ms: state.tempo,
      interval_s: state.interval,
      volume: state.volume,
      last_hash: state.lastHash,
      mapping,
      events: state.events.map(event => ({
        index: event.index,
        ts: event.ts,
        audio_time_s: Number.isFinite(event.scheduledAt)
          ? Number(event.scheduledAt.toFixed(4))
          : null,
        byte: event.byte,
        midi: event.midi,
        frequency_hz: Number(event.frequency.toFixed(4)),
        source: event.source,
        block_height: event.blockHeight,
        block_hash: event.blockHash,
      })),
      exported_at: new Date().toISOString(),
      tempo_range_ms: [TEMPO_MIN_MS, TEMPO_MAX_MS],
    };
  };

  const downloadFile = (filename, mime, data) => {
    try {
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      setError(`Export fehlgeschlagen: ${error.message}`);
    }
  };

  const exportJson = () => {
    const payload = buildExportPayload();
    if (!payload) return;
    downloadFile(`btc-audio-${payload.session_id}.json`, 'application/json', JSON.stringify(payload, null, 2));
  };

  const exportCsv = () => {
    const payload = buildExportPayload();
    if (!payload) return;
    const mappingJson = JSON.stringify(payload.mapping || {});
    const escape = value => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const header = [
      'session_id',
      'experiment_type',
      'started_at',
      'exported_at',
      'source',
      'connection',
      'tempo_ms',
      'interval_s',
      'volume',
      'event_index',
      'ts',
      'audio_time_s',
      'byte',
      'midi',
      'frequency_hz',
      'block_height',
      'block_hash',
      'last_hash',
      'mapping_details',
    ];
    const rows = [header.join(',')];
    const events = payload.events.length ? payload.events : [{ index: '', ts: '', audio_time_s: '', byte: '', midi: '', frequency_hz: '', block_height: '', block_hash: '' }];
    events.forEach(event => {
      rows.push(
        [
          escape(payload.session_id),
          escape(payload.experiment_type),
          escape(payload.started_at),
          escape(payload.exported_at),
          escape(payload.source),
          escape(payload.connection),
          escape(payload.tempo_ms),
          escape(payload.interval_s),
          escape(payload.volume),
          escape(event.index),
          escape(event.ts),
          escape(event.audio_time_s),
          escape(event.byte),
          escape(event.midi),
          escape(event.frequency_hz),
          escape(event.block_height),
          escape(event.block_hash),
          escape(payload.last_hash),
          escape(mappingJson),
        ].join(',')
      );
    });
    downloadFile(`btc-audio-${payload.session_id}.csv`, 'text/csv', rows.join('\n'));
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

  const updateExportButtons = () => {
    const hasEvents = state.events.length > 0;
    exportJsonBtn.disabled = !hasEvents;
    exportCsvBtn.disabled = !hasEvents;
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
      state.masterGain.gain.value = Math.max(0, Math.min(1, state.volume));
      state.analyser = state.audioCtx.createAnalyser();
      state.analyser.fftSize = 2048;
      state.masterGain.connect(state.analyser);
      state.analyser.connect(state.audioCtx.destination);
    }
    if (state.audioCtx.state === 'suspended') {
      await state.audioCtx.resume();
    }
    return state.audioCtx;
  };

  const scheduleOscillator = ({ byte, blockHeight, blockHash, scheduledAt, source }) => {
    if (!state.audioCtx || !state.masterGain) return;
    const { midi, frequency } = byteToFrequency(byte);
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, scheduledAt);
    gain.gain.setValueAtTime(0, scheduledAt);
    gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, state.volume)), scheduledAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, scheduledAt + 0.4);
    osc.connect(gain).connect(state.masterGain);
    osc.start(scheduledAt);
    osc.stop(scheduledAt + 0.5);

    const index = state.eventCounter++;
    state.events.push({
      index,
      ts: Date.now(),
      scheduledAt,
      byte,
      midi,
      frequency,
      source,
      blockHeight: Number.isFinite(blockHeight) ? blockHeight : null,
      blockHash: typeof blockHash === 'string' ? blockHash : null,
    });
    if (state.events.length > EVENT_LIMIT) {
      state.events.splice(0, state.events.length - EVENT_LIMIT);
    }
    updateExportButtons();
  };

  const appendValue = (value, { label, decimals = 2, unit } = {}) => {
    if (!Number.isFinite(value)) return;
    state.visualData.push(value);
    if (state.visualData.length > MAX_POINTS) {
      state.visualData.splice(0, state.visualData.length - MAX_POINTS);
    }
    drawVisual();
    const valueLabel =
      typeof label === 'string'
        ? label
        : `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
    updateStatus({
      value: valueLabel,
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

  const stopAll = async ({ closeAudio = false } = {}) => {
    state.running = false;
    stopFetchLoop();
    stopScheduler();
    clearByteQueue();
    setButtons(false);
    updateExportButtons();
    state.connection = 'idle';
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
    clearByteQueue();
    const controller = new AbortController();
    state.fetchController = controller;
    const fetchInterval = Math.max(5, state.interval) * 1000;

    const loadBlock = async () => {
      try {
        setError('');
        setConnectionState('connecting', 'Verbinde zur Blockchain…');
        const url = `${BLOCKCHAIN_ENDPOINT}?cors=true&_=${Date.now()}`;
        const response = await fetch(url, {
          cache: 'no-store',
          mode: 'cors',
          credentials: 'omit',
          signal: controller.signal,
        });
        if (response.type === 'opaque') {
          throw new Error('CORS blockiert Antwort');
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        const hash = typeof json?.hash === 'string' ? json.hash : null;
        const height = Number(json?.height);
        if (!hash) {
          throw new Error('Kein Hash in Antwort');
        }
        const bytes = [];
        for (let i = 0; i < hash.length; i += 2) {
          const fragment = hash.slice(i, i + 2);
          const byte = Number.parseInt(fragment, 16);
          if (Number.isFinite(byte)) {
            bytes.push(byte);
          }
        }
        if (!bytes.length) {
          throw new Error('Hash konnte nicht in Bytes umgewandelt werden');
        }
        state.lastHash = hash;
        state.lastValue = Number.isFinite(height) ? height : bytes[0];
        state.lastUpdated = Date.now();
        appendValue(state.lastValue, {
          label: Number.isFinite(height) ? `Block #${height}` : `Hash ${hash.slice(0, 8)}`,
          decimals: Number.isFinite(height) ? 0 : 2,
        });
        enqueueBytes(bytes, { source: 'btc', blockHeight: height, blockHash: hash });
        setConnectionState('connected', 'BTC-Quelle verbunden.');
        updateStatus({ sourceText: 'BTC' });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setError(`Blockchain-API: ${error.message}`);
        setConnectionState('error', 'Fehler – Fallback mit lokalen Zufallsdaten aktiv.');
        const fallbackBytes = getRandomBytes(BYTE_LOOKAHEAD);
        enqueueBytes(fallbackBytes, { source: 'fallback' });
        const avg = fallbackBytes.reduce((sum, value) => sum + value, 0) / fallbackBytes.length;
        state.lastValue = avg;
        state.lastHash = null;
        state.lastUpdated = Date.now();
        appendValue(avg, { label: `Fallback ${Math.round(avg)}`, decimals: 0 });
      }
    };

    await loadBlock();
    if (!controller.signal.aborted) {
      state.fetchTimer = setInterval(loadBlock, fetchInterval);
    }
  };

  const startLocalMode = () => {
    stopFetchLoop();
    clearByteQueue();
    setError('');
    setConnectionState('local', 'Lokaler Zufallsmodus aktiv.');
    const pushLocal = () => {
      const bytes = getRandomBytes(BYTE_LOOKAHEAD);
      enqueueBytes(bytes, { source: 'local' });
      const avg = bytes.reduce((sum, value) => sum + value, 0) / bytes.length;
      state.lastValue = avg;
      state.lastHash = null;
      state.lastUpdated = Date.now();
      appendValue(avg, { label: `Byte-Mittel ${Math.round(avg)}`, decimals: 0 });
    };
    pushLocal();
    const intervalMs = Math.max(5, state.interval) * 1000;
    state.fetchTimer = setInterval(pushLocal, intervalMs);
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
    state.lastHash = null;
    state.lastUpdated = null;
    state.events = [];
    state.eventCounter = 0;
    updateExportButtons();
    updateStatus({ value: '--', updated: '--' });
    state.sessionId = generateSessionId();
    state.sessionStarted = Date.now();
    state.mappingDetails = createMappingDetails();
    clearByteQueue();
    startScheduler();
    if (state.source === 'btc') {
      updateStatus({ sourceText: 'BTC' });
      handleBtcFetch();
    } else {
      updateStatus({ sourceText: 'Lokal' });
      startLocalMode();
    }
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
        startLocalMode();
      }
    }
  };

  const handleTempoInput = event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    const tempoMs = clampTempo(value);
    state.tempo = tempoMs;
    tempoOutput.textContent = `${tempoMs}\u00A0ms`;
    if (state.running && state.audioCtx) {
      startScheduler();
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
    if (state.running) {
      if (state.source === 'btc') {
        handleBtcFetch();
      } else {
        startLocalMode();
      }
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
  tempoOutput.textContent = `${state.tempo}\u00A0ms`;
  volumeOutput.textContent = `${Math.round(state.volume * 100)}\u00A0%`;
  intervalOutput.textContent = `${state.interval}\u00A0s`;
  updateExportButtons();

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

  exportJsonBtn.addEventListener('click', exportJson);
  cleanupFns.push(() => exportJsonBtn.removeEventListener('click', exportJson));

  exportCsvBtn.addEventListener('click', exportCsv);
  cleanupFns.push(() => exportCsvBtn.removeEventListener('click', exportCsv));

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

