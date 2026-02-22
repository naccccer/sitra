export const FACTORY_ADDRESS = 'مشهد، خین‌عرب، بین طرح چی 11 و 13، پرهام';
export const FACTORY_PHONES = '۰۹۰۴۷۰۷۹۸۶۹ - ۰۹۱۵۸۷۸۸۸۴۶';

export const toPN = (num) => {
  if (num === undefined || num === null) return '';
  return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
};

export const normalizeDigitsToLatin = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\u06F0-\u06F9]/g, (char) => String(char.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (char) => String(char.charCodeAt(0) - 0x0660));
};

export const generateOrderCode = (items, source = 'customer', dailySeq = 1) => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: '2-digit', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(d);
  const yy = parts.find(p => p.type === 'year')?.value || '00';
  const mm = parts.find(p => p.type === 'month')?.value || '00';
  const dd = parts.find(p => p.type === 'day')?.value || '00';
  const dateStr = `${yy}${mm}${dd}`;

  const hasPattern = items.some(i => i.pattern?.type === 'upload' || i.pattern?.type === 'carton') ? 1 : 0;
  const isAdmin = source === 'admin' ? 1 : 0;
  const seqStr = String(dailySeq).padStart(3, '0');

  const baseString = `${dateStr}${hasPattern}${isAdmin}${seqStr}`;
  let sum = 0;
  for (let i = 0; i < baseString.length; i++) sum += parseInt(baseString[i], 10) || 0;
  const k = sum % 10;

  return `${dateStr}-${hasPattern}${isAdmin}-${seqStr}-${k}`;
};
