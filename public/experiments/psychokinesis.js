import { installSubmitExperimentData } from '../helpers/submit.js';

// Legacy Psychokinesis experiment markup and logic.
const template = `<main>
  <!-- EDIT: TEXTE (Landing & Einleitung) -->
  <section class="block">
    <h1>Psychokinese Selbstexperiment</h1>
    <p class="lead">Teste deine Fähigkeit, den Zufall zu beeinflussen. Beobachte, ob dein Geist subtile Veränderungen in einem völlig fairen 50/50‑Zufallssystem bewirken kann.</p>
  </section>

  <section class="block" id="intro">
    <h2>Was ist Psychokinese?</h2>
    <p>Psychokinese ist die Fähigkeit, Materie allein mit der Kraft der Gedanken zu beeinflussen. Dazu gehören Erscheinungen wie <em>Telekinese</em> – das Bewegen von Gegenständen – oder <em>Pyrokinese</em>, die Beeinflussung von Feuer. Sie zählt zu den faszinierendsten Bereichen der Parapsychologie.</p>

    <h2>Kann jeder Psychokinese erlernen?</h2>
    <p>Im Prinzip ja. Wie beim Erlernen eines Instruments hängt der Fortschritt von der inneren Haltung und mentalen Offenheit ab. Menschen mit einem materialistischen Weltbild tun sich oft schwerer als jene, die bereit sind, das Unsichtbare als real zu akzeptieren.</p>

    <h2>Vorwort</h2>
    <p>"Viele Menschen glauben, dass Psychokinese nicht möglich ist – ohne es je ausprobiert zu haben. Doch Psychokinese ist nicht das Ziel, sondern ein Werkzeug: Sie kann uns helfen, die Welt und uns selbst besser zu verstehen."</p>
    <p>Missbrauch ist nicht möglich, denn eine universelle Sicherung verhindert ihn. Erfolg erfordert innere Ruhe, Glauben und geistige Reife.</p>

    <h2>Der menschliche Geist</h2>
    <p>Der Verstand ist Energie – jede Sekunde lenken wir diese Energie mit unseren Gedanken. Wer lernt, sie bewusst zu fokussieren, kann seine Umwelt beeinflussen. Gedanken sind Energie, und Energie wirkt auf Energie. Damit ist der Geist fähig, die Materie zu berühren.</p>

    <details style="max-width:760px;margin:10px auto 0;color:var(--muted)">
      <summary>Hinweis (Historie)</summary>
      <p style="margin-top:6px">Klassische Online‑Selbsttests – wie das frühere PKE7G‑Experiment – nutzten rein faire 50/50‑Generatoren und werteten einfache Richtungsentscheidungen mit Statistiken (z. B. Differenz, Z‑Wert) aus. Diese Seite folgt diesem einfachen, transparenten Ansatz.</p>
    </details>
  </section>
  <!-- /EDIT: TEXTE (Landing & Einleitung) -->

  <!-- Block: Experiment -->
  <section class="block" id="experiment">
    <h2>Selbstexperiment</h2>
    <p class="lead">
      Dieses Experiment lädt dich ein, die subtile Verbindung zwischen Geist und Zufall zu erforschen.<br />
      Konzentriere dich bewusst auf eine Richtung – Uhrzeigersinn oder Gegenuhrzeigersinn – und beobachte,<br />
      ob deine Intention minimale Abweichungen in der zufälligen Bewegung erzeugt.<br />
      Jeder Durchlauf ist ein Moment stiller Fokussierung, ein Training der Wahrnehmung und inneren Ruhe.<br />
      Nimm dir Zeit, bleib neugierig und betrachte das Ergebnis als Spiegel deiner geistigen Präsenz.<br />
      Der Ring besteht aus 16 gleichverteilten Feldern; die Auswahl des Startfelds ändert nur die Ausgangsposition.
    </p>
    <div class="controls">
      <label>Dauer (min)
        <!-- EDIT: PRESETS (Dauer in Minuten) -->
        <select id="duration"><option>1</option><option>2</option><option>3</option><option>5</option><option>8</option><option>13</option><option>21</option></select>
        <!-- /EDIT: PRESETS -->
      </label>
      <label>Geschwindigkeit (ms)
        <!-- EDIT: SPEED DEFAULT -->
        <input id="speed" type="number" value="800" min="50" max="2000" step="10" />
        <!-- /EDIT: SPEED DEFAULT -->
      </label>
      <label>Startfeld
        <select id="start"></select>
      </label>
      <label>Zielrichtung
        <select id="focus">
          <option value="none" selected>Keine Vorgabe</option>
          <option value="cw">Uhrzeigersinn</option>
          <option value="ccw">Gegenuhrzeigersinn</option>
        </select>
      </label>
    </div>
    <div class="ringWrap"><div id="ring" class="ring"></div></div>
    <div class="actions" style="margin-top:24px">
      <button id="toggle">Experiment starten</button>
      <button id="reset">Reset</button>
    </div>
  </section>

  <!-- Block: Resultate -->
  <section class="block" id="results">
    <div class="result-wrap">
      <h2>Resultate</h2>
      <div class="result-head">
        <div class="result-key">
          <span id="biasValue" class="result-accuracy">--.-%</span>
          <div class="result-pwrap">
            <span class="result-pvalue">p = <span id="biasPValue">--</span></span>
            <span id="biasBadge" class="badge tier-random">im Zufallsbereich</span>
          </div>
        </div>
        <p class="result-info">Die Tendenzquote zeigt die laufende Trefferquote relativ zur Zufallslinie (50&nbsp;%). Positive Werte bedeuten mehr Treffer als Zufall, negative entsprechend weniger.</p>
        <p class="result-note">Das 95&nbsp;%-Band markiert den erwartbaren Zufallsbereich. p ≥ 0.10 → Zufallsbereich. 0.05 ≤ p &lt; 0.10 → leicht. 0.01 ≤ p &lt; 0.05 → auffällig. 0.001 ≤ p &lt; 0.01 → sehr auffällig. p &lt; 0.001 → extrem auffällig.</p>
        <div id="targetMetrics" class="result-target" hidden aria-hidden="true">
          <div class="result-key">
            <span id="targetValue" class="result-accuracy">--.-%</span>
            <div class="result-pwrap">
              <span class="result-pvalue">p = <span id="targetPValue">--</span></span>
              <span id="targetBadge" class="badge tier-random">im Zufallsbereich</span>
            </div>
          </div>
          <p id="targetInfo" class="result-info result-target-info">Ziel-Trefferquote: Anteil der Schritte in der gewählten Richtung.</p>
        </div>
      </div>
      <details id="chartDetails" open>
        <summary>Details (Diagramm)</summary>
        <div id="chartLegend" class="chart-legend"></div>
        <div class="chart-options">
          <label class="example-toggle">
            <input type="checkbox" id="exampleToggle" />
            Beispiele anzeigen
          </label>
        </div>
        <canvas id="chart"></canvas>
      </details>
      <p class="summary-note">Die Tendenzquote bewegt sich zwischen −100&nbsp;% (immer daneben) und +100&nbsp;% (immer richtig). Das schattierte Band zeigt den 95&nbsp;%-Zufallsbereich.</p>
      <p id="exampleGuidance" class="summary-note">Beispielkurven zeigen trainierte Intention (stark vs. sehr stark) mit realistischen Schwankungen – gleiche Eckdaten, andere Tendenz.</p>
      <p id="exampleActiveNote" class="summary-note" hidden aria-live="polite">Beispiele dienen der Orientierung und sind nicht Teil deiner Session.</p>
      <div id="summary" class="note"></div>
      <div class="actions">
        <button id="saveSession" disabled>Session speichern</button>
        <button id="exportJSON">Export JSON</button>
        <button id="exportCSV">Export CSV</button>
      </div>
      <div id="storageNote" class="note"></div>
      <div id="sessionList"></div>
      <div style="text-align:center;margin-top:10px">
        <button id="clearSessions">Alle Sessions löschen</button>
      </div>
    </div>
  </section>

  <!-- EDIT: COPY (Nachwort) -->
  <section class="block">
    <h2>Nachwort</h2>
    <p class="note" style="max-width:760px;margin:8px auto 0">Trainiere in Ruhe, vergleiche mehrere Durchläufe und achte auf Tagesform. Ziel ist Erkenntnis, nicht Vorführung.</p>
    <p class="note" style="max-width:760px;margin:8px auto 0">Haftungsausschluss: Dieses Experiment ersetzt keine medizinische oder psychologische Betreuung. Keine Haftung für daraus abgeleitete Entscheidungen, Paranoia-Anfälle oder andere mentale Nebenwirkungen – bleib gelassen, selbst wenn die Resultate überraschend gut ausfallen, besonders nach ernst gemeinten 21 Minuten.</p>
  </section>
  <!-- /EDIT: COPY (Nachwort) -->
</main>

<footer style="max-width:980px;margin:0 auto;padding:0 16px 24px;display:flex;justify-content:flex-end;gap:16px;align-items:center;color:var(--muted);font-size:14px;">
  <span>Anonyme Sessions (UID, keine PII).</span>
  <a href="/privacy.html" style="color:inherit;text-decoration:underline;">Datenschutz</a>
</footer>
`;

function initPsychokinesisExperiment() {
  // EDIT: CONFIG (Konstanten anpassen)
  const N = 16;           // Anzahl Felder (fix)
  const RADIUS = Math.round(120 * 1.3); // Punkte ca. 30% naeher zum Rand
  const TRAIL_LEN = 6;    // Laenge der Trail‑Spur (optisch)
  // /EDIT: CONFIG

  // State & Elemente
  let pos=0, steps=0, cw=0, ccw=0, hits=0, misses=0;
  let trail=[], hist=[], running=false, endAt=0, startedAt=0, interval=800, timer=null;
  let focusDir=0;
  let targetMode='none';
  const ring = document.getElementById('ring');
  const startSel = document.getElementById('start');
  const durSel = document.getElementById('duration');
  const speedInp = document.getElementById('speed');
  const focusSel = document.getElementById('focus');
  const chart = document.getElementById('chart');
  if(chart){
    chart.setAttribute('title','Bias misst die Abweichung von 50 % unabhängig von der Richtung.');
  }
  const summary = document.getElementById('summary');
  const chartDetails = document.getElementById('chartDetails');
  const exampleToggle = document.getElementById('exampleToggle');
  const exampleActiveNote = document.getElementById('exampleActiveNote');
  const chartLegend = document.getElementById('chartLegend');
  const biasValueEl = document.getElementById('biasValue');
  const biasPValueEl = document.getElementById('biasPValue');
  const biasBadgeEl = document.getElementById('biasBadge');
  const targetMetricsEl = document.getElementById('targetMetrics');
  const targetValueEl = document.getElementById('targetValue');
  const targetPValueEl = document.getElementById('targetPValue');
  const targetBadgeEl = document.getElementById('targetBadge');
  const targetInfoEl = document.getElementById('targetInfo');
  const toggleBtn = document.getElementById('toggle');
  const resetBtn = document.getElementById('reset');
  const saveBtn = document.getElementById('saveSession');
  const exportJSONBtn = document.getElementById('exportJSON');
  const exportCSVBtn = document.getElementById('exportCSV');
  const storageNoteEl = document.getElementById('storageNote');
  const sessionListEl = document.getElementById('sessionList');
  const clearSessionsBtn = document.getElementById('clearSessions');

  if(!ring || !startSel || !durSel || !speedInp || !focusSel || !chart || !summary || !toggleBtn || !resetBtn || !saveBtn || !exportJSONBtn || !exportCSVBtn || !sessionListEl || !clearSessionsBtn){
    return;
  }

  const rootStyles=getComputedStyle(document.documentElement);
  const okStrokeColor=(rootStyles.getPropertyValue('--ok')||'#6dff65').trim()||'#6dff65';
  const projectOrange=(rootStyles.getPropertyValue('--infinity')||'#ff7a1a').trim()||'#ff7a1a';
  const exampleBlue='rgba(90,180,255,0.95)';

  let chartTooltip=document.querySelector('.chart-tooltip');
  if(!chartTooltip){
    chartTooltip=document.createElement('div');
    chartTooltip.className='chart-tooltip';
    chartTooltip.setAttribute('aria-hidden','true');
    document.body.appendChild(chartTooltip);
  }else{
    chartTooltip.classList.remove('visible');
    chartTooltip.setAttribute('aria-hidden','true');
  }

  let btcClicks=0, btcOverride=false;
  let autoSavePromptShown=false;
  let chartHoverData=null;
  let chartHoverHighlight=null;
  let showExampleCurves=false;

  function loadBtcOverride(){
    btcOverride=false;
    btcClicks=0;
  }

  function setTargetMode(value){
    if(value==='cw' || value==='ccw'){
      targetMode=value;
      focusDir=value==='cw'?1:-1;
    }else{
      targetMode='none';
      focusDir=0;
    }
  }

  function handleRingPointer(e){
    if(e.pointerType==='mouse' && e.button!==0) return;
    const rect=ring.getBoundingClientRect();
    const x=e.clientX-rect.left;
    const y=e.clientY-rect.top;
    const dx=x-rect.width/2;
    const dy=y-rect.height/2;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<=rect.width/2){
      if(!btcOverride && ++btcClicks>=21){
        btcOverride=true;
        applyThemeFromDuration();
      }
    }
  }

  function syncToggleButton(){
    if(!toggleBtn) return;
    toggleBtn.textContent = running ? 'Experiment stoppen' : 'Experiment starten';
  }

  function roundedRectPath(ctx,x,y,width,height,radius){
    const r=Math.max(0, Math.min(radius, width/2, height/2));
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+width-r, y);
    ctx.quadraticCurveTo(x+width, y, x+width, y+r);
    ctx.lineTo(x+width, y+height-r);
    ctx.quadraticCurveTo(x+width, y+height, x+width-r, y+height);
    ctx.lineTo(x+r, y+height);
    ctx.quadraticCurveTo(x, y+height, x, y+height-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  function updateExampleNote(){
    if(!exampleActiveNote) return;
    if(showExampleCurves){
      exampleActiveNote.hidden=false;
      exampleActiveNote.setAttribute('aria-hidden','false');
    }else{
      exampleActiveNote.hidden=true;
      exampleActiveNote.setAttribute('aria-hidden','true');
    }
  }

  function renderLegend(items){
    if(!chartLegend) return;
    chartLegend.innerHTML = items.map(item=>{
      const typeClass = item.type==='fill' ? 'legend-swatch fill' : 'legend-swatch line';
      const style = item.type==='fill'
        ? `style="background:${item.color};border-color:${item.stroke || item.color};"`
        : `style="color:${item.color};"`;
      return `<span class="legend-item"><span class="${typeClass}" ${style}></span><span>${item.label}</span></span>`;
    }).join('');
  }

  function refreshExamplesAfterConfig(){
    if(!showExampleCurves || running) return;
    requestAnimationFrame(drawChart);
  }

  // Storage
  const SKEY='pke7g_sessions_v2';
  let sessions=[], lastStats=null;
  function loadSessions(){ try{ const s=localStorage.getItem(SKEY); sessions=s?JSON.parse(s):[] }catch(e){ sessions=[]; storageNoteEl.textContent='Lokaler Speicher nicht verfügbar. Bitte exportieren.' } }
  function persistSessions(){ try{ localStorage.setItem(SKEY, JSON.stringify(sessions)); storageNoteEl.textContent=''; return true }catch(e){ storageNoteEl.textContent='Speicher voll/blockiert. Export empfohlen.'; return false } }
  function makeDownload(filename, mime, dataStr){ const blob=new Blob([dataStr], {type:mime}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(url); a.remove()},0) }
  function toCSV(rows){ const esc=v=>'"'+String(v).replace(/"/g,'""')+'"'; const header=['time','duration_min','speed_ms','start_field','focus','steps','cw','ccw','hits','misses','z','p']; const lines=[header.join(',')].concat(rows.map(r=>[esc(r.time), r.duration, r.speed, r.startField, esc(r.focus), r.steps, r.cw, r.ccw, r.hits, r.misses, r.z, r.p].join(','))); return lines.join('\n') }
  function updateSessionList(){ if(!sessions.length){ sessionListEl.innerHTML='<p class="note">Noch keine Sessions gespeichert.</p>'; return } let html='<div class="sessions-scroll"><table class="sessions"><thead><tr><th>Zeit</th><th>Dauer</th><th>Speed</th><th>Ziel</th><th>Schritte</th><th>Uhrz.</th><th>Gegen</th><th>Quote%</th><th>Aktionen</th></tr></thead><tbody>'; for(let i=sessions.length-1;i>=0;i--){ const s=sessions[i]; const q=s.steps?((s.hits/s.steps)*100).toFixed(1):'0.0'; html+='<tr data-i="'+i+'"><td>'+s.time+'</td><td>'+s.duration+'m</td><td>'+s.speed+'</td><td>'+s.focus+'</td><td>'+s.steps+'</td><td>'+s.cw+'</td><td>'+s.ccw+'</td><td>'+q+'</td><td class="actions-cell"><button data-action="dljson">JSON</button><button data-action="dlcsv">CSV</button><button data-action="del">Löschen</button></td></tr>' } html+='</tbody></table></div>'; sessionListEl.innerHTML=html }
  function exportAllJSON(){ makeDownload('sessions.json','application/json', JSON.stringify(sessions, null, 2)) }
  function exportAllCSV(){ makeDownload('sessions.csv','text/csv', toCSV(sessions)) }
  sessionListEl.addEventListener('click', (e)=>{ const btn=e.target.closest('button'); if(!btn) return; const tr=e.target.closest('tr'); if(!tr) return; const i=Number(tr.dataset.i); const s=sessions[i]; if(!s) return; const act=btn.dataset.action; if(act==='del'){ sessions.splice(i,1); persistSessions(); updateSessionList() } else if(act==='dljson'){ makeDownload('session_'+i+'.json','application/json', JSON.stringify(s, null, 2)) } else if(act==='dlcsv'){ makeDownload('session_'+i+'.csv','text/csv', toCSV([s])) } })

  // Init UI
  function init(){
    startSel.innerHTML='';
    for(let i=0;i<N;i++){
      const o=document.createElement('option');
      o.value=i;
      o.textContent='Feld '+(i+1);
      startSel.appendChild(o);
    }
    buildRing();
    setTargetMode(focusSel.value);
    applyThemeFromDuration();
    showSummary();
  }
  function getRingCenter(){
    const styles=getComputedStyle(ring);
    const width=ring.clientWidth||Number.parseFloat(styles.width)||ring.offsetWidth||0;
    const height=ring.clientHeight||Number.parseFloat(styles.height)||width;
    return { cx: width/2, cy: height/2 };
  }
  function buildRing(){ ring.innerHTML=''; const marker=document.createElement('div'); marker.id='marker'; marker.className='marker'; ring.appendChild(marker); const r=RADIUS; const {cx,cy}=getRingCenter(); for(let i=0;i<N;i++){ const a=(i/N)*Math.PI*2 - Math.PI/2; const x=cx + r*Math.cos(a), y=cy + r*Math.sin(a); const d=document.createElement('div'); d.className='dot'; d.dataset.i=i; d.style.left=x+'px'; d.style.top=y+'px'; ring.appendChild(d) } placeMarker(pos) }
  function placeMarker(i){
    const m=document.getElementById('marker');
    if(!m) return;
    const r=RADIUS;
    const {cx,cy}=getRingCenter();
    const a=(i/N)*Math.PI*2 - Math.PI/2;
    const x=cx + r*Math.cos(a), y=cy + r*Math.sin(a);
    m.style.left=x+'px';
    m.style.top=y+'px';
    if(!running && steps===0){
      m.className='marker prestart';
    }else if(m.classList.contains('prestart')){
      m.className='marker';
    }
  }

  function step(){
    const dir=Math.random()<0.5?-1:1;
    pos=(pos+dir+N)%N;
    steps++;
    if(dir===1) cw++; else ccw++;
    hist.push(dir);
    const marker=document.getElementById('marker');
    const hasTarget=focusDir!==0;
    if(marker){
      if(hasTarget){
        if(dir===focusDir){
          hits++;
          marker.className='marker hit';
        }else{
          misses++;
          marker.className='marker miss';
        }
      }else{
        marker.className='marker';
      }
    }
    placeMarker(pos);
  }
  function loop(){
    if(!running) return;
    const now=Date.now();
    if(now>=endAt){
      stopExp(true);
      return;
    }
    step();
    timer=requestAnimationFrame(()=> setTimeout(loop, interval));
  }
  function startExp(){
    if(running) return;
    setTargetMode(focusSel.value);
    resetExp();
    running=true;
    syncToggleButton();
    saveBtn.disabled=true;
    const mins=Number(durSel.value)||1;
    startedAt=Date.now();
    endAt=startedAt + mins*60*1000;
    interval=Number(speedInp.value)||800;
    if(interval<10) interval=10;
    applyThemeFromDuration();
    refreshExamplesAfterConfig();
    loop();
  }
  function stopExp(autoTriggered=false){
    if(!running) return;
    running=false;
    syncToggleButton();
    if(timer){ cancelAnimationFrame(timer); timer=null; }
    drawChart();
    showSummary();
    if(autoTriggered && !autoSavePromptShown && steps>0){
      autoSavePromptShown=true;
      if(typeof window!=='undefined' && window.confirm('Session speichern?')){
        if(typeof saveBtn.onclick==='function'){
          saveBtn.onclick();
        }else if(typeof saveBtn.click==='function'){
          saveBtn.click();
        }
      }
    }
    const endedAt=Date.now();
    const uploadPayload=makeUploadPayload(endedAt);
    if(uploadPayload) submitExperimentData(uploadPayload);
  }
  function resetExp(){
    cancelAnimationFrame(timer);
    timer=null;
    running=false;
    syncToggleButton();
    steps=0;
    cw=0;
    ccw=0;
    hits=0;
    misses=0;
    hist=[];
    lastStats=null;
    startedAt=0;
    endAt=0;
    saveBtn.disabled=true;
    autoSavePromptShown=false;
    btcClicks=0;
    chartHoverHighlight=null;
    chartHoverData=null;
    chartTooltip.classList.remove('visible');
    chartTooltip.setAttribute('aria-hidden','true');
    setTargetMode(focusSel.value);
    pos=Number(startSel.value)||0;
    const m=document.getElementById('marker');
    if(m) m.className='marker';
    placeMarker(pos);
    if(biasValueEl){
      biasValueEl.textContent='--.-%';
      biasValueEl.classList.remove('mastermystic');
    }
    if(biasPValueEl) biasPValueEl.textContent='--';
    if(biasBadgeEl){ biasBadgeEl.className='badge tier-random'; biasBadgeEl.textContent='im Zufallsbereich'; }
    if(targetMetricsEl){
      targetMetricsEl.hidden=true;
      targetMetricsEl.setAttribute('aria-hidden','true');
    }
    if(targetValueEl) targetValueEl.textContent='--.-%';
    if(targetPValueEl) targetPValueEl.textContent='--';
    if(targetBadgeEl){ targetBadgeEl.className='badge tier-random'; targetBadgeEl.textContent='im Zufallsbereich'; }
    summary.innerHTML='';
    const ctx=chart.getContext('2d');
    ctx.clearRect(0,0,chart.width,chart.height);
    if(showExampleCurves){
      requestAnimationFrame(drawChart);
    }
  }

  // EDIT: THEME‑LOGIK (BTC bei 21 Minuten)
  function applyThemeFromDuration(){ const is21=String(durSel.value)==='21'; const hasOverride=btcOverride===true; ring.classList.toggle('btc', is21 || hasOverride) }
  // /EDIT: THEME‑LOGIK

  // Chart & Stats
  function estimatePlannedSteps(){
    const mins=Number(durSel.value);
    if(!Number.isFinite(mins) || mins<=0) return 0;
    const speedValue=Number(speedInp.value);
    const fallbackInterval=Number.isFinite(interval)?interval:800;
    const speedMs=(Number.isFinite(speedValue) && speedValue>0)?Math.max(10, speedValue):Math.max(10, fallbackInterval);
    const totalMs=mins*60*1000;
    if(!Number.isFinite(totalMs) || totalMs<=0) return 0;
    return Math.max(1, Math.round(totalMs/speedMs));
  }

  function buildExampleCurves(totalSteps){
    const steps=Math.max(1, totalSteps||0);
    if(!showExampleCurves || !steps) return [];
    if(focusDir===0){
      setTargetMode('cw');
    }
    const defs=[
      {rate:0.62,label:'Beispiel: starke Intention (~62 % Bias)', color:exampleBlue, alpha:0.6, width:3, seed:19},
      {rate:0.67,label:'Beispiel: sehr starke Intention (~67 % Bias)', color:projectOrange, alpha:0.7, width:3.6, seed:37}
    ];
    const slumpZones=[
      {start:0.22,end:0.34,drop:0.18},
      {start:0.52,end:0.66,drop:0.22}
    ];
    const pseudoRandom=(i, seed)=>{
      const x=Math.sin((i+1)*(seed+1)*12.9898)*43758.5453;
      return x - Math.floor(x);
    };
    return defs.map(def=>{
      const values=[0];
      let successes=0;
      for(let i=1;i<=steps;i++){
        const progress=i/steps;
        let rate=def.rate;
        slumpZones.forEach(zone=>{
          if(progress>=zone.start && progress<=zone.end){
            const span=zone.end-zone.start||1;
            const local=(progress-zone.start)/span;
            rate -= Math.sin(local*Math.PI)*zone.drop;
          }
        });
        const breathing=Math.sin(progress*Math.PI*2.2)*(def.rate-0.5)*0.18;
        const jitter=(pseudoRandom(i, def.seed)-0.5)*0.14;
        rate = Math.max(0.32, Math.min(0.78, rate + breathing + jitter));
        const stepNoise=pseudoRandom(i*17, def.seed+13);
        const success=stepNoise < rate;
        if(success) successes += 1;
        const diff=(successes*2) - i;
        const tendency=(diff / i)*100;
        values.push(tendency);
      }
      return {...def, values};
    });
  }

  function drawChart(){
    const baseLegend=[
      {label:'Tendenzquote (laufend)', type:'line', color:'rgba(124,255,107,0.9)'},
      {label:'Null-Linie (50 %)', type:'line', color:'rgba(160,170,180,0.55)'},
      {label:'Zufallsband (95 %)', type:'fill', color:'rgba(124,180,255,0.28)', stroke:'rgba(124,180,255,0.6)'}
    ];
    if(chartDetails && !chartDetails.open){
      renderLegend(baseLegend);
      return;
    }
    const ctx=chart.getContext('2d');
    const cssW=chart.clientWidth||400;
    const cssH=chart.clientHeight||220;
    const W=chart.width=cssW*2;
    const H=chart.height=cssH*2;
    const pad=56;
    const w=W-2*pad;
    const h=H-2*pad;
    ctx.clearRect(0,0,W,H);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.lineJoin='round';
    ctx.lineCap='round';
    ctx.font='28px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';
    ctx.fillStyle='rgba(235,239,242,.8)';

    const yMin=-100;
    const yMax=100;
    const valueToY=(val)=>{
      const clamped=Math.max(yMin, Math.min(yMax, val));
      const ratio=(clamped - yMin)/(yMax - yMin);
      return pad + h - ratio*h;
    };

    const stepsCount=hist.length;
    const indexToX=(idx)=> pad + (stepsCount ? (idx/stepsCount)*w : 0);

    const tendencyValues=[];
    const rateValues=[];
    const bandValues=[];
    let cwCount=0, ccwCount=0, targetSuccess=0;
    for(let i=1;i<=stepsCount;i++){
      const dir=hist[i-1];
      if(dir===1) cwCount++; else ccwCount++;
      let successCount;
      let diff=cwCount-ccwCount;
      if(targetMode!=='none' && focusDir!==0){
        if(dir===focusDir) targetSuccess++;
        successCount=targetSuccess;
        diff=(targetSuccess*2)-i;
      }else{
        const best=Math.max(cwCount, ccwCount);
        successCount=best;
      }
      const rate=successCount/i;
      let tendency=(rate - 0.5)*200;
      if(targetMode==='none' || focusDir===0){
        const sign=diff===0?0:(diff>0?1:-1);
        tendency=sign*Math.abs(tendency);
      }
      const band=1.96*100*Math.sqrt(0.25 / i);
      tendencyValues.push(tendency);
      rateValues.push(rate);
      bandValues.push(band);
    }

    const legendItems=[...baseLegend];

    ctx.fillStyle='rgba(235,239,242,.85)';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('Schritte', pad + w/2, pad+h + 40);
    const primaryYAxisLabel='Tendenzquote (%)';
    const secondaryYAxisLabel='vs. 50 %';
    const yAxisPrimaryFont='28px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';
    const yAxisSecondaryFont='24px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';
    const yAxisCanvasMargin=12;
    const yAxisPlotClearance=10;
    const yAxisLineSpacing=32;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    const yAxisAnchorY=pad + h/2;
    const labelConfigs=[
      {text:primaryYAxisLabel, font:yAxisPrimaryFont},
      {text:secondaryYAxisLabel, font:yAxisSecondaryFont}
    ];
    const labelMetrics=labelConfigs.map(({text,font})=>{
      ctx.font=font;
      const metrics=ctx.measureText(text);
      const ascent=metrics.actualBoundingBoxAscent ?? 0;
      const descent=metrics.actualBoundingBoxDescent ?? 0;
      let height=ascent + descent;
      if(!height){
        const parsed=parseInt(font, 10);
        height=Number.isFinite(parsed)?parsed:28;
      }
      return {
        text,
        font,
        width:metrics.width,
        height
      };
    });
    const maxHalfHeight=labelMetrics.reduce((max,metric)=>Math.max(max, metric.height/2), 0);
    const minCenterX=yAxisCanvasMargin + maxHalfHeight;
    const maxCenterX=pad - yAxisPlotClearance - maxHalfHeight;
    const desiredCenterX=pad - 44;
    const yAxisAnchorX=Math.min(Math.max(desiredCenterX, minCenterX), maxCenterX);
    const totalBaselineExtent=labelMetrics.reduce((total,metric,idx)=>{
      return total + metric.width + (idx>0?yAxisLineSpacing:0);
    },0);
    let currentBaseline=-totalBaselineExtent/2;
    const baselineOffsets=labelMetrics.map((metric,idx)=>{
      currentBaseline+=metric.width/2;
      const offset=currentBaseline;
      currentBaseline+=metric.width/2;
      if(idx<labelMetrics.length-1){
        currentBaseline+=yAxisLineSpacing;
      }
      return offset;
    });
    ctx.save();
    ctx.translate(yAxisAnchorX, yAxisAnchorY);
    ctx.rotate(-Math.PI/2);
    labelMetrics.forEach((metric,idx)=>{
      ctx.font=metric.font;
      ctx.fillText(metric.text, baselineOffsets[idx], 0);
    });
    ctx.restore();
    ctx.font='28px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';

    ctx.strokeStyle='rgba(200,205,210,0.45)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(pad, pad-12);
    ctx.lineTo(pad, pad+h+12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad-12, pad+h);
    ctx.lineTo(pad+w+12, pad+h);
    ctx.stroke();

    ctx.strokeStyle='rgba(160,170,180,0.55)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(pad, valueToY(0));
    ctx.lineTo(pad+w, valueToY(0));
    ctx.stroke();

    if(stepsCount){
      ctx.fillStyle='rgba(124,180,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(indexToX(1), valueToY(bandValues[0]));
      for(let i=2;i<=stepsCount;i++) ctx.lineTo(indexToX(i), valueToY(bandValues[i-1]));
      ctx.lineTo(indexToX(stepsCount), valueToY(-bandValues[stepsCount-1]));
      for(let i=stepsCount-1;i>=1;i--) ctx.lineTo(indexToX(i), valueToY(-bandValues[i-1]));
      ctx.closePath();
      ctx.fill();
    }

    const exampleCurves=buildExampleCurves(Math.max(stepsCount, estimatePlannedSteps()));
    exampleCurves.forEach(curve=>{
      legendItems.push({label:curve.label, type:'line', color:curve.color});
      const values=curve.values;
      ctx.save();
      ctx.globalAlpha=curve.alpha;
      ctx.strokeStyle=curve.color;
      ctx.lineWidth=curve.width;
      ctx.beginPath();
      for(let i=1;i<values.length;i++){
        const x=indexToX(Math.min(i, stepsCount || estimatePlannedSteps()));
        const y=valueToY(values[i]);
        if(i===1) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.restore();
    });

    if(stepsCount){
      ctx.strokeStyle='rgba(124,255,107,0.9)';
      ctx.lineWidth=3;
      ctx.beginPath();
      for(let i=1;i<=stepsCount;i++){
        const x=indexToX(i);
        const y=valueToY(tendencyValues[i-1]);
        if(i===1) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();

      ctx.fillStyle='rgba(124,255,107,0.95)';
      const lastX=indexToX(stepsCount);
      const lastY=valueToY(tendencyValues[stepsCount-1]);
      ctx.beginPath();
      ctx.arc(lastX,lastY,6,0,Math.PI*2);
      ctx.fill();
    }

    renderLegend(legendItems);

    const scaleXFactor=W/(chart.getBoundingClientRect().width||cssW);
    const scaleYFactor=H/(chart.getBoundingClientRect().height||cssH);
    chartHoverData={points:[], scaleX:scaleXFactor, scaleY:scaleYFactor, indexToX, valueToY};
    if(stepsCount){
      chartHoverData.points=tendencyValues.map((value, idx)=>({
        x:indexToX(idx+1),
        y:valueToY(value),
        idx:idx+1,
        tendency:value,
        rate:rateValues[idx],
        band:bandValues[idx],
        dir:hist[idx]===1?'Uhrzeigersinn':'Gegenuhrzeigersinn'
      }));
    }else{
      chartHoverData.points=[];
    }
    if(chartHoverHighlight && chartHoverData.points.length){
      const match=chartHoverData.points.find(p=>p.idx===chartHoverHighlight.idx);
      if(match){
        ctx.strokeStyle='rgba(255,255,255,0.9)';
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(match.x, match.y,12,0,Math.PI*2);
        ctx.stroke();
      }
    }
  }


  if(chartDetails){
    const mq=window.matchMedia('(max-width: 767px)');
    const applyDetailsState=(isMobile)=>{
      if(isMobile){
        if(chartDetails.open){
          chartDetails.open=false;
        }
      }else if(!chartDetails.open){
        chartDetails.open=true;
        requestAnimationFrame(drawChart);
      }
    };
    applyDetailsState(mq.matches);
    const mqHandler=(event)=>applyDetailsState(event.matches);
    if(typeof mq.addEventListener==='function'){
      mq.addEventListener('change', mqHandler);
    }else if(typeof mq.addListener==='function'){
      mq.addListener(mqHandler);
    }
    chartDetails.addEventListener('toggle', ()=>{
      if(chartDetails.open){
        requestAnimationFrame(drawChart);
      }
    });
  }

  function setChartHighlight(idx){
    const current=chartHoverHighlight ? chartHoverHighlight.idx : null;
    if(current===idx) return;
    chartHoverHighlight = (typeof idx==='number') ? {idx} : null;
    drawChart();
  }

  function hideChartTooltip(){
    if(chartTooltip.classList.contains('visible')){
      chartTooltip.classList.remove('visible');
      chartTooltip.setAttribute('aria-hidden','true');
    }
    if(chartHoverHighlight){
      chartHoverHighlight=null;
      drawChart();
    }
  }

  function handleChartHover(evt){
    if(!chartHoverData || !chartHoverData.points.length){
      hideChartTooltip();
      return;
    }
    const rect=chart.getBoundingClientRect();
    const touch=evt.touches && evt.touches[0];
    const clientX=touch ? touch.clientX : evt.clientX;
    const clientY=touch ? touch.clientY : evt.clientY;
    const canvasX=(clientX - rect.left)*chartHoverData.scaleX;
    if(!isFinite(canvasX)){
      hideChartTooltip();
      return;
    }
    let nearest=null;
    let minDist=Infinity;
    for(const point of chartHoverData.points){
      const dist=Math.abs(point.x - canvasX);
      if(dist<minDist){
        minDist=dist;
        nearest=point;
      }
    }
    if(!nearest){
      hideChartTooltip();
      return;
    }
    const targetIdx=nearest.idx;
    setChartHighlight(targetIdx);
    const refreshed=chartHoverData && chartHoverData.points.find(p=>p.idx===targetIdx);
    if(!refreshed){
      hideChartTooltip();
      return;
    }
    const tendency=refreshed.tendency;
    const rate=refreshed.rate*100;
    const band=refreshed.band;
    const tendencyStr=`${tendency>=0?'+':''}${tendency.toFixed(1)}%`;
    const rateStr=`${rate.toFixed(1)}%`;
    const bandStr=`±${band.toFixed(1)}%`;
    chartTooltip.innerHTML=`<strong>Schritt ${refreshed.idx}</strong><br>Tendenzquote: ${tendencyStr}<br>Trefferquote kumuliert: ${rateStr}<br>Richtung: ${refreshed.dir}<br>95%-Band: ${bandStr}`;
    chartTooltip.style.left=`${clientX+16}px`;
    chartTooltip.style.top=`${clientY+16}px`;
    chartTooltip.classList.add('visible');
    chartTooltip.setAttribute('aria-hidden','false');
  }
  function erf(x){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const sign=x<0?-1:1; x=Math.abs(x); const t=1/(1+p*x); const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x); return sign*y }
  function pTwoTailFromZ(z){ const phi=0.5*(1+erf(Math.abs(z)/Math.SQRT2)); return 2*(1-phi) }
  function tierFromP(p){
    if(!Number.isFinite(p)) return {label:'im Zufallsbereich', cls:'tier-random'};
    if(p>=0.10) return {label:'im Zufallsbereich', cls:'tier-random'};
    if(p>=0.05) return {label:'leicht überdurchschnittlich', cls:'tier-mild'};
    if(p>=0.01) return {label:'auffällig', cls:'tier-noticeable'};
    if(p>=0.001) return {label:'sehr auffällig', cls:'tier-strong'};
    return {label:'extrem auffällig', cls:'tier-extreme'};
  }
  function showSummary(){
    const total=cw+ccw;
    const diff=cw-ccw;
    const absDiff=Math.abs(diff);
    const biasPct=total ? (absDiff/total)*100 : 0;
    const denom=Math.sqrt(total||1);
    const biasZ=total ? absDiff/denom : 0;
    const biasP=pTwoTailFromZ(biasZ);
    const biasTier=tierFromP(biasP);
    const biasPctDisplay=biasPct.toFixed(1);
    const biasPDisplay=biasP<0.001?'< 0.001':biasP.toFixed(3);
    const biasPDisplayHtml=biasP<0.001?'&lt; 0.001':biasP.toFixed(3);

    const targetActive=targetMode!=='none' && focusDir!==0;
    const targetLabel=targetActive ? (targetMode==='cw'?'Uhrzeigersinn':'Gegenuhrzeigersinn') : 'keine Vorgabe';
    let targetAcc=0;
    let targetZ=0;
    let targetP=1;
    let targetPDisplay='--';
    let targetPDisplayHtml='--';
    let targetTier=tierFromP(1);

    if(targetActive){
      targetAcc=total ? (hits/total)*100 : 0;
      targetZ=total ? (diff*(focusDir||1))/denom : 0;
      targetP=pTwoTailFromZ(targetZ);
      targetPDisplay=targetP<0.001?'< 0.001':targetP.toFixed(3);
      targetPDisplayHtml=targetP<0.001?'&lt; 0.001':targetP.toFixed(3);
      targetTier=tierFromP(targetP);
    }

    let tendencySigned=biasPct;
    if(targetActive){
      const signedDiff=(hits*2) - total;
      const sign=signedDiff===0?0:(signedDiff>0?1:-1);
      tendencySigned=sign*Math.abs(biasPct);
    }else{
      const sign=diff===0?0:(diff>0?1:-1);
      tendencySigned=sign*Math.abs(biasPct);
    }
    const tendencyDisplay=(tendencySigned>=0?'+':'')+tendencySigned.toFixed(1);

    if(biasValueEl){
      biasValueEl.textContent=tendencyDisplay+'%';
      biasValueEl.classList.toggle('mastermystic', biasTier.cls==='tier-extreme');
    }
    if(biasPValueEl) biasPValueEl.textContent=biasPDisplay;
    if(biasBadgeEl){ biasBadgeEl.className='badge '+biasTier.cls; biasBadgeEl.textContent=biasTier.label; }

    if(targetMetricsEl){
      if(targetActive){
        targetMetricsEl.hidden=false;
        targetMetricsEl.setAttribute('aria-hidden','false');
        if(targetValueEl){
          targetValueEl.textContent=targetAcc.toFixed(1)+'%';
          targetValueEl.classList.toggle('mastermystic', targetTier.cls==='tier-extreme');
        }
        if(targetPValueEl) targetPValueEl.textContent=targetPDisplay;
        if(targetBadgeEl){ targetBadgeEl.className='badge '+targetTier.cls; targetBadgeEl.textContent=targetTier.label; }
        if(targetInfoEl) targetInfoEl.textContent='Ziel-Trefferquote ('+targetLabel+'): Anteil der Schritte in der gewählten Richtung.';
      }else{
        targetMetricsEl.hidden=true;
        targetMetricsEl.setAttribute('aria-hidden','true');
      }
    }

    const lines=[
      'Zielvorgabe: <b>'+targetLabel+'</b>',
      'Schritte: <b>'+total+'</b> (Uhrz.: <b>'+cw+'</b>, Gegen: <b>'+ccw+'</b>)',
      'Tendenzquote: <b>'+tendencyDisplay+'%</b> – p: <b>'+biasPDisplayHtml+'</b>'
    ];
    if(targetActive){
      lines.push('Ziel-Trefferquote: <b>'+targetAcc.toFixed(1)+'%</b> – p: <b>'+targetPDisplayHtml+'</b>');
    }
    lines.push('<span class="summary-note">p &lt; 0.05 → eher nicht nur Zufall. p ≥ 0.05 → Zufallsbereich.</span>');
    summary.innerHTML='<div class="summary-lines">'+lines.map(line=>'<div>'+line+'</div>').join('')+'</div>';

    lastStats={
      biasZ,
      biasP,
      biasPct,
      targetActive,
      targetZ: targetActive ? targetZ : null,
      targetP: targetActive ? targetP : null,
      targetAcc: targetActive ? targetAcc : null
    };
    saveBtn.disabled=false;
  }
  function currentSessionRecord(){
    const duration=Number(durSel.value)||0;
    const speed=Number(speedInp.value)||0;
    const total=cw+ccw;
    const diff=cw-ccw;
    const absDiff=Math.abs(diff);
    const biasPct=total ? (absDiff/total)*100 : 0;
    const denom=Math.sqrt(total||1);
    const biasZ=total ? absDiff/denom : 0;
    const biasP=pTwoTailFromZ(biasZ);
    const focusLabel=targetMode==='cw'?'Uhrzeigersinn':targetMode==='ccw'?'Gegenuhrzeigersinn':'keine Vorgabe';
    const targetActive=targetMode!=='none' && focusDir!==0;
    const targetHitRate=targetActive && total ? hits/total : null;
    const targetZ=targetActive ? (diff*(focusDir||1))/denom : null;
    const targetP=targetActive && targetZ!==null ? pTwoTailFromZ(targetZ) : null;
    return {
      time:new Date().toISOString(),
      duration,
      speed,
      startField:Number(startSel.value)+1,
      focus:focusLabel,
      steps:total,
      cw,
      ccw,
      hits:targetActive?hits:0,
      misses:targetActive?misses:0,
      bias_pct:Number(tendencySigned.toFixed(2)),
      z:biasZ,
      p:biasP,
      target_hit_rate:targetHitRate!==null?Number(targetHitRate.toFixed(4)):null,
      target_z:targetZ,
      target_p:targetP
    };
  }

  function makeUploadPayload(endTs){
    const totalSteps=cw+ccw;
    if(!totalSteps) return null;
    const safeEnd=(typeof endTs==='number' && Number.isFinite(endTs))?Math.round(endTs):Date.now();
    const durationMs=startedAt?Math.max(0, safeEnd-startedAt):0;
    const plannedDuration=Number(durSel.value)||0;
    const durationMinutes=durationMs?durationMs/60000:plannedDuration;
    const speedInput=Number(speedInp.value);
    const speedMs=(Number.isFinite(speedInput) && speedInput>0)?speedInput:Math.max(0, interval);
    const startIndex=Number(startSel.value);
    const startField=Number.isFinite(startIndex)?Math.max(1, Math.round(startIndex)+1):1;
    const focusValue=targetMode;
    const diff=cw-ccw;
    const absDiff=Math.abs(diff);
    const denom=Math.sqrt(totalSteps||1);
    const fallbackBiasZ=denom?absDiff/denom:0;
    const lastBiasZ=lastStats && Number.isFinite(Number(lastStats.biasZ))?Number(lastStats.biasZ):fallbackBiasZ;
    const safeBiasZ=Number.isFinite(lastBiasZ)?lastBiasZ:0;
    const lastBiasP=lastStats && Number.isFinite(Number(lastStats.biasP))?Number(lastStats.biasP):pTwoTailFromZ(safeBiasZ);
    const safeBiasP=Number.isFinite(lastBiasP)?Math.min(Math.max(lastBiasP,0),1):Math.min(Math.max(pTwoTailFromZ(safeBiasZ),0),1);
    const targetActive=focusValue!=='none' && focusDir!==0;
    const targetZ=targetActive? (diff*(focusDir||1))/denom : null;
    const targetP=targetZ!==null?Math.min(Math.max(pTwoTailFromZ(targetZ),0),1):null;
    const targetHitRate=targetActive?hits/totalSteps:null;
    let tendencySigned=0;
    if(targetActive){
      const signedDiff=(hits*2) - totalSteps;
      tendencySigned=totalSteps? (signedDiff/totalSteps)*100 : 0;
    }else{
      const sign=diff===0?0:(diff>0?1:-1);
      tendencySigned=totalSteps? sign*(absDiff/totalSteps)*100 : 0;
    }
    return {
      ts:safeEnd,
      duration_min:Number(Math.max(0, durationMinutes).toFixed(4)),
      speed_ms:Number(speedMs),
      start_field:startField,
      focus:focusValue,
      steps:totalSteps,
      cw,
      ccw,
      hits:targetActive?hits:0,
      misses:targetActive?misses:0,
      bias_pct:Number(tendencySigned.toFixed(4)),
      z:safeBiasZ,
      p:safeBiasP,
      target_z:targetZ,
      target_p:targetP,
      hit_rate:targetHitRate!==null?Number(targetHitRate.toFixed(4)):null
    };
  }

  // Events
  toggleBtn.onclick = ()=> running ? stopExp(false) : startExp();
  resetBtn.onclick = resetExp;
  durSel.onchange = ()=>{ applyThemeFromDuration(); refreshExamplesAfterConfig(); };
  startSel.onchange = ()=>{
    if(running) return;
    const selected=Number(startSel.value);
    pos=Number.isFinite(selected)?selected:0;
    placeMarker(pos);
  };
  focusSel.onchange = (e)=>{
    setTargetMode(e.target.value);
    refreshExamplesAfterConfig();
    if(!running){
      hits=0;
      misses=0;
      showSummary();
    }
  };
  if(speedInp){
    const handleSpeedChange=()=>{ refreshExamplesAfterConfig(); };
    speedInp.addEventListener('change', handleSpeedChange);
    speedInp.addEventListener('input', handleSpeedChange);
  }
  if(exampleToggle){
    exampleToggle.addEventListener('change', ()=>{
      showExampleCurves=!!exampleToggle.checked;
      if(showExampleCurves && targetMode==='none'){
        focusSel.value='cw';
        setTargetMode('cw');
        if(!running){
          hits=0;
          misses=0;
          showSummary();
        }
      }
      updateExampleNote();
      hideChartTooltip();
      requestAnimationFrame(drawChart);
    });
  }
  saveBtn.onclick = ()=>{ const rec=currentSessionRecord(); sessions.push(rec); if(!persistSessions()){ makeDownload('session-lokal.json','application/json', JSON.stringify(rec, null, 2)) } updateSessionList(); if(sessions.length>=200){ storageNoteEl.textContent='Viele Sessions gespeichert - bitte regelmäßig exportieren.' } };
  exportJSONBtn.onclick = exportAllJSON;
  exportCSVBtn.onclick = exportAllCSV;
  clearSessionsBtn.onclick = ()=>{ if(confirm('Alle gespeicherten Sessions löschen?')){ sessions=[]; persistSessions(); updateSessionList() } };
  ring.addEventListener('pointerdown', handleRingPointer);
  chart.addEventListener('mousemove', handleChartHover);
  chart.addEventListener('mouseleave', hideChartTooltip);
  chart.addEventListener('touchmove', handleChartHover);
  chart.addEventListener('touchend', hideChartTooltip);
  chart.addEventListener('touchcancel', hideChartTooltip);

  // Tests (Konsole, optional)
  function runTests(){
    const orig=Math.random;
    const originalFocusValue=focusSel.value;
    try{
      focusSel.value='cw';
      setTargetMode('cw');
      Math.random=()=>0.9;
      const cw0=cw, ccw0=ccw;
      step();
      console.assert(cw===cw0+1 && ccw===ccw0, 'cw inc');
      Math.random=()=>0.1;
      const cw1=cw, ccw1=ccw;
      step();
      console.assert(ccw===ccw1+1 && cw===cw1, 'ccw inc');
      const originalDur=durSel.value;
      const hadOverride=btcOverride;
      durSel.value='21';
      applyThemeFromDuration();
      console.assert(ring.classList.contains('btc'), 'btc on 21');
      durSel.value='1';
      applyThemeFromDuration();
      if(!hadOverride){
        console.assert(!ring.classList.contains('btc'), 'btc off');
      }
      const csv=toCSV([{time:'t',duration:1,speed:800,startField:1,focus:'Uhrzeigersinn',steps:2,cw:1,ccw:1,hits:1,misses:1,z:0,p:1}]);
      console.assert(csv.startsWith('time,'),'csv header');
      console.assert(csv.indexOf('\n')!==-1,'csv newline');
      cw=5;
      ccw=5;
      hits=5;
      misses=5;
      showSummary();
      console.assert(saveBtn.disabled===false,'save enabled');
      durSel.value=originalDur;
      applyThemeFromDuration();
    }catch(e){
      console.warn('tests failed', e);
    }finally{
      Math.random=orig;
      focusSel.value=originalFocusValue;
      setTargetMode(focusSel.value);
      resetExp();
    }
  }

  loadBtcOverride();
  loadSessions();
  updateSessionList();
  init();
  updateExampleNote();
  runTests();
}

export function mountPsychokinesis(target = document.getElementById('app-root')) {
  const root = target || document.getElementById('app-root');
  if (!root) return;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.add('bg-stars');
  }
  root.innerHTML = template;
  installSubmitExperimentData();
  initPsychokinesisExperiment();
}

export function unmountPsychokinesis(target = document.getElementById('app-root')) {
  const root = target || document.getElementById('app-root');
  if (!root) return;
  root.innerHTML = '';
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('bg-stars');
  }
}

if (typeof window !== 'undefined') {
  window.__psiExperiments = window.__psiExperiments || {};
  window.__psiExperiments.psychokinesis = {
    mount: mountPsychokinesis,
    unmount: unmountPsychokinesis,
    template,
  };
}

export default {
  mount: mountPsychokinesis,
  unmount: unmountPsychokinesis,
  template,
};
