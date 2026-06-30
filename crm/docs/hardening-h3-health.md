# سخت‌سازی H3 — Health (liveness/readiness) + بررسی Redis

> وضعیت: **اجراشده و اعتبارسنجی‌شده** (۳ تست واحد + بررسی زنده‌ی up/۵۰۳). اولویت: 🟠 High.

## ۱) مسئله
health قبلی فقط یک مسیر سطحی بود (وضعیت DB) و بین **liveness** (زنده‌بودن فرایند) و
**readiness** (آماده‌بودن برای ترافیک) تفکیک نداشت؛ Redis هم بررسی نمی‌شد.

## ۲) راهکار (`@nestjs/terminus`)
- **`GET /api/health`** — حفظ‌شده برای سازگاری (وضعیت سرویس + DB).
- **`GET /api/health/live`** — liveness: فقط زنده‌بودن فرایند (بدون وابستگی) ⇒ مناسب
  restart خودکار ارکستریتور. healthcheck سرویس `api` در compose از همین استفاده می‌کند.
- **`GET /api/health/ready`** — readiness: بررسی **دیتابیس** + **Redis**؛ شکست هر کدام ⇒ **۵۰۳**.
- **`RedisModule` سراسری**: کلاینت ioredis مشترک (برای readiness و آداپتور سوکت در H4). اگر
  `REDIS_URL` تنظیم نشده باشد، کلاینت `null` است و Redis در readiness «not_configured/up»
  گزارش می‌شود (وابستگی اختیاری).

## ۳) فایل‌های افزوده/تغییر
- جدید: `src/health/{health.module,health.controller,prisma.health,redis.health}.ts`
  (+ `redis.health.spec.ts`)، `src/redis/redis.module.ts`.
- `src/app.module.ts` — ثبت `RedisModule` و `HealthModule` (حذف ثبت مستقیم کنترلر قبلی).
- `docker-compose.yml` — healthcheck سرویس `api` روی `/api/health/live`.

## ۴) شواهد اعتبارسنجی
- `npm run build` ⇒ بدون خطا. `npx jest` ⇒ **۷۱/۷۱** سبز.
- **زنده (Redis بالا):** `/health/ready` ⇒ `{database:up, redis:up}`.
- **زنده (Redis خاموش):** `/health/ready` ⇒ **HTTP 503** با ذکر `redis: down`، در حالی‌که
  `/health/live` همچنان **200** ماند.
- `docker compose config` ⇒ معتبر.

## ۵) سازگاری عقب‌رو
`GET /api/health` بدون تغییر باقی ماند. بقیه افزودنی است. Redis وابستگی **اختیاری** است؛
نبودِ `REDIS_URL` سیستم را نمی‌شکند.
