import { Logger } from '@nestjs/common';
import { ISttProvider } from './ai-provider.interface';

/**
 * STT شبیه‌سازی‌شده. متن فارسیِ واقع‌نمای یک تماس HVAC برمی‌گرداند (قطعی بر اساس ورودی)
 * تا خط لوله‌ی رونویسی→خلاصه→نیت قابل‌آزمون باشد. بعداً با WhisperSttProvider جایگزین می‌شود.
 */
const SAMPLES = [
  'سلام، پکیج دیواری منزل ما خراب شده و آب گرم نمیده، صدای زیادی هم میده. میشه یه تکنسین بفرستید؟',
  'سلام، برای یک ساختمان ۱۲ واحدی میخوام موتورخانه نصب کنم، قیمت دیگ چدنی و مشعل رو میخواستم بدونم.',
  'وقت بخیر، سرویس سالیانه‌ی پکیجم رو میخواستم رزرو کنم و رسوب‌گیری مبدل انجام بشه.',
  'سلام، میخواستم برای خرید یک پمپ سیرکولاتور و یک منبع انبساط استعلام قیمت بگیرم.',
];

export class MockSttProvider implements ISttProvider {
  private readonly logger = new Logger('MockStt');

  mode(): 'mock' | 'real' {
    return 'mock';
  }

  transcribe(recordingRef: string): Promise<string> {
    this.logger.debug(`transcribe(mock): ${recordingRef}`);
    // انتخاب قطعی بر اساس طول مسیر — خروجی پایدار برای آزمون
    const idx = recordingRef.length % SAMPLES.length;
    return Promise.resolve(SAMPLES[idx]);
  }
}
