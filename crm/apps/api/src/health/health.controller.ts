import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('سلامت')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * سلامت کلی (سازگار با نسخه‌ی قبل): وضعیت سرویس و دیتابیس.
   * برای healthcheckهای ساده‌ی موجود حفظ شده است.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'بررسی سلامت سرویس و اتصال دیتابیس' })
  async check(): Promise<{ status: string; db: string; time: string }> {
    let db = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, time: new Date().toISOString() };
  }

  /**
   * Liveness — فقط زنده‌بودن فرایند را تأیید می‌کند (بدون بررسی وابستگی‌ها).
   * برای restart خودکار توسط ارکستریتور (k8s/compose) مناسب است.
   */
  @Public()
  @Get('live')
  @ApiOperation({ summary: 'بررسی liveness (زنده‌بودن فرایند)' })
  live(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness — آماده‌بودن برای پذیرش ترافیک: دیتابیس و Redis (در صورت پیکربندی).
   * شکست هر وابستگی ⇒ پاسخ 503.
   */
  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'بررسی readiness (دیتابیس + Redis)' })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database'),
      () => this.redisHealth.pingCheck('redis'),
    ]);
  }
}
