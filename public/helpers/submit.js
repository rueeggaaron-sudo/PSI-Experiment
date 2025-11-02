export function installSubmitExperimentData() {
  if (typeof window === 'undefined') {
    return;
  }
  const existing = window.submitExperimentData;
  if (typeof existing === 'function' && existing.__psiProvided) {
    return;
  }
  const submitExperimentData = async function (rec) {
    let consent = false;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('exp-upload-ok') : null;
      consent = raw ? JSON.parse(raw) : false;
    } catch (error) {
      try {
        const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('exp-upload-ok') : null;
        consent = raw ? JSON.parse(raw) : false;
      } catch (storageError) {
        consent = false;
      }
    }
    if (!consent) return;
    const payload = rec && typeof rec === 'object' ? { ...rec } : {};
    const tsValue = payload.ts;
    payload.ts = typeof tsValue === 'number' && Number.isFinite(tsValue) ? Math.round(tsValue) : Date.now();
    try {
      await fetch('/api/exp/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (requestError) {
      console.warn('Experiment upload failed', requestError);
    }
  };
  submitExperimentData.__psiProvided = true;
  window.submitExperimentData = submitExperimentData;
}
