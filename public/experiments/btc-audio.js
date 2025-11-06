const template = `
  <main class="btc-audio" aria-labelledby="btcAudioTitle">
    <header class="btc-audio__intro">
      <h1 id="btcAudioTitle">BTC Audio Sonifikation (MVP)</h1>
      <p class="btc-audio__consent-hint" data-consent-hint>
        Audio &amp; Datenzugriff starten erst nach deinem Opt-in. Daten bleiben lokal, es werden nur öffentliche BTC-Blockdaten gelesen.
      </p>
      <div class="btc-audio__consent" data-consent-overlay>
        <p>Teilnahme freiwillig &amp; anonym. Audio wird lokal generiert, Blockinformationen stammen aus einer öffentlichen API.</p>
        <button type="button" class="btc-audio__consent-button" data-action="accept-consent">Ich stimme zu</button>
      </div>
    </header>

    <section class="btc-audio__status" aria-live="polite">
      <div class="btc-audio__status-line">
        <span>Status: <strong data-status-state>Gestoppt</strong></span>
        <span>Quelle: <strong data-status-source>Blockchain</strong></span>
        <span>Letztes Update: <strong data-status-updated>--</strong></span>
        <span>Letzte Frequenz: <strong data-status-value>--</strong></span>
      </div>
      <p class="btc-audio__status-message" data-status-message role="status"></p>
      <p class="btc-audio__status-error" data-status-error role="alert" hidden></p>
    </section>

    <section class="btc-audio__controls" aria-label="Steuerung">
      <fieldset class="btc-audio__fieldset" aria-label="Quelle">
        <legend>Quelle</legend>
        <label><input type="radio" name="btc-audio-source" value="btc" checked>BTC&nbsp;Blockhash</label>
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
      </div>
    </section>

    <section class="btc-audio__visual" aria-label="Visualisierung">
      <canvas id="btc-audio-canvas" width="640" height="200" role="img" aria-label="Zeitverlauf der Frequenzen"></canvas>
    </section>

    <section class="btc-audio__exports" aria-label="Datenexport">
      <div class="btc-audio__export-buttons" role="group" aria-label="Export">
        <button type="button" class="secondary" data-action="export-json" disabled>Export JSON</button>
        <button type="button" class="secondary" data-action="export-csv" disabled>Export CSV</button>
      </div>
    </section>
  </main>
`;

const BLOCKCHAIN_ENDPOINT = 'https://blockchain.info/latestblock';
const MAX_POINTS = 160;
const HASH_BYTE_LENGTH = 32;
const RANDOM_SEQUENCE_LENGTH = 32;

const MAPPING_CONFIG = {
  type: 'equal_temperament',
  baseFrequencyHz: 110,
  stepsPerOctave: 12,
  octaves: 5,
  envelope: {
    attack: 0.01,
    decay: 0,
    sustain: 0.85,
    release: 0.25,
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const makeDownload = (filename, mime, dataStr) => {
  const blob = new Blob([dataStr], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
};

const toCsv = record => {
  if (!record) return '';
  const {
    session_id,
    experiment_type,
    source,
    tempo_ms,
    interval_s,
    mapping,
    events = [],
    session_started_at,
    session_finished_at,
    duration_ms,
    event_count,
    block,
  } = record;

  const header = [
    'session_id',
    'experiment_type',
    'source',
    'tempo_ms',
    'interval_s',
    'mapping_type',
    'mapping_base_frequency_hz',
    'mapping_steps_per_octave',
    'mapping_octaves',
    'mapping_min_frequency_hz',
    'mapping_max_frequency_hz',
    'mapping_hash_length_bytes',
    'mapping_random_sequence_length',
    'session_started_at',
    'session_finished_at',
    'duration_ms',
    'event_count',
    'block_hash',
    'block_height',
    'block_time_unix',
    'block_index',
    'event_index',
    'event_timestamp',
    'event_audio_time',
    'event_source',
    'event_byte_value',
    'event_note_step',
    'event_frequency_hz',
    'event_sequence_id',
  ];

  const mapValue = value => {
    if (value === null || value === undefined) return '';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const mappingData = mapping || {};
  const blockData = block || {};

  const rows = events.length
    ? events.map((event, index) => [
        mapValue(session_id),
        mapValue(experiment_type),
        mapValue(event.source || source),
        mapValue(tempo_ms),
        mapValue(interval_s),
        mapValue(mappingData.type || ''),
        mapValue(mappingData.base_frequency_hz ?? mappingData.baseFrequencyHz ?? ''),
        mapValue(mappingData.steps_per_octave ?? mappingData.stepsPerOctave ?? ''),
        mapValue(mappingData.octaves ?? ''),
        mapValue(mappingData.min_frequency_hz ?? mappingData.minFrequencyHz ?? ''),
        mapValue(mappingData.max_frequency_hz ?? mappingData.maxFrequencyHz ?? ''),
        mapValue(mappingData.hash_length_bytes ?? ''),
        mapValue(mappingData.random_sequence_length ?? ''),
        mapValue(session_started_at),
        mapValue(session_finished_at),
        mapValue(duration_ms),
        mapValue(event_count),
        mapValue(event.blockHash ?? blockData.hash ?? ''),
        mapValue(event.blockHeight ?? blockData.height ?? ''),
        mapValue(blockData.time ?? ''),
        mapValue(event.blockIndex ?? blockData.block_index ?? ''),
        mapValue(event.eventIndex ?? index),
        mapValue(event.timestamp),
        mapValue(event.audioTime),
        mapValue(event.source || source),
        mapValue(event.byteValue),
        mapValue(event.noteStep),
        mapValue(event.frequencyHz),
        mapValue(event.sequenceId || ''),
      ])
    : [[
        mapValue(session_id),
        mapValue(experiment_type),
        mapValue(source),
        mapValue(tempo_ms),
        mapValue(interval_s),
        mapValue(mappingData.type || ''),
        mapValue(mappingData.base_frequency_hz ?? mappingData.baseFrequencyHz ?? ''),
        mapValue(mappingData.steps_per_octave ?? mappingData.stepsPerOctave ?? ''),
        mapValue(mappingData.octaves ?? ''),
        mapValue(mappingData.min_frequency_hz ?? mappingData.minFrequencyHz ?? ''),
        mapValue(mappingData.max_frequency_hz ?? mappingData.maxFrequencyHz ?? ''),
        mapValue(mappingData.hash_length_bytes ?? ''),
        mapValue(mappingData.random_sequence_length ?? ''),
        mapValue(session_started_at),
        mapValue(session_finished_at),
        mapValue(duration_ms),
        mapValue(event_count),
        mapValue(blockData.hash ?? ''),
        mapValue(blockData.height ?? ''),
        mapValue(blockData.time ?? ''),
        mapValue(blockData.block_index ?? ''),
        mapValue(''),
        mapValue(''),
        mapValue(''),
        mapValue(source),
        mapValue(''),
        mapValue(''),
        mapValue(''),
        mapValue(''),
      ]];

  return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
};

const hexToBytes = (hexString = '') => {
  const clean = hexString.replace(/[^0-9a-f]/gi, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) {
    const pair = clean.slice(i, i + 2);
    if (pair.length === 2) {
      bytes.push(parseInt(pair, 16));
    }
  }
  return bytes;
};

const getMinFrequency = () => MAPPING_CONFIG.baseFrequencyHz;
const getMaxFrequency = () =>
  MAPPING_CONFIG.baseFrequencyHz * Math.pow(2, ((MAPPING_CONFIG.stepsPerOctave * MAPPING_CONFIG.octaves) - 1) / MAPPING_CONFIG.stepsPerOctave);

const mapByteToFrequency = byte => {
  const totalSteps = MAPPING_CONFIG.stepsPerOctave * MAPPING_CONFIG.octaves;
  const normalized = clamp(byte / 255, 0, 1);
  const step = Math.round(normalized * (totalSteps - 1));
  const frequency = MAPPING_CONFIG.baseFrequencyHz * Math.pow(2, step / MAPPING_CONFIG.stepsPerOctave);
  return {
    frequency: clamp(frequency, getMinFrequency(), getMaxFrequency()),
    noteStep: step,
  };
};

const createSequenceFromBytes = (bytes, meta = {}) =>
  bytes.map((value, index) => {
    const { frequency, noteStep } = mapByteToFrequency(value);
    return {
      byteValue: value,
      noteStep,
      frequencyHz: frequency,
      index,
      sequenceId: meta.sequenceId || null,
      source: meta.source || 'unknown',
      blockHash: meta.blockHash || null,
      blockHeight: meta.blockHeight || null,
      blockIndex: meta.blockIndex || null,
    };
  });

const getRandomBytes = length => {
  const size = Number(length) || RANDOM_SEQUENCE_LENGTH;
  const array = new Uint8Array(size);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < size; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array);
};

const generateSessionId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const random = Math.floor(Math.random() * 1_000_000).toString(16).padStart(5, '0');
  return `session-${Date.now()}-${random}`;
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
  const canvas = root.querySelector('#btc-audio-canvas');
  const canvasCtx = canvas?.getContext('2d');
  const exportJsonBtn = root.querySelector('[data-action="export-json"]');
  const exportCsvBtn = root.querySelector('[data-action="export-csv"]');

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
    !canvasCtx ||
    !exportJsonBtn ||
    !exportCsvBtn
  ) {
    return;
  }

  const state = {
    consentGiven: false,
    running: false,
    source: 'btc',
    tempoMs: Number(tempoInput.value) || 120,
    volume: Number(volumeInput.value) || 0.4,
    interval: Number(intervalInput.value) || 30,
    lastUpdated: null,
    audioCtx: null,
    masterGain: null,
    analyser: null,
    fetchTimer: null,
    tickTimer: null,
    fetchController: null,
    visualData: [],
    sequence: [],
    sequenceIndex: 0,
    sequenceMeta: null,
    currentBlock: null,
    events: [],
    sessionId: null,
    sessionStartedAt: null,
    sessionFinishedAt: null,
    lastSession: null,
    connectionStatus: 'idle',
    mappingInfo: {
      ...MAPPING_CONFIG,
      base_frequency_hz: MAPPING_CONFIG.baseFrequencyHz,
      steps_per_octave: MAPPING_CONFIG.stepsPerOctave,
      min_frequency_hz: getMinFrequency(),
      max_frequency_hz: getMaxFrequency(),
      hash_length_bytes: HASH_BYTE_LENGTH,
      random_sequence_length: RANDOM_SEQUENCE_LENGTH,
    },
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

  const updateExportButtons = () => {
    const hasSession = Boolean(state.lastSession);
    const hasEvents = Boolean(state.lastSession?.events?.length);
    exportJsonBtn.disabled = !(hasSession && hasEvents);
    exportCsvBtn.disabled = !(hasSession && hasEvents);
  };

  const setConnectionStatus = (status, details = {}) => {
    state.connectionStatus = status;
    if (status === 'connected') {
      const { height } = details;
      const suffix = height ? `Block #${height}` : 'Blockchain';
      updateStatus({ message: `Verbunden – ${suffix}.` });
      setError('');
    } else if (status === 'local') {
      updateStatus({ message: 'Lokaler Zufallsmodus aktiv.' });
      setError('');
    } else if (status === 'error') {
      updateStatus({ message: 'Verbindungsfehler – lokaler Fallback.' });
    } else {
      updateStatus({ message: '' });
    }
  };

  const recordVisualEvent = event => {
    if (!event || !Number.isFinite(event.frequencyHz)) {
      return;
    }
    state.visualData.push(event.frequencyHz);
    if (state.visualData.length > MAX_POINTS) {
      state.visualData.splice(0, state.visualData.length - MAX_POINTS);
    }
    drawVisual();
    updateStatus({
      value: `${event.frequencyHz.toFixed(2)} Hz (Byte ${event.byteValue})`,
      updated: new Date(event.timestamp).toLocaleTimeString(),
    });
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
      state.masterGain.gain.value = clamp(state.volume, 0, 1);
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

  const scheduleTone = event => {
    if (!state.audioCtx || !state.masterGain || !event) return;
    const attack = clamp(MAPPING_CONFIG.envelope.attack, 0.005, 0.5);
    const release = clamp(MAPPING_CONFIG.envelope.release, 0.05, 2);
    const osc = state.audioCtx.createOscillator();
    const voiceGain = state.audioCtx.createGain();
    const now = state.audioCtx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(event.frequencyHz, now);
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(1, now + attack);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + release);
    osc.connect(voiceGain).connect(state.masterGain);
    osc.start();
    osc.stop(now + release + 0.05);
  };

  const applySequence = (sequence, meta = {}, block = null) => {
    if (!Array.isArray(sequence) || !sequence.length) {
      return;
    }
    state.sequence = sequence;
    state.sequenceIndex = 0;
    state.sequenceMeta = meta;
    if (block) {
      state.currentBlock = block;
    }
  };

  const setRandomSequence = (reason = 'local') => {
    const bytes = getRandomBytes(RANDOM_SEQUENCE_LENGTH);
    const sequenceId = `${reason}-${Date.now()}`;
    const meta = {
      sequenceId,
      source: reason.startsWith('fallback') ? 'random_fallback' : 'local_random',
    };
    const sequence = createSequenceFromBytes(bytes, meta);
    applySequence(sequence, meta, null);
    if (reason.startsWith('fallback')) {
      state.currentBlock = null;
    }
    if (reason.startsWith('local')) {
      setConnectionStatus('local');
    } else if (reason.startsWith('fallback')) {
      setConnectionStatus('error');
    }
  };

  const getSessionSourceSummary = () => {
    const sources = new Set(state.events.map(event => event.source));
    if (sources.size === 0) {
      return state.source === 'btc' ? 'blockchain' : 'local_random';
    }
    if (sources.size === 1) {
      return Array.from(sources)[0];
    }
    return Array.from(sources).join('+');
  };

  const buildSessionRecord = () => {
    if (!state.sessionId || !state.sessionStartedAt) {
      return null;
    }
    const finishedAt = state.sessionFinishedAt || Date.now();
    return {
      session_id: state.sessionId,
      experiment_type: 'btc_audio',
      source: getSessionSourceSummary(),
      tempo_ms: clamp(state.tempoMs, 80, 200),
      interval_s: state.interval,
      mapping: {
        type: state.mappingInfo.type,
        base_frequency_hz: state.mappingInfo.base_frequency_hz,
        steps_per_octave: state.mappingInfo.steps_per_octave,
        octaves: state.mappingInfo.octaves,
        min_frequency_hz: state.mappingInfo.min_frequency_hz,
        max_frequency_hz: state.mappingInfo.max_frequency_hz,
        hash_length_bytes: state.mappingInfo.hash_length_bytes,
        random_sequence_length: state.mappingInfo.random_sequence_length,
      },
      events: state.events.slice(),
      session_started_at: new Date(state.sessionStartedAt).toISOString(),
      session_finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - state.sessionStartedAt,
      event_count: state.events.length,
      block: state.currentBlock ? { ...state.currentBlock } : null,
      connection_status: state.connectionStatus,
    };
  };

  const finalizeSession = () => {
    if (!state.sessionId || !state.sessionStartedAt) {
      return null;
    }
    state.sessionFinishedAt = Date.now();
    const record = buildSessionRecord();
    state.lastSession = record;
    updateExportButtons();
    return record;
  };

  const resetSessionData = () => {
    state.events = [];
    state.sequence = [];
    state.sequenceIndex = 0;
    state.sequenceMeta = null;
    state.currentBlock = null;
    state.sessionId = generateSessionId();
    state.sessionStartedAt = Date.now();
    state.sessionFinishedAt = null;
    state.lastSession = null;
    state.connectionStatus = state.source === 'btc' ? 'idle' : 'local';
    updateExportButtons();
  };

  const getNextEvent = () => {
    if (!state.sequence.length) {
      return null;
    }
    if (state.sequenceIndex >= state.sequence.length) {
      if (state.sequenceMeta?.source === 'blockchain' && state.connectionStatus === 'connected') {
        state.sequenceIndex = 0;
      } else {
        setRandomSequence(state.source === 'btc' ? 'fallback-loop' : 'local-loop');
      }
    }
    const baseEvent = state.sequence[state.sequenceIndex];
    state.sequenceIndex += 1;
    if (!baseEvent) {
      return null;
    }
    const timestamp = Date.now();
    const audioTime = state.audioCtx ? Number(state.audioCtx.currentTime.toFixed(6)) : null;
    const eventRecord = {
      eventIndex: state.events.length,
      timestamp,
      audioTime,
      byteValue: baseEvent.byteValue,
      noteStep: baseEvent.noteStep,
      frequencyHz: baseEvent.frequencyHz,
      sequenceId: baseEvent.sequenceId,
      source: baseEvent.source,
      blockHash: baseEvent.blockHash,
      blockHeight: baseEvent.blockHeight,
      blockIndex: baseEvent.blockIndex,
    };
    state.events.push(eventRecord);
    return eventRecord;
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
    const wasRunning = state.running;
    state.running = false;
    stopFetchLoop();
    stopTickLoop();
    setButtons(false);
    setConnectionStatus('idle');
    if (wasRunning) {
      finalizeSession();
    }
    updateStatus({ stateText: 'Gestoppt', message: 'Bereit.' });
    if (closeAudio && state.audioCtx) {
      const ctx = state.audioCtx;
      state.audioCtx = null;
      state.masterGain = null;
      state.analyser = null;
      try {
        await ctx.close();
      } catch (error) {
        // ignore close errors
      }
    }
    updateExportButtons();
  };

  const handleBtcFetch = async () => {
    stopFetchLoop();
    const controller = new AbortController();
    state.fetchController = controller;
    const fetchInterval = Math.max(5, state.interval) * 1000;

    const loadBlock = async () => {
      try {
        setError('');
        updateStatus({ message: 'Verbinde Blockchain…' });
        const url = `${BLOCKCHAIN_ENDPOINT}?cors=true&_=${Date.now()}`;
        const response = await fetch(url, {
          cache: 'no-store',
          mode: 'cors',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        const hash = String(json?.hash || '');
        const bytes = hexToBytes(hash).slice(0, HASH_BYTE_LENGTH);
        if (!hash || bytes.length === 0) {
          throw new Error('Kein gültiger Blockhash');
        }
        const heightValue = Number(json?.height ?? json?.block_height);
        const timeValue = Number(json?.time);
        const blockIndexValue = Number(json?.block_index);
        const blockData = {
          hash,
          height: Number.isFinite(heightValue) ? heightValue : null,
          time: Number.isFinite(timeValue) ? timeValue : null,
          block_index: Number.isFinite(blockIndexValue) ? blockIndexValue : null,
        };
        const meta = {
          sequenceId: hash,
          source: 'blockchain',
          blockHash: hash,
          blockHeight: blockData.height,
          blockIndex: blockData.block_index,
        };
        const sequence = createSequenceFromBytes(bytes, meta);
        applySequence(sequence, meta, blockData);
        state.lastUpdated = Date.now();
        setConnectionStatus('connected', blockData);
        updateStatus({
          sourceText: 'Blockchain',
          updated: new Date(state.lastUpdated).toLocaleTimeString(),
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const isCors = error?.name === 'TypeError' && (!error.message || error.message === 'Failed to fetch');
        const message = isCors ? 'CORS/Netzwerkproblem bei Blockchain-API.' : `Blockchain konnte nicht geladen werden: ${error?.message || error}`;
        setError(message);
        setConnectionStatus('error');
        setRandomSequence('fallback-fetch');
      }
    };

    await loadBlock();
    if (!controller.signal.aborted) {
      state.fetchTimer = setInterval(loadBlock, fetchInterval);
    }
  };

  const runTick = () => {
    if (!state.running) return;
    const event = getNextEvent();
    if (!event) return;
    scheduleTone(event);
    recordVisualEvent(event);
  };

  const startTickLoop = () => {
    stopTickLoop();
    const delay = clamp(state.tempoMs, 80, 200);
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
    resetSessionData();
    state.running = true;
    setButtons(true);
    setError('');
    clearCanvas();
    state.visualData.length = 0;
    state.lastUpdated = null;
    updateStatus({ stateText: 'Laufend', value: '--', updated: '--', message: 'Audio läuft…' });
    if (state.source === 'btc') {
      updateStatus({ sourceText: 'Blockchain' });
      handleBtcFetch();
    } else {
      updateStatus({ sourceText: 'Lokal' });
      setRandomSequence('local-start');
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
    updateStatus({ sourceText: value === 'btc' ? 'Blockchain' : 'Lokal' });
    if (state.running) {
      if (value === 'btc') {
        handleBtcFetch();
        state.sequence = [];
        state.sequenceIndex = 0;
        setConnectionStatus('idle');
      } else {
        stopFetchLoop();
        setRandomSequence('local-switch');
      }
    } else {
      setConnectionStatus(value === 'btc' ? 'idle' : 'local');
    }
  };

  const handleTempoInput = event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    state.tempoMs = clamp(value, 80, 200);
    tempoInput.value = state.tempoMs;
    tempoOutput.textContent = `${state.tempoMs}\u00A0ms`;
    if (state.running) {
      startTickLoop();
    }
  };

  const handleVolumeInput = event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    const safeValue = clamp(value, 0, 1);
    state.volume = safeValue;
    volumeInput.value = safeValue;
    volumeOutput.textContent = `${Math.round(safeValue * 100)}\u00A0%`;
    if (state.masterGain && state.audioCtx) {
      const now = state.audioCtx.currentTime;
      state.masterGain.gain.cancelScheduledValues(now);
      state.masterGain.gain.setTargetAtTime(safeValue, now, 0.02);
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

  const getSessionRecord = () => state.lastSession || buildSessionRecord();

  const handleExport = format => {
    const record = getSessionRecord();
    if (!record || !Array.isArray(record.events) || record.events.length === 0) {
      setError('Keine Daten zum Export vorhanden.');
      return;
    }
    const safeId = String(record.session_id || `session-${Date.now()}`).replace(/[^a-z0-9-_]/gi, '_');
    setError('');
    if (format === 'json') {
      makeDownload(`btc-audio-${safeId}.json`, 'application/json', JSON.stringify(record, null, 2));
    } else if (format === 'csv') {
      makeDownload(`btc-audio-${safeId}.csv`, 'text/csv', toCsv(record));
    }
  };

  clearCanvas();
  tempoOutput.textContent = `${state.tempoMs}\u00A0ms`;
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

  const exportJsonHandler = () => handleExport('json');
  exportJsonBtn.addEventListener('click', exportJsonHandler);
  cleanupFns.push(() => exportJsonBtn.removeEventListener('click', exportJsonHandler));

  const exportCsvHandler = () => handleExport('csv');
  exportCsvBtn.addEventListener('click', exportCsvHandler);
  cleanupFns.push(() => exportCsvBtn.removeEventListener('click', exportCsvHandler));

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

