// نگاشت enumهای API به برچسب فارسی + رنگ نشان (badge)

export const CUSTOMER_TYPE: Record<string, string> = {
  RESIDENTIAL: 'خانگی',
  CONTRACTOR: 'پیمانکار',
  COMPANY: 'شرکت',
  BUILDING_PROJECT: 'پروژه ساختمانی',
};

export const CUSTOMER_STATUS: Record<string, string> = {
  LEAD: 'سرنخ',
  ACTIVE: 'فعال',
  INACTIVE: 'غیرفعال',
  BLOCKED: 'مسدود',
};

export const CUSTOMER_STATUS_TONE: Record<string, string> = {
  LEAD: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-steel-100 text-steel-600',
  BLOCKED: 'bg-red-100 text-red-700',
};

export const LEAD_SOURCE: Record<string, string> = {
  PHONE_INBOUND: 'تماس ورودی',
  PHONE_OUTBOUND: 'تماس خروجی',
  WEBSITE: 'وب‌سایت',
  REFERRAL: 'معرفی',
  CAMPAIGN: 'کمپین',
  WALK_IN: 'مراجعه حضوری',
  OTHER: 'سایر',
};

export const CALL_DIRECTION: Record<string, string> = {
  INBOUND: 'ورودی',
  OUTBOUND: 'خروجی',
  INTERNAL: 'داخلی',
};

export const CALL_STATUS: Record<string, string> = {
  RINGING: 'در حال زنگ',
  ANSWERED: 'پاسخ‌داده‌شده',
  NO_ANSWER: 'بی‌پاسخ',
  BUSY: 'مشغول',
  FAILED: 'ناموفق',
  VOICEMAIL: 'پیغام‌گیر',
};

export const CALL_INTENT: Record<string, string> = {
  PURCHASE: 'خرید',
  BREAKDOWN: 'خرابی',
  INSTALLATION: 'نصب',
  SERVICE: 'سرویس',
  UNKNOWN: 'نامشخص',
};

export const label = (map: Record<string, string>, key: string | null | undefined): string =>
  (key && map[key]) || key || '—';
