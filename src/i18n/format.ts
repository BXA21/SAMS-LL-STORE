import type { Locale } from './config';

/** OMR is quoted to 3 decimals (baisa). Latin digits are kept in both languages. */
export function formatPrice(amount: number, locale: Locale, currency = 'OMR'): string {
  const value = Number(amount).toFixed(3);
  if (currency !== 'OMR') return `${value} ${currency}`;
  return locale === 'ar' ? `${value} ر.ع.` : `${value} OMR`;
}

export function currencyLabel(locale: Locale, currency = 'OMR'): string {
  if (currency !== 'OMR') return currency;
  return locale === 'ar' ? 'ر.ع.' : 'OMR';
}

export function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Muscat',
  });
}
