import { Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { ISttProvider } from './ai-provider.interface';

/**
 * ارائه‌دهنده‌ی STT واقعی روی Whisper خودمیزبان (سازگار با whisper-asr-webservice).
 * فایل ضبط را از مسیر محلی خوانده و برای رونویسی فارسی POST می‌کند.
 * هنگام راه‌اندازی، STT_MOCK=false شود.
 */
export class WhisperSttProvider implements ISttProvider {
  private readonly logger = new Logger('WhisperStt');

  constructor(private readonly baseUrl: string) {}

  mode(): 'mock' | 'real' {
    return 'real';
  }

  async transcribe(recordingRef: string): Promise<string> {
    const buf = await readFile(recordingRef);
    const form = new FormData();
    form.append('audio_file', new Blob([buf]), basename(recordingRef));
    const url = `${this.baseUrl}/asr?language=fa&output=txt&task=transcribe`;
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      throw new Error(`خطای سرویس رونویسی (${res.status})`);
    }
    return (await res.text()).trim();
  }
}
