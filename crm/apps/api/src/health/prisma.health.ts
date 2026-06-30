import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

/** نشانگر سلامت دیتابیس (PostgreSQL) از طریق یک کوئری سبک */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        'بررسی دیتابیس ناموفق بود',
        this.getStatus(key, false, {
          message: err instanceof Error ? err.message : 'unknown',
        }),
      );
    }
  }
}
