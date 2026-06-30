import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';
import type { RedisClient } from '../redis/redis.module';

describe('RedisHealthIndicator', () => {
  it('وقتی Redis پیکربندی نشده باشد، up با یادداشت not_configured برمی‌گرداند', async () => {
    const indicator = new RedisHealthIndicator(null);
    const res = await indicator.pingCheck('redis');
    expect(res.redis.status).toBe('up');
    expect((res.redis as { note?: string }).note).toBe('not_configured');
  });

  it('با ping موفق، up برمی‌گرداند', async () => {
    const redis = { ping: jest.fn().mockResolvedValue('PONG') } as unknown as RedisClient;
    const indicator = new RedisHealthIndicator(redis);
    const res = await indicator.pingCheck('redis');
    expect(res.redis.status).toBe('up');
  });

  it('با شکست ping، HealthCheckError پرتاب می‌کند', async () => {
    const redis = { ping: jest.fn().mockRejectedValue(new Error('conn refused')) } as unknown as RedisClient;
    const indicator = new RedisHealthIndicator(redis);
    await expect(indicator.pingCheck('redis')).rejects.toBeInstanceOf(HealthCheckError);
  });
});
