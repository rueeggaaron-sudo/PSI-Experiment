const ensurePlainObject = value => (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};

export const initSubmitHandler = ({ getConsent }) => {
  const consentGetter = typeof getConsent === 'function'
    ? getConsent
    : (() => false);

  async function submitExperimentData(record) {
    if (!consentGetter()) {
      return;
    }
    const payload = { ...ensurePlainObject(record) };
    const tsValue = payload.ts;
    payload.ts = (typeof tsValue === 'number' && Number.isFinite(tsValue))
      ? Math.round(tsValue)
      : Date.now();

    try {
      await fetch('/api/exp/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      console.warn('Experiment upload failed', error);
    }
  }

  window.submitExperimentData = submitExperimentData;
  return submitExperimentData;
};

export const createExperimentSubmitter = (experimentKey, experimentVersion) => {
  const key = typeof experimentKey === 'string' && experimentKey ? experimentKey : 'unknown';
  const version = typeof experimentVersion === 'string' && experimentVersion ? experimentVersion : undefined;
  return data => {
    const payload = {
      experiment_key: key,
      ...(version ? { experiment_version: version } : {}),
      ...ensurePlainObject(data),
    };
    if (typeof window.submitExperimentData === 'function') {
      return window.submitExperimentData(payload);
    }
    return null;
  };
};
