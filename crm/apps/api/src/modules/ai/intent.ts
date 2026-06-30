import { IntentType } from '@prisma/client';
import { faNormalizeText } from '../../common/utils/persian';

/**
 * تشخیص نیت تماس بر اساس کلیدواژه‌های فارسی.
 * این یک پیاده‌سازی واقعی و قابل‌اتکاست (نه فقط Mock) و در نبود LLM هم کار می‌کند؛
 * لایه‌ی LLM می‌تواند آن را بازبینی/بهبود دهد.
 */
const KEYWORDS: Record<Exclude<IntentType, 'UNKNOWN'>, string[]> = {
  PURCHASE: ['خرید', 'قیمت', 'بخرم', 'سفارش', 'فاکتور', 'تخفیف', 'موجودی', 'چند', 'فروش'],
  BREAKDOWN: ['خراب', 'کار نمی', 'نشتی', 'نشت', 'صدا', 'ارور', 'خاموش', 'روشن نمی', 'مشکل', 'ایراد', 'سرد'],
  INSTALLATION: ['نصب', 'راه اندازی', 'راه‌اندازی', 'لوله کشی', 'لوله‌کشی', 'اجرا', 'موتورخانه جدید'],
  SERVICE: ['سرویس', 'سالیانه', 'شست', 'رسوب', 'نگهداری', 'بازدید دوره', 'تعمیر'],
};

export interface IntentResult {
  intent: IntentType;
  confidence: number; // 0..1
  scores: Record<string, number>;
}

export function detectIntent(text: string | null | undefined): IntentResult {
  const norm = faNormalizeText(text ?? '');
  const scores: Record<string, number> = {};
  let best: IntentType = IntentType.UNKNOWN;
  let bestCount = 0;
  let total = 0;

  for (const [intent, words] of Object.entries(KEYWORDS)) {
    let count = 0;
    for (const w of words) {
      const nw = faNormalizeText(w);
      if (norm.includes(nw)) count++;
    }
    scores[intent] = count;
    total += count;
    if (count > bestCount) {
      bestCount = count;
      best = intent as IntentType;
    }
  }

  const confidence = total === 0 ? 0 : Math.min(1, bestCount / Math.max(1, total));
  return { intent: bestCount === 0 ? IntentType.UNKNOWN : best, confidence, scores };
}
