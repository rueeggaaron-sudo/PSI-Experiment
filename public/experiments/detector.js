const VIDEO_WIDTH = 680;
const VIDEO_HEIGHT = 480;
const DEFAULT_THRESHOLD = 0.28;
const SCORE_SMOOTHING = 12;
const EVENT_COOLDOWN_MS = 1500;

const template = `
  <main class="detector" aria-labelledby="detectorTitle">
    <header class="detector__intro">
      <h1 id="detectorTitle">Anomaly Detector (MVP)</h1>
      <p class="detector__consent" role="status">
        Kamera startet nur nach deinem Opt-in. Keine personenbezogenen Daten, Verarbeitung bleibt lokal. Snapshots &amp; Export entstehen nur clientseitig.
      </p>
      <div class="detector__controls" role="group" aria-label="Steuerung">
        <button type="button" data-action="start">Start</button>
        <button type="button" data-action="stop" disabled>Stopp</button>
        <button type="button" data-action="snapshot" disabled>Snapshot</button>
        <button type="button" data-action="baseline" disabled>Referenz aktualisieren</button>
      </div>
      <div class="detector__settings">
        <label for="threshold">Threshold
          <input id="threshold" type="range" min="0" max="1" value="${DEFAULT_THRESHOLD}" step="0.01" aria-describedby="thresholdValue" />
        </label>
        <output id="thresholdValue" class="detector__value" for="threshold">${DEFAULT_THRESHOLD.toFixed(2)}</output>
        <button type="button" data-action="export-json" class="secondary" disabled>Export JSON</button>
        <button type="button" data-action="export-csv" class="secondary" disabled>Export CSV</button>
      </div>
      <p class="detector__hint">Referenz = aktuelles Bild bei Start. Passe den Threshold an, bis Events nur bei echten Abweichungen auftreten.</p>
    </header>

    <section class="detector__live" aria-label="Live-Analyse">
      <div class="detector__canvas-wrap">
        <canvas id="detectorCanvas" width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" role="img" aria-label="Kamera-Stream mit Differenzanalyse"></canvas>
        <video id="detectorVideo" width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" autoplay muted playsinline hidden></video>
      </div>
      <div class="detector__metrics">
        <div class="detector__metric" aria-live="polite">Score: <span id="scoreValue">0.00</span></div>
        <div class="detector__metric">Events: <span id="eventCount">0</span></div>
        <canvas id="scoreSparkline" class="detector__sparkline" width="200" height="48" aria-hidden="true"></canvas>
      </div>
    </section>

    <section class="detector__events" aria-label="Event-Log">
      <header class="detector__events-head">
        <h2>Events</h2>
        <p class="detector__events-note">Events entstehen, wenn der Score den Threshold übersteigt. Snapshots bleiben lokal.</p>
      </header>
      <p id="detectorError" class="detector__error" role="alert" hidden></p>
      <ul id="eventList" class="detector__event-list" aria-live="polite"></ul>
    </section>
  </main>
`;

export function mountDetector(root) {
  if (!root) return;
  root.innerHTML = template;

  const videoEl = root.querySelector('#detectorVideo');
  const canvasEl = root.querySelector('#detectorCanvas');
  const sparklineEl = root.querySelector('#scoreSparkline');
  const startBtn = root.querySelector('[data-action="start"]');
  const stopBtn = root.querySelector('[data-action="stop"]');
  const snapshotBtn = root.querySelector('[data-action="snapshot"]');
  const baselineBtn = root.querySelector('[data-action="baseline"]');
  const exportJsonBtn = root.querySelector('[data-action="export-json"]');
  const exportCsvBtn = root.querySelector('[data-action="export-csv"]');
  const thresholdInput = root.querySelector('#threshold');
  const thresholdValue = root.querySelector('#thresholdValue');
  const scoreValue = root.querySelector('#scoreValue');
  const eventCount = root.querySelector('#eventCount');
  const eventList = root.querySelector('#eventList');
  const errorBox = root.querySelector('#detectorError');

  if (!canvasEl || !videoEl || !startBtn || !stopBtn || !snapshotBtn || !baselineBtn || !thresholdInput || !thresholdValue || !scoreValue || !eventCount || !eventList || !sparklineEl || !exportJsonBtn || !exportCsvBtn || !errorBox) {
    return;
  }

  const ctx = canvasEl.getContext('2d', { alpha: false });
  const sparkCtx = sparklineEl.getContext('2d', { alpha: false });

  let stream = null;
  let rafId = null;
  let running = false;
  let baseline = null;
  let baselineReady = false;
  let sparklineHistory = [];
  let events = [];
  let lastEventAt = 0;
  const sessionId = new Date().toISOString();

  const resetSparkline = () => {
    sparkCtx.clearRect(0, 0, sparklineEl.width, sparklineEl.height);
    sparkCtx.fillStyle = 'rgba(255,255,255,0.08)';
    sparkCtx.fillRect(0, 0, sparklineEl.width, sparklineEl.height);
  };

  resetSparkline();

  const updateSparkline = score => {
    const { width, height } = sparklineEl;
    const maxPoints = width - 2;
    sparklineHistory.push(score);
    if (sparklineHistory.length > SCORE_SMOOTHING * 3) {
      sparklineHistory.shift();
    }
    const slice = sparklineHistory.slice(-maxPoints);
    sparkCtx.clearRect(0, 0, width, height);
    sparkCtx.fillStyle = 'rgba(255,255,255,0.08)';
    sparkCtx.fillRect(0, 0, width, height);
    if (!slice.length) return;
    sparkCtx.strokeStyle = 'rgba(113, 255, 202, 0.85)';
    sparkCtx.lineWidth = 2;
    sparkCtx.beginPath();
    slice.forEach((value, index) => {
      const x = 1 + index;
      const y = height - 4 - Math.min(1, Math.max(0, value)) * (height - 8);
      if (index === 0) {
        sparkCtx.moveTo(x, y);
      } else {
        sparkCtx.lineTo(x, y);
      }
    });
    sparkCtx.stroke();
  };

  const updateScore = score => {
    scoreValue.textContent = score.toFixed(2);
    updateSparkline(score);
  };

  const setError = message => {
    if (!message) {
      errorBox.hidden = true;
      errorBox.textContent = '';
      return;
    }
    errorBox.hidden = false;
    errorBox.textContent = message;
  };

  const setButtons = state => {
    if (state === 'running') {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      snapshotBtn.disabled = false;
      baselineBtn.disabled = false;
      exportJsonBtn.disabled = false;
      exportCsvBtn.disabled = false;
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      snapshotBtn.disabled = true;
      baselineBtn.disabled = true;
    }
  };

  const stopStreamTracks = () => {
    if (!stream) return;
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        // ignore
      }
    });
    stream = null;
  };

  const clearAnimation = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const updateExportState = () => {
    const hasData = running || events.length > 0;
    exportJsonBtn.disabled = !hasData;
    exportCsvBtn.disabled = !hasData;
  };

  const renderEvents = () => {
    eventCount.textContent = events.length;
    eventList.innerHTML = '';
    if (!events.length) {
      const empty = document.createElement('li');
      empty.className = 'detector__event-empty';
      empty.textContent = 'Noch keine Events.';
      eventList.appendChild(empty);
      updateExportState();
      return;
    }

    events.forEach(event => {
      const item = document.createElement('li');
      item.className = 'detector__event-item';
      item.dataset.eventId = event.id;

      const header = document.createElement('div');
      header.className = 'detector__event-meta';
      header.innerHTML = `
        <strong>${event.timestamp}</strong>
        <span>Score: ${event.score.toFixed(3)}</span>
      `;

      const previewWrap = document.createElement('div');
      previewWrap.className = 'detector__event-preview';
      const img = document.createElement('img');
      img.src = event.snapshot;
      img.alt = `Snapshot des Events ${event.id}`;
      img.loading = 'lazy';
      previewWrap.appendChild(img);

      const actionRow = document.createElement('div');
      actionRow.className = 'detector__event-actions';

      const downloadLink = document.createElement('a');
      downloadLink.href = event.snapshot;
      downloadLink.download = `detector-event-${event.id}.png`;
      downloadLink.textContent = 'Download Snapshot';
      downloadLink.className = 'secondary';
      downloadLink.rel = 'noopener';

      const crosscheckBtn = document.createElement('button');
      crosscheckBtn.type = 'button';
      crosscheckBtn.textContent = 'Crosscheck (Stub)';
      crosscheckBtn.className = 'secondary';
      crosscheckBtn.addEventListener('click', () => {
        event.meta = event.meta || {};
        event.meta.crosscheck = 'API nicht konfiguriert';
        const info = item.querySelector('.detector__event-info');
        if (info) {
          info.textContent = event.meta.crosscheck;
        } else {
          const metaInfo = document.createElement('p');
          metaInfo.className = 'detector__event-info';
          metaInfo.textContent = event.meta.crosscheck;
          item.appendChild(metaInfo);
        }
      });

      actionRow.appendChild(downloadLink);
      actionRow.appendChild(crosscheckBtn);

      item.appendChild(header);
      item.appendChild(previewWrap);
      item.appendChild(actionRow);

      if (event.meta && event.meta.crosscheck) {
        const info = document.createElement('p');
        info.className = 'detector__event-info';
        info.textContent = event.meta.crosscheck;
        item.appendChild(info);
      }

      eventList.appendChild(item);
    });

    updateExportState();
  };

  renderEvents();

  const exportPayload = () => ({
    experiment_type: 'detector_mvp',
    session_id: sessionId,
    video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
    threshold: Number(thresholdInput.value),
    events: events.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      score: Number(event.score.toFixed(4)),
      snapshot: event.snapshot,
      meta: event.meta || {},
    })),
  });

  const handleExport = format => {
    const payload = exportPayload();
    let blob;
    let filename;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      filename = `detector-${sessionId}.json`;
    } else {
      const header = ['id', 'timestamp', 'score', 'snapshot', 'meta'];
      const rows = [header.join(',')];
      payload.events.forEach(event => {
        const meta = JSON.stringify(event.meta || {});
        const row = [event.id, event.timestamp, event.score, event.snapshot, meta]
          .map(value => `"${String(value).replace(/"/g, '""')}"`)
          .join(',');
        rows.push(row);
      });
      rows.unshift(`# experiment_type=detector_mvp, threshold=${payload.threshold}`);
      blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      filename = `detector-${sessionId}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const computeScore = frameData => {
    const { data } = frameData;
    const pixelCount = VIDEO_WIDTH * VIDEO_HEIGHT;
    if (!baseline) {
      baseline = new Float32Array(pixelCount);
    }

    let diff = 0;
    for (let i = 0; i < pixelCount; i += 1) {
      const offset = i * 4;
      const gray = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
      if (!baselineReady) {
        baseline[i] = gray;
        continue;
      }
      diff += Math.abs(gray - baseline[i]);
    }

    if (!baselineReady) {
      baselineReady = true;
      return 0;
    }

    const raw = diff / (pixelCount * 255);
    return Math.min(1, Math.max(0, raw));
  };

  const smoothingBuffer = [];

  const step = () => {
    if (!running) return;
    if (videoEl.readyState < 2) {
      rafId = requestAnimationFrame(step);
      return;
    }

    ctx.drawImage(videoEl, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    const frame = ctx.getImageData(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    const score = computeScore(frame);
    smoothingBuffer.push(score);
    if (smoothingBuffer.length > SCORE_SMOOTHING) {
      smoothingBuffer.shift();
    }
    const smoothed = smoothingBuffer.reduce((acc, value) => acc + value, 0) / smoothingBuffer.length;
    updateScore(smoothed);

    const threshold = Number(thresholdInput.value);
    const now = Date.now();
    if (smoothed > threshold) {
      if (now - lastEventAt > EVENT_COOLDOWN_MS) {
        lastEventAt = now;
        const snapshot = canvasEl.toDataURL('image/png');
        const event = {
          id: String(now),
          timestamp: new Date().toISOString(),
          score: smoothed,
          snapshot,
          meta: {},
        };
        events.push(event);
        renderEvents();
      }
    }

    rafId = requestAnimationFrame(step);
  };

  const start = async () => {
    if (running) return;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setError('getUserMedia wird nicht unterstützt.');
      return;
    }
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: VIDEO_WIDTH },
          height: { ideal: VIDEO_HEIGHT },
        },
        audio: false,
      });
      stream = mediaStream;
      videoEl.srcObject = stream;
      baselineReady = false;
      smoothingBuffer.length = 0;
      sparklineHistory.length = 0;
      resetSparkline();
      running = true;
      setButtons('running');
      updateExportState();
      videoEl.play().catch(() => {});
      step();
    } catch (error) {
      setError('Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.');
      stop();
    }
  };

  const stop = () => {
    running = false;
    clearAnimation();
    stopStreamTracks();
    videoEl.srcObject = null;
    setButtons('idle');
    updateExportState();
  };

  const takeSnapshot = () => {
    if (!running) return;
    const data = canvasEl.toDataURL('image/png');
    const link = document.createElement('a');
    const now = new Date();
    const id = now.toISOString();
    link.href = data;
    link.download = `detector-snapshot-${id}.png`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const updateBaseline = () => {
    if (!running) return;
    if (!baseline) {
      baseline = new Float32Array(VIDEO_WIDTH * VIDEO_HEIGHT);
    }
    const frame = ctx.getImageData(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    const { data } = frame;
    const pixelCount = VIDEO_WIDTH * VIDEO_HEIGHT;
    for (let i = 0; i < pixelCount; i += 1) {
      const offset = i * 4;
      baseline[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
    }
    baselineReady = true;
    smoothingBuffer.length = 0;
  };

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  snapshotBtn.addEventListener('click', takeSnapshot);
  baselineBtn.addEventListener('click', updateBaseline);

  thresholdInput.addEventListener('input', () => {
    const value = Number(thresholdInput.value);
    thresholdValue.textContent = value.toFixed(2);
  });

  exportJsonBtn.addEventListener('click', () => handleExport('json'));
  exportCsvBtn.addEventListener('click', () => handleExport('csv'));

  setButtons('idle');
  updateExportState();

  root.__detectorCleanup = () => {
    stop();
    clearAnimation();
    stopStreamTracks();
  };
}

export function unmountDetector(root) {
  if (!root) return;
  if (typeof root.__detectorCleanup === 'function') {
    root.__detectorCleanup();
  }
  delete root.__detectorCleanup;
  root.innerHTML = '';
}
