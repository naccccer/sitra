import { resolveApiFileUrl } from '@/utils/url';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg']);

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, Math.max(0, Number(ms) || 0));
});

const sanitizePrintTitle = (value) => (
  String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
);

const getFileExtension = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized.includes('.')) return '';
  const parts = normalized.split('.');
  return parts[parts.length - 1] || '';
};

const isImageMime = (mime = '') => String(mime || '').toLowerCase().startsWith('image/');

const collectOrderPatternImageUrls = (items = []) => {
  if (!Array.isArray(items)) return [];

  const urls = [];
  for (const item of items) {
    const pattern = item?.pattern;
    if (!pattern || pattern.type !== 'upload') continue;

    const previewDataUrl = String(pattern.previewDataUrl || '').trim();
    if (previewDataUrl.startsWith('data:image/')) {
      urls.push(previewDataUrl);
      continue;
    }

    const filePath = String(pattern.filePath || pattern.path || pattern.url || '').trim();
    const fileUrl = resolveApiFileUrl(filePath);
    if (!fileUrl) continue;

    const mimeType = String(pattern.mimeType || '').toLowerCase();
    const ext = getFileExtension(pattern.fileName || filePath);
    if (isImageMime(mimeType) || IMAGE_EXTENSIONS.has(ext)) {
      urls.push(fileUrl);
    }
  }

  return Array.from(new Set(urls));
};

const preloadImage = (src, timeoutMs = 4000) => new Promise((resolve) => {
  if (!src) {
    resolve();
    return;
  }

  const img = new Image();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    resolve();
  };

  const timeoutId = setTimeout(finish, Math.max(500, Number(timeoutMs) || 4000));
  img.onload = () => {
    clearTimeout(timeoutId);
    finish();
  };
  img.onerror = () => {
    clearTimeout(timeoutId);
    finish();
  };
  img.src = src;
});

async function preloadPatternImages(items = []) {
  const urls = collectOrderPatternImageUrls(items);
  if (urls.length === 0) return;
  await Promise.all(urls.map((url) => preloadImage(url)));
}

export async function printInvoiceWithOrderCode({
  orderCode = '',
  items = [],
  fallbackTitle = 'Invoice',
  delayMs = 180,
} = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const previousTitle = document.title;
  const printTitle = sanitizePrintTitle(orderCode) || sanitizePrintTitle(fallbackTitle) || 'Invoice';
  document.title = printTitle;

  let restored = false;
  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    document.title = previousTitle;
  };

  window.addEventListener('afterprint', restoreTitle, { once: true });

  try {
    await preloadPatternImages(items);
    await sleep(delayMs);
    window.print();
  } finally {
    // Fallback: in some browsers `afterprint` may not fire reliably.
    setTimeout(restoreTitle, 2000);
  }
}
