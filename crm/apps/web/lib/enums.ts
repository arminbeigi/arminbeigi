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

export const CALL_INTENT_TONE: Record<string, string> = {
  PURCHASE: 'bg-emerald-100 text-emerald-700',
  BREAKDOWN: 'bg-red-100 text-red-700',
  INSTALLATION: 'bg-flame-100 text-flame-600',
  SERVICE: 'bg-sky-100 text-sky-700',
  UNKNOWN: 'bg-steel-100 text-steel-500',
};

export const PROJECT_TYPE: Record<string, string> = {
  ENGINE_ROOM: 'موتورخانه',
  WALL_PACKAGE: 'پکیج دیواری',
  CAST_IRON_BOILER: 'دیگ چدنی',
  STEEL_BOILER: 'دیگ فولادی',
  INSTALLATION: 'نصب',
  SERVICE: 'سرویس',
};

export const PROJECT_STATUS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SURVEY: 'بازدید فنی',
  PROPOSAL: 'پیشنهاد قیمت',
  IN_PROGRESS: 'در حال اجرا',
  ON_HOLD: 'متوقف',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
};

export const PROJECT_STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-steel-100 text-steel-600',
  SURVEY: 'bg-sky-100 text-sky-700',
  PROPOSAL: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-flame-100 text-flame-600',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

/** انتقال‌های مجاز وضعیت پروژه — هم‌راستا با state machine بک‌اند */
export const PROJECT_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SURVEY', 'CANCELLED'],
  SURVEY: ['PROPOSAL', 'CANCELLED'],
  PROPOSAL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const PRODUCT_CATEGORY: Record<string, string> = {
  BOILER: 'دیگ / پکیج',
  BURNER: 'مشعل',
  PUMP: 'پمپ',
  TANK: 'منبع / مخزن',
  RADIATOR: 'رادیاتور',
  ACCESSORY: 'متعلقات',
};

export const FUEL_TYPE: Record<string, string> = {
  GAS: 'گازی',
  GASOIL: 'گازوئیلی',
  DUAL: 'دوگانه‌سوز',
  ELECTRIC: 'برقی',
  NONE: 'بدون سوخت',
};

export const BOILER_KIND: Record<string, string> = {
  WALL_PACKAGE: 'پکیج دیواری',
  CAST_IRON: 'دیگ چدنی',
  STEEL: 'دیگ فولادی',
  GROUND: 'زمینی',
  NONE: 'نامشخص',
};

// ── تیکت‌ها / پشتیبانی ────────────────────────────────────────────────────────
export const TICKET_STATUS: Record<string, string> = {
  OPEN: 'باز',
  IN_PROGRESS: 'در حال بررسی',
  WAITING: 'در انتظار مشتری',
  RESOLVED: 'حل‌شده',
  CLOSED: 'بسته‌شده',
};

export const TICKET_STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-sky-100 text-sky-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING: 'bg-violet-100 text-violet-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-steel-100 text-steel-600',
};

export const TICKET_PRIORITY: Record<string, string> = {
  LOW: 'کم',
  MEDIUM: 'متوسط',
  HIGH: 'زیاد',
  URGENT: 'فوری',
};

export const TICKET_PRIORITY_TONE: Record<string, string> = {
  LOW: 'bg-steel-100 text-steel-600',
  MEDIUM: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-amber-100 text-amber-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const TICKET_CATEGORY: Record<string, string> = {
  BREAKDOWN: 'خرابی',
  INSTALLATION: 'نصب',
  MAINTENANCE: 'سرویس دوره‌ای',
  WARRANTY: 'گارانتی',
  COMPLAINT: 'شکایت',
  INQUIRY: 'استعلام',
};

/** انتقال‌های مجاز وضعیت تیکت — هم‌راستا با state machine بک‌اند */
export const TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING', 'RESOLVED', 'CLOSED'],
  WAITING: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
};

export const label = (map: Record<string, string>, key: string | null | undefined): string =>
  (key && map[key]) || key || '—';
