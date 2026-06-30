import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';

/**
 * پیکربندی لاگ ساخت‌یافته (pino) با correlation-id.
 * - هر درخواست یک شناسه می‌گیرد (از هدر X-Request-Id یا تولید UUID) که در همان هدر
 *   پاسخ هم برمی‌گردد ⇒ ردگیری end-to-end.
 * - فیلدهای حساس (Authorization، cookie، رمز/توکن در بدنه) پنهان (redact) می‌شوند.
 * - خروجی همیشه JSON ساخت‌یافته است (مناسب جمع‌آوری لاگ در تولید).
 */
export function buildLoggerParams(level: string): Params {
  return {
    pinoHttp: {
      level,
      genReqId: (req: IncomingMessage, res: ServerResponse): string => {
        const existing = (req.headers['x-request-id'] as string | undefined)?.trim();
        const id = existing && existing.length > 0 ? existing : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      // سطح لاگ هر پاسخ بر اساس کد وضعیت
      customLogLevel: (_req, res, err): 'info' | 'warn' | 'error' => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // پنهان‌سازی اطلاعات حساس
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.refreshToken',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
      // اطلاعات حداقلی و مفید از درخواست/پاسخ
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      // مسیرهای پر سروصدا را کم‌اهمیت کن
      autoLogging: {
        ignore: (req: IncomingMessage) => req.url === '/api/health',
      },
    },
  };
}
