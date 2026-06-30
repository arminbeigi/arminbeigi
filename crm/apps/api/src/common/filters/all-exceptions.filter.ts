import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * فیلتر سراسری خطا: همه‌ی خطاها را به یک شکل یکنواخت JSON تبدیل می‌کند.
 * پیام‌های اعتبارسنجی class-validator (آرایه) حفظ می‌شوند.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'خطای داخلی سرور';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as { message?: string | string[]; error?: string };
        message = r.message ?? message;
        error = r.error ?? exception.name;
      }
    } else if (this.isHttpErrorLike(exception)) {
      // خطاهای سبک http-errors (مثل PayloadTooLarge از body-parser) که HttpException نیستند
      status = exception.status;
      message = exception.message || message;
      error = exception.name || error;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  /** خطاهای دارای کد وضعیت معتبر (۴۰۰–۵۹۹) به‌سبک http-errors */
  private isHttpErrorLike(e: unknown): e is { status: number; message: string; name: string } {
    if (typeof e !== 'object' || e === null) return false;
    const status = (e as { status?: unknown }).status;
    return typeof status === 'number' && status >= 400 && status < 600;
  }
}
