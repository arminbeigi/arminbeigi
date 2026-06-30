import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { Env } from '../config/env.validation';

/** توکن تزریق کلاینت Redis (ممکن است null باشد اگر REDIS_URL تنظیم نشده باشد) */
export const REDIS_CLIENT = 'REDIS_CLIENT';
export type RedisClient = Redis | null;

/**
 * ماژول سراسری Redis — یک کلاینت ioredis مشترک فراهم می‌کند که هم برای بررسی
 * آمادگی (readiness) و هم برای آداپتور Socket.IO (مقیاس‌پذیری) استفاده می‌شود.
 * اگر REDIS_URL تنظیم نشده باشد، null برمی‌گرداند و وابستگی اختیاری می‌ماند.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): RedisClient => {
        const url = config.get('REDIS_URL', { infer: true });
        if (!url) return null;
        const logger = new Logger('Redis');
        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          lazyConnect: false,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });
        client.on('error', (err) => logger.warn(`خطای اتصال Redis: ${err.message}`));
        client.on('connect', () => logger.log('اتصال به Redis برقرار شد'));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<RedisClient>(REDIS_CLIENT, { strict: false });
    if (client) await client.quit().catch(() => undefined);
  }
}
