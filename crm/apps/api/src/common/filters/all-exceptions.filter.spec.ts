import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

/**
 * تست واحد فیلتر سراسری خطا — تضمین یکنواختی پاسخ و شناسایی خطاهای سبک http-errors
 * (مثل PayloadTooLarge از body-parser) که HttpException نیستند.
 */
describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ url: '/api/test' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('HttpException را با کد و پیام درست بازتاب می‌دهد', () => {
    filter.catch(new BadRequestException('ورودی نامعتبر'), host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(jsonMock.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      message: 'ورودی نامعتبر',
      path: '/api/test',
    });
  });

  it('خطای سبک http-errors (status=413) را به همان کد نگاشت می‌کند', () => {
    const err = Object.assign(new Error('request entity too large'), {
      status: 413,
      name: 'PayloadTooLargeError',
    });
    filter.catch(err, host);
    expect(statusMock).toHaveBeenCalledWith(413);
    expect(jsonMock.mock.calls[0][0]).toMatchObject({
      statusCode: 413,
      error: 'PayloadTooLargeError',
      message: 'request entity too large',
    });
  });

  it('خطای ناشناخته ⇒ 500 با پیام عمومی فارسی (بدون نشت جزئیات)', () => {
    filter.catch(new Error('secret internal detail'), host);
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock.mock.calls[0][0]).toMatchObject({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'خطای داخلی سرور',
    });
  });
});
