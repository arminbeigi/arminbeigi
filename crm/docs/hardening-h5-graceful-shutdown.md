# سخت‌سازی H5 — خاموشی تمیز (Graceful Shutdown)

> وضعیت: **اجراشده و اعتبارسنجی‌شده** (آزمون زنده‌ی SIGTERM موفق). اولویت: 🟠 High.

## ۱) مسئله
خاموشی قبلی بر `process.on('beforeExit')` در `PrismaService` تکیه داشت که **نامطمئن** است:
رویداد `beforeExit` با `SIGTERM`/`SIGINT` (سیگنال‌های واقعی توقف کانتینر) فعال نمی‌شود و در
Prisma نسخه‌های جدید نیز منسوخ است. نتیجه: قطع‌نشدن تمیز اتصال‌ها هنگام استقرار/restart.

## ۲) راهکار
- **`app.enableShutdownHooks()`** در `main.ts`: Nest به `SIGTERM`/`SIGINT` گوش می‌دهد و چرخه‌ی
  خاموشی را اجرا می‌کند: بستن سرور HTTP (توقف پذیرش درخواست جدید) و فراخوانی hookهای حیات.
- `PrismaService.onModuleDestroy` ⇒ `$disconnect()` (با لاگ).
- `RedisModule.onApplicationShutdown` ⇒ `redis.quit()` (از H3).
- حذف کامل هک `beforeExit` و وابستگی به `INestApplication` در PrismaService.

## ۳) فایل‌های تغییر
- `src/main.ts` — جایگزینی هک با `app.enableShutdownHooks()`.
- `src/prisma/prisma.service.ts` — حذف `enableShutdownHooks`؛ لاگ بستن اتصال در `onModuleDestroy`.

## ۴) شواهد اعتبارسنجی
- `npm run build` ⇒ بدون خطا. `npx jest` ⇒ **۷۱/۷۱** سبز.
- **زنده:** ارسال `SIGTERM` به فرایند ⇒ خروج **تمیز** (نه kill اجباری) و لاگ
  «اتصال PostgreSQL بسته شد» از طریق چرخه‌ی حیات. (سرویس `api` در compose نیز با همین
  مکانیزم هنگام `docker compose stop`/استقرار به‌درستی drain می‌شود.)

## ۵) سازگاری عقب‌رو
افزودنی/اصلاحی بدون تغییر قرارداد API. رفتار در شرایط عادی یکسان است؛ تنها مسیر خاموشی
قابل‌اعتمادتر شد.
