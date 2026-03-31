const STORAGE_KEY = 'sitra:sales:order-create-draft:v1';

export const readOrderCreateDraft = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const writeOrderCreateDraft = (draft) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft || {}));
  } catch {
    // Ignore persistence errors to keep order flow resilient.
  }
};

export const clearOrderCreateDraft = () => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
};

