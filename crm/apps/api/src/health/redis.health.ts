import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { REDIS_CLIENT, RedisClient } from '../redis/redis.module';

/**
 * نشانگر سلامت Redis. اگر Redis پیکربندی نشده باشد (REDIS_URL خالی)، به‌عنوان
 * «پیکربندی‌نشده» گزارش می‌شود (نه خطا) — وابستگی اختیاری است.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      return this.getStatus(key, true, { note: 'not_configured' });
    }
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') throw new Error(`پاسخ غیرمنتظره: ${pong}`);
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        'بررسی Redis ناموفق بود',
        this.getStatus(key, false, {
          message: err instanceof Error ? err.message : 'unknown',
        }),
      );
    }
  }
}
