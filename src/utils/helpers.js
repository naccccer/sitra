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
