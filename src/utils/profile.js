import { FACTORY_ADDRESS, FACTORY_PHONES } from './helpers';

export const defaultProfile = {
  brandName: 'Sitra',
  panelSubtitle: 'پنل مدیریت سفارش',
  invoiceTitleCustomer: 'پیش‌فاکتور رسمی سفارش',
  invoiceTitleFactory: 'برگه سفارش تولید (نسخه کارخانه)',
  logoPath: '',
  logoOriginalName: '',
  address: FACTORY_ADDRESS,
  phones: FACTORY_PHONES,
};

const toSafeText = (value) => String(value ?? '').trim();

export const normalizeProfile = (source) => {
  const raw = source && typeof source === 'object' ? source : {};
  const brandName = toSafeText(raw.brandName) || defaultProfile.brandName;
  const panelSubtitle = toSafeText(raw.panelSubtitle) || defaultProfile.panelSubtitle;
  const invoiceTitleCustomer = toSafeText(raw.invoiceTitleCustomer) || defaultProfile.invoiceTitleCustomer;
  const invoiceTitleFactory = toSafeText(raw.invoiceTitleFactory) || defaultProfile.invoiceTitleFactory;
  const logoPath = toSafeText(raw.logoPath);
  const logoOriginalName = toSafeText(raw.logoOriginalName);
  const address = toSafeText(raw.address) || defaultProfile.address;
  const phones = toSafeText(raw.phones) || defaultProfile.phones;

  return {
    brandName,
    panelSubtitle,
    invoiceTitleCustomer,
    invoiceTitleFactory,
    logoPath,
    logoOriginalName,
    address,
    phones,
  };
};

export const profileLogoSrc = (logoPath = '') => {
  const raw = toSafeText(logoPath);
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
};

export const profileBrandInitial = (profile) => {
  const normalized = normalizeProfile(profile);
  const first = toSafeText(normalized.brandName).charAt(0);
  if (!first) return 'S';
  return first.toUpperCase();
};
