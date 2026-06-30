/**
 * ابزارهای نرمال‌سازی فارسی — هم‌راستا با تابع fa_normalize در دیتابیس (مهاجرت 0002).
 */

const FA_AR_DIGITS = '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩';
const LATIN_DIGITS = '01234567890123456789';

/** تبدیل ارقام فارسی/عربی به لاتین */
export function foldDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const idx = FA_AR_DIGITS.indexOf(ch);
    out += idx === -1 ? ch : LATIN_DIGITS[idx];
  }
  return out;
}

/**
 * نرمال‌سازی شماره تلفن برای ذخیره و تطبیق تماس:
 * - ارقام فارسی/عربی → لاتین
 * - حذف هر چیز غیرعددی به‌جز + ابتدایی
 * - تبدیل پیش‌شماره‌ی ایران (+98 / 0098) به 0
 */
export function normalizePhone(raw: string): string {
  let s = foldDigits(raw).trim();
  const hasPlus = s.startsWith('+');
  s = s.replace(/[^\d]/g, '');
  if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (hasPlus && s.startsWith('98')) s = '0' + s.slice(2);
  return s;
}
