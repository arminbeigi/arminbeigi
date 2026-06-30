/** توکن‌های تزریق وابستگی برای ارائه‌دهنده‌های AI (Mock یا Real) */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
export const STT_PROVIDER = Symbol('STT_PROVIDER');

/** ارائه‌دهنده‌ی مدل زبانی (خلاصه‌سازی + دستیار) */
export interface ILlmProvider {
  mode(): 'mock' | 'real';
  /** خلاصه‌ی فارسی از متن تماس */
  summarize(transcript: string): Promise<string>;
  /** پاسخ دستیار فارسی با توجه به متن زمینه (context) */
  assistantAnswer(query: string, context: string): Promise<string>;
}

/** ارائه‌دهنده‌ی تبدیل گفتار به متن (STT) */
export interface ISttProvider {
  mode(): 'mock' | 'real';
  /** رونویسی فایل ضبط (مسیر محلی یا URL) به متن فارسی */
  transcribe(recordingRef: string): Promise<string>;
}
