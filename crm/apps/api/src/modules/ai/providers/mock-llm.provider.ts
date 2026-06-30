import { Logger } from '@nestjs/common';
import { detectIntent } from '../intent';
import { ILlmProvider } from './ai-provider.interface';

/**
 * ارائه‌دهنده‌ی LLM شبیه‌سازی‌شده. خروجی فارسیِ قطعی و منطقی تولید می‌کند تا کل خط لوله‌ی AI
 * بدون مدل واقعی قابل‌اجرا و آزمون باشد. هنگام راه‌اندازی مدل خودمیزبان با OpenAiLlmProvider جایگزین می‌شود.
 */
export class MockLlmProvider implements ILlmProvider {
  private readonly logger = new Logger('MockLlm');

  mode(): 'mock' | 'real' {
    return 'mock';
  }

  summarize(transcript: string): Promise<string> {
    const intent = detectIntent(transcript).intent;
    const intentFa: Record<string, string> = {
      PURCHASE: 'استعلام خرید/قیمت',
      BREAKDOWN: 'اعلام خرابی/مشکل فنی',
      INSTALLATION: 'درخواست نصب/راه‌اندازی',
      SERVICE: 'درخواست سرویس/نگهداری',
      UNKNOWN: 'موضوع عمومی',
    };
    // خلاصه‌ی استخراجی: نخستین جمله‌ی معنادار + برچسب موضوع
    const firstSentence =
      transcript
        .split(/[.!?؟\n]/)
        .map((s) => s.trim())
        .find((s) => s.length > 8) ?? transcript.slice(0, 120);
    return Promise.resolve(`موضوع: ${intentFa[intent]}. ${firstSentence}`.trim());
  }

  assistantAnswer(query: string, context: string): Promise<string> {
    this.logger.debug(`assistant(mock): ${query}`);
    return Promise.resolve(context || 'در حال حاضر پاسخ دقیقی برای این پرسش در دسترس نیست.');
  }
}
