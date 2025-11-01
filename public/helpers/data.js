const DEFAULT_DURATION = 3600;

const createElement = (tag, className) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
};

export function initializeToasts(root = document.getElementById('toast-root')) {
  if (!root || typeof document === 'undefined') {
    return {
      showToast: () => {},
    };
  }

  root.classList.add('toast-root');

  const showToast = (message, options = {}) => {
    if (!message) return null;
    const toast = createElement('div', 'toast');
    const { variant = 'info', duration = DEFAULT_DURATION, description = null } = options;
    toast.dataset.variant = variant;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');

    const messageEl = createElement('div', 'toast__message');
    messageEl.textContent = message;
    toast.appendChild(messageEl);

    if (description) {
      const descriptionEl = createElement('div', 'toast__description');
      descriptionEl.textContent = description;
      toast.appendChild(descriptionEl);
    }

    root.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    const close = () => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      }, { once: true });
    };

    const timeout = Math.max(1000, Number(duration) || DEFAULT_DURATION);
    const timer = setTimeout(close, timeout);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      close();
    });

    return toast;
  };

  return { showToast };
}

export const formatExportUrl = ({ day, format = 'csv' } = {}) => {
  const safeDay = day || new Date().toISOString().slice(0, 10);
  const safeFormat = format === 'jsonl' ? 'jsonl' : 'csv';
  const params = new URLSearchParams({ day: safeDay, format: safeFormat });
  return `/api/exp/export?${params.toString()}`;
};

export const triggerDataExport = (options = {}) => {
  if (typeof window === 'undefined') return;
  const url = formatExportUrl(options);
  window.open(url, '_blank', 'noopener');
};
