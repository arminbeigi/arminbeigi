import { Logger } from '@nestjs/common';
import { ILlmProvider } from './ai-provider.interface';

export interface OpenAiLlmOptions {
  baseUrl: string; // سرور سازگار با OpenAI (vLLM/Ollama/...)
  model: string;
  apiKey: string;
}

/**
 * ارائه‌دهنده‌ی LLM واقعی روی سرور سازگار با OpenAI (مدل خودمیزبان).
 * چون سرویس داخلی است، از پروکسی عبور نمی‌کند. هنگام راه‌اندازی، AI_MOCK=false شود.
 */
export class OpenAiLlmProvider implements ILlmProvider {
  private readonly logger = new Logger('OpenAiLlm');

  constructor(private readonly opts: OpenAiLlmOptions) {}

  mode(): 'mock' | 'real' {
    return 'real';
  }

  private async chat(system: string, user: string): Promise<string> {
    const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify({
        model: this.opts.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`خطای سرویس AI (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  summarize(transcript: string): Promise<string> {
    return this.chat(
      'تو دستیار یک شرکت تأسیساتی (HVAC) هستی. مکالمه‌ی تلفنی مشتری را در حداکثر دو جمله‌ی کوتاه فارسی خلاصه کن.',
      transcript,
    );
  }

  assistantAnswer(query: string, context: string): Promise<string> {
    return this.chat(
      'تو دستیار فروش یک شرکت تأسیساتی هستی. فقط بر اساس داده‌ی زمینه و به فارسی روان و کوتاه پاسخ بده.',
      `زمینه:\n${context}\n\nپرسش: ${query}`,
    );
  }
}
