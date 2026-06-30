const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** تبدیل ارقام لاتین به فارسی */
export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

/** نمایش رشته با ارقام فارسی (نام مستعار توصیفی برای toFa) */
export const normalizeForDisplay = toFa;

/** جداکننده‌ی هزارگان + ارقام فارسی */
export function faNumber(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return toFa(String(value));
  return toFa(n.toLocaleString('en-US'));
}

/** مبلغ ریالی → نمایش تومان فارسی */
export function faToman(irr: string | number): string {
  const n = typeof irr === 'string' ? Number(irr) : irr;
  if (Number.isNaN(n)) return '—';
  const toman = Math.round(n / 10);
  return `${faNumber(toman)} تومان`;
}

/** تاریخ ISO → تاریخ/زمان فارسی (تقویم شمسی) */
export function faDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** ثانیه → mm:ss فارسی */
export function faDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return toFa(`${m}:${String(s).padStart(2, '0')}`);
}
