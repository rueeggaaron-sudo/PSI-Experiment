import { installSubmitExperimentData } from '../helpers/submit.js';

const template = `<main>
  <section class="block">
    <h1>Präkognition Selbstexperiment</h1>
    <p class="lead">Kannst du den Ausgang eines versteckten Zufallsereignisses vorab spüren? Dieses Experiment bietet eine ruhige Sequenz an Vorhersagen, um genau das zu testen.</p>
  </section>

  <section class="block" id="intro">
    <h2>Was wird untersucht?</h2>
    <p>In jeder Runde trifft ein fairer Zufallsgenerator eine Entscheidung zwischen zwei Symbolen. Deine Aufgabe ist es, das Ergebnis bereits vor der Offenlegung zu fühlen und anschließend deine Intuition festzuhalten.</p>
    <p>Fokussiere dich wenige Sekunden lang, bevor du eine Entscheidung triffst. Notiere gern Eindrücke im Kommentarfeld, um Muster bei wiederholten Sessions zu erkennen.</p>
  </section>

  <section class="block" id="experiment">
    <h2>Experiment durchführen</h2>
    <p class="summary-note">Wähle die gewünschte Rundenzahl, starte die Session und entscheide dich dann Runde für Runde zwischen Sonne (☀︎) und Mond (☾).</p>
    <div class="controls">
      <label>Anzahl Runden
        <select id="roundCount">
          <option value="10">10</option>
          <option value="20" selected>20</option>
          <option value="30">30</option>
          <option value="40">40</option>
        </select>
      </label>
      <label>Session-Notiz
        <input id="sessionNote" type="text" maxlength="80" placeholder="optional" />
      </label>
    </div>
    <div class="actions">
      <button id="startSession">Session starten</button>
      <button id="resetSession" class="secondary" disabled>Reset</button>
    </div>
    <div id="guessControls" class="note" hidden aria-hidden="true">
      <p id="roundStatus" class="result-info" aria-live="polite">Session noch nicht gestartet.</p>
      <div class="actions" style="justify-content:center;gap:12px;margin-top:16px;">
        <button data-guess="sun" class="primary">☀︎ Sonne</button>
        <button data-guess="moon" class="primary">☾ Mond</button>
      </div>
      <p class="summary-note" style="margin-top:16px;">Warte einen Moment, richte deine Aufmerksamkeit auf das kommende Symbol und treffe dann deine Wahl.</p>
    </div>
    <div id="history" class="note" aria-live="polite"></div>
  </section>

  <section class="block" id="results">
    <h2>Resultate</h2>
    <div class="result-wrap">
      <div class="result-head">
        <div class="result-key">
          <span id="accuracy" class="result-accuracy">--.-%</span>
          <div class="result-pwrap">
            <span class="result-pvalue">p = <span id="pValue">--</span></span>
            <span id="resultBadge" class="badge tier-random">im Zufallsbereich</span>
          </div>
        </div>
        <p class="result-info">Trefferquote relativ zu reinem Zufall (50&nbsp;%). p-Wert basiert auf einer zweiseitigen Binomialverteilung.</p>
        <p class="result-note">p ≥ 0.10 → Zufallsbereich. 0.05 ≤ p &lt; 0.10 → leicht. 0.01 ≤ p &lt; 0.05 → auffällig. 0.001 ≤ p &lt; 0.01 → sehr auffällig. p &lt; 0.001 → extrem auffällig.</p>
      </div>
      <div class="note" id="sessionSummary"></div>
      <div class="actions" style="margin-top:16px;justify-content:flex-start;gap:12px;">
        <button id="saveSession" disabled>Session speichern</button>
        <button id="downloadSession" class="secondary" disabled>Download JSON</button>
      </div>
      <p id="storageHint" class="summary-note">Uploads erfolgen nur bei aktivierter Einwilligung. Ohne Einwilligung bleibt alles lokal.</p>
    </div>
  </section>

  <section class="block">
    <h2>Nachwort</h2>
    <p class="note">Vergleiche mehrere Sessions, beobachte Tagesform, Stimmung oder äußere Einflüsse. Bleib neugierig, aber auch kritisch – außergewöhnliche Resultate sollten sich reproduzieren lassen.</p>
  </section>
</main>`;

const SYMBOLS = {
  sun: {
    label: 'Sonne',
    icon: '☀︎',
  },
  moon: {
    label: 'Mond',
    icon: '☾',
  },
};

function logFactorial(n) {
  let result = 0;
  for (let i = 2; i <= n; i += 1) {
    result += Math.log(i);
  }
  return result;
}

function binomialProbability(n, k, p = 0.5) {
  if (p === 0) {
    return k === 0 ? 1 : 0;
  }
  if (p === 1) {
    return k === n ? 1 : 0;
  }
  const logProb = logFactorial(n) - logFactorial(k) - logFactorial(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logProb);
}

function twoSidedPValue(total, hits) {
  if (!Number.isFinite(total) || total <= 0) {
    return 1;
  }
  const expected = total / 2;
  if (hits === expected) {
    return 1;
  }
  const isLowerTail = hits < expected;
  let tail = 0;
  if (isLowerTail) {
    for (let i = 0; i <= hits; i += 1) {
      tail += binomialProbability(total, i);
    }
  } else {
    for (let i = hits; i <= total; i += 1) {
      tail += binomialProbability(total, i);
    }
  }
  return Math.min(1, tail * 2);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '--.-%';
  return `${value.toFixed(1)}%`;
}

function formatPValue(value) {
  if (!Number.isFinite(value)) return '--';
  if (value < 0.001) return '< 0.001';
  return value.toFixed(3);
}

function badgeTier(pValue) {
  if (!Number.isFinite(pValue) || pValue >= 0.10) return { tier: 'tier-random', label: 'im Zufallsbereich' };
  if (pValue >= 0.05) return { tier: 'tier-light', label: 'leicht auffällig' };
  if (pValue >= 0.01) return { tier: 'tier-medium', label: 'auffällig' };
  if (pValue >= 0.001) return { tier: 'tier-strong', label: 'sehr auffällig' };
  return { tier: 'tier-extreme', label: 'extrem auffällig' };
}

function initPrecognitionExperiment() {
  const roundSelect = document.getElementById('roundCount');
  const noteInput = document.getElementById('sessionNote');
  const startButton = document.getElementById('startSession');
  const resetButton = document.getElementById('resetSession');
  const guessContainer = document.getElementById('guessControls');
  const guessButtons = Array.from(guessContainer.querySelectorAll('[data-guess]'));
  const roundStatus = document.getElementById('roundStatus');
  const historyEl = document.getElementById('history');
  const accuracyEl = document.getElementById('accuracy');
  const pValueEl = document.getElementById('pValue');
  const badgeEl = document.getElementById('resultBadge');
  const summaryEl = document.getElementById('sessionSummary');
  const saveButton = document.getElementById('saveSession');
  const downloadButton = document.getElementById('downloadSession');
  const storageHint = document.getElementById('storageHint');

  let session = null;
  let lastRecord = null;

  function resetView() {
    guessContainer.hidden = true;
    guessContainer.setAttribute('aria-hidden', 'true');
    historyEl.innerHTML = '';
    roundStatus.textContent = 'Session noch nicht gestartet.';
    accuracyEl.textContent = '--.-%';
    pValueEl.textContent = '--';
    badgeEl.textContent = 'im Zufallsbereich';
    badgeEl.className = 'badge tier-random';
    summaryEl.textContent = '';
    saveButton.disabled = true;
    downloadButton.disabled = true;
    storageHint.textContent = 'Uploads erfolgen nur bei aktivierter Einwilligung. Ohne Einwilligung bleibt alles lokal.';
    lastRecord = null;
  }

  function createSession() {
    const total = parseInt(roundSelect.value, 10);
    session = {
      total: Number.isFinite(total) ? total : 20,
      note: noteInput.value.trim(),
      rounds: [],
      active: true,
      hits: 0,
      misses: 0,
    };
    guessContainer.hidden = false;
    guessContainer.setAttribute('aria-hidden', 'false');
    startButton.disabled = true;
    resetButton.disabled = false;
    roundSelect.disabled = true;
    noteInput.disabled = true;
    saveButton.disabled = true;
    downloadButton.disabled = true;
    historyEl.innerHTML = '';
    roundStatus.textContent = 'Bereit für Runde 1 – nimm dir Zeit, bevor du ein Symbol wählst.';
    storageHint.textContent = 'Uploads erfolgen nur bei aktivierter Einwilligung. Ohne Einwilligung bleibt alles lokal.';
  }

  function renderHistory() {
    if (!session) return;
    const fragments = session.rounds.slice(-5).map(entry => {
      const result = SYMBOLS[entry.result];
      const guess = SYMBOLS[entry.guess];
      const status = entry.hit ? 'Treffer' : 'daneben';
      return `<div>Runde ${entry.round}: ${guess.icon} → ${result.icon} (${status})</div>`;
    });
    const remaining = session.total - session.rounds.length;
    const tail = remaining > 0 ? `<div style="margin-top:6px;color:var(--muted);">Noch ${remaining} Runde${remaining === 1 ? '' : 'n'}.</div>` : '';
    historyEl.innerHTML = `${fragments.join('')}${tail}`;
  }

  function updateSummary() {
    if (!session) return;
    const total = session.rounds.length;
    if (total === 0) {
      accuracyEl.textContent = '--.-%';
      pValueEl.textContent = '--';
      badgeEl.textContent = 'im Zufallsbereich';
      badgeEl.className = 'badge tier-random';
      summaryEl.textContent = '';
      return;
    }
    const hits = session.hits;
    const accuracy = (hits / total) * 100;
    const pValue = twoSidedPValue(total, hits);
    const tier = badgeTier(pValue);
    accuracyEl.textContent = formatPercent(accuracy);
    pValueEl.textContent = formatPValue(pValue);
    badgeEl.textContent = tier.label;
    badgeEl.className = `badge ${tier.tier}`;
    summaryEl.textContent = `Treffer: ${hits} von ${total}. Verfehlungen: ${session.misses}.`;
  }

  function updateButtonsState() {
    const disableGuess = !session || !session.active;
    guessButtons.forEach(button => {
      button.disabled = disableGuess;
    });
    saveButton.disabled = !lastRecord;
    downloadButton.disabled = !lastRecord;
  }

  function finishSession() {
    if (!session) return;
    session.active = false;
    roundStatus.textContent = 'Session abgeschlossen. Du kannst das Ergebnis speichern oder erneut starten.';
    startButton.disabled = false;
    resetButton.disabled = false;
    roundSelect.disabled = false;
    noteInput.disabled = false;
    const total = session.rounds.length;
    const pValue = twoSidedPValue(total, session.hits);
    lastRecord = {
      experiment: 'precognition',
      version: 1,
      ts: Date.now(),
      totalRounds: total,
      hits: session.hits,
      misses: session.misses,
      pValue,
      accuracy: total ? session.hits / total : 0,
      note: session.note,
      rounds: session.rounds,
    };
    updateButtonsState();
  }

  function handleGuess(guessKey) {
    if (!session || !session.active) return;
    if (!SYMBOLS[guessKey]) return;
    const roundIndex = session.rounds.length + 1;
    const resultKey = Math.random() < 0.5 ? 'sun' : 'moon';
    const hit = guessKey === resultKey;
    session.rounds.push({
      round: roundIndex,
      guess: guessKey,
      result: resultKey,
      hit,
    });
    if (hit) {
      session.hits += 1;
    } else {
      session.misses += 1;
    }
    const remaining = session.total - session.rounds.length;
    if (remaining > 0) {
      roundStatus.textContent = `Runde ${roundIndex + 1} von ${session.total}. Nimm dir erneut kurz Zeit.`;
    } else {
      roundStatus.textContent = 'Alle Runden abgeschlossen.';
    }
    renderHistory();
    updateSummary();
    if (session.rounds.length >= session.total) {
      finishSession();
    }
  }

  function resetSession() {
    session = null;
    startButton.disabled = false;
    resetButton.disabled = true;
    roundSelect.disabled = false;
    noteInput.disabled = false;
    noteInput.value = '';
    resetView();
    updateButtonsState();
  }

  function downloadJson(record) {
    if (!record) return;
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `psi-precognition-${record.ts}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  startButton.addEventListener('click', () => {
    createSession();
    updateButtonsState();
  });

  resetButton.addEventListener('click', () => {
    resetSession();
  });

  guessButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      handleGuess(button.dataset.guess);
      updateButtonsState();
    });
  });

  saveButton.addEventListener('click', () => {
    if (!lastRecord) return;
    if (typeof window !== 'undefined' && typeof window.submitExperimentData === 'function') {
      window.submitExperimentData(lastRecord);
      storageHint.textContent = 'Session gespeichert. Upload erfolgt nur, wenn die Einwilligung aktiv war.';
    } else {
      storageHint.textContent = 'Upload nicht verfügbar. Session bleibt lokal.';
    }
  });

  downloadButton.addEventListener('click', () => {
    if (!lastRecord) return;
    downloadJson(lastRecord);
    storageHint.textContent = 'JSON-Download gestartet.';
  });

  resetView();
  updateButtonsState();
}

export function mountPrecognition(target = document.getElementById('app-root')) {
  const root = target || document.getElementById('app-root');
  if (!root) return;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('bg-mist');
    document.body.classList.add('bg-stars');
  }
  root.innerHTML = template;
  installSubmitExperimentData();
  initPrecognitionExperiment();
}

export function unmountPrecognition(target = document.getElementById('app-root')) {
  const root = target || document.getElementById('app-root');
  if (!root) return;
  root.innerHTML = '';
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('bg-stars');
  }
}

if (typeof window !== 'undefined') {
  window.__psiExperiments = window.__psiExperiments || {};
  window.__psiExperiments.precognition = {
    mount: mountPrecognition,
    unmount: unmountPrecognition,
  };
}
