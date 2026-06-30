import type { IncomingMessage, ServerResponse } from 'http';
import { buildLoggerParams } from './logger.config';

/** تست واحد منطق correlation-id در پیکربندی لاگر */
describe('buildLoggerParams · genReqId', () => {
  const getGenReqId = () => {
    const params = buildLoggerParams('info');
    const pinoHttp = params.pinoHttp as { genReqId: (req: unknown, res: unknown) => string };
    return pinoHttp.genReqId;
  };

  const mockRes = () => {
    const headers: Record<string, string> = {};
    return {
      res: { setHeader: (k: string, v: string) => (headers[k] = v) } as unknown as ServerResponse,
      headers,
    };
  };

  it('اگر X-Request-Id داده شود، همان را برمی‌گرداند و در هدر پاسخ می‌گذارد', () => {
    const genReqId = getGenReqId();
    const { res, headers } = mockRes();
    const req = { headers: { 'x-request-id': 'abc-123' } } as unknown as IncomingMessage;
    const id = genReqId(req, res);
    expect(id).toBe('abc-123');
    expect(headers['X-Request-Id']).toBe('abc-123');
  });

  it('اگر هدر نباشد، یک UUID تولید و در پاسخ ست می‌کند', () => {
    const genReqId = getGenReqId();
    const { res, headers } = mockRes();
    const req = { headers: {} } as unknown as IncomingMessage;
    const id = genReqId(req, res);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['X-Request-Id']).toBe(id);
  });

  it('سطح لاگ بر اساس کد وضعیت تعیین می‌شود', () => {
    const params = buildLoggerParams('info');
    const fn = (params.pinoHttp as { customLogLevel: (r: unknown, res: unknown, e: unknown) => string })
      .customLogLevel;
    expect(fn({}, { statusCode: 200 }, undefined)).toBe('info');
    expect(fn({}, { statusCode: 404 }, undefined)).toBe('warn');
    expect(fn({}, { statusCode: 500 }, undefined)).toBe('error');
    expect(fn({}, { statusCode: 200 }, new Error('x'))).toBe('error');
  });
});
