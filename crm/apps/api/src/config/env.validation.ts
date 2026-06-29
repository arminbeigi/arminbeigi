import { z } from 'zod';

/**
 * اعتبارسنجی متغیرهای محیطی هنگام بوت.
 * اگر چیزی نامعتبر باشد، اپ با خطای واضح بالا نمی‌آید (fail-fast).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET باید حداقل ۱۶ نویسه باشد'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET باید حداقل ۱۶ نویسه باشد'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900), // 15m
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2592000), // 30d

  // اختیاری‌ها (در فازهای بعد استفاده می‌شوند)
  REDIS_URL: z.string().optional(),
  CORS_ORIGINS: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`پیکربندی محیط نامعتبر است:\n${issues}`);
  }
  return parsed.data;
}
