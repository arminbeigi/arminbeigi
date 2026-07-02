import { ProductCategory, TicketCategory, TicketPriority } from '@prisma/client';
import { faNormalizeText } from '../../common/utils/persian';

/**
 * دسته‌بندی خودکار تیکت پشتیبانی بر اساس کلیدواژه‌های فارسی حوزه‌ی HVAC.
 * پیاده‌سازی واقعی و قابل‌اتکاست (نه Mock) و بدون LLM هم کار می‌کند؛ لایه‌ی LLM
 * می‌تواند بعداً نتیجه را بازبینی/اصلاح کند. هم‌راستا با detectIntent تماس‌ها.
 */

// کلیدواژه‌های هر دسته‌ی تیکت
const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  BREAKDOWN: ['خراب', 'کار نمی', 'نشتی', 'نشت', 'صدا', 'ارور', 'خاموش', 'روشن نمی', 'مشکل', 'ایراد', 'سرد', 'گرم نمی', 'حرارت نمی'],
  INSTALLATION: ['نصب', 'راه اندازی', 'راه‌اندازی', 'لوله کشی', 'لوله‌کشی', 'اجرا', 'موتورخانه جدید', 'راه انداز'],
  MAINTENANCE: ['سرویس', 'سالیانه', 'شست', 'رسوب', 'نگهداری', 'بازدید دوره', 'تعمیر', 'دوره ای', 'دوره‌ای'],
  WARRANTY: ['گارانتی', 'ضمانت', 'وارانتی', 'خدمات پس از فروش'],
  COMPLAINT: ['شکایت', 'نارضایتی', 'بدقولی', 'تاخیر', 'تأخیر', 'بی کیفیت', 'اعتراض', 'ناراضی'],
  INQUIRY: ['استعلام', 'سوال', 'سؤال', 'پرسش', 'مشاوره', 'راهنمایی', 'قیمت', 'چقدر', 'چطور'],
};

// نشانه‌های اولویت — اورژانسی (خطر ایمنی) و زیاد
const URGENT_KEYWORDS = ['نشت گاز', 'بوی گاز', 'گاز نشت', 'آتش', 'حریق', 'دود', 'انفجار', 'برق گرفت', 'خطر', 'فوری', 'اورژانس', 'اضطراری'];
const HIGH_KEYWORDS = ['خراب', 'کار نمی', 'بدون آب گرم', 'بدون حرارت', 'سرد', 'خاموش شد', 'قطع شد', 'نشتی آب', 'سریع'];
const LOW_HINT_CATEGORIES: TicketCategory[] = ['INQUIRY'];

// تشخیص قطعه/تجهیز HVAC مرتبط (هم‌راستا با PRODUCT_HINTS در ai.service)
const COMPONENT_KEYWORDS: { words: string[]; component: ProductCategory }[] = [
  { words: ['پکیج', 'دیگ', 'بویلر', 'شوفاژ', 'موتورخانه'], component: ProductCategory.BOILER },
  { words: ['مشعل', 'برنر'], component: ProductCategory.BURNER },
  { words: ['پمپ', 'سیرکولاتور'], component: ProductCategory.PUMP },
  { words: ['منبع', 'مخزن', 'انبساط'], component: ProductCategory.TANK },
  { words: ['رادیاتور', 'پره'], component: ProductCategory.RADIATOR },
];

export interface TicketClassification {
  category: TicketCategory;
  priority: TicketPriority;
  component: ProductCategory | null;
  confidence: number; // 0..1
  scores: Record<string, number>;
}

function countMatches(norm: string, words: string[]): number {
  let count = 0;
  for (const w of words) if (norm.includes(faNormalizeText(w))) count++;
  return count;
}

/** دسته‌بندی متن تیکت (موضوع + توضیحات) به دسته/اولویت/قطعه */
export function classifyTicket(text: string | null | undefined): TicketClassification {
  const norm = faNormalizeText(text ?? '');

  // ── دسته ──
  const scores: Record<string, number> = {};
  let bestCategory: TicketCategory = 'INQUIRY';
  let bestCount = 0;
  let total = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS) as [TicketCategory, string[]][]) {
    const count = countMatches(norm, words);
    scores[cat] = count;
    total += count;
    if (count > bestCount) {
      bestCount = count;
      bestCategory = cat;
    }
  }

  // ── اولویت ──
  let priority: TicketPriority;
  if (countMatches(norm, URGENT_KEYWORDS) > 0) {
    priority = 'URGENT';
  } else if (countMatches(norm, HIGH_KEYWORDS) > 0) {
    priority = 'HIGH';
  } else if (LOW_HINT_CATEGORIES.includes(bestCategory) && bestCount > 0) {
    priority = 'LOW';
  } else {
    priority = 'MEDIUM';
  }

  // ── قطعه/تجهیز ──
  let component: ProductCategory | null = null;
  for (const hint of COMPONENT_KEYWORDS) {
    if (hint.words.some((w) => norm.includes(faNormalizeText(w)))) {
      component = hint.component;
      break;
    }
  }

  const confidence = total === 0 ? 0 : Math.min(1, bestCount / Math.max(1, total));
  return { category: bestCategory, priority, component, confidence, scores };
}
